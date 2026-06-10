/**
 * Módulo Atención Clínica — Capa de Servicios
 *
 * Gestores implementados:
 *   • Gestor Alta Historial   — validarTamañoFormato(), registrarHistorial(), guardarArchivo()
 *   • Gestor Listar Historial — traerHistorial(), exportarCSV()
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
import {
  MedicalRecord,
  MedicalRecordFormData,
  MedicalAttachment,
  FormValidationResult,
} from "../types";

const COL = "historiales";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "application/pdf", "text/plain"];
const MAX_FILE_SIZE_MB = 5;

// ── Conversion ──────────────────────────────────────────────────────────────

function toRecord(id: string, data: Record<string, any>): MedicalRecord {
  return {
    id,
    petId: data.petId ?? "",
    professionalId: data.professionalId ?? "",
    serviceId: data.serviceId,
    date: (data.date as Timestamp)?.toDate() ?? new Date(),
    eventType: data.eventType ?? "Consulta",
    description: data.description ?? "",
    weight: data.weight,
    temperature: data.temperature,
    heartRate: data.heartRate,
    respiratoryRate: data.respiratoryRate,
    diagnosis: data.diagnosis,
    treatment: data.treatment,
    medication: data.medication,
    nextAppointmentDate: (data.nextAppointmentDate as Timestamp)?.toDate(),
    notes: data.notes,
    clientIdAtTime: data.clientIdAtTime,
    clientNameAtTime: data.clientNameAtTime,
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    createdBy: data.createdBy ?? "",
    updatedAt: (data.updatedAt as Timestamp)?.toDate(),
    updatedBy: data.updatedBy,
    deleted: data.deleted ?? false,
    deletedAt: (data.deletedAt as Timestamp)?.toDate(),
    deletedBy: data.deletedBy,
    attachments: data.attachments ?? [],
  };
}

// ── localStorage fallback ───────────────────────────────────────────────────

const LS_KEY = "veterinaria_medical_records";

function lsLoad(): MedicalRecord[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function lsSave(records: MedicalRecord[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(records));
}

// ─────────────────────────────────────────────────────────────────────────
// Gestor Alta Historial
// ─────────────────────────────────────────────────────────────────────────

/** Valida tipo y tamaño de archivos adjuntos. */
export function validarTamañoFormato(file: File): FormValidationResult {
  const errors = [];

  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push({
      field: "file",
      message: `Tipo de archivo no permitido: ${file.type}. Permitidos: JPG, PNG, GIF, PDF, TXT.`,
    });
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    errors.push({
      field: "file",
      message: `El archivo supera el límite de ${MAX_FILE_SIZE_MB} MB.`,
    });
  }

  return { valid: errors.length === 0, errors };
}

/** Persiste un nuevo registro de historial clínico. */
export async function registrarHistorial(
  data: MedicalRecordFormData,
  createdBy: string,
  clientIdAtTime?: string,
  clientNameAtTime?: string,
  attachments: MedicalAttachment[] = []
): Promise<MedicalRecord> {
  const payload = {
    ...data,
    date: data.date ? new Date(data.date) : new Date(),
    nextAppointmentDate: data.nextAppointmentDate ? new Date(data.nextAppointmentDate) : undefined,
    clientIdAtTime,
    clientNameAtTime,
    attachments,
    deleted: false,
    createdBy,
    createdAt: FIREBASE_CONFIGURED ? serverTimestamp() : new Date(),
  };

  if (FIREBASE_CONFIGURED && db) {
    const ref = await addDoc(collection(db, COL), payload);
    return { id: ref.id, ...payload, createdAt: new Date() } as MedicalRecord;
  }

  const records = lsLoad();
  const newRecord: MedicalRecord = {
    id: Date.now().toString(),
    ...data,
    date: data.date ? new Date(data.date) : new Date(),
    nextAppointmentDate: data.nextAppointmentDate ? new Date(data.nextAppointmentDate) : undefined,
    clientIdAtTime,
    clientNameAtTime,
    attachments,
    deleted: false,
    createdBy,
    createdAt: new Date(),
  };
  lsSave([...records, newRecord]);
  return newRecord;
}

