/**
 * userService.ts — Servicio público de gestión de usuarios
 *
 * Este archivo es la fachada principal para operaciones de usuario y
 * asignación de roles.  Internamente delega en usuarioService.ts (que
 * contiene la lógica de Firestore / Firebase Auth) y agrega helpers de
 * alto nivel que la UI consume directamente.
 *
 * Exporta todo el contrato de usuarioService más utilidades extra:
 *   - bootstrapFirstAdmin()   → crea el primer admin desde Firebase Console
 *   - asignarRolSeguro()      → verifica que el llamante sea admin antes de cambiar roles
 *   - getPermissionLabel()    → etiquetas legibles para la UI
 */

export {
  traerUsuarios,
  traerUsuarioPorId,
  registrarUsuario,
  modificarUsuario,
  desactivarUsuario,
  validarUnicidadUsuario,
  asignarRoles,
  asignarPermisos,
  ROLE_PERMISSIONS,
} from "./usuarioService";

import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth, FIREBASE_CONFIGURED } from "../firebase/config";
import { PermissionName, User } from "../types";
import { ROLE_PERMISSIONS } from "./usuarioService";

// ── Permission display labels (Spanish) ───────────────────────────────────

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

// ── Role display metadata ─────────────────────────────────────────────────

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

// ── asignarRolSeguro ──────────────────────────────────────────────────────

/**
 * Cambia el rol de un usuario con verificación de que el llamante es admin.
 * Escribe directamente en /usuarios/{uid} (no a través de Firebase Auth Custom Claims
 * ya que eso requeriría Cloud Functions; los claims se leen sólo en el contexto).
 *
 * @param callerUser  El usuario autenticado que realiza la acción
 * @param targetUid   UID del usuario al que se le cambia el rol
 * @param newRole     Nuevo rol a asignar
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
    throw new Error("Firebase no está configurado. Configure las variables de entorno.");
  }

  const newPermissions: PermissionName[] = ROLE_PERMISSIONS[newRole] ?? [];

  await setDoc(
    doc(db, "usuarios", targetUid),
    {
      roleId: newRole,
      roleName: newRole,
      permissions: newPermissions,
      updatedBy: callerUser.id,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// ── bootstrapFirstAdmin ───────────────────────────────────────────────────

/**
 * Eleva a admin al usuario actualmente autenticado en Firebase Auth.
 * Úsese UNA VEZ desde la consola del navegador o desde un script de seed
 * cuando el documento /usuarios/{uid} aún no existe o no tiene rol.
 *
 * IMPORTANTE: Este método NO está disponible en la UI de producción.
 * Para usar en la consola del navegador:
 *   import { bootstrapFirstAdmin } from './services/userService';
 *   await bootstrapFirstAdmin();
 */
export async function bootstrapFirstAdmin(): Promise<void> {
  if (!FIREBASE_CONFIGURED || !db || !auth) {
    throw new Error("Firebase no configurado.");
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("No hay sesión activa en Firebase Auth. Inicie sesión primero.");
  }

  await setDoc(
    doc(db, "usuarios", currentUser.uid),
    {
      uid: currentUser.uid,
      email: currentUser.email,
      fullName: currentUser.displayName ?? "Administrador",
      username: (currentUser.email ?? "admin").split("@")[0],
      roleId: "admin",
      roleName: "admin",
      permissions: ROLE_PERMISSIONS.admin,
      active: true,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  console.info(
    `✅ Usuario ${currentUser.email} promovido a admin en Firestore. ` +
    "Recargue la página para aplicar los cambios."
  );
}
