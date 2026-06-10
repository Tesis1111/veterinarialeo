# Plan: Migración Estructural a Firebase — Veterinaria Leo

## Context

El sistema actualmente persiste todos sus datos en `localStorage` con datos mock hardcodeados en los contextos (`AuthContext`, `AuditContext`) y en cada módulo. La UI (Vite + Tailwind + shadcn) está completa. El objetivo es reemplazar toda la capa de datos por Firebase (Auth, Firestore, Functions), manteniendo la UI intacta y organizando el código con la nomenclatura de Gestores/Métodos de la documentación técnica.

**Estado actual relevante:**
- `firebase` SDK **no está instalado** (package.json usa `@jsr/supabase__supabase-js` y `hono`)
- `AuthContext.tsx` usa mock users hardcodeados + localStorage
- `AuditContext.tsx` usa localStorage
- Módulos usan localStorage con datos `initial*` como fallback
- `src/app/types/index.ts` ya tiene el modelo normalizado (`User.roleId`, `Role`, `Permission` como objetos)
- No existe carpeta `src/app/services/` ni `src/app/controllers/`
- No existe `src/app/firebase/`

---

## Pasos de Implementación

### 1. Instalar Firebase SDK
```bash
pnpm add firebase
```

### 2. Crear `src/app/firebase/config.ts`
Inicializa Firebase App, `getAuth`, `getFirestore`, `getFunctions` con el SDK modular v10.
Exporta `app`, `auth`, `db`, `functions`.
Usa variables de entorno (`import.meta.env.VITE_FIREBASE_*`) con placeholders en comentarios para que el usuario las configure en `.env.local`.

### 3. Actualizar `src/app/types/index.ts`
Ajustar el tipo `User` para que `AuthContext` lo use consistentemente:
- Mantener `roleId: string` y `role?: Role` (populated)
- Añadir campo `roleName: 'admin' | 'veterinario' | 'recepcionista'` para compatibilidad con el resto de la UI
- Añadir `PermissionName` como tipo de las strings de permiso (ya existe)
- Mantener los tipos `Client`, `Pet`, `Appointment`, etc. sin cambios

### 4. Refactorizar `src/app/context/AuthContext.tsx`
- Reemplazar mock users por `signInWithEmailAndPassword(auth, email, password)`
- Gestionar estado global con `onAuthStateChanged(auth, callback)`
- Al recibir el usuario de Firebase, leer el documento `/usuarios/{uid}` en Firestore para obtener `roleName`, `permissions`, y datos del perfil
- Mantener la misma interface `AuthContextType` (solo `login` cambia de firma: acepta email en lugar de username, o mantiene compatibilidad mapeando)
- `logout()` usa `signOut(auth)`
- `hasPermission()` sigue leyendo `user.permissions`
- Conservar `isAdmin`, `isVeterinario`, `isRecepcionista`

### 5. Crear capa de servicios `src/app/services/`

#### `src/app/services/clienteService.ts`
```
Gestor Alta Cliente:    validarDatos(), ValidarUnicidadCliente(), registrarCliente()
Gestor Modificar Cliente: validarDatos(), asociarCliente()
```
Internamente llama a Firestore colección `clientes`.

#### `src/app/services/mascotaService.ts`
```
Gestor Alta Mascota: validarDatos(), ValidarUnicidadMascota(), registrarMascota()
```
Colección `mascotas`.

#### `src/app/services/historialService.ts`
```
Gestor Alta Historial:   validarTamañoFormato(), registrarHistorial(), guardarArchivo()
Gestor Listar Historial: traerHistorial(), exportarCSV()
```
Colección `historiales`. `guardarArchivo()` sube a Firebase Storage (o guarda base64 en Firestore como fallback).

#### `src/app/services/turnoService.ts`
```
Gestor Alta Turnos:   validarHorario(), validarDisponibilidadProfesional(), validarDuplicados()
Gestor Calendario:    mostrarCalendarioTurno()
Gestor Alertas:       detectarAlertas()
```
Colección `turnos`.

#### `src/app/services/horarioService.ts`
```
Gestor Alta Horario: validarHorario(), registrarHorario()
```
Colección `horarios`.

