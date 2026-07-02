/**
 * parametrosService.ts — Datos Paramétricos del Sistema
 *
 * Gestiona las colecciones dinámicas administradas por el administrador:
 *   • especies          — Especies de animales
 *   • razas             — Razas vinculadas a una especie
 *   • tiposEvento       — Tipos de evento clínico
 *   • arbolVacunacion   — Vacunas por especie con periodicidad
 *
 * Fuente de datos: exclusivamente Firebase Firestore.
 *
 * IMPORTANTE: Las queries de Firestore usan solo `where("active","==",true)` sin
 * `orderBy` para evitar requerir índices compuestos. El ordenado se hace client-side.
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db, FIREBASE_CONFIGURED } from "../firebase/config";
import {
  EspecieParametro,
  RazaParametro,
  TipoEvento,
  VacunaParametro,
} from "../types";

// ── Firestore ↔ model helpers ─────────────────────────────────────────────────

function ts2date(v: any): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return new Date();
}

function toEspecie(id: string, d: any): EspecieParametro {
  return { id, name: d.name ?? "", icon: d.icon, description: d.description, active: d.active !== false, createdAt: ts2date(d.createdAt), updatedAt: d.updatedAt ? ts2date(d.updatedAt) : undefined, createdBy: d.createdBy };
}
function toRaza(id: string, d: any): RazaParametro {
  return { id, especieId: d.especieId ?? "", name: d.name ?? "", description: d.description, active: d.active !== false, createdAt: ts2date(d.createdAt), updatedAt: d.updatedAt ? ts2date(d.updatedAt) : undefined, createdBy: d.createdBy };
}
function toTipo(id: string, d: any): TipoEvento {
  return { id, name: d.name ?? "", color: d.color ?? "bg-gray-100 text-gray-700", requiresVaccineTracking: d.requiresVaccineTracking ?? false, active: d.active !== false, createdAt: ts2date(d.createdAt), updatedAt: d.updatedAt ? ts2date(d.updatedAt) : undefined, createdBy: d.createdBy };
}
function toVacuna(id: string, d: any): VacunaParametro {
  return { id, especieId: d.especieId ?? "", especieName: d.especieName, nombreVacuna: d.nombreVacuna ?? "", dosis: d.dosis ?? 1, periodicidadDias: d.periodicidadDias ?? 365, descripcion: d.descripcion, active: d.active !== false, createdAt: ts2date(d.createdAt), updatedAt: d.updatedAt ? ts2date(d.updatedAt) : undefined, createdBy: d.createdBy };
}

// ─────────────────────────────────────────────────────────────────────────────
// onSnapshot exports — para suscripción en tiempo real desde los componentes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Suscribe en tiempo real a la colección `especies`.
 * Retorna la función de desuscripción (llamar en el cleanup del useEffect).
 * Si Firebase no está configurado, el callback recibe un array vacío.
 */
export function suscribirEspecies(
  callback: (especies: EspecieParametro[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | (() => void) {
  if (FIREBASE_CONFIGURED && db) {
    // Sin orderBy para evitar requerir índice compuesto — ordenamos client-side
    const q = query(collection(db, "especies"), where("active", "==", true));
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => toEspecie(d.id, d.data()));
      data.sort((a, b) => a.name.localeCompare(b.name, "es"));
      callback(data);
    }, (err) => {
      console.error("[parametrosService] onSnapshot especies error:", err);
      onError?.(err as Error);
      callback([]);
    });
  }
  // Fallback localStorage
  callback([]);
  return () => {};
}

export function suscribirRazas(
  callback: (razas: RazaParametro[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | (() => void) {
  if (FIREBASE_CONFIGURED && db) {
    const q = query(collection(db, "razas"), where("active", "==", true));
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => toRaza(d.id, d.data()));
      data.sort((a, b) => a.name.localeCompare(b.name, "es"));
      callback(data);
    }, (err) => {
      console.error("[parametrosService] onSnapshot razas error:", err);
      onError?.(err as Error);
      callback([]);
    });
  }
  callback([]);
  return () => {};
}

