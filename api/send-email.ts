import { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

// Vercel environment variables
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Veterinaria Leo <notificaciones@notificationvet.com>';
// Misma API key web pública del proyecto (VITE_FIREBASE_API_KEY ya definida en Vercel).
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY;

let resend: Resend;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
}

// Escapa todo valor interpolado en las plantillas HTML (previene inyección
// de HTML/enlaces en correos con la identidad de la veterinaria).
const esc = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SUBJECT_LEN = 200;
const MAX_ATTACHMENT_LEN = 4 * 1024 * 1024; // ~3MB de PDF en base64

// Cache de tokens verificados y rate limit por uid. Son Maps por instancia de
// la función serverless (best-effort): reducen llamadas a Google y ponen
// fricción al abuso, sin pretender ser un límite global exacto.
const tokenCache = new Map<string, { uid: string; expiresAt: number }>();
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_PER_WINDOW = 20;

// Rate limiting por IP (para solicitudes sin sesión)
const ipRateBuckets = new Map<string, { count: number; windowStart: number }>();
const IP_RATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutos
const IP_RATE_MAX_PER_WINDOW = 5; // máximo 5 solicitudes por IP cada 5 minutos

function isRateLimitedByIp(ip: string): boolean {
  const now = Date.now();
  const bucket = ipRateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart > IP_RATE_WINDOW_MS) {
    ipRateBuckets.set(ip, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > IP_RATE_MAX_PER_WINDOW;
}


async function verifyIdToken(idToken: string): Promise<string | null> {
  const cached = tokenCache.get(idToken);
  if (cached && cached.expiresAt > Date.now()) return cached.uid;

  if (!FIREBASE_API_KEY) {
    console.error('Missing VITE_FIREBASE_API_KEY environment variable.');
    return null;
  }
  const resp = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!resp.ok) return null;
  const body: any = await resp.json();
  const uid = body?.users?.[0]?.localId;
  if (!uid) return null;

  tokenCache.set(idToken, { uid, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });
  if (tokenCache.size > 500) {
    for (const [k, v] of tokenCache) if (v.expiresAt <= Date.now()) tokenCache.delete(k);
  }
  return uid;
}

