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
  updateDoc,
  writeBatch,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { Appointment, AppointmentFormData, DoctorSchedule, FormValidationResult, TimeSlot } from "../types";
import { audit } from "./auditoriaService";

const COL = "turnos";
const SLOTS_COL = "slots";

// ── Slots (unicidad de horario por profesional) ─────────────────────────────

/** ID determinista del lock de slot: {doctorId}_{YYYY-MM-DD}_{HH:mm}. */
export function slotIdFor(doctorId: string, dateStr: string, startTime: string): string {
  return `${doctorId}_${dateStr}_${startTime}`;
}

/** Fecha local como "YYYY-MM-DD" (sin desfase UTC). */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** ¿Este turno reserva un slot de agenda del profesional? */
function needsSlot(t: { type?: string; doctorId?: string | null; startTime?: string | null; status?: string }): boolean {
  return t.type !== "daycare" &&
    Boolean(t.doctorId) &&
    Boolean(t.startTime) &&
    ["Programado", "Confirmado"].includes(t.status ?? "Confirmado");
}

/** Error de dominio: el horario ya está reservado (perdió la carrera del slot). */
export class SlotOcupadoError extends Error {
  constructor() {
    super("El profesional ya tiene un turno en ese horario. Elegí otro horario.");
    this.name = "SlotOcupadoError";
  }
}

