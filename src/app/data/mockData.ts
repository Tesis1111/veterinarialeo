/**
 * mockData.ts — DEPRECATED
 * Todos los datos del sistema provienen exclusivamente de Firebase Firestore.
 * Este archivo existe solo para compatibilidad de tipos en módulos aún no migrados.
 * No agregar nuevos datos ni importar este archivo en código de producción.
 */
import { Client, Pet, MedicalRecord, Appointment, Doctor } from "../types";

export const initialClients: Client[] = [];
export const initialPets: Pet[] = [];
export const initialMedicalRecords: MedicalRecord[] = [];
export const initialAppointments: Appointment[] = [];
export const doctors: Doctor[] = [];
