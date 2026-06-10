// ============================================
// DATOS PREDEFINIDOS: ESPECIES Y RAZAS
// ============================================

export interface SpeciesData {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

export interface BreedData {
  id: string;
  speciesId: string;
  name: string;
  description?: string;
  commonCharacteristics?: string;
}

// ── Especies disponibles ──────────────────────────────────────
export const PREDEFINED_SPECIES: SpeciesData[] = [
  {
    id: "sp_perro",
    name: "Perro",
    description: "Canis lupus familiaris",
    icon: "🐕"
  },
  {
    id: "sp_gato",
    name: "Gato",
    description: "Felis catus",
    icon: "🐈"
  },
  {
    id: "sp_ave",
    name: "Ave",
    description: "Aves de compañía",
    icon: "🦜"
  },
  {
    id: "sp_conejo",
    name: "Conejo",
    description: "Oryctolagus cuniculus",
    icon: "🐰"
  },
  {
    id: "sp_hamster",
    name: "Hámster",
    description: "Cricetinae",
    icon: "🐹"
  },
  {
    id: "sp_reptil",
    name: "Reptil",
    description: "Reptilia",
    icon: "🦎"
  },
  {
    id: "sp_otro",
    name: "Otro",
    description: "Otras especies exóticas",
    icon: "🐾"
  }
];

// ── Razas de Perro ──────────────────────────────────────
export const DOG_BREEDS: BreedData[] = [
  { id: "br_lab", speciesId: "sp_perro", name: "Labrador Retriever", commonCharacteristics: "Amigable, activo, inteligente" },
  { id: "br_golden", speciesId: "sp_perro", name: "Golden Retriever", commonCharacteristics: "Dócil, leal, enérgico" },
  { id: "br_pastor_aleman", speciesId: "sp_perro", name: "Pastor Alemán", commonCharacteristics: "Protector, inteligente, obediente" },
  { id: "br_bulldog", speciesId: "sp_perro", name: "Bulldog Francés", commonCharacteristics: "Compacto, cariñoso, sociable" },
  { id: "br_beagle", speciesId: "sp_perro", name: "Beagle", commonCharacteristics: "Curioso, alegre, activo" },
  { id: "br_poodle", speciesId: "sp_perro", name: "Caniche (Poodle)", commonCharacteristics: "Inteligente, hipoalergénico, elegante" },
  { id: "br_chihuahua", speciesId: "sp_perro", name: "Chihuahua", commonCharacteristics: "Pequeño, valiente, vivaz" },
  { id: "br_yorkshire", speciesId: "sp_perro", name: "Yorkshire Terrier", commonCharacteristics: "Pequeño, atento, cariñoso" },
  { id: "br_dalmata", speciesId: "sp_perro", name: "Dálmata", commonCharacteristics: "Enérgico, amigable, manchado" },
  { id: "br_husky", speciesId: "sp_perro", name: "Husky Siberiano", commonCharacteristics: "Resistente, independiente, activo" },
  { id: "br_boxer", speciesId: "sp_perro", name: "Boxer", commonCharacteristics: "Juguetón, leal, protector" },
  { id: "br_doberman", speciesId: "sp_perro", name: "Doberman", commonCharacteristics: "Alerta, leal, inteligente" },
  { id: "br_rottweiler", speciesId: "sp_perro", name: "Rottweiler", commonCharacteristics: "Fuerte, protector, leal" },
  { id: "br_cocker", speciesId: "sp_perro", name: "Cocker Spaniel", commonCharacteristics: "Alegre, cariñoso, activo" },
  { id: "br_dogo", speciesId: "sp_perro", name: "Dogo Argentino", commonCharacteristics: "Fuerte, valiente, leal" },
  { id: "br_ovejero", speciesId: "sp_perro", name: "Ovejero Belga", commonCharacteristics: "Inteligente, trabajador, protector" },
  { id: "br_pitbull", speciesId: "sp_perro", name: "American Pit Bull Terrier", commonCharacteristics: "Fuerte, leal, enérgico" },
  { id: "br_shih_tzu", speciesId: "sp_perro", name: "Shih Tzu", commonCharacteristics: "Cariñoso, pequeño, pelaje largo" },
  { id: "br_pug", speciesId: "sp_perro", name: "Pug", commonCharacteristics: "Sociable, juguetón, compacto" },
  { id: "br_border", speciesId: "sp_perro", name: "Border Collie", commonCharacteristics: "Muy inteligente, trabajador, ágil" },
  { id: "br_akita", speciesId: "sp_perro", name: "Akita", commonCharacteristics: "Digno, leal, protector" },
  { id: "br_mestizo_perro", speciesId: "sp_perro", name: "Mestizo / Cruce", commonCharacteristics: "Variado" },
  { id: "br_otro_perro", speciesId: "sp_perro", name: "Otra raza", commonCharacteristics: "Raza no especificada" }
];

// ── Razas de Gato ──────────────────────────────────────
export const CAT_BREEDS: BreedData[] = [
  { id: "br_siames", speciesId: "sp_gato", name: "Siamés", commonCharacteristics: "Vocal, social, elegante" },
  { id: "br_persa", speciesId: "sp_gato", name: "Persa", commonCharacteristics: "Pelaje largo, tranquilo, dulce" },
  { id: "br_maine_coon", speciesId: "sp_gato", name: "Maine Coon", commonCharacteristics: "Grande, sociable, pelaje abundante" },
  { id: "br_bengala", speciesId: "sp_gato", name: "Bengala", commonCharacteristics: "Manchas tipo leopardo, activo" },
  { id: "br_ragdoll", speciesId: "sp_gato", name: "Ragdoll", commonCharacteristics: "Dócil, grande, ojos azules" },
  { id: "br_british", speciesId: "sp_gato", name: "British Shorthair", commonCharacteristics: "Robusto, tranquilo, pelaje denso" },
  { id: "br_sphynx", speciesId: "sp_gato", name: "Sphynx (sin pelo)", commonCharacteristics: "Sin pelo, cariñoso, energético" },
  { id: "br_abisinio", speciesId: "sp_gato", name: "Abisinio", commonCharacteristics: "Activo, curioso, atlético" },
  { id: "br_angora", speciesId: "sp_gato", name: "Angora Turco", commonCharacteristics: "Pelaje sedoso, elegante, juguetón" },
  { id: "br_birman", speciesId: "sp_gato", name: "Birmano", commonCharacteristics: "Guantes blancos, ojos azules, tranquilo" },
  { id: "br_devon_rex", speciesId: "sp_gato", name: "Devon Rex", commonCharacteristics: "Pelaje rizado, orejas grandes, social" },
  { id: "br_scottish", speciesId: "sp_gato", name: "Scottish Fold", commonCharacteristics: "Orejas plegadas, dulce, tranquilo" },
  { id: "br_comun", speciesId: "sp_gato", name: "Gato Común / Doméstico", commonCharacteristics: "Variado, adaptable" },
  { id: "br_mestizo_gato", speciesId: "sp_gato", name: "Mestizo / Cruce", commonCharacteristics: "Variado" },
  { id: "br_otro_gato", speciesId: "sp_gato", name: "Otra raza", commonCharacteristics: "Raza no especificada" }
];

// ── Tipos de Aves ──────────────────────────────────────
export const BIRD_BREEDS: BreedData[] = [
  { id: "br_canario", speciesId: "sp_ave", name: "Canario", commonCharacteristics: "Canto melodioso, pequeño" },
  { id: "br_periquito", speciesId: "sp_ave", name: "Periquito", commonCharacteristics: "Social, colorido, pequeño" },
  { id: "br_loro", speciesId: "sp_ave", name: "Loro", commonCharacteristics: "Inteligente, puede hablar, longevo" },
  { id: "br_ninfa", speciesId: "sp_ave", name: "Ninfa (Cacatúa)", commonCharacteristics: "Cresta, cariñoso, silbador" },
  { id: "br_agaporni", speciesId: "sp_ave", name: "Agapornis (Inseparable)", commonCharacteristics: "Pequeño, social, colorido" },
  { id: "br_diamante", speciesId: "sp_ave", name: "Diamante Mandarín", commonCharacteristics: "Pequeño, gregario, activo" },
  { id: "br_guacamayo", speciesId: "sp_ave", name: "Guacamayo", commonCharacteristics: "Grande, colorido, inteligente" },
  { id: "br_cacatua", speciesId: "sp_ave", name: "Cacatúa", commonCharacteristics: "Cresta, social, ruidoso" },
  { id: "br_otro_ave", speciesId: "sp_ave", name: "Otra ave", commonCharacteristics: "No especificada" }
];

// ── Razas de Conejo ──────────────────────────────────────
export const RABBIT_BREEDS: BreedData[] = [
  { id: "br_conejo_enano", speciesId: "sp_conejo", name: "Conejo Enano", commonCharacteristics: "Pequeño, dócil, orejas cortas" },
  { id: "br_conejo_belier", speciesId: "sp_conejo", name: "Belier (Mini Lop)", commonCharacteristics: "Orejas caídas, tranquilo" },
  { id: "br_conejo_rex", speciesId: "sp_conejo", name: "Rex", commonCharacteristics: "Pelaje aterciopelado, mediano" },
  { id: "br_conejo_angora", speciesId: "sp_conejo", name: "Angora", commonCharacteristics: "Pelaje muy largo, requiere cepillado" },
  { id: "br_conejo_gigante", speciesId: "sp_conejo", name: "Gigante de Flandes", commonCharacteristics: "Grande, tranquilo, dócil" },
  { id: "br_otro_conejo", speciesId: "sp_conejo", name: "Otro conejo", commonCharacteristics: "No especificado" }
];

// ── Tipos de Hámster ──────────────────────────────────────
export const HAMSTER_BREEDS: BreedData[] = [
  { id: "br_hamster_sirio", speciesId: "sp_hamster", name: "Hámster Sirio (Dorado)", commonCharacteristics: "Solitario, nocturno, mediano" },
  { id: "br_hamster_ruso", speciesId: "sp_hamster", name: "Hámster Ruso (Campbell)", commonCharacteristics: "Pequeño, social, activo" },
  { id: "br_hamster_roborovski", speciesId: "sp_hamster", name: "Roborovski", commonCharacteristics: "Muy pequeño, rápido, social" },
  { id: "br_hamster_chino", speciesId: "sp_hamster", name: "Hámster Chino", commonCharacteristics: "Cola larga, ágil, tímido" },
  { id: "br_otro_hamster", speciesId: "sp_hamster", name: "Otro hámster", commonCharacteristics: "No especificado" }
];

// ── Tipos de Reptiles ──────────────────────────────────────
export const REPTILE_BREEDS: BreedData[] = [
  { id: "br_iguana", speciesId: "sp_reptil", name: "Iguana Verde", commonCharacteristics: "Herbívora, grande, requiere UV" },
  { id: "br_gecko", speciesId: "sp_reptil", name: "Gecko Leopardo", commonCharacteristics: "Nocturno, insectívoro, dócil" },
  { id: "br_tortuga", speciesId: "sp_reptil", name: "Tortuga de Tierra", commonCharacteristics: "Herbívora, longeva, lenta" },
  { id: "br_tortuga_agua", speciesId: "sp_reptil", name: "Tortuga Acuática", commonCharacteristics: "Omnívora, acuática, longeva" },
  { id: "br_pogona", speciesId: "sp_reptil", name: "Pogona (Dragón Barbudo)", commonCharacteristics: "Omnívoro, dócil, diurno" },
  { id: "br_camaleon", speciesId: "sp_reptil", name: "Camaleón", commonCharacteristics: "Cambia de color, insectívoro, delicado" },
  { id: "br_serpiente_maiz", speciesId: "sp_reptil", name: "Serpiente del Maíz", commonCharacteristics: "No venenosa, dócil, carnívora" },
  { id: "br_otro_reptil", speciesId: "sp_reptil", name: "Otro reptil", commonCharacteristics: "No especificado" }
];

// ── Consolidado de todas las razas ──────────────────────────────────────
export const ALL_BREEDS: BreedData[] = [
  ...DOG_BREEDS,
  ...CAT_BREEDS,
  ...BIRD_BREEDS,
  ...RABBIT_BREEDS,
  ...HAMSTER_BREEDS,
  ...REPTILE_BREEDS
];

// ── Helpers ──────────────────────────────────────────────
export const getSpeciesById = (id: string): SpeciesData | undefined =>
  PREDEFINED_SPECIES.find(s => s.id === id);

export const getBreedsBySpecies = (speciesId: string): BreedData[] =>
  ALL_BREEDS.filter(b => b.speciesId === speciesId);

export const getBreedById = (id: string): BreedData | undefined =>
  ALL_BREEDS.find(b => b.id === id);

export const getSpeciesName = (id: string): string =>
  getSpeciesById(id)?.name || "Desconocido";

export const getBreedName = (id: string): string =>
  getBreedById(id)?.name || "Desconocido";