export function suscribirTiposEvento(
  callback: (tipos: TipoEvento[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | (() => void) {
  if (FIREBASE_CONFIGURED && db) {
    const q = query(collection(db, "tiposEvento"), where("active", "==", true));
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => toTipo(d.id, d.data()));
      data.sort((a, b) => a.name.localeCompare(b.name, "es"));
      callback(data);
    }, (err) => {
      console.error("[parametrosService] onSnapshot tiposEvento error:", err);
      onError?.(err as Error);
      callback([]);
    });
  }
  callback([]);
  return () => {};
}

export function suscribirVacunas(
  callback: (vacunas: VacunaParametro[]) => void,
  onError?: (err: Error) => void
): Unsubscribe | (() => void) {
  if (FIREBASE_CONFIGURED && db) {
    const q = query(collection(db, "arbolVacunacion"), where("active", "==", true));
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => toVacuna(d.id, d.data()));
      data.sort((a, b) => a.nombreVacuna.localeCompare(b.nombreVacuna, "es"));
      callback(data);
    }, (err) => {
      console.error("[parametrosService] onSnapshot vacunas error:", err);
      onError?.(err as Error);
      callback([]);
    });
  }
  callback([]);
  return () => {};
}

// ─────────────────────────────────────────────────────────────────────────────
// One-shot getDocs — para componentes que no necesitan suscripción
// ─────────────────────────────────────────────────────────────────────────────

export async function traerEspecies(): Promise<EspecieParametro[]> {
  if (FIREBASE_CONFIGURED && db) {
    try {
      const snap = await getDocs(query(collection(db, "especies"), where("active", "==", true)));
      const data = snap.docs.map(d => toEspecie(d.id, d.data()));
      return data.sort((a, b) => a.name.localeCompare(b.name, "es"));
    } catch (err) {
      console.error("[parametrosService] traerEspecies error:", err);
    }
  }
  return [];
}

export async function traerRazasPorEspecie(especieId: string): Promise<RazaParametro[]> {
  if (FIREBASE_CONFIGURED && db) {
    try {
      const snap = await getDocs(query(collection(db, "razas"), where("especieId", "==", especieId), where("active", "==", true)));
      const data = snap.docs.map(d => toRaza(d.id, d.data()));
      return data.sort((a, b) => a.name.localeCompare(b.name, "es"));
    } catch (err) {
      console.error("[parametrosService] traerRazasPorEspecie error:", err);
    }
  }
  return [];
}

export async function traerTodasLasRazas(): Promise<RazaParametro[]> {
  if (FIREBASE_CONFIGURED && db) {
    try {
      const snap = await getDocs(query(collection(db, "razas"), where("active", "==", true)));
      const data = snap.docs.map(d => toRaza(d.id, d.data()));
      return data.sort((a, b) => a.name.localeCompare(b.name, "es"));
    } catch (err) {
      console.error("[parametrosService] traerTodasLasRazas error:", err);
    }
  }
  return [];
}

export async function traerTiposEvento(): Promise<TipoEvento[]> {
  if (FIREBASE_CONFIGURED && db) {
    try {
      const snap = await getDocs(query(collection(db, "tiposEvento"), where("active", "==", true)));
      const data = snap.docs.map(d => toTipo(d.id, d.data()));
      return data.sort((a, b) => a.name.localeCompare(b.name, "es"));
    } catch (err) {
      console.error("[parametrosService] traerTiposEvento error:", err);
    }
  }
  return [];
}

export async function traerVacunasPorEspecie(especieId: string): Promise<VacunaParametro[]> {
  if (FIREBASE_CONFIGURED && db) {
    try {
      const snap = await getDocs(query(collection(db, "arbolVacunacion"), where("especieId", "==", especieId), where("active", "==", true)));
      const data = snap.docs.map(d => toVacuna(d.id, d.data()));
      return data.sort((a, b) => a.nombreVacuna.localeCompare(b.nombreVacuna, "es"));
    } catch (err) {
      console.error("[parametrosService] traerVacunasPorEspecie error:", err);
    }
  }
  return [];
}

