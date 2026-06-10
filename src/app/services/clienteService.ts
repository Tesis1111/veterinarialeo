/**
 * Módulo Clientes — Capa de Servicios
 *
 * Gestores implementados:
 *   • Gestor Alta Cliente    — validarDatos(), ValidarUnicidadCliente(), registrarCliente()
 *   • Gestor Modificar Cliente — validarDatos(), asociarCliente()
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
import { Client, ClientFormData, FormValidationResult } from "../types";

const COL = "clientes";

// ── Firestore ↔ App model conversions ─────────────────────────────────────

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

// ── localStorage fallback helpers ─────────────────────────────────────────

const LS_KEY = "veterinaria_clients";

function lsLoad(): Client[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function lsSave(clients: Client[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(clients));
}

// ─────────────────────────────────────────────────────────────────────────
// Gestor Alta Cliente
// ─────────────────────────────────────────────────────────────────────────

/** Valida los campos obligatorios del formulario de cliente. */
export function validarDatos(data: ClientFormData): FormValidationResult {
  const errors = [];

  if (!data.fullName?.trim()) {
    errors.push({ field: "fullName", message: "El nombre completo es obligatorio." });
  }
  if (!data.dniCuit?.trim()) {
    errors.push({ field: "dniCuit", message: "El DNI/CUIT es obligatorio." });
  } else if (!/^[\d\-\.]{7,13}$/.test(data.dniCuit.replace(/\s/g, ""))) {
    errors.push({ field: "dniCuit", message: "El DNI/CUIT tiene un formato inválido." });
  }
  if (!data.phone?.trim()) {
    errors.push({ field: "phone", message: "El teléfono es obligatorio." });
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push({ field: "email", message: "El email no tiene un formato válido." });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Verifica que no exista otro cliente activo con el mismo DNI/CUIT.
 * Returns true if the DNI/CUIT is unique (no conflict).
 */
export async function ValidarUnicidadCliente(dniCuit: string, excludeId?: string): Promise<boolean> {
  if (FIREBASE_CONFIGURED && db) {
    const q = query(
      collection(db, COL),
      where("dniCuit", "==", dniCuit),
      where("deleted", "==", false)
    );
    const snap = await getDocs(q);
    return snap.docs.every((d) => d.id === excludeId);
  }

  const clients = lsLoad();
  return !clients.some(
    (c) => c.dniCuit === dniCuit && !c.deleted && c.id !== excludeId
  );
}

/** Persiste un nuevo cliente en Firestore (o localStorage como fallback). */
export async function registrarCliente(
  data: ClientFormData,
  createdBy: string
): Promise<Client> {
  if (FIREBASE_CONFIGURED && db) {
    const payload = {
      ...data,
      deleted: false,
      createdBy,
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, COL), payload);
    return { id: ref.id, ...data, deleted: false, createdBy, createdAt: new Date() };
  }

  const clients = lsLoad();
  const newClient: Client = {
    id: Date.now().toString(),
    ...data,
    deleted: false,
    createdBy,
    createdAt: new Date(),
  };
  lsSave([...clients, newClient]);
  return newClient;
}

// ─────────────────────────────────────────────────────────────────────────
// Gestor Modificar Cliente
// ─────────────────────────────────────────────────────────────────────────

/** Actualiza los datos de un cliente existente. */
export async function asociarCliente(
  id: string,
  data: Partial<ClientFormData>,
  updatedBy: string
): Promise<Client> {
  if (FIREBASE_CONFIGURED && db) {
    const ref = doc(db, COL, id);
    await updateDoc(ref, { ...data, updatedBy, updatedAt: serverTimestamp() });
    const snap = await getDoc(ref);
    return toClient(id, snap.data() as Record<string, any>);
  }

  const clients = lsLoad();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error(`Cliente ${id} no encontrado`);
  const updated: Client = { ...clients[idx], ...data, updatedBy, updatedAt: new Date() };
  clients[idx] = updated;
  lsSave(clients);
  return updated;
}

/** Soft-delete de cliente. */
export async function eliminarCliente(id: string, deletedBy: string): Promise<void> {
  if (FIREBASE_CONFIGURED && db) {
    await updateDoc(doc(db, COL, id), {
      deleted: true,
      deletedBy,
      deletedAt: serverTimestamp(),
    });
    return;
  }

  const clients = lsLoad();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx !== -1) {
    clients[idx] = { ...clients[idx], deleted: true, deletedBy, deletedAt: new Date() };
    lsSave(clients);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Lecturas
// ─────────────────────────────────────────────────────────────────────────

export async function traerClientes(includeDeleted = false): Promise<Client[]> {
  if (FIREBASE_CONFIGURED && db) {
    const q = includeDeleted
      ? query(collection(db, COL), orderBy("fullName"))
      : query(collection(db, COL), where("deleted", "==", false), orderBy("fullName"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => toClient(d.id, d.data()));
  }

  const clients = lsLoad();
  return includeDeleted ? clients : clients.filter((c) => !c.deleted);
}

export async function traerClientePorId(id: string): Promise<Client | null> {
  if (FIREBASE_CONFIGURED && db) {
    const snap = await getDoc(doc(db, COL, id));
    return snap.exists() ? toClient(snap.id, snap.data()) : null;
  }

  return lsLoad().find((c) => c.id === id) ?? null;
}
