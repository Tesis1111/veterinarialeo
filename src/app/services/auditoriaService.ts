/**
 * Módulo Auditoría — Capa de Servicios
 *
 * Gestores implementados:
 *   • Gestor Auditoria — traerAuditoria(), exportarCSV(), registrarAuditoria()
 */
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db, FIREBASE_CONFIGURED } from "../firebase/config";
import { AuditLog } from "../types";

const COL = "auditoria";
const LS_KEY = "veterinaria_audit_logs";

// ── Conversion ──────────────────────────────────────────────────────────────

function toLog(id: string, data: Record<string, any>): AuditLog {
  return {
    id,
    userId: data.userId ?? "",
    userName: data.userName ?? "",
    userRole: data.userRole ?? "",
    action: data.action ?? "VIEW",
    module: data.module ?? "system",
    entityType: data.entityType,
    entityId: data.entityId,
    oldValues: data.oldValues,
    newValues: data.newValues,
    details: data.details,
    ipAddress: data.ipAddress ?? "127.0.0.1",
    userAgent: data.userAgent,
    sessionId: data.sessionId,
    timestamp: (data.timestamp as Timestamp)?.toDate() ?? new Date(),
  };
}

// ── localStorage fallback ───────────────────────────────────────────────────

function lsLoad(): AuditLog[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function lsSave(logs: AuditLog[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(logs.slice(0, 1000)));
}

// ─────────────────────────────────────────────────────────────────────────
// Gestor Auditoria
// ─────────────────────────────────────────────────────────────────────────

/** Registra un evento de auditoría en Firestore o localStorage. */
export async function registrarAuditoria(
  log: Omit<AuditLog, "id" | "timestamp">
): Promise<AuditLog> {
  if (FIREBASE_CONFIGURED && db) {
    const payload = { ...log, timestamp: serverTimestamp() };
    const ref = await addDoc(collection(db, COL), payload);
    return { id: ref.id, ...log, timestamp: new Date() };
  }

  const newLog: AuditLog = {
    id: Date.now().toString(),
    ...log,
    timestamp: new Date(),
  };
  const existing = lsLoad();
  lsSave([newLog, ...existing]);
  return newLog;
}

/** Recupera los últimos registros de auditoría. */
export async function traerAuditoria(maxRecords = 500): Promise<AuditLog[]> {
  if (FIREBASE_CONFIGURED && db) {
    const q = query(
      collection(db, COL),
      orderBy("timestamp", "desc"),
      limit(maxRecords)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toLog(d.id, d.data()));
  }

  return lsLoad().slice(0, maxRecords);
}

/** Recupera registros filtrados por módulo. */
export async function traerAuditoriaPorModulo(module: string): Promise<AuditLog[]> {
  if (FIREBASE_CONFIGURED && db) {
    const q = query(
      collection(db, COL),
      where("module", "==", module),
      orderBy("timestamp", "desc"),
      limit(200)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toLog(d.id, d.data()));
  }

  return lsLoad().filter((l) => l.module === module);
}

/** Recupera registros de un usuario específico. */
export async function traerAuditoriaPorUsuario(userId: string): Promise<AuditLog[]> {
  if (FIREBASE_CONFIGURED && db) {
    const q = query(
      collection(db, COL),
      where("userId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(200)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toLog(d.id, d.data()));
  }

  return lsLoad().filter((l) => l.userId === userId);
}

/** Exporta registros de auditoría como CSV y descarga el archivo. */
export function exportarCSV(logs: AuditLog[], filename = "auditoria.csv"): void {
  const headers = [
    "ID", "Fecha/Hora", "Usuario", "Rol", "Acción", "Módulo", "Detalles", "IP",
  ];

  const rows = logs.map((l) => [
    l.id,
    new Date(l.timestamp).toLocaleString("es-AR"),
    l.userName,
    l.userRole,
    l.action,
    l.module,
    `"${(l.details ?? "").replace(/"/g, '""')}"`,
    l.ipAddress ?? "",
  ]);

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
