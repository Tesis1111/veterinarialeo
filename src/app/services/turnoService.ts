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
import { db, FIREBASE_CONFIGURED } from "../firebase/config";
import { Appointment, AppointmentFormData, DoctorSchedule, FormValidationResult, TimeSlot } from "../types";

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

// ── localStorage fallback ───────────────────────────────────────────────────

const LS_KEY = "veterinaria_appointments";

function lsLoad(): Appointment[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function lsSave(appointments: Appointment[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(appointments));
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
    const appointmentDate = new Date(date + "T00:00:00");
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

  const dow = new Date(date + "T00:00:00").getDay();
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

  if (FIREBASE_CONFIGURED && db) {
    const q = query(
      collection(db, COL),
      where("petId", "==", petId),
      where("date", "==", new Date(date + "T00:00:00")),
      where("startTime", "==", startTime),
      where("status", "in", ["Programado", "Confirmado"])
    );
    const snap = await getDocs(q);
    const conflict = snap.docs.find((d) => d.id !== excludeId);
    if (conflict) {
      errors.push({
        field: "petId",
        message: "Ya existe un turno para esta mascota en ese horario.",
      });
    }
  } else {
    const appointments = lsLoad();
    const conflict = appointments.find(
      (a) =>
        a.petId === petId &&
        new Date(a.date).toDateString() === new Date(date + "T00:00:00").toDateString() &&
        a.startTime === startTime &&
        ["Programado", "Confirmado"].includes(a.status) &&
        a.id !== excludeId
    );
    if (conflict) {
      errors.push({
        field: "petId",
        message: "Ya existe un turno para esta mascota en ese horario.",
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─────────────────────────────────────────────────────────────────────────
// Gestor Calendario
// ─────────────────────────────────────────────────────────────────────────

/** Retorna los turnos de una fecha específica ordenados por hora. */
export async function mostrarCalendarioTurno(date: string): Promise<Appointment[]> {
  if (FIREBASE_CONFIGURED && db) {
    const start = new Date(date + "T00:00:00");
    const end = new Date(date + "T23:59:59");
    const q = query(
      collection(db, COL),
      where("date", ">=", start),
      where("date", "<=", end),
      orderBy("date"),
      orderBy("startTime")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toAppointment(d.id, d.data()));
  }

  const appointments = lsLoad();
  return appointments
    .filter(
      (a) =>
        new Date(a.date).toDateString() === new Date(date + "T00:00:00").toDateString() &&
        a.status !== "Cancelado"
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/** Genera los slots disponibles de 30 min para un doctor en una fecha. */
export function generarSlots(
  doctorId: string,
  date: string,
  schedules: DoctorSchedule[],
  existingAppointments: Appointment[]
): TimeSlot[] {
  const dow = new Date(date + "T00:00:00").getDay();
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

      const conflict = existingAppointments.find(
        (a) =>
          a.doctorId === doctorId &&
          new Date(a.date).toDateString() === new Date(date + "T00:00:00").toDateString() &&
          a.startTime < end &&
          a.endTime > start &&
          ["Programado", "Confirmado"].includes(a.status)
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
// CRUD
// ─────────────────────────────────────────────────────────────────────────

export async function registrarTurno(
  data: AppointmentFormData,
  createdBy: string
): Promise<Appointment> {
  const payload = {
    ...data,
    date: new Date(data.date + "T00:00:00"),
    deleted: false,
    createdBy,
    createdAt: FIREBASE_CONFIGURED ? serverTimestamp() : new Date(),
  };

  if (FIREBASE_CONFIGURED && db) {
    const ref = await addDoc(collection(db, COL), payload);
    return { id: ref.id, ...data, date: new Date(data.date), createdBy, createdAt: new Date() } as Appointment;
  }

  const appointments = lsLoad();
  const newAppt: Appointment = {
    id: Date.now().toString(),
    ...data,
    date: new Date(data.date + "T00:00:00"),
    createdBy,
    createdAt: new Date(),
  };
  lsSave([...appointments, newAppt]);
  return newAppt;
}

export async function modificarTurno(
  id: string,
  data: Partial<AppointmentFormData>,
  updatedBy: string
): Promise<Appointment> {
  if (FIREBASE_CONFIGURED && db) {
    const ref = doc(db, COL, id);
    await updateDoc(ref, { ...data, updatedBy, updatedAt: serverTimestamp() });
    const snap = await getDoc(ref);
    return toAppointment(id, snap.data() as Record<string, any>);
  }

  const appointments = lsLoad();
  const idx = appointments.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error(`Turno ${id} no encontrado`);
  const updated: Appointment = { ...appointments[idx], ...data, updatedBy, updatedAt: new Date() } as Appointment;
  appointments[idx] = updated;
  lsSave(appointments);
  return updated;
}

export async function cancelarTurno(
  id: string,
  reason: string,
  updatedBy: string
): Promise<void> {
  if (FIREBASE_CONFIGURED && db) {
    await updateDoc(doc(db, COL, id), {
      status: "Cancelado",
      cancellationReason: reason,
      cancelledAt: serverTimestamp(),
      updatedBy,
      updatedAt: serverTimestamp(),
    });
    return;
  }

  const appointments = lsLoad();
  const idx = appointments.findIndex((a) => a.id === id);
  if (idx !== -1) {
    appointments[idx] = {
      ...appointments[idx],
      status: "Cancelado",
      cancellationReason: reason,
      cancelledAt: new Date(),
      updatedBy,
      updatedAt: new Date(),
    };
    lsSave(appointments);
  }
}

export async function traerTurnos(filters?: {
  clientId?: string;
  petId?: string;
  doctorId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Appointment[]> {
  if (FIREBASE_CONFIGURED && db) {
    const constraints: Parameters<typeof query>[1][] = [orderBy("date", "desc")];
    if (filters?.clientId) constraints.unshift(where("clientId", "==", filters.clientId));
    if (filters?.petId) constraints.unshift(where("petId", "==", filters.petId));
    const snap = await getDocs(query(collection(db, COL), ...constraints));
    return snap.docs.map((d) => toAppointment(d.id, d.data()));
  }

  let appointments = lsLoad();
  if (filters?.clientId) appointments = appointments.filter((a) => a.clientId === filters.clientId);
  if (filters?.petId) appointments = appointments.filter((a) => a.petId === filters.petId);
  return appointments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
