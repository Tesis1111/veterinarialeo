# Plan: Migración de Datos Hardcodeados a Parámetros Dinámicos en Firestore

## Contexto

El sistema veterinario tiene datos estáticos dispersos en el código que deben volverse administrables:
- `src/app/data/speciesAndBreeds.ts` — 7 especies + ~66 razas, usadas en `PetsModuleEnhanced`
- `CLINICAL_EVENT_TYPES` array hardcodeado en `MedicalHistoryModuleNew.tsx` (12 tipos)
- `initialDoctors` en `mockData.ts` (8 doctores) — leídos desde localStorage, sin Firestore
- Tipos de servicio de turno (`clinic/grooming/daycare`) sin "motivo" administrable

La meta: crear una capa de servicios Firestore para estos datos, un módulo de administración CRUD exclusivo para el rol admin, y actualizar los módulos existentes para consumir estos datos dinámicamente, manteniendo coherencia visual y el patrón de fallback ya establecido en el proyecto.

---

## Nuevas Colecciones Firestore

| Colección | Descripción |
|---|---|
| `especies` | Especies de animales (nombre, icono, descripción) |
| `razas` | Razas, vinculadas por `especieId` |
| `tiposEvento` | Tipos de evento clínico (nombre, color, activo) |
| `arbolVacunacion` | Vacuna por especie: nombre, dosis, periodicidad (días) |
| `doctores` | Perfiles de profesionales (nombre, especialidad, matrícula, userId) |

---

## Archivos a Crear

### 1. `src/app/types/index.ts` — Añadir interfaces nuevas
Agregar al final del archivo existente (sin tocar las interfaces actuales):
```ts
export interface EspecieParametro { id: string; name: string; icon?: string; description?: string; active: boolean; createdAt: Date; }
export interface RazaParametro    { id: string; especieId: string; name: string; active: boolean; createdAt: Date; }
export interface TipoEvento       { id: string; name: string; color: string; active: boolean; createdAt: Date; }
export interface VacunaParametro  { id: string; especieId: string; nombreVacuna: string; dosis: number; periodicidadDias: number; descripcion?: string; active: boolean; createdAt: Date; }
export interface DoctorPerfil     { id: string; userId?: string; fullName: string; specialty: string; licenseNumber?: string; available: boolean; createdAt: Date; updatedAt?: Date; }
```

### 2. `src/app/services/parametrosService.ts` (nuevo)
Sigue el patrón exacto de los servicios existentes (Firestore + localStorage fallback via `FIREBASE_CONFIGURED`).

**Exports:**
```
// Especies
traerEspecies(): Promise<EspecieParametro[]>
registrarEspecie(data, createdBy): Promise<EspecieParametro>
modificarEspecie(id, data): Promise<void>
eliminarEspecie(id): Promise<void>   // soft-delete: active=false

// Razas
traerRazasPorEspecie(especieId): Promise<RazaParametro[]>
traerTodasLasRazas(): Promise<RazaParametro[]>
registrarRaza(data, createdBy): Promise<RazaParametro>
modificarRaza(id, data): Promise<void>
eliminarRaza(id): Promise<void>

// Tipos de Evento
traerTiposEvento(): Promise<TipoEvento[]>
registrarTipoEvento(data, createdBy): Promise<TipoEvento>
modificarTipoEvento(id, data): Promise<void>
eliminarTipoEvento(id): Promise<void>

// Árbol de Vacunación
traerVacunasPorEspecie(especieId): Promise<VacunaParametro[]>
traerTodasLasVacunas(): Promise<VacunaParametro[]>
registrarVacuna(data, createdBy): Promise<VacunaParametro>
modificarVacuna(id, data): Promise<void>
eliminarVacuna(id): Promise<void>
```

**Fallback localStorage:** cada función usa keys `veterinaria_especies`, `veterinaria_razas`, `veterinaria_tipos_evento`, `veterinaria_vacunas` con los datos estáticos actuales como valor inicial.