function isRateLimited(uid: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(uid);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(uid, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_MAX_PER_WINDOW;
}

// Plantilla base para todos los correos
const baseTemplate = (title: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-w-lg mx-auto; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); margin-top: 20px; margin-bottom: 20px; }
    .header { background-color: #f97316; padding: 30px 20px; text-align: center; color: white; }
    .header h1 { margin: 0; font-size: 24px; font-weight: bold; }
    .content { padding: 30px; color: #374151; line-height: 1.6; font-size: 16px; }
    .content h2 { color: #1f2937; font-size: 20px; margin-top: 0; }
    .footer { background-color: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #f97316; color: white !important; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; margin-bottom: 15px; }
    .info-box { background-color: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0; }
    .info-box p { margin: 5px 0; }
    .info-label { font-weight: bold; color: #9a3412; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🐾 Veterinaria Leo</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Veterinaria Leo - Cuidando a tus mejores amigos</p>
      <p>Si tienes alguna consulta, no dudes en contactarnos.</p>
    </div>
  </div>
</body>
</html>
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY environment variable.");
    return res.status(500).json({ error: 'Configuración de servidor incompleta (API Key).' });
  }

  try {
    const { to, subject, type, data = {}, attachmentBase64 } = req.body;

    if (!to || !subject || !type) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: to, subject, type' });
    }
    if (typeof to !== 'string' || !EMAIL_RE.test(to)) {
      return res.status(400).json({ error: 'Destinatario inválido' });
    }
    if (typeof subject !== 'string' || subject.length > MAX_SUBJECT_LEN) {
      return res.status(400).json({ error: 'Asunto inválido' });
    }

    const isAdminRecovery = type === 'admin_password_recovery' || type === 'admin_password_recovery_error';

    if (isAdminRecovery) {
      // Validar estrictamente el destinatario administrador para evitar abusos
      const allowedAdmins = ['ferreyraemanuel19@gmail.com', 'admin@veterinaria-leo.com'];
      if (!allowedAdmins.includes(to)) {
        return res.status(403).json({ error: 'Destinatario no autorizado para este tipo de correo administrativo' });
      }

      // Rate limit por IP
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
      const ipStr = Array.isArray(ip) ? ip[0] : String(ip);
      if (isRateLimitedByIp(ipStr)) {
        return res.status(429).json({ error: 'Demasiadas solicitudes de recuperación. Intente en unos minutos.' });
      }
    } else {
      // Autenticación: solo usuarios logueados en Firebase pueden enviar correos.
      const authHeader = req.headers.authorization || '';
      const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!idToken) {
        return res.status(401).json({ error: 'No autenticado' });
      }
      const uid = await verifyIdToken(idToken);
      if (!uid) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
      }
      if (isRateLimited(uid)) {
        return res.status(429).json({ error: 'Demasiados correos, intente en un minuto' });
      }
    }
    if (attachmentBase64 !== undefined &&
        (typeof attachmentBase64 !== 'string' || attachmentBase64.length > MAX_ATTACHMENT_LEN)) {
      return res.status(400).json({ error: 'Adjunto inválido o demasiado grande' });
    }

    let htmlContent = '';

    switch (type) {
      case 'appointment_created':
        htmlContent = baseTemplate(
          'Turno Confirmado',
          `<h2>¡Hola ${esc(data.clientName)}!</h2>
           <p>Te confirmamos que el turno para <strong>${esc(data.petName)}</strong> ha sido agendado exitosamente.</p>
           <div class="info-box">
             <p><span class="info-label">📅 Fecha:</span> ${esc(data.date)}</p>
             <p><span class="info-label">🕒 Hora:</span> ${esc(data.time)}</p>
             <p><span class="info-label">👨‍⚕️ Veterinario:</span> ${esc(data.doctorName)}</p>
             <p><span class="info-label">🏥 Motivo:</span> ${esc(data.reason)}</p>
           </div>
           <p>Por favor, recuerda llegar 10 minutos antes. ¡Los esperamos!</p>`
        );
        break;

      case 'appointment_cancelled':
        htmlContent = baseTemplate(
          'Turno Cancelado',
          `<h2>Hola ${esc(data.clientName)},</h2>
           <p>Te informamos que el turno de <strong>${esc(data.petName)}</strong> ha sido cancelado.</p>
           <div class="info-box">
             <p><span class="info-label">📅 Fecha original:</span> ${esc(data.date)}</p>
             <p><span class="info-label">🕒 Hora original:</span> ${esc(data.time)}</p>
           </div>
           <p>Si deseas reprogramarlo, puedes contactarnos o gestionarlo a través de nuestro sistema.</p>`
        );
        break;

      case 'appointment_rescheduled':
        htmlContent = baseTemplate(
          'Turno Reprogramado',
          `<h2>Hola ${esc(data.clientName)},</h2>
           <p>El turno de <strong>${esc(data.petName)}</strong> ha sido reprogramado con éxito.</p>
           <div class="info-box">
             <p><span class="info-label">❌ Fecha anterior:</span> ${esc(data.oldDate)} a las ${esc(data.oldTime)}</p>
             <p><span class="info-label">✅ Nueva Fecha:</span> ${esc(data.newDate)}</p>
             <p><span class="info-label">✅ Nueva Hora:</span> ${esc(data.newTime)}</p>
           </div>
           <p>¡Nos vemos pronto!</p>`
        );
        break;

      case 'welcome':
        htmlContent = baseTemplate(
          '¡Bienvenido a Veterinaria Leo!',
          `<h2>¡Hola ${esc(data.clientName)}!</h2>
           <p>Queremos darte la bienvenida a nuestra familia. En <strong>Veterinaria Leo</strong> estamos felices de poder cuidar la salud y bienestar de tus mascotas.</p>
           <p>Ya puedes comenzar a gestionar tus turnos y acceder al historial clínico a través de nuestro sistema.</p>`
        );
        break;

      case 'pet_registered':
        htmlContent = baseTemplate(
          'Mascota Registrada',
          `<h2>¡Hola ${esc(data.clientName)}!</h2>
           <p>Te confirmamos que tu mascota <strong>${esc(data.petName)}</strong> ha sido registrada correctamente en nuestro sistema.</p>
           <div class="info-box">
             <p><span class="info-label">🐾 Mascota:</span> ${esc(data.petName)}</p>
             <p><span class="info-label">🧬 Especie/Raza:</span> ${esc(data.species)} - ${esc(data.breed)}</p>
           </div>
           <p>Ya podemos empezar a llevar su historial clínico al día. ¡Gracias por confiar en nosotros!</p>`
        );
        break;

      case 'clinical_history':
        htmlContent = baseTemplate(
          'Historial Clínico',
          `<h2>Hola ${esc(data.clientName)},</h2>
           <p>Adjunto a este correo encontrarás el historial clínico actualizado de <strong>${esc(data.petName)}</strong>.</p>
           <p>Si tienes alguna duda sobre las indicaciones o los registros, no dudes en consultarnos.</p>`
        );
        break;

      case 'reminder':
        htmlContent = baseTemplate(
          'Recordatorio Importante',
          `<h2>Hola ${esc(data.clientName)},</h2>
           <p>Queremos recordarte sobre una fecha importante para <strong>${esc(data.petName)}</strong>.</p>
           <div class="info-box">
             <p><span class="info-label">🔔 Tipo:</span> ${esc(data.reminderType)}</p>
             <p><span class="info-label">📅 Fecha aproximada:</span> ${esc(data.date)}</p>
             <p><span class="info-label">📝 Detalle:</span> ${esc(data.notes)}</p>
           </div>
           <p>Contactanos para agendar un turno lo antes posible para mantener su calendario al día.</p>`
        );
        break;

      // 'password_recovery' se eliminó: la recuperación usa el flujo oficial de
      // Firebase Auth (sendPasswordResetEmail) y este endpoint exige sesión.

      default:
        return res.status(400).json({ error: 'Tipo de correo no soportado' });
    }

    // Configurar el objeto de envío
    const emailPayload: any = {
      from: EMAIL_FROM,
      to,
      subject,
      html: htmlContent,
    };

    // Agregar adjuntos si existen (PDF Historial Clínico)
    if (attachmentBase64) {
      const safePetName = String(data.petName ?? 'mascota').replace(/[^\w\s.-]/g, '').trim() || 'mascota';
      emailPayload.attachments = [
        {
          filename: `Historial_Clinico_${safePetName}.pdf`,
          content: attachmentBase64.split(',')[1] || attachmentBase64, // Remove data URI prefix if present
        }
      ];
    }

    const { data: resendData, error } = await resend.emails.send(emailPayload);

    if (error) {
      console.error('Resend API Error:', error);
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true, id: resendData?.id });
  } catch (error: any) {
    console.error('Serverless Error:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor al enviar correo' });
  }
}
