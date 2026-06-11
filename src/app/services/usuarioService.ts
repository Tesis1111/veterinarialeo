/**
 * usuarioService.ts — Gestión de usuarios
 *
 * Gestor Usuarios y Permisos:
 *   validarUnicidadUsuario()  — verifica username / email únicos en Firestore
 *   registrarUsuario()        — crea cuenta en Firebase Auth + documento en /usuarios
 *   modificarUsuario()        — actualiza campos del documento en /usuarios
 *   desactivarUsuario()       — soft-disable (active: false) en /usuarios
 *   asignarRoles()            — cambia roleId / roleName / permissions en /usuarios
 *   asignarPermisos()         — sobreescribe la lista de permisos en /usuarios
 *
 * IMPORTANTE: todas las operaciones de escritura exigen Firebase configurado.
 * No existe fallback mock: los datos de usuarios NO se guardan en localStorage.
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
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db, FIREBASE_CONFIGURED } from "../firebase/config";
import { User, UserFormData, PermissionName, FormValidationResult } from "../types";

// Import from AuthContext to avoid redefining the same map in multiple places.
// Note: this is a pure data import (no React hooks), so it's safe to use in services.
import { ROLE_PERMISSIONS } from "../context/AuthContext";

const COL = "usuarios";

// ── Firestore → app model ─────────────────────────────────────────────────────

function toUser(id: string, data: Record<string, any>): User {
  const roleName = (data.roleName ?? data.roleId ?? "recepcionista") as User["roleName"];
  return {
    id,
    username: data.username ?? "",
    email: data.email ?? "",
    fullName: data.fullName ?? "",
    roleId: data.roleId ?? roleName ?? "",
    roleName,
    permissions: (data.permissions as PermissionName[]) ?? ROLE_PERMISSIONS[roleName ?? "recepcionista"] ?? [],
    phone: data.phone,
    active: data.active !== false,
    createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate(),
    lastLogin: (data.lastLogin as Timestamp)?.toDate(),
  };
}

// ── Guard ─────────────────────────────────────────────────────────────────────

function requireFirebase(operation: string): void {
  if (!FIREBASE_CONFIGURED || !db) {
    throw new Error(
      `[usuarioService] "${operation}" requiere Firebase configurado. ` +
      "Configure las variables VITE_FIREBASE_* y vuelva a intentar."
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gestor Usuarios y Permisos
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica que username y email no estén ya en uso por otro usuario.
 * Solo comprueba en Firestore; no depende de Firebase Auth.
 */
