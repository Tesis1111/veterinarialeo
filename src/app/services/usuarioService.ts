/**
 * Módulo Seguridad — Capa de Servicios
 *
 * Gestores implementados:
 *   • Gestor Usuarios y Permisos — validarUnicidadUsuario(), registrarUsuario(),
 *                                   asignarRoles(), asignarPermisos()
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, FIREBASE_CONFIGURED } from "../firebase/config";
import { User, UserFormData, PermissionName, FormValidationResult } from "../types";

const COL = "usuarios";

// ── Permission map ──────────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<string, PermissionName[]> = {
  admin: [
    "view_clients", "manage_clients",
    "view_pets", "manage_pets",
    "view_medical_history", "manage_medical_history", "delete_medical_history",
    "view_appointments", "manage_appointments",
    "view_users", "manage_users", "manage_roles",
    "view_audit", "manage_system_config", "manage_services",
  ],
  veterinario: [
    "view_clients", "manage_clients",
    "view_pets", "manage_pets",
    "view_medical_history", "manage_medical_history",
    "view_appointments", "manage_appointments",
  ],
  recepcionista: [
    "view_clients", "manage_clients",
    "view_pets", "manage_pets",
    "view_medical_history",
    "view_appointments", "manage_appointments",
  ],
  peluquero: [
    "view_clients",
    "view_pets",
    "view_appointments", "manage_appointments",
  ],
};

// ── Conversion ──────────────────────────────────────────────────────────────

function toUser(id: string, data: Record<string, any>): User {
  return {
    id,
    username: data.username ?? "",
    email: data.email ?? "",
    fullName: data.fullName ?? "",
    roleId: data.roleId ?? "recepcionista",
    roleName: data.roleName ?? data.roleId ?? "recepcionista",
    permissions: data.permissions ?? ROLE_PERMISSIONS[data.roleId ?? "recepcionista"] ?? [],
    phone: data.phone,
    active: data.active !== false,
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate(),
    lastLogin: (data.lastLogin as Timestamp)?.toDate(),
  };
}

// ── localStorage fallback ───────────────────────────────────────────────────

// Users are NOT persisted to localStorage in Firebase mode; mock list is readonly
const MOCK_PASSWORDS: Record<string, string> = {
  admin: "admin123",
  veterinario: "vet123",
  recepcionista: "rec123",
};

// ─────────────────────────────────────────────────────────────────────────
// Gestor Usuarios y Permisos
// ─────────────────────────────────────────────────────────────────────────

/** Verifica que el username o email no estén en uso. */
export async function validarUnicidadUsuario(
  username: string,
  email: string,
  excludeId?: string
): Promise<FormValidationResult> {
  const errors = [];

  if (FIREBASE_CONFIGURED && db) {
    const [byUsername, byEmail] = await Promise.all([
      getDocs(query(collection(db, COL), where("username", "==", username))),
      getDocs(query(collection(db, COL), where("email", "==", email))),
    ]);

    if (!byUsername.empty && byUsername.docs.every((d) => d.id !== excludeId)) {
      errors.push({ field: "username", message: "El nombre de usuario ya está en uso." });
    }
    if (!byEmail.empty && byEmail.docs.every((d) => d.id !== excludeId)) {
      errors.push({ field: "email", message: "El email ya está registrado." });
    }
  }
  // In mock mode we skip the uniqueness check (readonly list)

  return { valid: errors.length === 0, errors };
}

/**
 * Registra un nuevo usuario: crea la cuenta en Firebase Auth
 * y escribe el documento en la colección /usuarios.
 */
