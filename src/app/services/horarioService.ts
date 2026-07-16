/**
 * horarioService.ts — Gestión de Horarios de Profesionales
 * Fuente de datos: exclusivamente Firebase Firestore.
 * Incluye eliminarHorario() para borrado definitivo del documento.
 */
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { DoctorSchedule, FormValidationResult } from "../types";
import { audit } from "./auditoriaService";

const COL = "horarios";
const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

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

function requireDb(op: string) {
  if (!db) throw new Error(`[horarioService] Firebase no configurado. Operación: ${op}`);
}

export async function validarHorario(
  doctorId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeId?: string
): Promise<FormValidationResult> {
  const errors = [];
  if (!startTime || !endTime) {
    errors.push({ field: "startTime", message: "Los horarios de inicio y fin son obligatorios." });
    return { valid: false, errors };
  }
  if (startTime >= endTime) {
    errors.push({ field: "endTime", message: "La hora de fin debe ser posterior al inicio." });
    return { valid: false, errors };
  }

  requireDb("validarHorario");
  // Fetch and filter client-side to avoid composite index
  const snap = await getDocs(query(collection(db!, COL), where("doctorId", "==", doctorId)));
  const existing = snap.docs
    .filter(d => d.id !== excludeId && d.data().dayOfWeek === dayOfWeek && d.data().active !== false)
    .map(d => toSchedule(d.id, d.data()));

  const overlap = existing.some(s => startTime < (s.endTime ?? "") && endTime > (s.startTime ?? ""));
  if (overlap) {
    errors.push({ field: "startTime", message: `Se superpone con un horario existente el ${DAY_NAMES[dayOfWeek]}.` });
  }
  return { valid: errors.length === 0, errors };
}

export async function registrarHorario(
  doctorId: string, dayOfWeek: number, startTime: string, endTime: string
): Promise<DoctorSchedule> {
  requireDb("registrarHorario");
  const payload = { doctorId, dayOfWeek, startTime, endTime, active: true, createdAt: serverTimestamp() };
  const ref = await addDoc(collection(db!, COL), payload);
  await audit({
    action: "CREATE", module: "security", entityType: "horario", entityId: ref.id,
    details: `Registró horario ${DAY_NAMES[dayOfWeek]} ${startTime}-${endTime} para el profesional ${doctorId}`,
    newValues: { doctorId, dayOfWeek, startTime, endTime },
  });
  return { id: ref.id, doctorId, dayOfWeek, startTime, endTime, active: true, createdAt: new Date() };
}

/** Soft-disable: mantiene el documento pero lo marca como inactivo. */
export async function desactivarHorario(id: string): Promise<void> {
  requireDb("desactivarHorario");
  await updateDoc(doc(db!, COL, id), { active: false, updatedAt: serverTimestamp() });
  await audit({
    action: "UPDATE", module: "security", entityType: "horario", entityId: id,
    details: `Desactivó el horario ${id}`, newValues: { active: false },
  });
}

/** Borrado definitivo del documento de Firestore. */
export async function eliminarHorario(id: string): Promise<void> {
  requireDb("eliminarHorario");
  await deleteDoc(doc(db!, COL, id));
  await audit({
    action: "DELETE", module: "security", entityType: "horario", entityId: id,
    details: `Eliminó el horario ${id}`,
  });
}

export async function traerHorariosPorDoctor(doctorId: string): Promise<DoctorSchedule[]> {
  requireDb("traerHorariosPorDoctor");
  const snap = await getDocs(query(collection(db!, COL), where("doctorId", "==", doctorId)));
  return snap.docs.map(d => toSchedule(d.id, d.data()));
}

export async function traerTodosLosHorarios(): Promise<DoctorSchedule[]> {
  requireDb("traerTodosLosHorarios");
  const snap = await getDocs(collection(db!, COL));
  return snap.docs.map(d => toSchedule(d.id, d.data()));
}
