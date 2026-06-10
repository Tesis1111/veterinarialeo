// ============================================
// SISTEMA DE NOTIFICACIONES DE TURNOS
// Notificaciones automáticas 24 horas antes
// ============================================

import { differenceInHours, format, isFuture } from "date-fns";
import { es } from "date-fns/locale";

export interface AppointmentNotification {
  id: string;
  appointmentId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  petName: string;
  petSpecies: string;
  doctorName?: string;
  appointmentDate: Date;
  appointmentTime: string;
  serviceType: string;
  reason?: string;
  hoursUntil: number;
  notificationSentAt?: Date;
  notificationStatus: "pending" | "sent" | "failed";
}

export interface NotificationSettings {
  enabled: boolean;
  hoursBeforeAppointment: number; // Por defecto 24
  sendEmail: boolean;
  sendSMS: boolean;
  sendWhatsApp: boolean;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  hoursBeforeAppointment: 24,
  sendEmail: true,
  sendSMS: false,
  sendWhatsApp: true
};

// ── Calcular si un turno necesita notificación ──────────────────────────────────────
export const shouldNotify = (
  appointmentDate: Date,
  appointmentTime: string,
  settings: NotificationSettings = DEFAULT_NOTIFICATION_SETTINGS
): boolean => {
  if (!settings.enabled) return false;

  const now = new Date();
  const [hours, minutes] = appointmentTime.split(":").map(Number);
  const fullAppointmentDate = new Date(appointmentDate);
  fullAppointmentDate.setHours(hours, minutes, 0, 0);

  if (!isFuture(fullAppointmentDate)) return false;

  const hoursUntil = differenceInHours(fullAppointmentDate, now);
  return hoursUntil > 0 && hoursUntil <= settings.hoursBeforeAppointment;
};

// ── Calcular horas restantes ──────────────────────────────────────
export const getHoursUntilAppointment = (
  appointmentDate: Date,
  appointmentTime: string
): number => {
  const now = new Date();
  const [hours, minutes] = appointmentTime.split(":").map(Number);
  const fullAppointmentDate = new Date(appointmentDate);
  fullAppointmentDate.setHours(hours, minutes, 0, 0);

  return differenceInHours(fullAppointmentDate, now);
};

// ── Generar mensaje de notificación por email ──────────────────────────────────────
export const generateEmailNotification = (notification: AppointmentNotification): {
  subject: string;
  body: string;
} => {
  const appointmentDateFormatted = format(
    new Date(notification.appointmentDate),
    "EEEE d 'de' MMMM 'de' yyyy",
    { locale: es }
  );

  const subject = `🐾 Recordatorio: Turno de ${notification.petName} mañana`;

  const body = `
Estimado/a ${notification.clientName},

Le recordamos que tiene un turno programado para su mascota ${notification.petName} (${notification.petSpecies}).

📅 Fecha: ${appointmentDateFormatted}
🕐 Hora: ${notification.appointmentTime}
${notification.doctorName ? `👨‍⚕️ Profesional: ${notification.doctorName}` : ""}
📝 Motivo: ${notification.reason || "Consulta general"}

Por favor, llegue 10 minutos antes del horario programado.

Si necesita cancelar o reprogramar su turno, contáctenos con anticipación.

---
Este es un mensaje automático del sistema de gestión veterinaria.
  `.trim();

  return { subject, body };
};

// ── Generar mensaje de notificación por WhatsApp/SMS ──────────────────────────────────────
export const generateWhatsAppNotification = (notification: AppointmentNotification): string => {
  const appointmentDateFormatted = format(
    new Date(notification.appointmentDate),
    "dd/MM/yyyy",
    { locale: es }
  );

  return `
🐾 *Recordatorio de Turno*

Hola ${notification.clientName}!

Tienes un turno para *${notification.petName}* (${notification.petSpecies}) mañana:

📅 ${appointmentDateFormatted}
🕐 ${notification.appointmentTime}hs
${notification.doctorName ? `👨‍⚕️ ${notification.doctorName}` : ""}

Por favor llega 10 min antes. Para cancelar/reprogramar, contáctanos.
  `.trim();
};

