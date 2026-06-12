/**
 * parametrosService.ts — Datos Paramétricos del Sistema
 *
 * Gestiona las colecciones dinámicas administradas por el administrador:
 *   • especies          — Especies de animales
 *   • razas             — Razas vinculadas a una especie
 *   • tiposEvento       — Tipos de evento clínico
 *   • arbolVacunacion   — Vacunas por especie con periodicidad
 *
 * Patrón: Firestore cuando FIREBASE_CONFIGURED=true, localStorage como fallback.
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
  EspecieParametro,
  RazaParametro,
  TipoEvento,
  VacunaParametro,
} from "../types";

// ── Seed data (mirrors speciesAndBreeds.ts) ───────────────────────────────────

const SEED_ESPECIES: Omit<EspecieParametro, "createdAt">[] = [
  { id: "sp_perro",   name: "Perro",   icon: "🐕", description: "Canis lupus familiaris", active: true },
  { id: "sp_gato",    name: "Gato",    icon: "🐈", description: "Felis catus", active: true },
  { id: "sp_ave",     name: "Ave",     icon: "🦜", description: "Aves de compañía", active: true },
  { id: "sp_conejo",  name: "Conejo",  icon: "🐰", description: "Oryctolagus cuniculus", active: true },
  { id: "sp_hamster", name: "Hámster", icon: "🐹", description: "Cricetinae", active: true },
  { id: "sp_reptil",  name: "Reptil",  icon: "🦎", description: "Reptilia", active: true },
  { id: "sp_otro",    name: "Otro",    icon: "🐾", description: "Otras especies", active: true },
];

const SEED_RAZAS: Omit<RazaParametro, "createdAt">[] = [
  // Perros
  { id: "r_labrador",       especieId: "sp_perro", name: "Labrador Retriever",   active: true },
  { id: "r_golden",         especieId: "sp_perro", name: "Golden Retriever",      active: true },
  { id: "r_pastor_aleman",  especieId: "sp_perro", name: "Pastor Alemán",         active: true },
  { id: "r_bulldog_fr",     especieId: "sp_perro", name: "Bulldog Francés",       active: true },
  { id: "r_beagle",         especieId: "sp_perro", name: "Beagle",                active: true },
  { id: "r_poodle",         especieId: "sp_perro", name: "Poodle/Caniche",        active: true },
  { id: "r_rottweiler",     especieId: "sp_perro", name: "Rottweiler",            active: true },
  { id: "r_yorkshire",      especieId: "sp_perro", name: "Yorkshire Terrier",     active: true },
  { id: "r_boxer",          especieId: "sp_perro", name: "Boxer",                 active: true },
  { id: "r_dachshund",      especieId: "sp_perro", name: "Dachshund/Salchicha",   active: true },
  { id: "r_maltese",        especieId: "sp_perro", name: "Maltés",                active: true },
  { id: "r_shih_tzu",       especieId: "sp_perro", name: "Shih Tzu",              active: true },
  { id: "r_pomeranian",     especieId: "sp_perro", name: "Pomerania",             active: true },
  { id: "r_chihuahua",      especieId: "sp_perro", name: "Chihuahua",             active: true },
  { id: "r_doberman",       especieId: "sp_perro", name: "Doberman",              active: true },
  { id: "r_husky",          especieId: "sp_perro", name: "Husky Siberiano",       active: true },
  { id: "r_border_collie",  especieId: "sp_perro", name: "Border Collie",         active: true },
  { id: "r_cocker",         especieId: "sp_perro", name: "Cocker Spaniel",        active: true },
  { id: "r_schnauzer",      especieId: "sp_perro", name: "Schnauzer",             active: true },
  { id: "r_mestizo_perro",  especieId: "sp_perro", name: "Mestizo",               active: true },
  // Gatos
  { id: "r_siames",         especieId: "sp_gato",  name: "Siamés",                active: true },
  { id: "r_persa",          especieId: "sp_gato",  name: "Persa",                 active: true },
  { id: "r_maine_coon",     especieId: "sp_gato",  name: "Maine Coon",            active: true },
  { id: "r_bengala",        especieId: "sp_gato",  name: "Bengala",               active: true },
  { id: "r_ragdoll",        especieId: "sp_gato",  name: "Ragdoll",               active: true },
  { id: "r_british",        especieId: "sp_gato",  name: "British Shorthair",     active: true },
  { id: "r_scottish",       especieId: "sp_gato",  name: "Scottish Fold",         active: true },
  { id: "r_abisinio",       especieId: "sp_gato",  name: "Abisinio",              active: true },
  { id: "r_sphynx",         especieId: "sp_gato",  name: "Sphynx",                active: true },
  { id: "r_mestizo_gato",   especieId: "sp_gato",  name: "Mestizo",               active: true },
  // Aves
  { id: "r_canario",        especieId: "sp_ave",   name: "Canario",               active: true },
  { id: "r_periquito",      especieId: "sp_ave",   name: "Periquito",             active: true },
  { id: "r_loro",           especieId: "sp_ave",   name: "Loro",                  active: true },
  { id: "r_ninfa",          especieId: "sp_ave",   name: "Ninfa",                 active: true },
  { id: "r_agapornis",      especieId: "sp_ave",   name: "Agapornis",             active: true },
  // Conejos
  { id: "r_conejo_enano",   especieId: "sp_conejo", name: "Enano",               active: true },
  { id: "r_conejo_belier",  especieId: "sp_conejo", name: "Belier",              active: true },
  { id: "r_conejo_rex",     especieId: "sp_conejo", name: "Rex",                 active: true },
  { id: "r_conejo_angora",  especieId: "sp_conejo", name: "Angora",              active: true },
  // Hámsters
  { id: "r_hamster_sirio",  especieId: "sp_hamster", name: "Sirio",              active: true },
  { id: "r_hamster_ruso",   especieId: "sp_hamster", name: "Ruso",               active: true },
  // Reptiles
  { id: "r_iguana",         especieId: "sp_reptil",  name: "Iguana",             active: true },
  { id: "r_gecko",          especieId: "sp_reptil",  name: "Gecko Leopardo",     active: true },
  { id: "r_tortuga",        especieId: "sp_reptil",  name: "Tortuga",            active: true },
  { id: "r_pogona",         especieId: "sp_reptil",  name: "Pogona",             active: true },
];

const SEED_TIPOS_EVENTO: Omit<TipoEvento, "createdAt">[] = [
  { id: "te_consulta",      name: "Consulta médica",              color: "bg-blue-100 text-blue-800",    requiresVaccineTracking: false, active: true },
  { id: "te_vacuna",        name: "Vacuna / Inmunización",        color: "bg-green-100 text-green-800",  requiresVaccineTracking: true,  active: true },
  { id: "te_cirugia",       name: "Cirugía",                      color: "bg-red-100 text-red-800",      requiresVaccineTracking: false, active: true },
  { id: "te_analisis",      name: "Análisis clínico / Lab.",      color: "bg-purple-100 text-purple-800",requiresVaccineTracking: false, active: true },
  { id: "te_radiografia",   name: "Radiografía",                  color: "bg-indigo-100 text-indigo-800",requiresVaccineTracking: false, active: true },
  { id: "te_tomografia",    name: "Tomografía (TAC)",             color: "bg-pink-100 text-pink-800",    requiresVaccineTracking: false, active: true },
  { id: "te_ecografia",     name: "Ecografía",                    color: "bg-cyan-100 text-cyan-800",    requiresVaccineTracking: false, active: true },
  { id: "te_desparasitacion",name: "Desparasitación",             color: "bg-yellow-100 text-yellow-800",requiresVaccineTracking: false, active: true },
  { id: "te_control",       name: "Control / Seguimiento",        color: "bg-teal-100 text-teal-800",    requiresVaccineTracking: false, active: true },
  { id: "te_emergencia",    name: "Emergencia / Urgencia",        color: "bg-red-200 text-red-900",      requiresVaccineTracking: false, active: true },
  { id: "te_internacion",   name: "Internación",                  color: "bg-orange-100 text-orange-800",requiresVaccineTracking: false, active: true },
  { id: "te_otro",          name: "Otro procedimiento",           color: "bg-gray-100 text-gray-700",    requiresVaccineTracking: false, active: true },
];

const SEED_VACUNAS: Omit<VacunaParametro, "createdAt">[] = [
  // Perros
  { id: "vac_antirrabica_p", especieId: "sp_perro", nombreVacuna: "Antirrábica",         dosis: 1, periodicidadDias: 365, descripcion: "Vacuna obligatoria anual",   active: true },
  { id: "vac_dhppi",         especieId: "sp_perro", nombreVacuna: "Séxtuple (DHPPI+L)",  dosis: 3, periodicidadDias: 365, descripcion: "Distemper, Hepatitis, Parvovirus, Parainfluenza, Leptospirosis", active: true },
  { id: "vac_bordetella",    especieId: "sp_perro", nombreVacuna: "Bordetella",           dosis: 1, periodicidadDias: 365, descripcion: "Tos de las perreras",        active: true },
  // Gatos
  { id: "vac_antirrabica_g", especieId: "sp_gato",  nombreVacuna: "Antirrábica",         dosis: 1, periodicidadDias: 365, descripcion: "Vacuna anual",               active: true },
  { id: "vac_triple_felina", especieId: "sp_gato",  nombreVacuna: "Triple Felina (RCP)", dosis: 2, periodicidadDias: 365, descripcion: "Rinotraqueitis, Calicivirus, Panleucopenia", active: true },
  { id: "vac_leucemia",      especieId: "sp_gato",  nombreVacuna: "Leucemia Felina",     dosis: 2, periodicidadDias: 365, descripcion: "FeLV",                       active: true },
];

// ── localStorage keys ─────────────────────────────────────────────────────────

const LS = {
  especies:  "veterinaria_parametros_especies",
  razas:     "veterinaria_parametros_razas",
  tipos:     "veterinaria_parametros_tipos_evento",
  vacunas:   "veterinaria_parametros_vacunas",
};

function lsLoad<T>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : seed.map(s => ({ ...s, createdAt: new Date() }));
  } catch { return seed.map(s => ({ ...s, createdAt: new Date() })); }
}

function lsSave<T>(key: string, data: T[]) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
}

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
// ESPECIES
// ─────────────────────────────────────────────────────────────────────────────

export async function traerEspecies(): Promise<EspecieParametro[]> {
  if (FIREBASE_CONFIGURED && db) {
    const snap = await getDocs(query(collection(db, "especies"), where("active", "==", true), orderBy("name")));
    return snap.docs.map(d => toEspecie(d.id, d.data()));
  }
  return lsLoad<EspecieParametro>(LS.especies, SEED_ESPECIES.map(s => ({ ...s, createdAt: new Date() }))).filter(e => e.active);
}

export async function registrarEspecie(data: Omit<EspecieParametro, "id" | "createdAt">, createdBy: string): Promise<EspecieParametro> {
  if (FIREBASE_CONFIGURED && db) {
    const ref = await addDoc(collection(db, "especies"), { ...data, createdBy, createdAt: serverTimestamp() });
    return { id: ref.id, ...data, createdAt: new Date(), createdBy };
  }
  const list = lsLoad<EspecieParametro>(LS.especies, SEED_ESPECIES.map(s => ({ ...s, createdAt: new Date() })));
  const item: EspecieParametro = { id: Date.now().toString(), ...data, createdAt: new Date(), createdBy };
  lsSave(LS.especies, [...list, item]);
  return item;
}

export async function modificarEspecie(id: string, data: Partial<EspecieParametro>): Promise<void> {
  if (FIREBASE_CONFIGURED && db) {
    await updateDoc(doc(db, "especies", id), { ...data, updatedAt: serverTimestamp() });
    return;
  }
  const list = lsLoad<EspecieParametro>(LS.especies, SEED_ESPECIES.map(s => ({ ...s, createdAt: new Date() })));
  lsSave(LS.especies, list.map(e => e.id === id ? { ...e, ...data, updatedAt: new Date() } : e));
}

export async function eliminarEspecie(id: string): Promise<void> {
  return modificarEspecie(id, { active: false });
}

// ─────────────────────────────────────────────────────────────────────────────
// RAZAS
// ─────────────────────────────────────────────────────────────────────────────

export async function traerRazasPorEspecie(especieId: string): Promise<RazaParametro[]> {
  if (FIREBASE_CONFIGURED && db) {
    const snap = await getDocs(query(collection(db, "razas"), where("especieId", "==", especieId), where("active", "==", true), orderBy("name")));
    return snap.docs.map(d => toRaza(d.id, d.data()));
  }
  return lsLoad<RazaParametro>(LS.razas, SEED_RAZAS.map(s => ({ ...s, createdAt: new Date() }))).filter(r => r.especieId === especieId && r.active);
}

export async function traerTodasLasRazas(): Promise<RazaParametro[]> {
  if (FIREBASE_CONFIGURED && db) {
    const snap = await getDocs(query(collection(db, "razas"), where("active", "==", true), orderBy("name")));
    return snap.docs.map(d => toRaza(d.id, d.data()));
  }
  return lsLoad<RazaParametro>(LS.razas, SEED_RAZAS.map(s => ({ ...s, createdAt: new Date() }))).filter(r => r.active);
}

export async function registrarRaza(data: Omit<RazaParametro, "id" | "createdAt">, createdBy: string): Promise<RazaParametro> {
  if (FIREBASE_CONFIGURED && db) {
    const ref = await addDoc(collection(db, "razas"), { ...data, createdBy, createdAt: serverTimestamp() });
    return { id: ref.id, ...data, createdAt: new Date(), createdBy };
  }
  const list = lsLoad<RazaParametro>(LS.razas, SEED_RAZAS.map(s => ({ ...s, createdAt: new Date() })));
  const item: RazaParametro = { id: Date.now().toString(), ...data, createdAt: new Date(), createdBy };
  lsSave(LS.razas, [...list, item]);
  return item;
}

export async function modificarRaza(id: string, data: Partial<RazaParametro>): Promise<void> {
  if (FIREBASE_CONFIGURED && db) {
    await updateDoc(doc(db, "razas", id), { ...data, updatedAt: serverTimestamp() });
    return;
  }
  const list = lsLoad<RazaParametro>(LS.razas, SEED_RAZAS.map(s => ({ ...s, createdAt: new Date() })));
  lsSave(LS.razas, list.map(r => r.id === id ? { ...r, ...data, updatedAt: new Date() } : r));
}

export async function eliminarRaza(id: string): Promise<void> {
  return modificarRaza(id, { active: false });
}

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE EVENTO CLÍNICO
// ─────────────────────────────────────────────────────────────────────────────

export async function traerTiposEvento(): Promise<TipoEvento[]> {
  if (FIREBASE_CONFIGURED && db) {
    const snap = await getDocs(query(collection(db, "tiposEvento"), where("active", "==", true), orderBy("name")));
    return snap.docs.map(d => toTipo(d.id, d.data()));
  }
  return lsLoad<TipoEvento>(LS.tipos, SEED_TIPOS_EVENTO.map(s => ({ ...s, createdAt: new Date() }))).filter(t => t.active);
}

export async function registrarTipoEvento(data: Omit<TipoEvento, "id" | "createdAt">, createdBy: string): Promise<TipoEvento> {
  if (FIREBASE_CONFIGURED && db) {
    const ref = await addDoc(collection(db, "tiposEvento"), { ...data, createdBy, createdAt: serverTimestamp() });
    return { id: ref.id, ...data, createdAt: new Date(), createdBy };
  }
  const list = lsLoad<TipoEvento>(LS.tipos, SEED_TIPOS_EVENTO.map(s => ({ ...s, createdAt: new Date() })));
  const item: TipoEvento = { id: Date.now().toString(), ...data, createdAt: new Date(), createdBy };
  lsSave(LS.tipos, [...list, item]);
  return item;
}

export async function modificarTipoEvento(id: string, data: Partial<TipoEvento>): Promise<void> {
  if (FIREBASE_CONFIGURED && db) {
    await updateDoc(doc(db, "tiposEvento", id), { ...data, updatedAt: serverTimestamp() });
    return;
  }
  const list = lsLoad<TipoEvento>(LS.tipos, SEED_TIPOS_EVENTO.map(s => ({ ...s, createdAt: new Date() })));
  lsSave(LS.tipos, list.map(t => t.id === id ? { ...t, ...data, updatedAt: new Date() } : t));
}

export async function eliminarTipoEvento(id: string): Promise<void> {
  return modificarTipoEvento(id, { active: false });
}

// ─────────────────────────────────────────────────────────────────────────────
// ÁRBOL DE VACUNACIÓN
// ─────────────────────────────────────────────────────────────────────────────

export async function traerVacunasPorEspecie(especieId: string): Promise<VacunaParametro[]> {
  if (FIREBASE_CONFIGURED && db) {
    const snap = await getDocs(query(collection(db, "arbolVacunacion"), where("especieId", "==", especieId), where("active", "==", true), orderBy("nombreVacuna")));
    return snap.docs.map(d => toVacuna(d.id, d.data()));
  }
  return lsLoad<VacunaParametro>(LS.vacunas, SEED_VACUNAS.map(s => ({ ...s, createdAt: new Date() }))).filter(v => v.especieId === especieId && v.active);
}

export async function traerTodasLasVacunas(): Promise<VacunaParametro[]> {
  if (FIREBASE_CONFIGURED && db) {
    const snap = await getDocs(query(collection(db, "arbolVacunacion"), where("active", "==", true)));
    return snap.docs.map(d => toVacuna(d.id, d.data()));
  }
  return lsLoad<VacunaParametro>(LS.vacunas, SEED_VACUNAS.map(s => ({ ...s, createdAt: new Date() }))).filter(v => v.active);
}

export async function registrarVacuna(data: Omit<VacunaParametro, "id" | "createdAt">, createdBy: string): Promise<VacunaParametro> {
  if (FIREBASE_CONFIGURED && db) {
    const ref = await addDoc(collection(db, "arbolVacunacion"), { ...data, createdBy, createdAt: serverTimestamp() });
    return { id: ref.id, ...data, createdAt: new Date(), createdBy };
  }
  const list = lsLoad<VacunaParametro>(LS.vacunas, SEED_VACUNAS.map(s => ({ ...s, createdAt: new Date() })));
  const item: VacunaParametro = { id: Date.now().toString(), ...data, createdAt: new Date(), createdBy };
  lsSave(LS.vacunas, [...list, item]);
  return item;
}

export async function modificarVacuna(id: string, data: Partial<VacunaParametro>): Promise<void> {
  if (FIREBASE_CONFIGURED && db) {
    await updateDoc(doc(db, "arbolVacunacion", id), { ...data, updatedAt: serverTimestamp() });
    return;
  }
  const list = lsLoad<VacunaParametro>(LS.vacunas, SEED_VACUNAS.map(s => ({ ...s, createdAt: new Date() })));
  lsSave(LS.vacunas, list.map(v => v.id === id ? { ...v, ...data, updatedAt: new Date() } : v));
}

export async function eliminarVacuna(id: string): Promise<void> {
  return modificarVacuna(id, { active: false });
}
