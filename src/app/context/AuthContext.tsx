import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, UserRole, Permission } from "../types";

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (username: string, password: string) => boolean;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  hasPermission: (permission: Permission) => boolean;
  isAdmin: boolean;
  isVeterinario: boolean;
  isRecepcionista: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users con diferentes roles
const mockUsers: User[] = [
  {
    id: "1",
    username: "admin",
    password: "admin123",
    fullName: "Administrador Principal",
    role: "admin",
    email: "admin@veterinaria.com",
    phone: "+54 11 1234-5678",
    active: true,
    createdAt: new Date(2020, 0, 1),
    permissions: [
      "manage_clients",
      "manage_pets",
      "view_medical_history",
      "manage_medical_history",
      "manage_appointments",
      "view_appointments",
      "manage_users",
      "manage_permissions"
    ]
  },
  {
    id: "2",
    username: "veterinario",
    password: "vet123",
    fullName: "Dra. María Fernández",
    role: "veterinario",
    email: "veterinario@veterinaria.com",
    phone: "+54 11 2345-6789",
    active: true,
    createdAt: new Date(2021, 0, 1),
    permissions: [
      "manage_clients",
      "manage_pets",
      "view_medical_history",
      "manage_medical_history",
      "view_appointments",
      "manage_appointments"
    ]
  },
  {
    id: "3",
    username: "recepcionista",
    password: "rec123",
    fullName: "Juan Pérez",
    role: "recepcionista",
    email: "recepcionista@veterinaria.com",
    phone: "+54 11 9876-5432",
    active: true,
    createdAt: new Date(2021, 6, 1),
    permissions: [
      "manage_clients",
      "manage_pets",
      "view_medical_history",
      "view_appointments",
      "manage_appointments"
    ]
  }
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("veterinaria_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    const foundUser = mockUsers.find(
      u => u.username === username && u.password === password && u.active
    );

    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem("veterinaria_user", JSON.stringify(foundUser));
      
      // Registrar en auditoría
      const auditLog = {
        id: Date.now().toString(),
        userId: foundUser.id,
        userName: foundUser.fullName,
        userRole: foundUser.role,
        action: "Iniciar Sesión",
        module: "Autenticación",
        details: `Usuario ${foundUser.username} inició sesión`,
        timestamp: new Date(),
        ipAddress: "127.0.0.1"
      };
      
      const logs = JSON.parse(localStorage.getItem("veterinaria_audit_logs") || "[]");
      logs.unshift(auditLog);
      localStorage.setItem("veterinaria_audit_logs", JSON.stringify(logs.slice(0, 1000)));
      
      return true;
    }
    return false;
  };

  const logout = () => {
    if (user) {
      // Registrar cierre de sesión en auditoría
      const auditLog = {
        id: Date.now().toString(),
        userId: user.id,
        userName: user.fullName,
        userRole: user.role,
        action: "Cerrar Sesión",
        module: "Autenticación",
        details: `Usuario ${user.username} cerró sesión`,
        timestamp: new Date(),
        ipAddress: "127.0.0.1"
      };
      
      const logs = JSON.parse(localStorage.getItem("veterinaria_audit_logs") || "[]");
      logs.unshift(auditLog);
      localStorage.setItem("veterinaria_audit_logs", JSON.stringify(logs.slice(0, 1000)));
    }
    
    setUser(null);
    localStorage.removeItem("veterinaria_user");
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    setUser(updatedUser);
    localStorage.setItem("veterinaria_user", JSON.stringify(updatedUser));

    // Update in mock users array
    const userIndex = mockUsers.findIndex(u => u.id === user.id);
    if (userIndex !== -1) {
      mockUsers[userIndex] = updatedUser;
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return user.permissions.includes(permission);
  };

  const isAdmin = user?.role === "admin";
  const isVeterinario = user?.role === "veterinario";
  const isRecepcionista = user?.role === "recepcionista";

  return (
    <AuthContext.Provider value={{ 
      user, 
      users: mockUsers,
      login, 
      logout, 
      updateUser, 
      hasPermission, 
      isAdmin,
      isVeterinario,
      isRecepcionista
    }}>
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