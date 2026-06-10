import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, FIREBASE_CONFIGURED } from "../firebase/config";
import { User, PermissionName } from "../types";

// ============================================================
// Permission mapping by role (used for localStorage fallback)
// ============================================================
const ROLE_PERMISSIONS: Record<string, PermissionName[]> = {
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

// ============================================================
// Mock users — used ONLY when Firebase is not configured
// ============================================================
const MOCK_USERS: User[] = [
  {
    id: "1",
    username: "admin",
    email: "admin@veterinaria.com",
    fullName: "Administrador Principal",
    roleId: "admin",
    roleName: "admin",
    permissions: ROLE_PERMISSIONS.admin,
    phone: "+54 11 1234-5678",
    active: true,
    createdAt: new Date(2020, 0, 1),
  },
  {
    id: "2",
    username: "veterinario",
    email: "veterinario@veterinaria.com",
    fullName: "Dra. María Fernández",
    roleId: "veterinario",
    roleName: "veterinario",
    permissions: ROLE_PERMISSIONS.veterinario,
    phone: "+54 11 2345-6789",
    active: true,
    createdAt: new Date(2021, 0, 1),
  },
  {
    id: "3",
    username: "recepcionista",
    email: "recepcionista@veterinaria.com",
    fullName: "Juan Pérez",
    roleId: "recepcionista",
    roleName: "recepcionista",
    permissions: ROLE_PERMISSIONS.recepcionista,
    phone: "+54 11 9876-5432",
    active: true,
    createdAt: new Date(2021, 6, 1),
  },
];

// ============================================================
// Context interface
// ============================================================
interface AuthContextType {
  user: User | null;
  users: User[];
  loading: boolean;
  login: (emailOrUsername: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  hasPermission: (permission: PermissionName) => boolean;
  isAdmin: boolean;
  isVeterinario: boolean;
  isRecepcionista: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================
// Helpers — Firestore
// ============================================================
async function loadUserFromFirestore(firebaseUser: FirebaseUser): Promise<User | null> {
  if (!db) return null;
  try {
    const ref = doc(db, "usuarios", firebaseUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    const data = snap.data();
    const roleName = (data.roleName as User["roleName"]) ?? "recepcionista";

    return {
      id: firebaseUser.uid,
      username: data.username ?? firebaseUser.email ?? firebaseUser.uid,
      email: firebaseUser.email ?? data.email ?? "",
      fullName: firebaseUser.displayName ?? data.fullName ?? "",
      roleId: data.roleId ?? roleName,
      roleName,
      permissions: data.permissions ?? ROLE_PERMISSIONS[roleName] ?? [],
      phone: data.phone,
      active: data.active !== false,
      createdAt: data.createdAt?.toDate() ?? new Date(),
      updatedAt: data.updatedAt?.toDate(),
      lastLogin: new Date(),
    };
  } catch {
    return null;
  }
}

function writeAuditLog(entry: {
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  details: string;
}) {
  try {
    const logs = JSON.parse(localStorage.getItem("veterinaria_audit_logs") || "[]");
    logs.unshift({
      ...entry,
      id: Date.now().toString(),
      timestamp: new Date(),
      ipAddress: "127.0.0.1",
    });
    localStorage.setItem("veterinaria_audit_logs", JSON.stringify(logs.slice(0, 1000)));
  } catch {
    // ignore
  }
}

// ============================================================
// Provider
// ============================================================
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Firebase mode: subscribe to auth state ──────────────────
  useEffect(() => {
    if (!FIREBASE_CONFIGURED || !auth) {
      // Fallback: restore from localStorage
      try {
        const saved = localStorage.getItem("veterinaria_user");
        if (saved) setUser(JSON.parse(saved));
      } catch {
        // ignore
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const appUser = await loadUserFromFirestore(firebaseUser);
        setUser(appUser);
        if (appUser) {
          localStorage.setItem("veterinaria_user", JSON.stringify(appUser));
        }
      } else {
        setUser(null);
        localStorage.removeItem("veterinaria_user");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ── login ───────────────────────────────────────────────────
  const login = async (emailOrUsername: string, password: string): Promise<boolean> => {
    if (FIREBASE_CONFIGURED && auth) {
      try {
        // Accept either email or username; map username → email via Firestore
        let email = emailOrUsername;
        if (!emailOrUsername.includes("@") && db) {
          const { collection, query, where, getDocs } = await import("firebase/firestore");
          const q = query(
            collection(db, "usuarios"),
            where("username", "==", emailOrUsername)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            email = snap.docs[0].data().email;
          }
        }

        const cred = await signInWithEmailAndPassword(auth, email, password);
        const appUser = await loadUserFromFirestore(cred.user);
        if (!appUser || !appUser.active) {
          await signOut(auth);
          return false;
        }

        if (db) {
          await setDoc(doc(db, "usuarios", cred.user.uid), { lastLogin: serverTimestamp() }, { merge: true });
        }

        setUser(appUser);
        localStorage.setItem("veterinaria_user", JSON.stringify(appUser));

        writeAuditLog({
          userId: appUser.id,
          userName: appUser.fullName,
          userRole: appUser.roleName ?? appUser.roleId,
          action: "Iniciar Sesión",
          module: "Autenticación",
          details: `Usuario ${appUser.username} inició sesión via Firebase Auth`,
        });

        return true;
      } catch {
        return false;
      }
    }

    // ── localStorage / mock fallback ──────────────────────────
    const found = MOCK_USERS.find(
      (u) =>
        (u.username === emailOrUsername || u.email === emailOrUsername) &&
        u.active
    );
    const MOCK_PASSWORDS: Record<string, string> = {
      admin: "admin123",
      veterinario: "vet123",
      recepcionista: "rec123",
    };
    const passOk = found ? MOCK_PASSWORDS[found.username] === password : false;

    if (found && passOk) {
      setUser(found);
      localStorage.setItem("veterinaria_user", JSON.stringify(found));
      writeAuditLog({
        userId: found.id,
        userName: found.fullName,
        userRole: found.roleName ?? found.roleId,
        action: "Iniciar Sesión",
        module: "Autenticación",
        details: `Usuario ${found.username} inició sesión (modo demo)`,
      });
      return true;
    }
    return false;
  };

  // ── logout ──────────────────────────────────────────────────
  const logout = async () => {
    if (user) {
      writeAuditLog({
        userId: user.id,
        userName: user.fullName,
        userRole: user.roleName ?? user.roleId,
        action: "Cerrar Sesión",
        module: "Autenticación",
        details: `Usuario ${user.username} cerró sesión`,
      });
    }

    if (FIREBASE_CONFIGURED && auth) {
      await signOut(auth);
    }

    setUser(null);
    localStorage.removeItem("veterinaria_user");
  };

  // ── updateUser ──────────────────────────────────────────────
  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    const updatedUser: User = { ...user, ...updates, updatedAt: new Date() };

    if (FIREBASE_CONFIGURED && auth?.currentUser && db) {
      try {
        const { fullName, phone } = updates;
        if (fullName) {
          await updateProfile(auth.currentUser, { displayName: fullName });
        }
        await setDoc(
          doc(db, "usuarios", user.id),
          { fullName, phone, updatedAt: serverTimestamp() },
          { merge: true }
        );
      } catch {
        // best effort
      }
    }

    setUser(updatedUser);
    localStorage.setItem("veterinaria_user", JSON.stringify(updatedUser));
  };

  // ── hasPermission ───────────────────────────────────────────
  const hasPermission = (permission: PermissionName): boolean => {
    if (!user) return false;
    return (user.permissions ?? []).includes(permission);
  };

  const isAdmin = user?.roleName === "admin";
  const isVeterinario = user?.roleName === "veterinario";
  const isRecepcionista = user?.roleName === "recepcionista";

  return (
    <AuthContext.Provider
      value={{
        user,
        users: MOCK_USERS,
        loading,
        login,
        logout,
        updateUser,
        hasPermission,
        isAdmin,
        isVeterinario,
        isRecepcionista,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
