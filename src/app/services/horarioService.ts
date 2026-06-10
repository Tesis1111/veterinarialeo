/**
 * Módulo Horarios — Capa de Servicios
 *
 * Gestores implementados:
 *   • Gestor Alta Horario — validarHorario(), registrarHorario()
 */
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, FIREBASE_CONFIGURED } from "../firebase/config";
import { DoctorSchedule, FormValidationResult } from "../types";

const COL = "horarios";

// ── Conversion ──────────────────────────────────────────────────────────────

function toSchedule(id: string, data: Record<string, any>): DoctorSchedule {
  return {
    id,
    doctorId: data.doctorId ?? "",
    dayOfWeek: data.dayOfWeek ?? 0,
    startTime: data.startTime ?? "08:00",
    endTime: data.endTime ?? "17:00",
    active: data.active !== false,
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate(),
  };
}

// ── localStorage fallback ───────────────────────────────────────────────────

const LS_KEY = "veterinaria_doctor_schedules";

function lsLoad(): DoctorSchedule[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function lsSave(schedules: DoctorSchedule[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(schedules));
}

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// ─────────────────────────────────────────────────────────────────────────
// Gestor Alta Horario
// ─────────────────────────────────────────────────────────────────────────

/** Valida que el horario tenga inicio < fin y no se superponga con horarios existentes. */
export async function validarHorario(
  doctorId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeId?: string
): Promise<FormValidationResult> {
  const errors = [];

  if (startTime >= endTime) {
    errors.push({ field: "endTime", message: "La hora de fin debe ser posterior al inicio." });
    return { valid: false, errors };
  }

  // Check overlaps
  let schedules: DoctorSchedule[];
  if (FIREBASE_CONFIGURED && db) {
    const q = query(
      collection(db, COL),
      where("doctorId", "==", doctorId),
      where("dayOfWeek", "==", dayOfWeek),
      where("active", "==", true)
    );
    const snap = await getDocs(q);
    schedules = snap.docs
      .filter((d) => d.id !== excludeId)
      .map((d) => toSchedule(d.id, d.data()));
  } else {
    schedules = lsLoad().filter(
      (s) => s.doctorId === doctorId && s.dayOfWeek === dayOfWeek && s.active && s.id !== excludeId
    );
  }

  const overlap = schedules.some(
    (s) => startTime < s.endTime && endTime > s.startTime
  );

  if (overlap) {
    errors.push({
      field: "startTime",
      message: `El horario se superpone con otro bloque existente para el ${DAY_NAMES[dayOfWeek]}.`,
    });
  }

  return { valid: errors.length === 0, errors };
}

/** Persiste un nuevo bloque de horario para un profesional. */
export async function registrarHorario(
  doctorId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string
): Promise<DoctorSchedule> {
  if (FIREBASE_CONFIGURED && db) {
    const payload = {
      doctorId,
      dayOfWeek,
      startTime,
      endTime,
      active: true,
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, COL), payload);
    return { id: ref.id, doctorId, dayOfWeek, startTime, endTime, active: true, createdAt: new Date() };
  }

  const schedules = lsLoad();
  const newSchedule: DoctorSchedule = {
    id: Date.now().toString(),
    doctorId,
    dayOfWeek,
    startTime,
    endTime,
    active: true,
    createdAt: new Date(),
  };
  lsSave([...schedules, newSchedule]);
  return newSchedule;
}

// ─────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────

export async function desactivarHorario(id: string): Promise<void> {
  if (FIREBASE_CONFIGURED && db) {
    await updateDoc(doc(db, COL, id), { active: false, updatedAt: serverTimestamp() });
    return;
  }

  const schedules = lsLoad();
  const idx = schedules.findIndex((s) => s.id === id);
  if (idx !== -1) {
    schedules[idx] = { ...schedules[idx], active: false, updatedAt: new Date() };
    lsSave(schedules);
  }
}

export async function traerHorariosPorDoctor(doctorId: string): Promise<DoctorSchedule[]> {
  if (FIREBASE_CONFIGURED && db) {
    const q = query(
      collection(db, COL),
      where("doctorId", "==", doctorId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toSchedule(d.id, d.data()));
  }

  return lsLoad().filter((s) => s.doctorId === doctorId);
}

export async function traerTodosLosHorarios(): Promise<DoctorSchedule[]> {
  if (FIREBASE_CONFIGURED && db) {
    const snap = await getDocs(collection(db, COL));
    return snap.docs.map((d) => toSchedule(d.id, d.data()));
  }

  return lsLoad();
}
