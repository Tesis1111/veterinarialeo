/**
 * speciesAndBreeds.ts — DEPRECATED
 * Las especies y razas se gestionan dinámicamente desde Firebase Firestore
 * a través de parametrosService (colecciones `especies` y `razas`).
 * Este archivo se mantiene vacío para no romper imports existentes.
 */

export interface SpeciesData { id: string; name: string; icon?: string; description?: string; }
export interface BreedData { id: string; speciesId: string; name: string; }

export const PREDEFINED_SPECIES: SpeciesData[] = [];

export function getSpeciesById(_id: string): SpeciesData | undefined { return undefined; }
export function getBreedsBySpecies(_speciesId: string): BreedData[] { return []; }
export function getBreedById(_id: string): BreedData | undefined { return undefined; }
export function getSpeciesName(_id: string): string { return ""; }
export function getBreedName(_id: string): string { return ""; }
