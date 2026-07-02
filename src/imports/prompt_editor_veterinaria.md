# Instrucciones Principales para el Editor de Código (Cursor / Copilot / Windsurf)

**Contexto del Proyecto:**
Este proyecto es el código fuente de "Veterinaria Leo", una aplicación web desarrollada para una tesis de grado en Analista de Sistemas. Está construida con React, TypeScript, Vite, Tailwind CSS, Shadcn UI y utiliza Firebase (Firestore + Auth) como backend. El despliegue se gestiona mediante Vercel.

**Objetivo:**
Necesito que actúes como un desarrollador Senior en React y Firebase. Tu objetivo es implementar una serie de refactorizaciones y correcciones críticas para que el sistema funcione al 100%, manteniendo la coherencia de la base de datos y la interfaz de usuario.

---

## ⚠️ REGLAS ESTRICTAS (NO IGNORAR)
1. **Infraestructura intacta:** NO debes modificar ni romper la configuración de Vercel (`vercel.json`, `vite.config.ts`) ni la inicialización de Firebase (`src/app/firebase/config.ts`).
2. **Consistencia de UI:** Utiliza los componentes existentes de Shadcn UI (especialmente `Select`, `Combobox`, `Form`) para mantener la coherencia visual.
3. **Tipado estricto:** Actualiza las interfaces de TypeScript en `src/app/types/index.ts` o en los archivos correspondientes para reflejar cualquier cambio en la base de datos.
4. **Manejo de estados:** Usa los hooks de React adecuados y asegúrate de manejar los estados de carga (`loading`) y error al hacer peticiones a Firebase.

---

## 🛠️ TAREAS A EJECUTAR (PASO A PASO)

A continuación, detallo los 6 puntos críticos que debes resolver. Por favor, aborda cada uno leyendo primero los archivos involucrados y luego aplicando los cambios.

### 1. Sincronización Global y Dinámica de Mascotas, Especies y Razas
**Problema:** Actualmente, los datos de mascotas, especies y razas no están centralizados o no se reflejan globalmente en todos los formularios.
**Solución requerida:**
- Revisa `src/app/services/mascotaService.ts` y asegúrate de que existan funciones robustas para obtener Especies, Razas y Mascotas desde Firestore.
- En TODAS las vistas donde se requiera ingresar o seleccionar una mascota, especie o raza (Mascotas, Historia Clínica, Agendar Turno, etc.), DEBES reemplazar cualquier input de texto o array estático por un componente tipo `Combobox` o `Select` dinámico.
- Estos componentes deben alimentarse directamente de los registros existentes en la base de datos (colecciones de mascotas/especies). Cuando se registra una nueva entidad en la base de datos, debe aparecer automáticamente en todos los desplegables del sistema.

### 2. Eliminación del campo "Motivo de Consulta" en Turnos
**Problema:** Al agendar un turno, aparece un campo de texto abierto que no es necesario.
**Solución requerida:**
- Localiza el formulario de agendamiento de turnos (revisa `src/app/components/modules/AppointmentsModule.tsx` y componentes hijos).
- Elimina el campo `motivo de consulta*` de la interfaz de usuario.
- Actualiza la validación del formulario (Zod o validación manual) para que ya no exija este campo.
- Revisa `src/app/services/turnoService.ts` y las interfaces TS para asegurarte de que al guardar en Firestore, la ausencia de este campo no rompa el tipado ni la inserción de datos.

### 3. Corrección del Sistema de Roles y Creación de Usuarios
**Problema:** Al crear un nuevo usuario y asignarle un rol, la base de datos no lo está guardando correctamente con la estructura esperada (`role`, `roleID`, etc.).
**Solución requerida:**
- Analiza minuciosamente cómo está estructurada la interfaz de Usuario (revisa `src/app/types/index.ts` y `src/app/services/usuarioService.ts`).
- Entiende el modelo actual de la base de datos para los roles.
- Modifica la lógica de guardado en el módulo de Usuarios (`src/app/components/modules/UsersModule.tsx`) para garantizar que el `rol` seleccionado en el UI se formatee correctamente y se guarde en Firestore bajo los campos precisos que requiere el sistema (ej. `role: "admin"`, `roleId: "xxx"`).
- Asegúrate de que al listar los usuarios, el rol se lea y renderice correctamente.

### 4. Gestión Dinámica de Profesionales (Veterinarios)
**Problema:** Faltan listados dinámicos para los profesionales.
**Solución requerida:**
- Cuando se registra un nuevo profesional (Doctor/Veterinario), este debe guardarse correctamente en su colección correspondiente (revisa `src/app/services/doctorService.ts`).
- En CUALQUIER parte del sistema donde se requiera asignar o seleccionar un profesional (por ejemplo, en Turnos o Historias Clínicas), debes extraer los datos de la base de datos y mostrarlos mediante un `Combobox` o `Select`.
- Asegúrate de que en todos los registros donde se asocia un profesional, se guarde su `id` y/o nombre referenciado a la colección de profesionales.

### 5. Limpieza y Optimización del Proyecto
**Problema:** Existen archivos inservibles, duplicados o código muerto que sobrecarga el proyecto.
**Solución requerida:**
- Realiza un análisis de la carpeta `src/app/components/modules/` y elimina componentes duplicados u obsoletos (por ejemplo, verifica si `PetsModule.tsx` y `PetsModuleEnhanced.tsx` o `MedicalHistoryModule.tsx` y `MedicalHistoryModuleNew.tsx` están compitiendo, y elimina el que ya no se usa, integrando lo mejor en el archivo principal).
- Elimina archivos Markdown innecesarios de pruebas o instrucciones pasadas que ya no aplican al código de producción, SOLO si estás 100% seguro de que no afectan el build ni la documentación clave de la tesis.
- Limpia importaciones no utilizadas en los archivos `.tsx` y `.ts`.

---

## 🔍 ARCHIVOS CLAVE PARA REVISAR ANTES DE CODIFICAR
Por favor, analiza estos archivos para entender la arquitectura antes de proponer los cambios:
- **Tipos e Interfaces:** `src/app/types/index.ts`
- **Servicios:** `src/app/services/mascotaService.ts`, `src/app/services/turnoService.ts`, `src/app/services/usuarioService.ts`, `src/app/services/doctorService.ts`
- **Módulos UI:** `src/app/components/modules/AppointmentsModule.tsx`, `src/app/components/modules/PetsModule.tsx`, `src/app/components/modules/UsersModule.tsx`
- **Componentes Base:** Componentes dentro de `src/app/components/ui/` (Select, Combobox, Form).

**Instrucción Final para la IA:** No me des explicaciones largas. Simplemente comienza a leer los archivos relevantes, dime qué vas a hacer brevemente, y ejecuta las refactorizaciones necesarias archivo por archivo asegurándote de que el proyecto compila y funciona perfecto al 100%.