/**
 * Guarda un archivo adjunto: lee como base64 y lo almacena en el registro.
 * En producción con Firebase Storage, subiría el archivo y devolvería la URL.
 */
export async function guardarArchivo(
  file: File,
  recordId: string,
  uploadedBy: string
): Promise<MedicalAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const attachment: MedicalAttachment = {
        id: Date.now().toString(),
        medicalRecordId: recordId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl: e.target?.result as string, // base64 DataURL
        uploadedAt: new Date(),
        uploadedBy,
        deleted: false,
      };

      // Patch the record in Firestore with the new attachment
      if (FIREBASE_CONFIGURED && db) {
        const { arrayUnion } = await import("firebase/firestore");
        await updateDoc(doc(db, COL, recordId), {
          attachments: arrayUnion(attachment),
        });
      } else {
        // Patch in localStorage
        const records = lsLoad();
        const idx = records.findIndex((r) => r.id === recordId);
        if (idx !== -1) {
          records[idx].attachments = [...(records[idx].attachments ?? []), attachment];
          lsSave(records);
        }
      }

      resolve(attachment);
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo"));
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Gestor Listar Historial
// ─────────────────────────────────────────────────────────────────────────

/** Trae el historial clínico de una mascota, ordenado por fecha descendente. */
export async function traerHistorial(petId: string): Promise<MedicalRecord[]> {
  if (FIREBASE_CONFIGURED && db) {
    const q = query(
      collection(db, COL),
      where("petId", "==", petId),
      where("deleted", "==", false),
      orderBy("date", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toRecord(d.id, d.data()));
  }

  return lsLoad()
    .filter((r) => r.petId === petId && !r.deleted)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** Trae todos los registros (para reportes/auditoría). */
export async function traerTodosLosHistoriales(): Promise<MedicalRecord[]> {
  if (FIREBASE_CONFIGURED && db) {
    const q = query(
      collection(db, COL),
      where("deleted", "==", false),
      orderBy("date", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toRecord(d.id, d.data()));
  }

  return lsLoad()
    .filter((r) => !r.deleted)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** Exporta una lista de registros como CSV y descarga el archivo. */
export function exportarCSV(records: MedicalRecord[], filename = "historial_clinico.csv"): void {
  const headers = [
    "ID", "Mascota", "Fecha", "Tipo de Evento", "Profesional",
    "Peso (kg)", "Temperatura", "Descripción", "Diagnóstico", "Tratamiento",
  ];

  const rows = records.map((r) => [
    r.id,
    r.petId,
    new Date(r.date).toLocaleDateString("es-AR"),
    r.eventType,
    r.professionalId,
    r.weight ?? "",
    r.temperature ?? "",
    `"${(r.description ?? "").replace(/"/g, '""')}"`,
    `"${(r.diagnosis ?? "").replace(/"/g, '""')}"`,
    `"${(r.treatment ?? "").replace(/"/g, '""')}"`,
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

/** Soft-delete de registro. */
export async function eliminarHistorial(id: string, deletedBy: string): Promise<void> {
  if (FIREBASE_CONFIGURED && db) {
    await updateDoc(doc(db, COL, id), {
      deleted: true,
      deletedBy,
      deletedAt: serverTimestamp(),
    });
    return;
  }

  const records = lsLoad();
  const idx = records.findIndex((r) => r.id === id);
  if (idx !== -1) {
    records[idx] = { ...records[idx], deleted: true, deletedBy, deletedAt: new Date() };
    lsSave(records);
  }
}

export async function traerHistorialPorId(id: string): Promise<MedicalRecord | null> {
  if (FIREBASE_CONFIGURED && db) {
    const snap = await getDoc(doc(db, COL, id));
    return snap.exists() ? toRecord(snap.id, snap.data()) : null;
  }

  return lsLoad().find((r) => r.id === id) ?? null;
}