/** Suma 30 minutos a "HH:mm" con acarreo de hora y cero a la izquierda. */
export function calcEndTime(start: string, durationMin = 30): string {
  const [h, m] = start.split(":").map(Number);
  const t = h * 60 + m + durationMin;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

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
    type: data.type,
    deleted: data.deleted ?? false,
    tiposEvento: data.tiposEvento,
    dateFrom: (data.dateFrom as Timestamp)?.toDate?.() ?? data.dateFrom,
    dateTo: (data.dateTo as Timestamp)?.toDate?.() ?? data.dateTo,
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
  // Query server-side por mascota + rango del día (índice compuesto petId+date)
  const [vy, vm, vd] = date.split("-").map(Number);
  const targetDate = new Date(vy, vm - 1, vd);
  targetDate.setHours(0, 0, 0, 0);
  const nextDay = new Date(targetDate);
  nextDay.setDate(targetDate.getDate() + 1);

  const snap = await getDocs(query(
    collection(db!, COL),
    where("petId", "==", petId),
    where("date", ">=", targetDate),
    where("date", "<", nextDay)
  ));
  const conflict = snap.docs.find(d => {
    const a = d.data();
    return d.id !== excludeId &&
      a.startTime === startTime &&
      ["Programado", "Confirmado"].includes(a.status ?? "");
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

/** Normaliza Date u "YYYY-MM-DD" a medianoche local. */
function toLocalMidnight(date: Date | string): Date {
  let dateObj: Date;
  if (date instanceof Date) {
    dateObj = new Date(date);
  } else {
    const [ty, tm, td] = String(date).split("-").map(Number);
    dateObj = new Date(ty, tm - 1, td);
  }
  dateObj.setHours(0, 0, 0, 0);
  return dateObj;
}

/** Traduce el permission-denied del batch de slot a un error de dominio. */
function mapSlotError(err: any): never {
  // El update del turno propio siempre está permitido para staff autenticado;
  // en el batch con slot, permission-denied solo puede venir del set sobre un
  // slot existente (rules: update de /slots prohibido) → horario ocupado.
  if (err?.code === "permission-denied") throw new SlotOcupadoError();
  throw err;
}

export async function registrarTurno(data: AppointmentFormData & Record<string, any>, createdBy: string): Promise<Appointment> {
  requireDb("registrarTurno");
  const dateObj = toLocalMidnight(data.date);
  const payload = { ...data, date: dateObj, deleted: false, createdBy, createdAt: serverTimestamp() };
  const turnoRef = doc(collection(db!, COL));

  if (needsSlot({ ...data, status: (data as any).status })) {
    const slotId = slotIdFor(data.doctorId!, toDateStr(dateObj), data.startTime!);
    const batch = writeBatch(db!);
    batch.set(doc(db!, SLOTS_COL, slotId), {
      turnoId: turnoRef.id,
      doctorId: data.doctorId,
      date: dateObj,
      startTime: data.startTime,
      createdBy,
      createdAt: serverTimestamp(),
    });
    batch.set(turnoRef, payload);
    await batch.commit().catch(mapSlotError);
  } else {
    const batch = writeBatch(db!);
    batch.set(turnoRef, payload);
    await batch.commit();
  }

  await audit({
    action: "CREATE", module: "appointments", entityType: "turno", entityId: turnoRef.id,
    details: `Registró un turno para el ${dateObj.toLocaleDateString("es-AR")} ${data.startTime ?? ""}`,
    newValues: { clientId: data.clientId, petId: data.petId, doctorId: data.doctorId, date: dateObj.toISOString() },
  });
  return { id: turnoRef.id, ...data, date: dateObj, createdBy, createdAt: new Date() } as Appointment;
}

export async function modificarTurno(id: string, data: Partial<AppointmentFormData> & Record<string, any>, updatedBy: string): Promise<Appointment> {
  requireDb("modificarTurno");
  const ref = doc(db!, COL, id);
  const prevSnap = await getDoc(ref);
  const prev = prevSnap.exists() ? toAppointment(id, prevSnap.data() as Record<string, any>) : null;

  const updatePayload: Record<string, any> = { ...data, updatedBy, updatedAt: serverTimestamp() };
  if (data.date !== undefined) updatePayload.date = toLocalMidnight(data.date as Date | string);

  // Slot viejo y nuevo según el estado resultante del merge
  const merged = {
    type: data.type ?? prev?.type,
    doctorId: (data.doctorId ?? prev?.doctorId) as string | undefined,
    startTime: (data.startTime ?? prev?.startTime) as string | undefined,
    status: (data as any).status ?? prev?.status,
  };
  const mergedDate: Date = updatePayload.date ?? (prev?.date as Date) ?? new Date();
  const oldSlotId = prev && needsSlot(prev)
    ? slotIdFor(prev.doctorId!, toDateStr(new Date(prev.date)), prev.startTime!)
    : null;
  const newSlotId = needsSlot(merged)
    ? slotIdFor(merged.doctorId!, toDateStr(mergedDate), merged.startTime!)
    : null;

  if (newSlotId !== oldSlotId) {
    const batch = writeBatch(db!);
    if (newSlotId) {
      batch.set(doc(db!, SLOTS_COL, newSlotId), {
        turnoId: id,
        doctorId: merged.doctorId,
        date: mergedDate,
        startTime: merged.startTime,
        createdBy: updatedBy,
        createdAt: serverTimestamp(),
      });
    }
    if (oldSlotId) batch.delete(doc(db!, SLOTS_COL, oldSlotId));
    batch.update(ref, updatePayload);
    await batch.commit().catch(mapSlotError);
  } else {
    await updateDoc(ref, updatePayload);
  }

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
  const ref = doc(db!, COL, id);
  const prevSnap = await getDoc(ref);
  const prev = prevSnap.exists() ? toAppointment(id, prevSnap.data() as Record<string, any>) : null;

  const batch = writeBatch(db!);
  batch.update(ref, {
    status: "Cancelado", cancellationReason: reason,
    cancelledAt: serverTimestamp(), updatedBy, updatedAt: serverTimestamp(),
  });
  // Libera el slot del profesional (delete idempotente: no falla si no existe)
  if (prev && needsSlot(prev)) {
    batch.delete(doc(db!, SLOTS_COL, slotIdFor(prev.doctorId!, toDateStr(new Date(prev.date)), prev.startTime!)));
  }
  await batch.commit();

  await audit({
    action: "UPDATE", module: "appointments", entityType: "turno", entityId: id,
    details: `Canceló el turno ${id}`, newValues: { status: "Cancelado", cancellationReason: reason },
  });
}

export async function traerTurnos(filters?: { clientId?: string; petId?: string; from?: Date; to?: Date }): Promise<Appointment[]> {
  requireDb("traerTurnos");
  // Filtros server-side: petId/clientId son where de campo único; el rango de
  // fecha se combina solo con petId (índice compuesto petId+date).
  const constraints = [];
  if (filters?.petId) constraints.push(where("petId", "==", filters.petId));
  else if (filters?.clientId) constraints.push(where("clientId", "==", filters.clientId));
  if (filters?.from && !filters?.clientId) constraints.push(where("date", ">=", filters.from));
  if (filters?.to && !filters?.clientId) constraints.push(where("date", "<", filters.to));

  const snap = await getDocs(constraints.length ? query(collection(db!, COL), ...constraints) : collection(db!, COL));
  let appts = snap.docs.map(d => toAppointment(d.id, d.data()));
  if (filters?.clientId) {
    appts = appts.filter(a => a.clientId === filters.clientId);
    if (filters.from) appts = appts.filter(a => new Date(a.date) >= filters.from!);
    if (filters.to) appts = appts.filter(a => new Date(a.date) < filters.to!);
  }
  return appts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
