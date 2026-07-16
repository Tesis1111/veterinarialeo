/**
 * mascotaService.ts — Gestión de Mascotas
 * Fuente de datos: exclusivamente Firebase Firestore.
 */
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { Pet, PetFormData, FormValidationResult } from "../types";
import { audit } from "./auditoriaService";

const COL = "mascotas";

function toPet(id: string, data: Record<string, any>): Pet {
  return {
    id,
    name: data.name ?? "",
    breedId: data.breedId ?? "",
    sex: data.sex ?? "Desconocido",
    birthDate: (data.birthDate as Timestamp)?.toDate(),
    color: data.color,
    observations: data.observations,
    imageUrl: data.imageUrl,
    clientId: data.clientId ?? "",
    deceased: data.deceased ?? false,
    deceasedDate: (data.deceasedDate as Timestamp)?.toDate(),
    deceasedReason: data.deceasedReason,
    deceasedNotes: data.deceasedNotes,
    ownershipHistory: data.ownershipHistory ?? [],
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    createdBy: data.createdBy ?? "",
    updatedAt: (data.updatedAt as Timestamp)?.toDate(),
    updatedBy: data.updatedBy,
    deleted: data.deleted ?? false,
    deletedAt: (data.deletedAt as Timestamp)?.toDate(),
    deletedBy: data.deletedBy,
  };
}

function requireDb(op: string) {
  if (!db) throw new Error(`[mascotaService] Firebase no configurado. Operación: ${op}`);
}

export function validarDatos(data: PetFormData): FormValidationResult {
  const errors = [];
  if (!data.name?.trim()) errors.push({ field: "name", message: "El nombre de la mascota es obligatorio." });
  if (!data.clientId?.trim()) errors.push({ field: "clientId", message: "Debe asociar la mascota a un cliente." });
  if (!data.sex) errors.push({ field: "sex", message: "El sexo es obligatorio." });
  return { valid: errors.length === 0, errors };
}

export async function ValidarUnicidadMascota(name: string, clientId: string, excludeId?: string): Promise<boolean> {
  requireDb("ValidarUnicidadMascota");
  const snap = await getDocs(query(collection(db!, COL), where("name", "==", name), where("clientId", "==", clientId)));
  return snap.docs.every((d) => d.id === excludeId || d.data().deleted === true);
}

export async function registrarMascota(data: PetFormData, createdBy: string): Promise<Pet> {
  requireDb("registrarMascota");
  const payload = { ...data, deceased: false, deleted: false, createdBy, createdAt: serverTimestamp() };
  const ref = await addDoc(collection(db!, COL), payload);
  await audit({
    action: "CREATE", module: "pets", entityType: "mascota", entityId: ref.id,
    details: `Registró la mascota "${data.name}"`, newValues: { ...data },
  });
  return { id: ref.id, ...data, deceased: false, deleted: false, createdBy, createdAt: new Date() };
}

export async function modificarMascota(id: string, data: Partial<PetFormData>, updatedBy: string): Promise<Pet> {
  requireDb("modificarMascota");
  const ref = doc(db!, COL, id);
  await updateDoc(ref, { ...data, updatedBy, updatedAt: serverTimestamp() });
  const snap = await getDoc(ref);
  const updated = toPet(id, snap.data() as Record<string, any>);
  await audit({
    action: "UPDATE", module: "pets", entityType: "mascota", entityId: id,
    details: `Modificó la mascota "${updated.name}"`, newValues: { ...data },
  });
  return updated;
}

export async function marcarFallecida(id: string, reason: string, notes: string, updatedBy: string): Promise<Pet> {
  requireDb("marcarFallecida");
  await updateDoc(doc(db!, COL, id), {
    deceased: true, deceasedDate: serverTimestamp(),
    deceasedReason: reason, deceasedNotes: notes, updatedBy, updatedAt: serverTimestamp(),
  });
  const snap = await getDoc(doc(db!, COL, id));
  const updated = toPet(id, snap.data() as Record<string, any>);
  await audit({
    action: "UPDATE", module: "pets", entityType: "mascota", entityId: id,
    details: `Marcó como fallecida la mascota "${updated.name}"`,
    newValues: { deceased: true, deceasedReason: reason },
  });
  return updated;
}

/** Baja lógica (soft-delete): la mascota queda en la base pero oculta por defecto. Reversible. */
export async function eliminarMascota(id: string, deletedBy: string): Promise<void> {
  requireDb("eliminarMascota");
  await updateDoc(doc(db!, COL, id), { deleted: true, deletedBy, deletedAt: serverTimestamp() });
  await audit({
    action: "DELETE", module: "pets", entityType: "mascota", entityId: id,
    details: `Dio de baja (lógica) la mascota ${id}`,
  });
}

/** Reactiva una mascota dada de baja (deshace el soft-delete). */
export async function reactivarMascota(id: string, updatedBy: string): Promise<void> {
  requireDb("reactivarMascota");
  await updateDoc(doc(db!, COL, id), { deleted: false, updatedBy, updatedAt: serverTimestamp() });
  await audit({
    action: "UPDATE", module: "pets", entityType: "mascota", entityId: id,
    details: `Reactivó la mascota ${id}`,
  });
}

/** Borrado FÍSICO: elimina el documento de Firestore de forma permanente e irreversible. */
export async function eliminarMascotaFisica(id: string): Promise<void> {
  requireDb("eliminarMascotaFisica");
  await deleteDoc(doc(db!, COL, id));
  await audit({
    action: "DELETE", module: "pets", entityType: "mascota", entityId: id,
    details: `Eliminó FÍSICAMENTE la mascota ${id}`,
  });
}

export async function traerMascotas(clientId?: string): Promise<Pet[]> {
  requireDb("traerMascotas");
  // Fetch all and filter client-side to avoid composite index issues
  const snap = await getDocs(collection(db!, COL));
  const all = snap.docs.map((d) => toPet(d.id, d.data())).filter(p => !p.deleted);
  return clientId ? all.filter(p => p.clientId === clientId) : all;
}

export async function traerMascotaPorId(id: string): Promise<Pet | null> {
  requireDb("traerMascotaPorId");
  const snap = await getDoc(doc(db!, COL, id));
  return snap.exists() ? toPet(snap.id, snap.data()) : null;
}
