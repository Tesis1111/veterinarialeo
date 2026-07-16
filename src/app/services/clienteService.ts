/**
 * clienteService.ts — Gestión de Clientes
 * Fuente de datos: exclusivamente Firebase Firestore.
 * No hay fallback a localStorage ni datos estáticos.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { Client, ClientFormData, FormValidationResult } from "../types";
import { audit } from "./auditoriaService";

const COL = "clientes";

function toClient(id: string, data: Record<string, any>): Client {
  return {
    id,
    fullName: data.fullName ?? "",
    dniCuit: data.dniCuit ?? "",
    phone: data.phone ?? "",
    address: data.address,
    email: data.email,
    observations: data.observations,
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
  if (!db) throw new Error(`[clienteService] Firebase no configurado. Operación: ${op}`);
}

export function validarDatos(data: ClientFormData): FormValidationResult {
  const errors = [];
  if (!data.fullName?.trim()) errors.push({ field: "fullName", message: "El nombre completo es obligatorio." });
  if (!data.dniCuit?.trim()) {
    errors.push({ field: "dniCuit", message: "El DNI/CUIT es obligatorio." });
  } else if (!/^[\d\-\.]{7,13}$/.test(data.dniCuit.replace(/\s/g, ""))) {
    errors.push({ field: "dniCuit", message: "El DNI/CUIT tiene un formato inválido." });
  }
  if (!data.phone?.trim()) errors.push({ field: "phone", message: "El teléfono es obligatorio." });
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push({ field: "email", message: "El email no tiene un formato válido." });
  }
  return { valid: errors.length === 0, errors };
}

export async function ValidarUnicidadCliente(dniCuit: string, excludeId?: string): Promise<boolean> {
  requireDb("ValidarUnicidadCliente");
  // Filter client-side to avoid composite index requirement
  const snap = await getDocs(query(collection(db!, COL), where("dniCuit", "==", dniCuit)));
  return snap.docs.every((d) => d.id === excludeId || d.data().deleted === true);
}

export async function registrarCliente(data: ClientFormData, createdBy: string): Promise<Client> {
  requireDb("registrarCliente");
  const payload = { ...data, deleted: false, createdBy, createdAt: serverTimestamp() };
  const ref = await addDoc(collection(db!, COL), payload);
  await audit({
    action: "CREATE", module: "clients", entityType: "cliente", entityId: ref.id,
    details: `Registró al cliente "${data.fullName}"`, newValues: { ...data },
  });
  return { id: ref.id, ...data, deleted: false, createdBy, createdAt: new Date() };
}

export async function asociarCliente(id: string, data: Partial<ClientFormData>, updatedBy: string): Promise<Client> {
  requireDb("asociarCliente");
  const ref = doc(db!, COL, id);
  await updateDoc(ref, { ...data, updatedBy, updatedAt: serverTimestamp() });
  const snap = await getDoc(ref);
  const updated = toClient(id, snap.data() as Record<string, any>);
  await audit({
    action: "UPDATE", module: "clients", entityType: "cliente", entityId: id,
    details: `Modificó al cliente "${updated.fullName}"`, newValues: { ...data },
  });
  return updated;
}

/** Baja lógica (soft-delete): el cliente queda en la base pero oculto por defecto. Reversible. */
export async function eliminarCliente(id: string, deletedBy: string): Promise<void> {
  requireDb("eliminarCliente");
  await updateDoc(doc(db!, COL, id), { deleted: true, deletedBy, deletedAt: serverTimestamp() });
  await audit({
    action: "DELETE", module: "clients", entityType: "cliente", entityId: id,
    details: `Dio de baja (lógica) al cliente ${id}`,
  });
}

/** Reactiva un cliente dado de baja (deshace el soft-delete). */
export async function reactivarCliente(id: string, updatedBy: string): Promise<void> {
  requireDb("reactivarCliente");
  await updateDoc(doc(db!, COL, id), { deleted: false, updatedBy, updatedAt: serverTimestamp() });
  await audit({
    action: "UPDATE", module: "clients", entityType: "cliente", entityId: id,
    details: `Reactivó al cliente ${id}`,
  });
}

/** Borrado FÍSICO: elimina el documento de Firestore de forma permanente e irreversible. */
export async function eliminarClienteFisico(id: string): Promise<void> {
  requireDb("eliminarClienteFisico");
  await deleteDoc(doc(db!, COL, id));
  await audit({
    action: "DELETE", module: "clients", entityType: "cliente", entityId: id,
    details: `Eliminó FÍSICAMENTE al cliente ${id}`,
  });
}

export async function traerClientes(includeDeleted = false): Promise<Client[]> {
  requireDb("traerClientes");
  // Fetch all and filter client-side to avoid composite index issues
  const snap = await getDocs(collection(db!, COL));
  const all = snap.docs.map((d) => toClient(d.id, d.data()));
  return includeDeleted ? all : all.filter(c => !c.deleted);
}

export async function traerClientePorId(id: string): Promise<Client | null> {
  requireDb("traerClientePorId");
  const snap = await getDoc(doc(db!, COL, id));
  return snap.exists() ? toClient(snap.id, snap.data()) : null;
}
