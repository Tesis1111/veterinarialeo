# PROMPT PARA EDITOR — SISTEMA VETERINARIO "veterinarialeo"

**Repositorio:** https://github.com/Tesis1111/veterinarialeo  
**Deploy actual:** https://veterinarialeo.vercel.app  
**Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Shadcn UI (Radix UI) + Firebase (Firestore + Auth) + Recharts  
**Base de datos:** Firebase Firestore  
**Colecciones existentes en Firestore:** `usuarios`, `clientes`, `mascotas`, `historiales`, `turnos`, `horarios`, `auditoria`, `especies`, `razas`, `tiposEvento`, `arbolVacunacion`, `doctores`

---

## REGLA GENERAL — OBLIGATORIA PARA TODOS LOS CAMBIOS

**TODO dato que el usuario cargue o modifique en el sistema DEBE guardarse y leerse desde Firebase Firestore.** No usar localStorage, no usar estado local como única fuente de verdad, no usar datos hardcodeados como reemplazo de la base de datos. Cada operación de alta, baja o modificación debe ejecutar el `addDoc`, `setDoc` o `updateDoc` correspondiente contra Firestore, y cada pantalla debe leer los datos en tiempo real con `onSnapshot` o `getDocs` desde Firestore.

---

## CAMBIO 1 — PARÁMETROS: ESPECIES, RAZAS Y SU USO EN TODO EL SISTEMA

### Problema actual:
El módulo de parámetros permite cargar especies y razas, pero esos datos NO se propagan correctamente a todos los componentes que los necesitan. Además, al querer agregar una especie nueva, el sistema pide un emoji de forma obligatoria, lo cual es innecesario.

### Solución requerida:

**1.1 — Módulo de Parámetros (sección Especies y Razas):**
- El campo "emoji" al crear una especie debe ser **opcional**, nunca obligatorio. Si se deja vacío, guardar la especie sin emoji o con un valor por defecto genérico (por ejemplo `"🐾"`). Eliminar cualquier validación que bloquee el guardado por falta de emoji.
- Cuando el usuario guarda una especie nueva, debe ejecutar `addDoc` a la colección `especies` en Firestore con los campos `{ nombre: string, emoji?: string, activa: boolean, creadaEn: Timestamp }`.
- Cuando el usuario guarda una raza nueva, debe ejecutar `addDoc` a la colección `razas` en Firestore con los campos `{ nombre: string, especieId: string, activa: boolean, creadaEn: Timestamp }`.

**1.2 — Propagación a todos los componentes que usan Especie/Raza:**  
Los siguientes componentes deben leer las especies y razas DESDE FIRESTORE (colecciones `especies` y `razas`) y mostrarlas en combobox/select:
- **Registrar nueva mascota** (`PetsModuleEnhanced.tsx`): select de especie → al elegir especie, el select de raza debe filtrarse mostrando solo las razas de esa especie.
- **Editar mascota**: misma lógica que registrar.
- **Módulo de vacunas / árbol de vacunación**: el selector de especie para filtrar vacunas debe leer de Firestore.
- **Filtros avanzados de mascotas**: el filtro por especie debe leer de Firestore, no de lista hardcodeada.
- **Reportes**: los gráficos de distribución por especie deben usar los nombres tal cual están en Firestore.
- Ningún combobox de especie o raza en todo el sistema debe tener valores escritos a mano en el código. Siempre leer de Firestore.

---

## CAMBIO 2 — EVENTOS CLÍNICOS: CARGA EN PARÁMETROS Y USO EN TURNOS E HISTORIAL

### Problema actual:
Los tipos de evento clínico (consulta, vacuna, cirugía, etc.) no se cargan desde los parámetros hacia el formulario de "Registrar turno" ni hacia "Historial clínico". El campo aparece abierto (texto libre).

### Solución requerida:

**2.1 — Módulo de Parámetros (sección Tipos de Evento):**
- El usuario debe poder agregar, editar y eliminar tipos de evento clínico desde parámetros.
- Cada alta debe ejecutar `addDoc` a la colección `tiposEvento` en Firestore con `{ nombre: string, descripcion?: string, activo: boolean, creadoEn: Timestamp }`.

