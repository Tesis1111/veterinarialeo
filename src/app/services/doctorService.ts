/**
 * doctorService.ts — Perfiles de Profesionales
 * Fuente de datos: exclusivamente Firebase Firestore (colección: doctores).
 */
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { DoctorPerfil } from "../types";
import { audit } from "./auditoriaService";

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
    nombre: d.nombre,
    apellido: d.apellido,
    profesion: d.profesion ?? "",
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
  // Strip undefined values — Firestore rejects undefined fields
  const payload: Record<string, any> = { createdBy, createdAt: serverTimestamp() };
  Object.entries(data).forEach(([k, v]) => { if (v !== undefined) payload[k] = v; });
  const ref = await addDoc(collection(db!, COL), payload);
  await audit({
    action: "CREATE", module: "users", entityType: "profesional", entityId: ref.id,
    details: `Registró al profesional "${data.fullName}"${data.profesion ? ` (${data.profesion})` : ""}`,
    newValues: { ...data },
  });
  return { id: ref.id, ...data, createdAt: new Date(), createdBy };
}

/**
 * Sincroniza (crea o actualiza) el perfil profesional vinculado a un usuario.
 * Es la ÚNICA fuente para crear/mantener documentos en `doctores` de forma
 * automática cuando cambian los datos del usuario. Idempotente por userId.
 */
export async function sincronizarDoctorDeUsuario(
  userId: string,
  data: {
    fullName: string;
    nombre?: string;
    apellido?: string;
    profesion?: string;
    specialty?: string;
    licenseNumber?: string;
    phone?: string;
    available?: boolean;
  },
  actorId?: string
): Promise<void> {
  requireDb("sincronizarDoctorDeUsuario");
  const existing = await getDocs(query(collection(db!, COL), where("userId", "==", userId)));

  const fields: Record<string, any> = {
    userId,
    fullName: data.fullName,
    nombre: data.nombre,
    apellido: data.apellido,
    profesion: data.profesion ?? "",
    // La especialidad se gestiona desde el módulo de Profesionales, no desde Usuarios.
    // Sólo se sincroniza si se provee explícitamente; si es undefined se preserva el valor actual.
    specialty: data.specialty,
    licenseNumber: data.licenseNumber,
    phone: data.phone,
    available: data.available !== false,
  };
  // Firestore rechaza undefined.
  const clean: Record<string, any> = {};
  Object.entries(fields).forEach(([k, v]) => { if (v !== undefined) clean[k] = v; });

  if (existing.empty) {
    await addDoc(collection(db!, COL), { ...clean, createdBy: actorId, createdAt: serverTimestamp() });
    await audit({
      action: "CREATE", module: "users", entityType: "profesional", entityId: userId,
      details: `Creó automáticamente el perfil profesional de "${data.fullName}"${data.profesion ? ` (${data.profesion})` : ""}`,
      newValues: clean,
    });
  } else {
    await Promise.all(
      existing.docs.map(d =>
        updateDoc(doc(db!, COL, d.id), { ...clean, updatedBy: actorId, updatedAt: serverTimestamp() })
      )
    );
    await audit({
      action: "UPDATE", module: "users", entityType: "profesional", entityId: userId,
      details: `Sincronizó el perfil profesional de "${data.fullName}"`,
      newValues: clean,
    });
  }
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
  const updated = toDoctor(id, snap.data() as Record<string, any>);
  await audit({
    action: "UPDATE", module: "users", entityType: "profesional", entityId: id,
    details: `Modificó al profesional "${updated.fullName}"`, newValues: { ...data },
  });
  return updated;
}

export async function desactivarDoctor(id: string, updatedBy?: string): Promise<void> {
  requireDb("desactivarDoctor");
  await updateDoc(doc(db!, COL, id), { available: false, updatedBy, updatedAt: serverTimestamp() });
}

/**
 * Desactiva el perfil profesional vinculado a un usuario (por userId).
 * Mantiene la integridad usuario↔profesional cuando se hace borrado lógico
 * de un usuario. No-op si el usuario no tiene perfil profesional.
 */
export async function desactivarDoctorPorUserId(userId: string, updatedBy?: string): Promise<void> {
  requireDb("desactivarDoctorPorUserId");
  const snap = await getDocs(query(collection(db!, COL), where("userId", "==", userId)));
  await Promise.all(
    snap.docs.map(d => updateDoc(doc(db!, COL, d.id), { available: false, updatedBy, updatedAt: serverTimestamp() }))
  );
}

/** Borrado FÍSICO del/los perfil(es) profesional(es) vinculados a un usuario. */
export async function eliminarDoctorFisicoPorUserId(userId: string): Promise<void> {
  requireDb("eliminarDoctorFisicoPorUserId");
  const snap = await getDocs(query(collection(db!, COL), where("userId", "==", userId)));
  await Promise.all(snap.docs.map(d => deleteDoc(doc(db!, COL, d.id))));
}
