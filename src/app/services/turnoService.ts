/**
 * Módulo Horarios y Turnos — Capa de Servicios
 *
 * Gestores implementados:
 *   • Gestor Alta Turnos     — validarHorario(), validarDisponibilidadProfesional(), validarDuplicados()
 *   • Gestor Calendario      — mostrarCalendarioTurno()
 *   • Gestor Alertas         — detectarAlertas()
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { Appointment, AppointmentFormData, DoctorSchedule, FormValidationResult, TimeSlot } from "../types";
import { audit } from "./auditoriaService";

const COL = "turnos";

// ── Conversion ──────────────────────────────────────────────────────────────

function toAppointment(id: string, data: Record<string, any>): Appointment {
  return {
    id,
    clientId: data.clientId ?? "",
    petId: data.petId ?? "",
    serviceId: data.serviceId ?? "",
    doctorId: data.doctorId,
    date: (data.date as Timestamp)?.toDate() ?? new Date(data.date),
    startTime: data.startTime ?? "",
    endTime: data.endTime ?? "",
    status: data.status ?? "Programado",
    reason: data.reason,
    notes: data.notes,
    cancellationReason: data.cancellationReason,
    cancelledAt: (data.cancelledAt as Timestamp)?.toDate(),
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    createdBy: data.createdBy ?? "",
    updatedAt: (data.updatedAt as Timestamp)?.toDate(),
    updatedBy: data.updatedBy,
  };
}


// ─────────────────────────────────────────────────────────────────────────
// Gestor Alta Turnos
// ─────────────────────────────────────────────────────────────────────────

/** Valida que el horario del turno sea coherente (inicio < fin, dentro del día). */
export function validarHorario(
  startTime: string,
  endTime: string,
  date: string
): FormValidationResult {
  const errors = [];

  if (!date) errors.push({ field: "date", message: "La fecha es obligatoria." });
  if (!startTime) errors.push({ field: "startTime", message: "La hora de inicio es obligatoria." });
  if (!endTime) errors.push({ field: "endTime", message: "La hora de fin es obligatoria." });

  if (startTime && endTime && startTime >= endTime) {
    errors.push({ field: "endTime", message: "La hora de fin debe ser posterior al inicio." });
  }

  if (date) {
    const [y, m, d] = date.split("-").map(Number);
    const appointmentDate = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) {
      errors.push({ field: "date", message: "No se pueden crear turnos en fechas pasadas." });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Verifica que el profesional esté disponible en el horario solicitado
 * según sus horarios configurados.
 */
export function validarDisponibilidadProfesional(
  doctorId: string,
  date: string,
  startTime: string,
  endTime: string,
  schedules: DoctorSchedule[]
): FormValidationResult {
  const errors = [];

  const [dy, dm, dd] = date.split("-").map(Number);
  const dow = new Date(dy, dm - 1, dd).getDay();
  const doctorSchedules = schedules.filter(
    (s) => s.doctorId === doctorId && s.dayOfWeek === dow && s.active
  );

  if (doctorSchedules.length === 0) {
    errors.push({
      field: "doctorId",
      message: "El profesional no trabaja el día seleccionado.",
    });
    return { valid: false, errors };
  }

  const withinSchedule = doctorSchedules.some(
    (s) => startTime >= s.startTime && endTime <= s.endTime
  );

  if (!withinSchedule) {
    errors.push({
      field: "startTime",
      message: "El horario solicitado está fuera del horario de atención del profesional.",
    });
  }

  return { valid: errors.length === 0, errors };
}

/** Verifica que no exista un turno duplicado para la misma mascota en la misma fecha/hora. */
export async function validarDuplicados(
  petId: string,
  date: string,
  startTime: string,
  excludeId?: string
): Promise<FormValidationResult> {
  const errors = [];

  if (!db) { return { valid: true, errors: [] }; }
  // Fetch all for this pet and filter client-side to avoid composite index
  const [vy, vm, vd] = date.split("-").map(Number);
  const targetDate = new Date(vy, vm - 1, vd);

  const snap = await getDocs(query(collection(db!, COL), where("petId", "==", petId)));
  const conflict = snap.docs.find(d => {
    const a = d.data();
    const aDate = a.date?.toDate ? a.date.toDate() : new Date(a.date);
    aDate.setHours(0, 0, 0, 0);
    return d.id !== excludeId &&
      a.startTime === startTime &&
      ["Programado", "Confirmado"].includes(a.status ?? "") &&
      aDate.getTime() === targetDate.getTime();
  });
  if (conflict) {
    errors.push({ field: "petId", message: "Ya existe un turno para esta mascota en ese horario." });
  }

  return { valid: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────
// Gestor Calendario
// ─────────────────────────────────────────────────────────────────────────

/** Retorna los turnos de una fecha específica ordenados por hora. */
export async function mostrarCalendarioTurno(date: string): Promise<Appointment[]> {
  if (!db) return [];

  // Parse the target date in local time (avoids UTC-3 offset issues)
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  target.setHours(0, 0, 0, 0);
  const nextDay = new Date(target);
  nextDay.setDate(target.getDate() + 1);

  // Firestore range query — filters on server, no composite index needed (single-field)
  const q = query(
    collection(db!, COL),
    where("date", ">=", target),
    where("date", "<", nextDay)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map(d => toAppointment(d.id, d.data()))
    .filter(a => a.status !== "Cancelado")
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
}

/** Genera los slots disponibles de 30 min para un doctor en una fecha. */
export function generarSlots(
  doctorId: string,
  date: string,
  schedules: DoctorSchedule[],
  existingAppointments: Appointment[]
): TimeSlot[] {
  const [dy, dm, dd] = date.split("-").map(Number);
  const dow = new Date(dy, dm - 1, dd).getDay();
  const daySchedules = schedules.filter(
    (s) => s.doctorId === doctorId && s.dayOfWeek === dow && s.active
  );

  const slots: TimeSlot[] = [];

  for (const schedule of daySchedules) {
    let [h, m] = schedule.startTime.split(":").map(Number);
    const [endH, endM] = schedule.endTime.split(":").map(Number);
    const endMinutes = endH * 60 + endM;

    while (h * 60 + m + 30 <= endMinutes) {
      const start = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      m += 30;
      if (m >= 60) { h++; m -= 60; }
      const end = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

      const slotDateStr = `${dy}-${String(dm).padStart(2,"0")}-${String(dd).padStart(2,"0")}`;
      const conflict = existingAppointments.find(
        (a) => {
          const aDate = new Date(a.date);
          const aStr = `${aDate.getFullYear()}-${String(aDate.getMonth()+1).padStart(2,"0")}-${String(aDate.getDate()).padStart(2,"0")}`;
          return a.doctorId === doctorId &&
            aStr === slotDateStr &&
            a.startTime < end &&
            a.endTime > start &&
            ["Programado", "Confirmado"].includes(a.status);
        }
      );

      slots.push({
        startTime: start,
        endTime: end,
        available: !conflict,
        appointmentId: conflict?.id,
      });
    }
  }

  return slots;
}

// ─────────────────────────────────────────────────────────────────────────
// Gestor Alertas
// ─────────────────────────────────────────────────────────────────────────

export interface TurnoAlerta {
  type: "overlap" | "no_schedule" | "upcoming" | "overdue";
  appointmentId: string;
  message: string;
}

/** Detecta conflictos y alertas en la lista de turnos próximos. */
export function detectarAlertas(
  appointments: Appointment[],
  schedules: DoctorSchedule[]
): TurnoAlerta[] {
  const alerts: TurnoAlerta[] = [];
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  for (const appt of appointments) {
    const apptDate = new Date(appt.date);

    // Turnos pasados sin completar
    if (apptDate < now && appt.status === "Programado") {
      alerts.push({
        type: "overdue",
        appointmentId: appt.id,
        message: `El turno del ${apptDate.toLocaleDateString("es-AR")} no fue completado.`,
      });
    }

    // Turnos próximas 24 horas
    if (apptDate >= now && apptDate <= in24h && appt.status !== "Cancelado") {
      alerts.push({
        type: "upcoming",
        appointmentId: appt.id,
        message: `Turno próximo: ${apptDate.toLocaleDateString("es-AR")} a las ${appt.startTime}.`,
      });
    }

    // Profesional sin horario ese día
    if (appt.doctorId && appt.status !== "Cancelado") {
      const dow = apptDate.getDay();
      const hasSchedule = schedules.some(
        (s) => s.doctorId === appt.doctorId && s.dayOfWeek === dow && s.active
      );
      if (!hasSchedule) {
        alerts.push({
          type: "no_schedule",
          appointmentId: appt.id,
          message: `El profesional del turno no tiene horario configurado para ese día.`,
        });
      }
    }
  }

  return alerts;
}

// ─────────────────────────────────────────────────────────────────────────
// CRUD — exclusivamente Firestore
// ─────────────────────────────────────────────────────────────────────────

function requireDb(op: string) {
  if (!db) throw new Error(`[turnoService] Firebase no configurado. Operación: ${op}`);
}

export async function registrarTurno(data: AppointmentFormData, createdBy: string): Promise<Appointment> {
  requireDb("registrarTurno");
  // Accept Date object or "YYYY-MM-DD" string; always convert to local midnight
  let dateObj: Date;
  if (data.date instanceof Date) {
    dateObj = new Date(data.date);
  } else {
    const [ty, tm, td] = String(data.date).split("-").map(Number);
    dateObj = new Date(ty, tm - 1, td);
  }
  dateObj.setHours(0, 0, 0, 0);
  const payload = { ...data, date: dateObj, deleted: false, createdBy, createdAt: serverTimestamp() };
  const ref = await addDoc(collection(db!, COL), payload);
  await audit({
    action: "CREATE", module: "appointments", entityType: "turno", entityId: ref.id,
    details: `Registró un turno para el ${dateObj.toLocaleDateString("es-AR")} ${data.startTime ?? ""}`,
    newValues: { clientId: data.clientId, petId: data.petId, doctorId: data.doctorId, date: dateObj.toISOString() },
  });
  return { id: ref.id, ...data, date: dateObj, createdBy, createdAt: new Date() } as Appointment;
}

export async function modificarTurno(id: string, data: Partial<AppointmentFormData>, updatedBy: string): Promise<Appointment> {
  requireDb("modificarTurno");
  const ref = doc(db!, COL, id);
  await updateDoc(ref, { ...data, updatedBy, updatedAt: serverTimestamp() });
  const snap = await getDoc(ref);
  const updated = toAppointment(id, snap.data() as Record<string, any>);
  // Distingue reprogramación / confirmación / modificación genérica.
  let details = `Modificó el turno ${id}`;
  if (data.status === "Confirmado") details = `Confirmó el turno ${id}`;
  else if (data.date || data.startTime) details = `Reprogramó el turno ${id}`;
  await audit({
    action: "UPDATE", module: "appointments", entityType: "turno", entityId: id,
    details, newValues: { ...data },
  });
  return updated;
}

export async function cancelarTurno(id: string, reason: string, updatedBy: string): Promise<void> {
  requireDb("cancelarTurno");
  await updateDoc(doc(db!, COL, id), {
    status: "Cancelado", cancellationReason: reason,
    cancelledAt: serverTimestamp(), updatedBy, updatedAt: serverTimestamp(),
  });
  await audit({
    action: "UPDATE", module: "appointments", entityType: "turno", entityId: id,
    details: `Canceló el turno ${id}`, newValues: { status: "Cancelado", cancellationReason: reason },
  });
}

export async function traerTurnos(filters?: { clientId?: string; petId?: string }): Promise<Appointment[]> {
  requireDb("traerTurnos");
  // Fetch all client-side to avoid composite index requirements
  const snap = await getDocs(collection(db!, COL));
  let appts = snap.docs.map(d => toAppointment(d.id, d.data()));
  if (filters?.clientId) appts = appts.filter(a => a.clientId === filters.clientId);
  if (filters?.petId) appts = appts.filter(a => a.petId === filters.petId);
  return appts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