export async function traerTodasLasVacunas(): Promise<VacunaParametro[]> {
  if (FIREBASE_CONFIGURED && db) {
    try {
      const snap = await getDocs(query(collection(db, "arbolVacunacion"), where("active", "==", true)));
      const data = snap.docs.map(d => toVacuna(d.id, d.data()));
      return data.sort((a, b) => a.nombreVacuna.localeCompare(b.nombreVacuna, "es"));
    } catch (err) {
      console.error("[parametrosService] traerTodasLasVacunas error:", err);
    }
  }
  return [];
}


// ─────────────────────────────────────────────────────────────────────────────
// CRUD — todas las operaciones requieren Firestore configurado
// ─────────────────────────────────────────────────────────────────────────────

function requireDb(op: string) { if (!db) throw new Error(`[parametrosService] Firebase no configurado: ${op}`); }

export async function registrarEspecie(data: Omit<EspecieParametro, "id" | "createdAt">, createdBy: string): Promise<EspecieParametro> {
  requireDb("registrarEspecie");
  const payload = { ...data, icon: data.icon || "🐾", description: data.description ?? "", createdBy, active: true, createdAt: serverTimestamp() };
  const ref = await addDoc(collection(db!, "especies"), payload);
  return { id: ref.id, ...data, icon: data.icon || "🐾", active: true, createdAt: new Date(), createdBy };
}
export async function modificarEspecie(id: string, data: Partial<EspecieParametro>): Promise<void> {
  requireDb("modificarEspecie");
  await updateDoc(doc(db!, "especies", id), { ...data, updatedAt: serverTimestamp() });
}
export async function eliminarEspecie(id: string): Promise<void> { return modificarEspecie(id, { active: false }); }

export async function registrarRaza(data: Omit<RazaParametro, "id" | "createdAt">, createdBy: string): Promise<RazaParametro> {
  requireDb("registrarRaza");
  const payload = { ...data, description: data.description ?? "", createdBy, active: true, createdAt: serverTimestamp() };
  const ref = await addDoc(collection(db!, "razas"), payload);
  return { id: ref.id, ...data, active: true, createdAt: new Date(), createdBy };
}
export async function modificarRaza(id: string, data: Partial<RazaParametro>): Promise<void> {
  requireDb("modificarRaza");
  await updateDoc(doc(db!, "razas", id), { ...data, updatedAt: serverTimestamp() });
}
export async function eliminarRaza(id: string): Promise<void> { return modificarRaza(id, { active: false }); }

export async function registrarTipoEvento(data: Omit<TipoEvento, "id" | "createdAt">, createdBy: string): Promise<TipoEvento> {
  requireDb("registrarTipoEvento");
  const payload = { ...data, createdBy, active: true, createdAt: serverTimestamp() };
  const ref = await addDoc(collection(db!, "tiposEvento"), payload);
  return { id: ref.id, ...data, active: true, createdAt: new Date(), createdBy };
}
export async function modificarTipoEvento(id: string, data: Partial<TipoEvento>): Promise<void> {
  requireDb("modificarTipoEvento");
  await updateDoc(doc(db!, "tiposEvento", id), { ...data, updatedAt: serverTimestamp() });
}
export async function eliminarTipoEvento(id: string): Promise<void> { return modificarTipoEvento(id, { active: false }); }

export async function registrarVacuna(data: Omit<VacunaParametro, "id" | "createdAt">, createdBy: string): Promise<VacunaParametro> {
  requireDb("registrarVacuna");
  const payload = { ...data, descripcion: data.descripcion ?? "", createdBy, active: true, createdAt: serverTimestamp() };
  const ref = await addDoc(collection(db!, "arbolVacunacion"), payload);
  return { id: ref.id, ...data, active: true, createdAt: new Date(), createdBy };
}
export async function modificarVacuna(id: string, data: Partial<VacunaParametro>): Promise<void> {
  requireDb("modificarVacuna");
  await updateDoc(doc(db!, "arbolVacunacion", id), { ...data, updatedAt: serverTimestamp() });
}
export async function eliminarVacuna(id: string): Promise<void> { return modificarVacuna(id, { active: false }); }