export async function validarUnicidadUsuario(
  username: string,
  email: string,
  excludeId?: string
): Promise<FormValidationResult> {
  const errors: FormValidationResult["errors"] = [];

  if (!FIREBASE_CONFIGURED || !db) {
    // Si Firebase no está disponible, omitir la validación de unicidad.
    return { valid: true, errors: [] };
  }

  const [byUsername, byEmail] = await Promise.all([
    getDocs(query(collection(db, COL), where("username", "==", username))),
    getDocs(query(collection(db, COL), where("email", "==", email))),
  ]);

  if (!byUsername.empty && byUsername.docs.some(d => d.id !== excludeId)) {
    errors.push({ field: "username", message: "El nombre de usuario ya está en uso." });
  }
  if (!byEmail.empty && byEmail.docs.some(d => d.id !== excludeId)) {
    errors.push({ field: "email", message: "El correo electrónico ya está registrado." });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Registra un nuevo usuario:
 *   1. Crea la cuenta en Firebase Authentication (email + contraseña).
 *   2. Actualiza el displayName en Firebase Auth.
 *   3. Crea el documento en /usuarios/{uid} con rol y permisos.
 *
 * Si el paso 1 falla (email duplicado, contraseña débil, etc.) el error
 * se propaga al llamante para que lo muestre en la UI.
 * Si el paso 3 falla, intenta eliminar la cuenta recién creada para no
 * dejar cuentas huérfanas en Firebase Auth.
 */
export async function registrarUsuario(
  data: UserFormData,
  createdBy: string
): Promise<User> {
  requireFirebase("registrarUsuario");

  if (!data.password?.trim()) {
    throw new Error("La contraseña es obligatoria para crear un usuario.");
  }

  // 1. Crear en Firebase Auth
  const cred = await createUserWithEmailAndPassword(auth!, data.email, data.password);

  try {
    // 2. Actualizar display name en Auth
    await updateProfile(cred.user, { displayName: data.fullName });

    // 3. Crear documento en Firestore
    const { password: _pw, ...safeData } = data; // no guardar contraseña
    const permissions: PermissionName[] = ROLE_PERMISSIONS[data.roleId] ?? [];

    const firestoreDoc: Record<string, unknown> = {
      ...safeData,
      uid: cred.user.uid,
      roleName: data.roleId,          // roleName == roleId (ej: "admin")
      permissions,
      active: data.active ?? true,
      createdBy,
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(db!, COL, cred.user.uid), firestoreDoc);

    return toUser(cred.user.uid, { ...firestoreDoc, createdAt: new Date() });
  } catch (err) {
    // Revertir: eliminar la cuenta de Auth para evitar cuentas huérfanas
    await cred.user.delete().catch(() => { /* ignore cleanup error */ });
    throw err;
  }
}

/**
 * Actualiza campos de perfil de un usuario existente.
 * No toca Firebase Auth (cambios de email/contraseña requieren flujo separado).
 */
export async function modificarUsuario(
  id: string,
  data: Partial<UserFormData>,
  updatedBy: string
): Promise<User> {
  requireFirebase("modificarUsuario");

  const { password: _pw, ...safeData } = data; // contraseña nunca en Firestore
  const ref = doc(db!, COL, id);
  await updateDoc(ref, { ...safeData, updatedBy, updatedAt: serverTimestamp() });
  const snap = await getDoc(ref);
  return toUser(id, snap.data() as Record<string, any>);
}

/**
 * Desactiva un usuario (soft-delete).
 * La cuenta de Firebase Auth permanece activa; sólo se bloquea en la app
 * porque onAuthStateChanged → loadUserFromFirestore verifica active !== false.
 */
export async function desactivarUsuario(id: string, updatedBy: string): Promise<void> {
  requireFirebase("desactivarUsuario");
  await updateDoc(doc(db!, COL, id), {
    active: false,
    updatedBy,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Cambia el rol de un usuario y actualiza sus permisos al conjunto
 * predeterminado del nuevo rol.
 */
export async function asignarRoles(
  userId: string,
  roleId: string,
  updatedBy: string
): Promise<void> {
  requireFirebase("asignarRoles");
  const permissions: PermissionName[] = ROLE_PERMISSIONS[roleId] ?? [];
  await updateDoc(doc(db!, COL, userId), {
    roleId,
    roleName: roleId,
    permissions,
    updatedBy,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Sobreescribe los permisos de un usuario (personalización granular).
 */
export async function asignarPermisos(
  userId: string,
  permissions: PermissionName[],
  updatedBy: string
): Promise<void> {
  requireFirebase("asignarPermisos");
  await updateDoc(doc(db!, COL, userId), {
    permissions,
    updatedBy,
    updatedAt: serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Lecturas
// ─────────────────────────────────────────────────────────────────────────────

export async function traerUsuarios(): Promise<User[]> {
  if (!FIREBASE_CONFIGURED || !db) return [];
  const snap = await getDocs(query(collection(db, COL), orderBy("fullName")));
  return snap.docs.map(d => toUser(d.id, d.data()));
}

export async function traerUsuarioPorId(id: string): Promise<User | null> {
  if (!FIREBASE_CONFIGURED || !db) return null;
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? toUser(snap.id, snap.data()) : null;
}