### 3. `src/app/services/doctorService.ts` (nuevo)
Colección Firestore: `doctores`. Sigue el mismo patrón.

**Exports:**
```
traerDoctores(): Promise<DoctorPerfil[]>
traerDoctorPorId(id): Promise<DoctorPerfil | null>
registrarDoctor(data, createdBy): Promise<DoctorPerfil>
modificarDoctor(id, data): Promise<void>
desactivarDoctor(id): Promise<void>
```

**Fallback localStorage:** key `veterinaria_doctors`, valor inicial = `initialDoctors` de `mockData.ts`.

### 4. `src/app/components/modules/ParametrosModule.tsx` (nuevo)
Módulo admin-only (protegido por AdminGuard).  
**Tabs:**
1. **Especies y Razas** — Lista de especies con botón expandir para ver razas. CRUD inline usando Cards y dialogs de shadcn/ui. Al eliminar especie: advertir si tiene razas activas.
2. **Tipos de Evento Clínico** — Tabla con nombre + chip de color. CRUD: crear/editar en form inline, eliminar con confirmación.
3. **Árbol de Vacunación** — Select de especie → tabla de vacunas (nombre, dosis, periodicidad). CRUD inline.

---

## Archivos a Modificar

### 5. `src/app/App.tsx`
- Agregar `"parametros"` al union `ModuleType`
- Importar `ParametrosModule`
- Agregar render `{activeModule === "parametros" && <AdminGuard><ParametrosModule /></AdminGuard>}`

### 6. `src/app/components/Navigation.tsx`
- Agregar ítem al array `navItems`:
  ```ts
  { id: "parametros", label: "Parámetros", icon: Settings2, show: isAdmin }
  ```
- Importar `Settings2` de `lucide-react`

### 7. `src/app/components/modules/PetsModuleEnhanced.tsx`
**Cambio:** reemplazar import de `PREDEFINED_SPECIES` + `getBreedsBySpecies()` por llamadas a `parametrosService`.

```ts
// Antes (en useEffect):
setPets(migratedPets);
setClients(...)

// Después (agregar):
traerEspecies().then(setEspecies).catch(() => setEspecies(PREDEFINED_SPECIES_FALLBACK))
traerTodasLasRazas().then(setRazas).catch(() => setRazas(RAZAS_FALLBACK))
```

Estado nuevo: `const [especies, setEspecies] = useState<EspecieParametro[]>([])`  
`const [razas, setRazas] = useState<RazaParametro[]>([])`

Reemplazar en el formulario:
- `PREDEFINED_SPECIES.map(...)` → `especies.map(...)`
- `getBreedsBySpecies(speciesId)` → `razas.filter(r => r.especieId === selectedSpeciesId)`

### 8. `src/app/components/modules/MedicalHistoryModuleNew.tsx`
**Cambio 1:** Reemplazar `CLINICAL_EVENT_TYPES` array hardcodeado.
```ts
// Antes: const CLINICAL_EVENT_TYPES = [...]
// Después:
const [tiposEvento, setTiposEvento] = useState<TipoEvento[]>([])
useEffect(() => {
  traerTiposEvento().then(setTiposEvento).catch(() => setTiposEvento(TIPOS_EVENTO_FALLBACK))
}, [])
```

**Cambio 2:** En el Select de tipo de evento, mapear desde `tiposEvento` en lugar del array hardcodeado.

**Cambio 3:** Sección de Seguimiento de Vacunas.  
Al seleccionar `eventType === "Vacuna"` (o equivalente desde tiposEvento), mostrar:
- Select de vacuna (filtrado por especie de la mascota seleccionada, cargado desde `arbolVacunacion`)
- Campo calculado automáticamente: "Próximo refuerzo: [fecha calculada = fecha_registro + periodicidadDias]"
- El campo `nextAppointmentDate` del `MedicalRecord` se pre-rellena con esa fecha

En la vista de historial, sección nueva "Seguimiento de Vacunas": tabla que filtra `petHistory` donde `eventType` es tipo vacuna, y muestra: Vacuna | Fecha | Próximo refuerzo | Estado (vencida / próxima / al día).