#### `src/app/services/usuarioService.ts`
```
Gestor Usuarios y Permisos: validarUnicidadUsuario(), registrarUsuario(), asignarRoles(), asignarPermisos()
```
Colección `usuarios`. `registrarUsuario()` llama a Firebase Auth `createUserWithEmailAndPassword` + escribe el documento en `/usuarios/{uid}`.

#### `src/app/services/auditoriaService.ts`
```
Gestor Auditoria: traerAuditoria(), exportarCSV(), registrarAuditoria()
```
Colección `auditoria`.

### 6. Actualizar `src/app/context/AuditContext.tsx`
- `addLog()` llama a `auditoriaService.registrarAuditoria()` (escribe en Firestore)
- `getLogs()` / estado inicial carga desde Firestore con `auditoriaService.traerAuditoria()`
- Mantiene la misma interface pública para no romper los módulos

### 7. Actualizar módulos para usar servicios
Reemplazar los patrones `localStorage.getItem/setItem` en cada módulo por llamadas a los servicios:

| Módulo | Servicio |
|---|---|
| `ClientsModule.tsx` | `clienteService` |
| `PetsModuleEnhanced.tsx` | `mascotaService` |
| `MedicalHistoryModuleNew.tsx` | `historialService` |
| `AppointmentsModule.tsx` | `turnoService` |
| `UsersModule.tsx` | `usuarioService` |
| `BusinessHoursModule.tsx` | `horarioService` |
| `AuditModule.tsx` | `auditoriaService` (vía context) |

Patrón estándar en cada módulo:
```tsx
// ANTES (localStorage)
const saved = localStorage.getItem("veterinaria_clients");

// DESPUÉS (Firestore via service)
const clients = await clienteService.traerClientes();
```
Añadir `loading` + `error` states donde no existan.

### 8. Crear `firestore.rules` en la raíz del proyecto

Reglas RBAC:
```
- /usuarios/**:     admin → R/W; veterinario/recepcionista → read propio
- /clientes/**:     admin, recepcionista → R/W; veterinario → R
- /mascotas/**:     admin, recepcionista → R/W; veterinario → R
- /historiales/**:  admin, veterinario → R/W; recepcionista → R
- /turnos/**:       admin, recepcionista, veterinario → R/W
- /horarios/**:     admin → R/W; resto → R
- /auditoria/**:    admin → R; escritura solo servidor
```
Toda mutación requiere `request.auth != null`.

---

## Estructura de Carpetas Resultante

```
src/app/
├── firebase/
│   └── config.ts              # NEW: init App, auth, db, functions
├── services/                  # NEW
│   ├── clienteService.ts
│   ├── mascotaService.ts
│   ├── historialService.ts
│   ├── turnoService.ts
│   ├── horarioService.ts
│   ├── usuarioService.ts
│   └── auditoriaService.ts
├── context/
│   ├── AuthContext.tsx         # MODIFIED: Firebase Auth
│   └── AuditContext.tsx        # MODIFIED: usa auditoriaService
├── types/
│   └── index.ts                # MODIFIED: ajuste menor en User
└── components/modules/
    └── (todos los módulos)     # MODIFIED: usan services en vez de localStorage
firestore.rules                 # NEW: en raíz del proyecto
```

---

## Notas de Compatibilidad

- Los servicios implementan **graceful degradation**: si Firebase no está configurado (variables de entorno faltantes), caen a un flag `FIREBASE_CONFIGURED = false` y retornan datos desde localStorage como antes. Esto evita romper la UI si el usuario aún no tiene credenciales de Firebase.
- La pantalla de `Login` recibe email en el campo username (el usuario puede ingresar su email completo). Los 3 mock users hardcodeados en AuthContext son eliminados; el admin inicial se crea manualmente en Firebase Console.
- Los IDs de Firestore reemplazan `Date.now().toString()` — se usa `doc(collection(db, 'x')).id` o el UID de Firebase Auth para usuarios.

---

## Verificación

1. **Auth**: iniciar sesión con una cuenta de Firebase; confirmar que `user.roleName` y `user.permissions` se cargan desde `/usuarios/{uid}`
2. **Clientes**: crear un cliente → verificar que aparece en Firestore Console colección `clientes`
3. **Auditoría**: cualquier acción → verificar escritura en colección `auditoria`
4. **Reglas**: intentar leer `historiales` con token de recepcionista → debe ser denegado por Firestore Rules
5. **Fallback**: sin variables de entorno → app sigue funcionando con localStorage
