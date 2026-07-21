/**
 * cascadeHelpers.ts — Borrados/cancelaciones en cascada con writeBatch.
 *
 * Firestore no tiene integridad referencial: al dar de baja un cliente o una
 * mascota hay que propagar el cambio a mascotas/turnos/historiales/slots en la
 * misma operación, o quedan documentos huérfanos. Estas utilidades arman las
 * operaciones y las commitean en lotes de hasta 400 escrituras.
 */
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
  DocumentReference,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { slotIdFor, toDateStr } from "./turnoService";

const BATCH_LIMIT = 400;

export type BatchOp =
  | { type: "update"; ref: DocumentReference; data: Record<string, any> }
  | { type: "delete"; ref: DocumentReference };

/** Commitea las operaciones en lotes atómicos de hasta 400 escrituras. */
export async function commitInChunks(ops: BatchOp[]): Promise<void> {
  for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db!);
    for (const op of ops.slice(i, i + BATCH_LIMIT)) {
      if (op.type === "update") batch.update(op.ref, op.data);
      else batch.delete(op.ref);
    }
    await batch.commit();
  }
}

async function docsWhere(col: string, field: string, value: string): Promise<QueryDocumentSnapshot[]> {
  const snap = await getDocs(query(collection(db!, col), where(field, "==", value)));
  return snap.docs;
}

const VIGENTES = ["Programado", "Confirmado"];

function slotRefOf(turno: DocumentSnapshot): DocumentReference | null {
  const t = turno.data() as Record<string, any>;
  if (!t?.doctorId || !t?.startTime || t?.type === "daycare") return null;
  const date: Date = (t.date as Timestamp)?.toDate?.() ?? new Date(t.date);
  if (isNaN(date.getTime())) return null;
  return doc(db!, "slots", slotIdFor(t.doctorId, toDateStr(date), t.startTime));
}

/** Ops para cancelar los turnos vigentes de los docs dados (libera sus slots). */
function opsCancelarTurnos(turnos: QueryDocumentSnapshot[], updatedBy: string, motivo: string): BatchOp[] {
  const ops: BatchOp[] = [];
  for (const t of turnos) {
    const status = (t.data() as any).status ?? "";
    if (!VIGENTES.includes(status)) continue;
    ops.push({
      type: "update",
      ref: t.ref,
      data: {
        status: "Cancelado",
        cancellationReason: motivo,
        cancelledAt: serverTimestamp(),
        updatedBy,
        updatedAt: serverTimestamp(),
      },
    });
    const slotRef = slotRefOf(t);
    if (slotRef) ops.push({ type: "delete", ref: slotRef });
  }
  return ops;
}

/** Ops para borrar físicamente turnos (y sus slots si estaban vigentes). */
function opsBorrarTurnos(turnos: QueryDocumentSnapshot[]): BatchOp[] {
  const ops: BatchOp[] = [];
  for (const t of turnos) {
    ops.push({ type: "delete", ref: t.ref });
    if (VIGENTES.includes((t.data() as any).status ?? "")) {
      const slotRef = slotRefOf(t);
      if (slotRef) ops.push({ type: "delete", ref: slotRef });
    }
  }
  return ops;
}

export interface DependenciasCliente {
  mascotas: number;
  turnosVigentes: number;
  historiales: number;
}

/** Cuenta mascotas, turnos vigentes e historiales asociados a un cliente. */
export async function contarDependenciasCliente(clientId: string): Promise<DependenciasCliente> {
  const [mascotas, turnos] = await Promise.all([
    docsWhere("mascotas", "clientId", clientId),
    docsWhere("turnos", "clientId", clientId),
  ]);
  const petIds = mascotas.map((m) => m.id);
  const historiales = (
    await Promise.all(petIds.map((pid) => docsWhere("historiales", "petId", pid)))
  ).flat();
  return {
    mascotas: mascotas.filter((m) => !(m.data() as any).deleted).length,
    turnosVigentes: turnos.filter((t) => VIGENTES.includes((t.data() as any).status ?? "")).length,
    historiales: historiales.length,
  };
}

/** Cuenta turnos vigentes e historiales asociados a una mascota. */
export async function contarDependenciasMascota(petId: string): Promise<{ turnosVigentes: number; historiales: number }> {
  const [turnos, historiales] = await Promise.all([
    docsWhere("turnos", "petId", petId),
    docsWhere("historiales", "petId", petId),
  ]);
  return {
    turnosVigentes: turnos.filter((t) => VIGENTES.includes((t.data() as any).status ?? "")).length,
    historiales: historiales.length,
  };
}

/**
 * Cascada del soft-delete de cliente: marca deleted a sus mascotas y cancela
 * sus turnos vigentes (liberando slots). Devuelve las ops SIN incluir al
 * cliente mismo — el caller agrega su propio update y commitea todo junto.
 */
export async function opsCascadaSoftCliente(clientId: string, deletedBy: string): Promise<BatchOp[]> {
  const [mascotas, turnos] = await Promise.all([
    docsWhere("mascotas", "clientId", clientId),
    docsWhere("turnos", "clientId", clientId),
  ]);
  const ops: BatchOp[] = mascotas
    .filter((m) => !(m.data() as any).deleted)
    .map((m) => ({
      type: "update" as const,
      ref: m.ref,
      data: { deleted: true, deletedBy, deletedAt: serverTimestamp() },
    }));
  ops.push(...opsCancelarTurnos(turnos, deletedBy, "Cliente dado de baja"));
  return ops;
}

/** Cascada del borrado FÍSICO de cliente: mascotas, historiales, turnos y slots. */
export async function opsCascadaFisicaCliente(clientId: string): Promise<BatchOp[]> {
  const [mascotas, turnos] = await Promise.all([
    docsWhere("mascotas", "clientId", clientId),
    docsWhere("turnos", "clientId", clientId),
  ]);
  const historiales = (
    await Promise.all(mascotas.map((m) => docsWhere("historiales", "petId", m.id)))
  ).flat();

  const ops: BatchOp[] = [];
  ops.push(...historiales.map((h) => ({ type: "delete" as const, ref: h.ref })));
  ops.push(...opsBorrarTurnos(turnos));
  ops.push(...mascotas.map((m) => ({ type: "delete" as const, ref: m.ref })));
  return ops;
}

/** Cascada del soft-delete de mascota: cancela sus turnos vigentes. */
export async function opsCascadaSoftMascota(petId: string, deletedBy: string): Promise<BatchOp[]> {
  const turnos = await docsWhere("turnos", "petId", petId);
  return opsCancelarTurnos(turnos, deletedBy, "Mascota dada de baja");
}

/** Cascada del borrado FÍSICO de mascota: historiales, turnos y slots. */
export async function opsCascadaFisicaMascota(petId: string): Promise<BatchOp[]> {
  const [turnos, historiales] = await Promise.all([
    docsWhere("turnos", "petId", petId),
    docsWhere("historiales", "petId", petId),
  ]);
  const ops: BatchOp[] = [];
  ops.push(...historiales.map((h) => ({ type: "delete" as const, ref: h.ref })));
  ops.push(...opsBorrarTurnos(turnos));
  return ops;
}