export async function registrarUsuario(
  data: UserFormData,
  createdBy: string
): Promise<User> {
  if (FIREBASE_CONFIGURED && auth && db) {
    if (!data.password) throw new Error("La contraseña es obligatoria al crear un usuario.");

    const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
    const { password, ...safeData } = data;
    void password; // not stored in Firestore

    const userDoc: Record<string, unknown> = {
      ...safeData,
      roleName: data.roleId,
      permissions: ROLE_PERMISSIONS[data.roleId] ?? [],
      createdBy,
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, COL, cred.user.uid), userDoc);

    return toUser(cred.user.uid, { ...userDoc, createdAt: new Date() });
  }

  // Mock fallback: just return a shaped object (no persistence)
  const mockUser: User = {
    id: Date.now().toString(),
    ...data,
    roleName: data.roleId as User["roleName"],
    permissions: ROLE_PERMISSIONS[data.roleId] ?? [],
    createdAt: new Date(),
  };
  return mockUser;
}

/** Asigna un nuevo rol a un usuario existente. */
export async function asignarRoles(
  userId: string,
  roleId: string,
  updatedBy: string
): Promise<void> {
  const newPermissions = ROLE_PERMISSIONS[roleId] ?? [];

  if (FIREBASE_CONFIGURED && db) {
    await updateDoc(doc(db, COL, userId), {
      roleId,
      roleName: roleId,
      permissions: newPermissions,
      updatedBy,
      updatedAt: serverTimestamp(),
    });
    return;
  }
  // Mock: no-op
}

/** Asigna permisos granulares a un usuario (overrides role defaults). */
export async function asignarPermisos(
  userId: string,
  permissions: PermissionName[],
  updatedBy: string
): Promise<void> {
  if (FIREBASE_CONFIGURED && db) {
    await updateDoc(doc(db, COL, userId), {
      permissions,
      updatedBy,
      updatedAt: serverTimestamp(),
    });
    return;
  }
  // Mock: no-op
}

// ─────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────

export async function modificarUsuario(
  id: string,
  data: Partial<UserFormData>,
  updatedBy: string
): Promise<User> {
  if (FIREBASE_CONFIGURED && db) {
    const { password, ...safeData } = data;
    void password;
    const ref = doc(db, COL, id);
    await updateDoc(ref, { ...safeData, updatedBy, updatedAt: serverTimestamp() });
    const snap = await getDoc(ref);
    return toUser(id, snap.data() as Record<string, any>);
  }

  throw new Error("Modificar usuarios en modo demo requiere Firebase configurado.");
}

export async function desactivarUsuario(id: string, updatedBy: string): Promise<void> {
  if (FIREBASE_CONFIGURED && db) {
    await updateDoc(doc(db, COL, id), {
      active: false,
      updatedBy,
      updatedAt: serverTimestamp(),
    });
    return;
  }
  // Mock: no-op
}

export async function traerUsuarios(): Promise<User[]> {
  if (FIREBASE_CONFIGURED && db) {
    const q = query(collection(db, COL), orderBy("fullName"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => toUser(d.id, d.data()));
  }

  // Return mock users
  return [
    {
      id: "1", username: "admin", email: "admin@veterinaria.com",
      fullName: "Administrador Principal", roleId: "admin", roleName: "admin",
      permissions: ROLE_PERMISSIONS.admin, active: true, createdAt: new Date(2020, 0, 1),
    },
    {
      id: "2", username: "veterinario", email: "veterinario@veterinaria.com",
      fullName: "Dra. María Fernández", roleId: "veterinario", roleName: "veterinario",
      permissions: ROLE_PERMISSIONS.veterinario, active: true, createdAt: new Date(2021, 0, 1),
    },
    {
      id: "3", username: "recepcionista", email: "recepcionista@veterinaria.com",
      fullName: "Juan Pérez", roleId: "recepcionista", roleName: "recepcionista",
      permissions: ROLE_PERMISSIONS.recepcionista, active: true, createdAt: new Date(2021, 6, 1),
    },
  ];
}

export async function traerUsuarioPorId(id: string): Promise<User | null> {
  if (FIREBASE_CONFIGURED && db) {
    const snap = await getDoc(doc(db, COL, id));
    return snap.exists() ? toUser(snap.id, snap.data()) : null;
  }

  const users = await traerUsuarios();
  return users.find((u) => u.id === id) ?? null;
}

export { MOCK_PASSWORDS };
