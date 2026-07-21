import { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

// Vercel environment variables
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Veterinaria Leo <notificaciones@notificationvet.com>';

let resend: Resend;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
}

// Plantilla base para todos los correos
const baseTemplate = (title: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
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
    const { to, subject, type, data, attachmentBase64 } = req.body;

    if (!to || !subject || !type) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: to, subject, type' });
    }

    let htmlContent = '';

    switch (type) {
      case 'appointment_created':
        htmlContent = baseTemplate(
          'Turno Confirmado',
          `<h2>¡Hola ${data.clientName}!</h2>
           <p>Te confirmamos que el turno para <strong>${data.petName}</strong> ha sido agendado exitosamente.</p>
           <div class="info-box">
             <p><span class="info-label">📅 Fecha:</span> ${data.date}</p>
             <p><span class="info-label">🕒 Hora:</span> ${data.time}</p>
             <p><span class="info-label">👨‍⚕️ Veterinario:</span> ${data.doctorName}</p>
             <p><span class="info-label">🏥 Motivo:</span> ${data.reason}</p>
           </div>
           <p>Por favor, recuerda llegar 10 minutos antes. ¡Los esperamos!</p>`
        );
        break;

      case 'appointment_cancelled':
        htmlContent = baseTemplate(
          'Turno Cancelado',
          `<h2>Hola ${data.clientName},</h2>
           <p>Te informamos que el turno de <strong>${data.petName}</strong> ha sido cancelado.</p>
           <div class="info-box">
             <p><span class="info-label">📅 Fecha original:</span> ${data.date}</p>
             <p><span class="info-label">🕒 Hora original:</span> ${data.time}</p>
           </div>
           <p>Si deseas reprogramarlo, puedes contactarnos o gestionarlo a través de nuestro sistema.</p>`
        );
        break;
        
      case 'appointment_rescheduled':
        htmlContent = baseTemplate(
          'Turno Reprogramado',
          `<h2>Hola ${data.clientName},</h2>
           <p>El turno de <strong>${data.petName}</strong> ha sido reprogramado con éxito.</p>
           <div class="info-box">
             <p><span class="info-label">❌ Fecha anterior:</span> ${data.oldDate} a las ${data.oldTime}</p>
             <p><span class="info-label">✅ Nueva Fecha:</span> ${data.newDate}</p>
             <p><span class="info-label">✅ Nueva Hora:</span> ${data.newTime}</p>
           </div>
           <p>¡Nos vemos pronto!</p>`
        );
        break;

      case 'welcome':
        htmlContent = baseTemplate(
          '¡Bienvenido a Veterinaria Leo!',
          `<h2>¡Hola ${data.clientName}!</h2>
           <p>Queremos darte la bienvenida a nuestra familia. En <strong>Veterinaria Leo</strong> estamos felices de poder cuidar la salud y bienestar de tus mascotas.</p>
           <p>Ya puedes comenzar a gestionar tus turnos y acceder al historial clínico a través de nuestro sistema.</p>`
        );
        break;

      case 'pet_registered':
        htmlContent = baseTemplate(
          'Mascota Registrada',
          `<h2>¡Hola ${data.clientName}!</h2>
           <p>Te confirmamos que tu mascota <strong>${data.petName}</strong> ha sido registrada correctamente en nuestro sistema.</p>
           <div class="info-box">
             <p><span class="info-label">🐾 Mascota:</span> ${data.petName}</p>
             <p><span class="info-label">🧬 Especie/Raza:</span> ${data.species} - ${data.breed}</p>
           </div>
           <p>Ya podemos empezar a llevar su historial clínico al día. ¡Gracias por confiar en nosotros!</p>`
        );
        break;

      case 'clinical_history':
        htmlContent = baseTemplate(
          'Historial Clínico',
          `<h2>Hola ${data.clientName},</h2>
           <p>Adjunto a este correo encontrarás el historial clínico actualizado de <strong>${data.petName}</strong>.</p>
           <p>Si tienes alguna duda sobre las indicaciones o los registros, no dudes en consultarnos.</p>`
        );
        break;

      case 'reminder':
        htmlContent = baseTemplate(
          'Recordatorio Importante',
          `<h2>Hola ${data.clientName},</h2>
           <p>Queremos recordarte sobre una fecha importante para <strong>${data.petName}</strong>.</p>
           <div class="info-box">
             <p><span class="info-label">🔔 Tipo:</span> ${data.reminderType}</p>
             <p><span class="info-label">📅 Fecha aproximada:</span> ${data.date}</p>
             <p><span class="info-label">📝 Detalle:</span> ${data.notes}</p>
           </div>
           <p>Contactanos para agendar un turno lo antes posible para mantener su calendario al día.</p>`
        );
        break;

      case 'password_recovery':
        htmlContent = baseTemplate(
          'Recuperación de Contraseña',
          `<h2>Hola ${data.clientName},</h2>
           <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
           <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
           <a href="${data.recoveryLink}" class="button">Restablecer Contraseña</a>
           <p>Si no fuiste tú quien realizó esta solicitud, puedes ignorar este correo.</p>`
        );
        break;

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
      emailPayload.attachments = [
        {
          filename: `Historial_Clinico_${data.petName}.pdf`,
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