**2.2 — Formulario "Registrar Turno":**
- El campo "Tipo de consulta / motivo" debe ser un `<Select>` (combobox) que lea la colección `tiposEvento` de Firestore en tiempo real.
- El formulario debe permitir seleccionar **una o más consultas por turno**. Implementar multi-selección: el usuario puede agregar múltiples ítems de tipo de evento al mismo turno (por ejemplo: "Vacuna" + "Control general"). Guardar como array en el documento del turno en Firestore: `tiposEvento: string[]`.

**2.3 — Formulario "Registrar entrada en Historial Clínico":**
- El campo "Tipo de evento" debe ser un `<Select>` que lea `tiposEvento` de Firestore. Eliminar el campo de texto libre para este dato.

---

## CAMBIO 3 — AGENDAR TURNO: REPARAR LA FUNCIONALIDAD COMPLETA

### Problema actual:
El botón/flujo de "Agendar turno" no funciona. El turno no se guarda o el formulario no procesa correctamente.

### Solución requerida:
- Revisar el componente `AppointmentsModule.tsx` (o el que maneje los turnos) y depurar completamente el flujo de guardado.
- Al confirmar un turno, debe ejecutarse `addDoc` a la colección `turnos` de Firestore con la siguiente estructura mínima:
  ```
  {
    clienteId: string,
    mascotaId: string,
    doctorId: string,
    fecha: Timestamp,
    hora: string,
    tiposEvento: string[],
    estado: 'pendiente' | 'confirmado' | 'cancelado' | 'realizado',
    notas?: string,
    creadoEn: Timestamp
  }
  ```
- Una vez guardado exitosamente en Firestore, mostrar un toast/snackbar de confirmación ("Turno agendado correctamente") y cerrar el modal/formulario.
- Si ocurre un error al guardar, mostrarlo claramente en pantalla, no fallar silenciosamente.
- La lista de turnos debe actualizarse automáticamente (usando `onSnapshot`) al agregar uno nuevo.

---

## CAMBIO 4 — FECHA DE NACIMIENTO DE MASCOTA: DESHABILITAR FECHAS FUTURAS

### Problema actual:
El calendario para seleccionar la fecha de nacimiento de una mascota permite elegir fechas posteriores a hoy, lo cual no tiene sentido lógico.

### Solución requerida:
- En el componente de registro/edición de mascotas, en el campo de fecha de nacimiento, configurar el `DatePicker` (que usa `react-day-picker`) para deshabilitar todas las fechas posteriores a hoy.
- En `react-day-picker` esto se hace con la prop `disabled={{ after: new Date() }}`.
- Si se usa otro componente de calendario, aplicar la restricción equivalente.
- Agregar validación en el submit del formulario: si `fechaNacimiento > new Date()`, mostrar error y no guardar.

---

## CAMBIO 5 — BAJA DE MASCOTA: REEMPLAZAR ÍCONO CALAVERA Y CAMBIAR TEXTO

### Problema actual:
El sistema usa un ícono de calavera (💀 / `Skull` de lucide-react) para indicar que una mascota falleció, y el botón/acción dice "Marcar Fallecida". Esto es visualmente poco profesional.

### Solución requerida:
- **Eliminar completamente** el ícono `Skull` de lucide-react de toda la aplicación. Buscar todos los `import { Skull }` y todos los usos `<Skull />` y reemplazarlos.
- Reemplazar el ícono por `<Archive />` o `<XCircle />` de lucide-react (ícono de archivar/dar de baja).
- Cambiar todos los textos que digan "Marcar Fallecida", "Fallecida", "Fallecido", "Marcar como fallecida" por **"Dar de baja"** o **"Baja de mascota"**.
- El campo `deceased: boolean` en Firestore puede renombrarse a `deBaja: boolean` o mantenerse como `deceased` internamente, pero en la interfaz nunca debe aparecer la palabra "fallecida" ni el ícono de calavera.
- El badge de estado que actualmente dice "Fallecida" debe decir **"Baja"** y usar color gris o rojo apagado, no negro.
- Esto aplica en: lista de mascotas, modal de confirmación, historial clínico, fichas de mascota, y cualquier otro lugar donde aparezca.

