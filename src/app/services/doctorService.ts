/**
 * doctorService.ts — Perfiles de Profesionales
 *
 * Colección Firestore: doctores
 * Fallback: localStorage key "veterinaria_doctors"
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
import { DoctorPerfil } from "../types";
import { doctors as initialDoctors } from "../data/mockData";

const COL = "doctores";
const LS_KEY = "veterinaria_doctors";

// ── Seed from mockData ─────────────────────────────────────────────────────────

function buildSeedDoctores(): DoctorPerfil[] {
  return initialDoctors.map(d => ({
    id: d.id,
    userId: undefined,
    fullName: d.name,
    specialty: d.specialty ?? "Medicina General",
    licenseNumber: undefined,
    phone: undefined,
    available: d.available,
    createdAt: new Date(),
  }));
}

// ── Conversion ─────────────────────────────────────────────────────────────────

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

// ── localStorage helpers ───────────────────────────────────────────────────────

function lsLoad(): DoctorPerfil[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Handle both old Doctor format and new DoctorPerfil format
      return parsed.map((d: any) => ({
        id: d.id,
        userId: d.userId,
        fullName: d.fullName ?? d.name ?? "",
        specialty: d.specialty ?? "",
        licenseNumber: d.licenseNumber,
        phone: d.phone,
        available: d.available !== false,
        createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
        updatedAt: d.updatedAt ? new Date(d.updatedAt) : undefined,
      }));
    }
    return buildSeedDoctores();
  } catch { return buildSeedDoctores(); }
}

function lsSave(doctors: DoctorPerfil[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(doctors)); } catch { /* ignore */ }
}

// ── CRUD ───────────────────────────────────────────────────────────────────────

export async function traerDoctores(): Promise<DoctorPerfil[]> {
  if (FIREBASE_CONFIGURED && db) {
    try {
      // Sin orderBy para evitar índice compuesto — filtramos/ordenamos client-side
      const snap = await getDocs(query(collection(db, COL), where("available", "==", true)));
      const data = snap.docs.map(d => toDoctor(d.id, d.data()));
      return data.sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
    } catch (err) {
      console.error("[doctorService] traerDoctores error:", err);
    }
  }
  return lsLoad().filter(d => d.available);
}

export async function traerTodosLosDoctores(): Promise<DoctorPerfil[]> {
  if (FIREBASE_CONFIGURED && db) {
    try {
      const snap = await getDocs(collection(db, COL));
      const data = snap.docs.map(d => toDoctor(d.id, d.data()));
      return data.sort((a, b) => a.fullName.localeCompare(b.fullName, "es"));
    } catch (err) {
      console.error("[doctorService] traerTodosLosDoctores error:", err);
    }
  }
  return lsLoad();
}

export async function traerDoctorPorId(id: string): Promise<DoctorPerfil | null> {
  if (FIREBASE_CONFIGURED && db) {
    const snap = await getDoc(doc(db, COL, id));
    return snap.exists() ? toDoctor(snap.id, snap.data()) : null;
  }
  return lsLoad().find(d => d.id === id) ?? null;
}

export async function traerDoctorPorUserId(userId: string): Promise<DoctorPerfil | null> {
  if (FIREBASE_CONFIGURED && db) {
    const snap = await getDocs(query(collection(db, COL), where("userId", "==", userId)));
    if (snap.empty) return null;
    return toDoctor(snap.docs[0].id, snap.docs[0].data());
  }
  return lsLoad().find(d => d.userId === userId) ?? null;
}

export async function registrarDoctor(
  data: Omit<DoctorPerfil, "id" | "createdAt">,
  createdBy: string
): Promise<DoctorPerfil> {
  if (FIREBASE_CONFIGURED && db) {
    const payload = { ...data, createdBy, createdAt: serverTimestamp() };
    const ref = await addDoc(collection(db, COL), payload);
    return { id: ref.id, ...data, createdAt: new Date(), createdBy };
  }
  const doctors = lsLoad();
  const item: DoctorPerfil = { id: `doc_${Date.now()}`, ...data, createdAt: new Date(), createdBy };
  lsSave([...doctors, item]);
  return item;
}

export async function modificarDoctor(
  id: string,
  data: Partial<DoctorPerfil>,
  updatedBy?: string
): Promise<DoctorPerfil> {
  if (FIREBASE_CONFIGURED && db) {
    const ref = doc(db, COL, id);
    await updateDoc(ref, { ...data, updatedBy, updatedAt: serverTimestamp() });
    const snap = await getDoc(ref);
    return toDoctor(id, snap.data() as Record<string, any>);
  }
  const doctors = lsLoad();
  const idx = doctors.findIndex(d => d.id === id);
  if (idx === -1) throw new Error(`Doctor ${id} no encontrado`);
  const updated: DoctorPerfil = { ...doctors[idx], ...data, updatedAt: new Date() };
  doctors[idx] = updated;
  lsSave(doctors);
  return updated;
}

export async function desactivarDoctor(id: string, updatedBy?: string): Promise<void> {
  if (FIREBASE_CONFIGURED && db) {
    await updateDoc(doc(db, COL, id), { available: false, updatedBy, updatedAt: serverTimestamp() });
    return;
  }
  const doctors = lsLoad();
  lsSave(doctors.map(d => d.id === id ? { ...d, available: false, updatedAt: new Date() } : d));
}
