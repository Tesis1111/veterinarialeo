// Backend Validation Functions - Appointments Module
// Estas funciones simulan validaciones del lado del servidor

import { Appointment, AppointmentType, AppointmentStatus } from "../types";
import { isBefore, startOfDay } from "date-fns";

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Valida que una fecha no sea anterior a la fecha actual
 * REGLA: No se pueden crear turnos en fechas pasadas
 */
export function validateAppointmentDate(date: Date): ValidationResult {
  const today = startOfDay(new Date());
  const appointmentDate = startOfDay(date);

  if (isBefore(appointmentDate, today)) {
    return {
      isValid: false,
      error: "No es posible asignar turnos en fechas pasadas."
    };
  }

  return { isValid: true };
}

/**
 * Valida que un rango de fechas sea válido (para guardería)
 */
export function validateDateRange(dateFrom: Date, dateTo: Date): ValidationResult {
  const today = startOfDay(new Date());
  const from = startOfDay(dateFrom);
  const to = startOfDay(dateTo);

  // Validar que la fecha desde no sea en el pasado
  if (isBefore(from, today)) {
    return {
      isValid: false,
      error: "La fecha de inicio no puede ser anterior a hoy."
    };
  }

  // Validar que la fecha hasta no sea anterior a la fecha desde
  if (isBefore(to, from)) {
    return {
      isValid: false,
      error: "La fecha 'hasta' debe ser posterior a la fecha 'desde'."
    };
  }

  return { isValid: true };
}

/**
 * Valida si un turno puede ser editado
 * REGLA: No se pueden editar turnos confirmados o completados
 */
export function canEditAppointment(appointment: Appointment): ValidationResult {
  if (appointment.status === "completed") {
    return {
      isValid: false,
      error: "No se puede editar un turno completado."
    };
  }

  if (appointment.status === "confirmed") {
    return {
      isValid: false,
      error: "No se puede editar un turno confirmado. Debe cambiar el estado primero."
    };
  }

  return { isValid: true };
}

/**
 * Valida si un turno puede ser eliminado
 */
export function canDeleteAppointment(appointment: Appointment): ValidationResult {
  if (appointment.status === "completed") {
    return {
      isValid: false,
      error: "No se puede eliminar un turno completado."
    };
  }

  return { isValid: true };
}

/**
 * Valida todos los campos requeridos de un turno
 */
export function validateAppointmentFields(
  type: AppointmentType,
  clientId: string,
  petId: string,
  reason: string,
  doctorId?: string,
  startTime?: string,
  dateFrom?: Date,
  dateTo?: Date
): ValidationResult {
  if (!clientId || !petId || !reason) {
    return {
      isValid: false,
      error: "Complete todos los campos obligatorios (Cliente, Mascota, Motivo)."
    };
  }

  if (type === "clinic" || type === "grooming") {
    if (!doctorId || !startTime) {
      return {
        isValid: false,
        error: `Para ${type === "clinic" ? "consultas clínicas" : "peluquería"}, debe seleccionar profesional y horario.`
      };
    }
  }

  if (type === "daycare") {
    if (!dateFrom || !dateTo) {
      return {
        isValid: false,
        error: "Para guardería, debe seleccionar las fechas desde y hasta."
      };
    }
  }

  return { isValid: true };
}

/**
 * Verifica si un turno está "cerrado" (no puede modificarse)
 */
export function isAppointmentLocked(appointment: Appointment): boolean {
  return appointment.status === "completed" || appointment.status === "confirmed";
}

/**
 * Obtiene el mensaje de estado de un turno cerrado
 */
export function getLockedAppointmentMessage(appointment: Appointment): string {
  if (appointment.status === "completed") {
    return "Turno Completado - Solo Lectura";
  }
  if (appointment.status === "confirmed") {
    return "Turno Confirmado - Solo Lectura";
  }
  return "";
}