// ── Simular envío de notificación (en producción se conecta a backend/servicio) ──────────────────────────────────────
export const sendNotification = async (
  notification: AppointmentNotification,
  settings: NotificationSettings = DEFAULT_NOTIFICATION_SETTINGS
): Promise<{
  success: boolean;
  channel: string[];
  message?: string;
}> => {
  // Simular delay de red
  await new Promise(resolve => setTimeout(resolve, 500));

  const sentChannels: string[] = [];

  // Email
  if (settings.sendEmail && notification.clientEmail) {
    const { subject, body } = generateEmailNotification(notification);
    console.log("📧 Email enviado:", { to: notification.clientEmail, subject, body });
    sentChannels.push("Email");
  }

  // WhatsApp
  if (settings.sendWhatsApp && notification.clientPhone) {
    const message = generateWhatsAppNotification(notification);
    console.log("📱 WhatsApp enviado:", { to: notification.clientPhone, message });
    sentChannels.push("WhatsApp");
  }

  // SMS
  if (settings.sendSMS && notification.clientPhone) {
    const message = generateWhatsAppNotification(notification);
    console.log("💬 SMS enviado:", { to: notification.clientPhone, message });
    sentChannels.push("SMS");
  }

  if (sentChannels.length === 0) {
    return {
      success: false,
      channel: [],
      message: "No hay canales de notificación configurados o datos de contacto del cliente"
    };
  }

  return {
    success: true,
    channel: sentChannels,
    message: `Notificación enviada por ${sentChannels.join(", ")}`
  };
};

// ── Obtener configuración de notificaciones del localStorage ──────────────────────────────────────
export const getNotificationSettings = (): NotificationSettings => {
  const saved = localStorage.getItem("veterinaria_notification_settings");
  if (saved) {
    return JSON.parse(saved);
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
};

// ── Guardar configuración de notificaciones ──────────────────────────────────────
export const saveNotificationSettings = (settings: NotificationSettings): void => {
  localStorage.setItem("veterinaria_notification_settings", JSON.stringify(settings));
};

// ── Procesar notificaciones pendientes (se ejecuta periódicamente) ──────────────────────────────────────
export const processNotifications = async (
  appointments: any[],
  clients: any[],
  pets: any[],
  doctors: any[]
): Promise<AppointmentNotification[]> => {
  const settings = getNotificationSettings();
  const notifications: AppointmentNotification[] = [];

  const sentNotifications = JSON.parse(
    localStorage.getItem("veterinaria_sent_notifications") || "[]"
  ) as string[];

  for (const apt of appointments) {
    // Solo procesar turnos confirmados o programados
    if (apt.status === "cancelled" || apt.status === "completed") continue;

    // Verificar si ya se envió notificación
    if (sentNotifications.includes(apt.id)) continue;

    // Verificar si está dentro del rango de notificación
    if (!shouldNotify(new Date(apt.date), apt.startTime || "00:00", settings)) continue;

    const client = clients.find(c => c.id === apt.clientId);
    const pet = pets.find(p => p.id === apt.petId);
    const doctor = doctors.find(d => d.id === apt.doctorId);

    if (!client || !pet) continue;

    const notification: AppointmentNotification = {
      id: `notif_${apt.id}_${Date.now()}`,
      appointmentId: apt.id,
      clientName: client.fullName,
      clientEmail: (client as any).email,
      clientPhone: client.phone,
      petName: pet.name,
      petSpecies: (pet as any).species || "Mascota",
      doctorName: doctor?.name,
      appointmentDate: new Date(apt.date),
      appointmentTime: apt.startTime || "Sin horario",
      serviceType: apt.type || "clinic",
      reason: apt.reason,
      hoursUntil: getHoursUntilAppointment(new Date(apt.date), apt.startTime || "00:00"),
      notificationStatus: "pending"
    };

    // Intentar enviar
    const result = await sendNotification(notification, settings);

    if (result.success) {
      notification.notificationStatus = "sent";
      notification.notificationSentAt = new Date();
      sentNotifications.push(apt.id);
    } else {
      notification.notificationStatus = "failed";
    }

    notifications.push(notification);
  }

  // Guardar IDs de notificaciones enviadas
  localStorage.setItem("veterinaria_sent_notifications", JSON.stringify(sentNotifications));

  return notifications;
};

// ── Limpiar notificaciones antiguas (más de 7 días) ──────────────────────────────────────
export const cleanOldNotifications = (): void => {
  const sentNotifications = JSON.parse(
    localStorage.getItem("veterinaria_sent_notifications") || "[]"
  ) as string[];

  // En producción, aquí se filtrarían las notificaciones basándose en fecha
  // Por ahora mantener las últimas 100
  if (sentNotifications.length > 100) {
    const recent = sentNotifications.slice(-100);
    localStorage.setItem("veterinaria_sent_notifications", JSON.stringify(recent));
  }
};