### 9. `src/app/components/modules/AppointmentsModule.tsx`
**Cambio 1:** Agregar campo "Motivo / Tipo de evento" como Select dinámico.
```ts
const [tiposEvento, setTiposEvento] = useState<TipoEvento[]>([])
useEffect(() => { traerTiposEvento().then(setTiposEvento)... }, [])
```
Agregar al `formData`: `eventoTipoId: ""`  
Agregar Select en el formulario (visible cuando `type === "clinic"`):
```tsx
<Select value={formData.eventoTipoId} onValueChange={...}>
  {tiposEvento.filter(t => t.active).map(t => <SelectItem .../>)}
</Select>
```

**Cambio 2:** Reemplazar `initialDoctors` con `doctorService.traerDoctores()`.
```ts
traerDoctores().then(setDoctors).catch(() => setDoctors(initialDoctors))
```

### 10. `src/app/components/modules/UsersModule.tsx`
**Cambio 1:** Extender `formData` con campos de doctor:
```ts
formData.licenseNumber: ""   // Número de matrícula
formData.specialty: ""       // Especialidad
```

**Cambio 2:** Mostrar campos extra cuando `role === "veterinario"`:
- Input "Número de Matrícula"
- Input "Especialidad / Profesión"

**Cambio 3:** En `handleSaveUser`, cuando `needsSchedule(role)`, persistir doctor en Firestore via `doctorService.registrarDoctor()` en lugar de solo `setDoctors(prev => [...prev, newDoctor])`.

**Cambio 4:** `doctors` state se carga desde `doctorService.traerDoctores()` en lugar de `localStorage.veterinaria_doctors`.

---

## Firestore Rules a agregar en `firestore.rules`

```
match /especies/{docId}   { allow read: if isAuthenticated(); allow write: if isAdmin(); }
match /razas/{docId}      { allow read: if isAuthenticated(); allow write: if isAdmin(); }
match /tiposEvento/{docId}{ allow read: if isAuthenticated(); allow write: if isAdmin(); }
match /arbolVacunacion/{docId} { allow read: if isAuthenticated(); allow write: if isAdmin(); }
match /doctores/{docId}   { allow read: if isAuthenticated(); allow write: if isAdmin(); }
```

---

## Orden de Implementación

1. Tipos en `types/index.ts` (no rompe nada)
2. `parametrosService.ts` (nuevo archivo independiente)
3. `doctorService.ts` (nuevo archivo independiente)
4. `ParametrosModule.tsx` (nuevo, referencia los 2 servicios anteriores)
5. `App.tsx` + `Navigation.tsx` (wiring del módulo nuevo)
6. `PetsModuleEnhanced.tsx` (consume `parametrosService`)
7. `MedicalHistoryModuleNew.tsx` (consume `parametrosService`, agrega sección vacunas)
8. `AppointmentsModule.tsx` (consume `tiposEvento` + `doctorService`)
9. `UsersModule.tsx` (extiende form + persiste en `doctorService`)
10. `firestore.rules` (5 reglas nuevas)

---

## Estrategia de Fallback

Todos los servicios siguen el patrón establecido:
- Si `FIREBASE_CONFIGURED === false` → localStorage como fuente
- Keys localStorage se pre-populan con los datos estáticos actuales como seed inicial
- Los módulos no rompen si Firestore no responde

---

## Verificación

1. **Admin login** → ir a "Parámetros" → crear especie "Tortuga" + raza "Mediterránea"
2. **Mascotas** → crear nueva → especie selector incluye "Tortuga" → razas filtradas muestran "Mediterránea"
3. **Historial Clínico** → tipo evento dropdown muestra tipos editados en Parámetros
4. **Historial Clínico** → registrar vacuna → campo "próximo refuerzo" se precalcula
5. **Turnos** → formulario muestra select "Motivo" con tipos dinámicos de Firestore
6. **Usuarios** → crear usuario veterinario → campos matrícula/especialidad visibles → doctor aparece en selector de turnos
