/**
 * Módulo Mascotas — Capa de Servicios
 *
 * Gestores implementados:
 *   • Gestor Alta Mascota — validarDatos(), ValidarUnicidadMascota(), registrarMascota()
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
import { Pet, PetFormData, FormValidationResult } from "../types";

const COL = "mascotas";

// ── Conversión ─────────────────────────────────────────────────────────────

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

// ── localStorage fallback ─────────────────────────────────────────────────

const LS_KEY = "veterinaria_pets";

function lsLoad(): Pet[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function lsSave(pets: Pet[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(pets));
}

// ─────────────────────────────────────────────────────────────────────────
// Gestor Alta Mascota
// ─────────────────────────────────────────────────────────────────────────

/** Valida los campos obligatorios del formulario de mascota. */
export function validarDatos(data: PetFormData): FormValidationResult {
  const errors = [];

  if (!data.name?.trim()) {
    errors.push({ field: "name", message: "El nombre de la mascota es obligatorio." });
  }
  if (!data.breedId?.trim()) {
    errors.push({ field: "breedId", message: "La raza es obligatoria." });
  }
  if (!data.clientId?.trim()) {
    errors.push({ field: "clientId", message: "Debe asociar la mascota a un cliente." });
  }
  if (!data.sex) {
    errors.push({ field: "sex", message: "El sexo es obligatorio." });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Verifica que no exista otra mascota activa con el mismo nombre para el mismo cliente.
 * Returns true if the name is unique for that client.
 */
export async function ValidarUnicidadMascota(
  name: string,
  clientId: string,
  excludeId?: string
): Promise<boolean> {
  if (FIREBASE_CONFIGURED && db) {
    const q = query(
      collection(db, COL),
      where("name", "==", name),
      where("clientId", "==", clientId),
      where("deleted", "==", false)
    );
    const snap = await getDocs(q);
    return snap.docs.every((d) => d.id === excludeId);
  }

  const pets = lsLoad();
  return !pets.some(
    (p) =>
      p.name.toLowerCase() === name.toLowerCase() &&
      p.clientId === clientId &&
      !p.deleted &&
      p.id !== excludeId
  );
}

/** Persiste una nueva mascota en Firestore (o localStorage). */
export async function registrarMascota(
  data: PetFormData,
  createdBy: string
): Promise<Pet> {
  if (FIREBASE_CONFIGURED && db) {
    const payload = {
      ...data,
      deceased: false,
      deleted: false,
      createdBy,
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, COL), payload);
    return {
      id: ref.id,
      ...data,
      deceased: false,
      deleted: false,
      createdBy,
      createdAt: new Date(),
    };
  }

  const pets = lsLoad();
  const newPet: Pet = {
    id: Date.now().toString(),
    ...data,
    deceased: false,
    deleted: false,
    createdBy,
    createdAt: new Date(),
  };
  lsSave([...pets, newPet]);
  return newPet;
}

// ─────────────────────────────────────────────────────────────────────────
// Gestor Modificar Mascota
// ─────────────────────────────────────────────────────────────────────────

export async function modificarMascota(
  id: string,
  data: Partial<PetFormData>,
  updatedBy: string
): Promise<Pet> {
  if (FIREBASE_CONFIGURED && db) {
    const ref = doc(db, COL, id);
    await updateDoc(ref, { ...data, updatedBy, updatedAt: serverTimestamp() });
    const snap = await getDoc(ref);
    return toPet(id, snap.data() as Record<string, any>);
  }

  const pets = lsLoad();
  const idx = pets.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Mascota ${id} no encontrada`);
  const updated: Pet = { ...pets[idx], ...data, updatedBy, updatedAt: new Date() };
  pets[idx] = updated;
  lsSave(pets);
  return updated;
}

/** Marca una mascota como fallecida. */
export async function marcarFallecida(
  id: string,
  reason: string,
  notes: string,
  updatedBy: string
): Promise<Pet> {
  if (FIREBASE_CONFIGURED && db) {
    await updateDoc(doc(db, COL, id), {
      deceased: true,
      deceasedDate: serverTimestamp(),
      deceasedReason: reason,
      deceasedNotes: notes,
      updatedBy,
      updatedAt: serverTimestamp(),
    });
    const snap = await getDoc(doc(db, COL, id));
    return toPet(id, snap.data() as Record<string, any>);
  }

  const pets = lsLoad();
  const idx = pets.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Mascota ${id} no encontrada`);
  const updated: Pet = {
    ...pets[idx],
    deceased: true,
    deceasedDate: new Date(),
    deceasedReason: reason,
    deceasedNotes: notes,
    updatedBy,
    updatedAt: new Date(),
  };
  pets[idx] = updated;
  lsSave(pets);
  return updated;
}

/** Soft-delete de mascota. */
export async function eliminarMascota(id: string, deletedBy: string): Promise<void> {
  if (FIREBASE_CONFIGURED && db) {
    await updateDoc(doc(db, COL, id), {
      deleted: true,
      deletedBy,
      deletedAt: serverTimestamp(),
    });
    return;
  }

  const pets = lsLoad();
  const idx = pets.findIndex((p) => p.id === id);
  if (idx !== -1) {
    pets[idx] = { ...pets[idx], deleted: true, deletedBy, deletedAt: new Date() };
    lsSave(pets);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Lecturas
// ─────────────────────────────────────────────────────────────────────────

export async function traerMascotas(clientId?: string): Promise<Pet[]> {
  if (FIREBASE_CONFIGURED && db) {
    const constraints: Parameters<typeof query>[1][] = [where("deleted", "==", false)];
    if (clientId) constraints.push(where("clientId", "==", clientId));
    constraints.push(orderBy("name"));
    const snap = await getDocs(query(collection(db, COL), ...constraints));
    return snap.docs.map((d) => toPet(d.id, d.data()));
  }

  const pets = lsLoad().filter((p) => !p.deleted);
  return clientId ? pets.filter((p) => p.clientId === clientId) : pets;
}

export async function traerMascotaPorId(id: string): Promise<Pet | null> {
  if (FIREBASE_CONFIGURED && db) {
    const snap = await getDoc(doc(db, COL, id));
    return snap.exists() ? toPet(snap.id, snap.data()) : null;
  }

  return lsLoad().find((p) => p.id === id) ?? null;
}
