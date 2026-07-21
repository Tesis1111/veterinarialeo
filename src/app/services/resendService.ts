import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

interface EmailLogData {
  to: string;
  subject: string;
  type: string;
  data: any;
  attachmentBase64?: string;
}

/**
 * Función interna para llamar a la API y registrar en Firestore
 */
async function sendEmailAndLog(payload: EmailLogData) {
  try {
    // 1. Llamar a nuestra Serverless Function
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // 2. Guardar log en Firestore
    await addDoc(collection(db, 'email_logs'), {
      destinatario: payload.to,
      asunto: payload.subject,
      fecha: serverTimestamp(),
      tipo_correo: payload.type,
      estado: response.ok ? 'enviado' : 'error',
      id_resend: result.id || null,
      mensaje_error: response.ok ? null : result.error || 'Error desconocido',
    });

    if (!response.ok) {
      throw new Error(result.error || 'Error al enviar el correo');
    }

    return result;
  } catch (error) {
    console.error('Error in sendEmailAndLog:', error);
    // Registrar el fallo de red o excepción inesperada si es posible
    try {
      await addDoc(collection(db, 'email_logs'), {
        destinatario: payload.to,
        asunto: payload.subject,
        fecha: serverTimestamp(),
        tipo_correo: payload.type,
        estado: 'error',
        id_resend: null,
        mensaje_error: error instanceof Error ? error.message : 'Excepción de red',
      });
    } catch (e) {
      console.error('No se pudo registrar el error en Firebase', e);
    }
    throw error;
  }
}

// ==========================================
// FUNCIONES EXPORTADAS PARA EL FRONTEND
// ==========================================

export const sendAppointmentEmail = async (
  to: string, 
  data: { clientName: string; petName: string; date: string; time: string; doctorName: string; reason: string }
) => {
  return sendEmailAndLog({
    to,
    subject: '¡Tu turno está confirmado! 🐾',
    type: 'appointment_created',
    data,
  });
};

export const sendAppointmentCancellation = async (
  to: string, 
  data: { clientName: string; petName: string; date: string; time: string }
) => {
  return sendEmailAndLog({
    to,
    subject: 'Turno cancelado - Veterinaria Leo',
    type: 'appointment_cancelled',
    data,
  });
};

export const sendAppointmentReschedule = async (
  to: string, 
  data: { clientName: string; petName: string; oldDate: string; oldTime: string; newDate: string; newTime: string }
) => {
  return sendEmailAndLog({
    to,
    subject: 'Turno reprogramado exitosamente 🔄',
    type: 'appointment_rescheduled',
    data,
  });
};

export const sendWelcomeEmail = async (
  to: string, 
  data: { clientName: string }
) => {
  return sendEmailAndLog({
    to,
    subject: '¡Bienvenido a Veterinaria Leo! 🐶🐱',
    type: 'welcome',
    data,
  });
};

export const sendPetRegistered = async (
  to: string, 
  data: { clientName: string; petName: string; species: string; breed: string }
) => {
  return sendEmailAndLog({
    to,
    subject: `¡${data.petName} ya es parte de la familia! 🐾`,
    type: 'pet_registered',
    data,
  });
};

export const sendClinicalHistory = async (
  to: string, 
  data: { clientName: string; petName: string },
  pdfBase64: string
) => {
  return sendEmailAndLog({
    to,
    subject: `Historial Clínico - ${data.petName} 📋`,
    type: 'clinical_history',
    data,
    attachmentBase64: pdfBase64,
  });
};

export const sendReminder = async (
  to: string, 
  data: { clientName: string; petName: string; reminderType: string; date: string; notes: string }
) => {
  return sendEmailAndLog({
    to,
    subject: `Recordatorio: ${data.reminderType} para ${data.petName} 🔔`,
    type: 'reminder',
    data,
  });
};

export const sendPasswordRecovery = async (
  to: string, 
  data: { clientName: string; recoveryLink: string }
) => {
  return sendEmailAndLog({
    to,
    subject: 'Recuperación de Contraseña 🔒',
    type: 'password_recovery',
    data,
  });
};