---

## CAMBIO 6 — SEGURIDAD: PERFIL PROFESIONAL EN COMBOBOX AL REGISTRAR USUARIO

### Problema actual:
Al registrar un nuevo usuario en el módulo de Seguridad, el campo "Perfil profesional" o "Rol" aparece como campo de texto libre (input abierto).

### Solución requerida:
- Convertir ese campo en un `<Select>` (combobox) con los roles definidos en el sistema.
- Los roles disponibles deben leerse de Firestore o, si son roles fijos del sistema, estar definidos como constante en el código. Los roles actuales según `firestore.rules` son: `admin`, `veterinario`, `recepcionista`, `peluquero`.
- El select debe mostrar los nombres en formato legible: "Administrador", "Veterinario", "Recepcionista", "Peluquero".
- Si se requiere que estos roles también sean configurables desde parámetros, agregar la colección `roles` en Firestore con los mismos campos que `tiposEvento`.
- Ningún usuario debe poder escribir manualmente el rol; siempre elegir del select.

---

## CAMBIO 7 — HISTORIAL CLÍNICO: REPARAR EL REGISTRO DE NUEVAS ENTRADAS

### Problema actual:
Al intentar agregar un nuevo registro en el historial clínico, la operación falla o no guarda correctamente.

### Solución requerida:

**7.1 — Reparar el guardado en Firestore:**
- Revisar el componente `MedicalHistoryModuleNew.tsx` (o el que maneje el historial clínico).
- Al confirmar el formulario de nuevo registro, debe ejecutarse `addDoc` a la colección `historiales` de Firestore con estructura mínima:
  ```
  {
    mascotaId: string,
    clienteId: string,
    clienteNombre: string,
    doctorId: string,
    fecha: Timestamp,
    tipoEvento: string,
    descripcion: string,
    diagnostico?: string,
    tratamiento?: string,
    medicamentos?: string[],
    peso?: number,
    temperatura?: number,
    proximoControl?: Timestamp,
    creadoEn: Timestamp,
    creadoPor: string
  }
  ```
- Si hay un error de permisos en Firestore, verificar que el usuario autenticado tenga rol `veterinario` o `admin` según las reglas en `firestore.rules`.
- Mostrar mensaje de error claro si el guardado falla.

**7.2 — Eliminar botón "Marcar Fallecida" del historial clínico:**
- Buscar y eliminar el botón "Marcar Fallecida" (o con ícono Skull) que aparece en el módulo de historial clínico.
- Si se necesita dar de baja una mascota desde esa sección, reemplazarlo por un botón que diga **"Dar de baja la mascota"** con ícono `<Archive />`, que abra un modal de confirmación antes de ejecutar la acción.

---

## CAMBIO 8 — MEJORA ESTÉTICA: ORDEN Y ESPACIADO DE ELEMENTOS

### Problema actual:
Algunos botones y secciones están superpuestos, muy juntos entre sí, o mal alineados visualmente.

### Solución requerida:
- **NO cambiar colores ni diseño general.**
- Revisar todos los módulos y aplicar las siguientes correcciones de layout:
  - Usar `gap-3` o `gap-4` (Tailwind) entre botones en la misma fila, reemplazando botones pegados.
  - Los botones de acción de cada fila en tablas (editar, eliminar, dar de baja, etc.) deben estar en un `flex gap-2` bien definido, nunca superpuestos.
  - Las secciones de formulario (modales) deben tener `space-y-4` entre campos.
  - Los cards del dashboard y paneles deben tener `p-4` o `p-6` consistente.
  - Revisar especialmente: módulo de mascotas, módulo de historial clínico, módulo de turnos y módulo de seguridad.
  - Verificar que en pantallas menores a 768px los elementos se apilen correctamente con `flex-col` en lugar de `flex-row`.
- El objetivo es que cada elemento respete su espacio y ningún botón quede encima de otro ni excesivamente cerca del borde del contenedor.

---

