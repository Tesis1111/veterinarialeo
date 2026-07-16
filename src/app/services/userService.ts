/**
 * userService.ts — Fachada pública de gestión de usuarios
 *
 * Re-exporta todo el contrato de usuarioService.ts y agrega:
 *   - ROLE_PERMISSIONS  → permisos por defecto de cada rol
 *   - PERMISSION_LABELS → etiquetas en español para la UI
 *   - ROLE_META         → metadatos visuales por rol (colores, descripción)
 *   - asignarRolSeguro  → cambio de rol verificando que el llamante sea admin
 *   - bootstrapFirstAdmin → promueve la primera cuenta a admin (consola)
 */

// ── Re-export full usuarioService contract ────────────────────────────────────
export {
  traerUsuarios,
  traerUsuarioPorId,
  registrarUsuario,
  modificarUsuario,
  desactivarUsuario,
  validarUnicidadUsuario,
  asignarRoles,
  asignarPermisos,
} from "./usuarioService";

import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth, FIREBASE_CONFIGURED } from "../firebase/config";
import { PermissionName, User } from "../types";
// ROLE_PERMISSIONS is the single source of truth — defined in AuthContext
import { ROLE_PERMISSIONS } from "../context/AuthContext";
export { ROLE_PERMISSIONS };

// ─────────────────────────────────────────────────────────────────────────────
// Permission display labels (Spanish UI strings)
// ─────────────────────────────────────────────────────────────────────────────
export const PERMISSION_LABELS: Record<PermissionName, string> = {
  view_clients:           "Ver clientes",
  manage_clients:         "Gestionar clientes",
  view_pets:              "Ver mascotas",
  manage_pets:            "Gestionar mascotas",
  view_medical_history:   "Ver historia clínica",
  manage_medical_history: "Gestionar historia clínica",
  delete_medical_history: "Eliminar historia clínica",
  view_appointments:      "Ver turnos",
  manage_appointments:    "Gestionar turnos",
  view_users:             "Ver usuarios",
  manage_users:           "Gestionar usuarios",
  manage_roles:           "Gestionar roles",
  view_audit:             "Ver auditoría",
  manage_system_config:   "Configuración del sistema",
  manage_services:        "Gestionar servicios",
};

// ─────────────────────────────────────────────────────────────────────────────
// Role visual metadata
// ─────────────────────────────────────────────────────────────────────────────
export const ROLE_META: Record<string, {
  displayName: string;
  color: string;
  bgColor: string;
  description: string;
}> = {
  admin: {
    displayName: "Administrador",
    color: "text-orange-800",
    bgColor: "bg-orange-100 border-orange-300",
    description: "Acceso completo al sistema",
  },
  veterinario: {
    displayName: "Veterinario",
    color: "text-blue-800",
    bgColor: "bg-blue-100 border-blue-300",
    description: "Gestión clínica y de turnos",
  },
  recepcionista: {
    displayName: "Recepcionista",
    color: "text-green-800",
    bgColor: "bg-green-100 border-green-300",
    description: "Atención al cliente y agenda",
  },
  peluquero: {
    displayName: "Peluquero",
    color: "text-purple-800",
    bgColor: "bg-purple-100 border-purple-300",
    description: "Servicios de peluquería",
  },
};

export function getPermissionLabel(permission: PermissionName): string {
  return PERMISSION_LABELS[permission] ?? permission;
}

// ─────────────────────────────────────────────────────────────────────────────
// asignarRolSeguro — cambio de rol con verificación de privilegio
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cambia el rol de `targetUid` verificando que `callerUser` sea admin.
 * Escribe roleId, roleName y permissions en /usuarios/{targetUid}.
 */
export async function asignarRolSeguro(
  callerUser: User,
  targetUid: string,
  newRole: "admin" | "veterinario" | "recepcionista" | "peluquero"
): Promise<void> {
  if (callerUser.roleName !== "admin") {
    throw new Error("Solo un administrador puede cambiar roles.");
  }
  if (!FIREBASE_CONFIGURED || !db) {
    throw new Error(
      "Firebase no configurado. Defina las variables VITE_FIREBASE_* en el entorno."
    );
  }

  await setDoc(
    doc(db, "usuarios", targetUid),
    {
      roleId: newRole,
      roleName: newRole,
      permissions: ROLE_PERMISSIONS[newRole] ?? [],
      updatedBy: callerUser.id,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// bootstrapFirstAdmin — inicialización del primer administrador
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea o completa el documento /usuarios/{uid} del usuario actualmente
 * autenticado en Firebase Auth, asignándole el rol admin.
 *
 * Úselo UNA SOLA VEZ desde la consola del navegador para preparar
 * la primera cuenta de administrador:
 *
 *   const { bootstrapFirstAdmin } = await import('/src/app/services/userService.ts');
 *   await bootstrapFirstAdmin();
 *
 * Luego recargue la página. A partir de ahí use la UI de Usuarios para
 * crear las demás cuentas.
 */
export async function bootstrapFirstAdmin(): Promise<void> {
  if (!FIREBASE_CONFIGURED || !db || !auth) {
    throw new Error("Firebase no configurado.");
  }

  const fbUser = auth.currentUser;
  if (!fbUser) {
    throw new Error(
      "No hay sesión activa. Inicie sesión en Firebase Auth primero."
    );
  }

  await setDoc(
    doc(db, "usuarios", fbUser.uid),
    {
      uid: fbUser.uid,
      email: fbUser.email,
      fullName: fbUser.displayName ?? "Administrador",
      username: (fbUser.email ?? "admin").split("@")[0],
      roleId: "admin",
      roleName: "admin",
      permissions: ROLE_PERMISSIONS.admin,
      active: true,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  console.info(
    `✅ ${fbUser.email} promovido a admin. Recargue la página para aplicar los cambios.`
  );
}
