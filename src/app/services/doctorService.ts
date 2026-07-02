/**
 * doctorService.ts — Perfiles de Profesionales
 * Fuente de datos: exclusivamente Firebase Firestore (colección: doctores).
 */
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { DoctorPerfil } from "../types";

const COL = "doctores";

function ts2date(v: any): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date();
}

function toDoctor(id: string, d: any): DoctorPerfil {
  return {
    id,
    userId: d.userId,
    fullName: d.fullName ?? d.name ?? "",
    specialty: d.specialty ?? "",
    licenseNumber: d.licenseNumber,
    phone: d.phone,
    available: d.available !== false,
    createdAt: ts2date(d.createdAt),
    updatedAt: d.updatedAt ? ts2date(d.updatedAt) : undefined,
    createdBy: d.createdBy,
  };
}

function requireDb(op: string): void {
  if (!db) throw new Error(`[doctorService] Firebase no configurado: ${op}`);
}

export async function traerDoctores(): Promise<DoctorPerfil[]> {
  requireDb("traerDoctores");
  try {
    const snap = await getDocs(query(collection(db!, COL), where("available", "==", true)));
    return snap.docs.map(d => toDoctor(d.id, d.data()))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
  } catch (err) {
    console.error("[doctorService] traerDoctores error:", err);
    return [];
  }
}

export async function traerTodosLosDoctores(): Promise<DoctorPerfil[]> {
  requireDb("traerTodosLosDoctores");
  try {
    const snap = await getDocs(collection(db!, COL));
    return snap.docs.map(d => toDoctor(d.id, d.data()))
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
  } catch (err) {
    console.error("[doctorService] traerTodosLosDoctores error:", err);
    return [];
  }
}

export async function traerDoctorPorId(id: string): Promise<DoctorPerfil | null> {
  requireDb("traerDoctorPorId");
  const snap = await getDoc(doc(db!, COL, id));
  return snap.exists() ? toDoctor(snap.id, snap.data()) : null;
}

export async function traerDoctorPorUserId(userId: string): Promise<DoctorPerfil | null> {
  requireDb("traerDoctorPorUserId");
  const snap = await getDocs(query(collection(db!, COL), where("userId", "==", userId)));
  return snap.empty ? null : toDoctor(snap.docs[0].id, snap.docs[0].data());
}

export async function registrarDoctor(
  data: Omit<DoctorPerfil, "id" | "createdAt">,
  createdBy: string
): Promise<DoctorPerfil> {
  requireDb("registrarDoctor");
  const payload = { ...data, createdBy, createdAt: serverTimestamp() };
  const ref = await addDoc(collection(db!, COL), payload);
  return { id: ref.id, ...data, createdAt: new Date(), createdBy };
}

export async function modificarDoctor(
  id: string,
  data: Partial<DoctorPerfil>,
  updatedBy?: string
): Promise<DoctorPerfil> {
  requireDb("modificarDoctor");
  const ref = doc(db!, COL, id);
  await updateDoc(ref, { ...data, updatedBy, updatedAt: serverTimestamp() });
  const snap = await getDoc(ref);
  return toDoctor(id, snap.data() as Record<string, any>);
}

export async function desactivarDoctor(id: string, updatedBy?: string): Promise<void> {
  requireDb("desactivarDoctor");
  await updateDoc(doc(db!, COL, id), { available: false, updatedBy, updatedAt: serverTimestamp() });
}