## CAMBIO 9 — USUARIOS: REGISTRO FUNCIONAL CON FIREBASE AUTH + FIRESTORE

### Problema actual:
Al registrar un usuario nuevo con email y contraseña desde el módulo de Seguridad, ese usuario no queda registrado en Firebase Authentication ni correctamente en Firestore, por lo que no puede iniciar sesión con esas credenciales.

### Solución requerida:
- Al crear un usuario nuevo desde el módulo de Seguridad, ejecutar en secuencia:
  1. `createUserWithEmailAndPassword(auth, email, password)` para crear el usuario en **Firebase Authentication**.
  2. Con el `uid` retornado, ejecutar `setDoc(doc(db, 'usuarios', uid), { ... })` para guardar en Firestore el perfil del usuario con campos:
     ```
     {
       uid: string,
       email: string,
       nombre: string,
       apellido: string,
       roleName: 'admin' | 'veterinario' | 'recepcionista' | 'peluquero',
       activo: boolean,
       creadoEn: Timestamp
     }
     ```
  3. Si la creación falla (email ya en uso, contraseña débil, etc.), mostrar el mensaje de error de Firebase en la interfaz.
- El campo contraseña en el formulario de creación de usuario debe tener mínimo 6 caracteres (requisito de Firebase Auth).
- Una vez creado, el usuario debe poder iniciar sesión en el sistema con ese email y contraseña.
- La lista de usuarios en el módulo de Seguridad debe leer de la colección `usuarios` en Firestore en tiempo real.

---

## CAMBIO 10 — REGLA GENERAL FINAL: PERSISTENCIA TOTAL EN FIREBASE

Este punto resume y refuerza todo lo anterior. Auditar **cada módulo** del sistema para garantizar que:

- **Módulo Clientes:** alta, edición y baja de clientes guarda/actualiza en colección `clientes` de Firestore.
- **Módulo Mascotas:** alta, edición y baja de mascotas guarda/actualiza en colección `mascotas` de Firestore.
- **Módulo Historial Clínico:** cada entrada guarda en colección `historiales` de Firestore.
- **Módulo Turnos:** alta, edición y cancelación de turnos guarda/actualiza en colección `turnos` de Firestore.
- **Módulo Parámetros:** cada ítem (especie, raza, tipo de evento, árbol de vacunación) guarda en su colección correspondiente de Firestore (`especies`, `razas`, `tiposEvento`, `arbolVacunacion`).
- **Módulo Seguridad:** usuarios se crean en Firebase Auth + `usuarios` en Firestore, como se especifica en el Cambio 9.
- **Ningún dato crítico debe vivir únicamente en estado de React o localStorage.** Si algo necesita persistencia entre sesiones, va a Firestore.
- Todos los listados deben usar `onSnapshot` para actualizarse en tiempo real cuando otro usuario hace un cambio.

---

## CONTEXTO TÉCNICO IMPORTANTE PARA EL EDITOR

- El archivo `firestore.rules` ya tiene las reglas de seguridad por rol (`admin`, `veterinario`, `recepcionista`, `peluquero`) correctamente definidas. Las colecciones `especies`, `razas`, `tiposEvento` y `arbolVacunacion` solo permiten escritura a `admin`. Tener en cuenta esto al probar.
- El proyecto usa `firebase@^12.14.0`. La sintaxis es la modular (v9+): `import { getFirestore, collection, addDoc, ... } from 'firebase/firestore'`.
- El proyecto usa `react-day-picker@8.10.1` para calendarios/date pickers.
- Lucide React está en versión `0.487.0`. El ícono `Skull` existe en esa versión; reemplazarlo por `Archive` o `XCircle`.
- Para los selects/combobox se usa Radix UI (`@radix-ui/react-select`). No introducir librerías nuevas si ya hay una disponible en el proyecto.
- El proyecto ya tiene `sonner@2.0.3` para toasts/notificaciones. Usarlo para los mensajes de confirmación y error.
- Mantener la paleta de colores existente (naranja como color principal, según `default_shadcn_theme.css`).
- No introducir dependencias nuevas salvo que sea estrictamente necesario y no haya alternativa en las ya instaladas.

