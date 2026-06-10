import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuditLog } from "../types";
import {
  registrarAuditoria,
  traerAuditoria,
  traerAuditoriaPorModulo,
  traerAuditoriaPorUsuario,
} from "../services/auditoriaService";

interface AuditContextType {
  logs: AuditLog[];
  addLog: (action: string, module: string, details: string) => void;
  getLogs: () => AuditLog[];
  getLogsByModule: (module: string) => AuditLog[];
  getLogsByUser: (userId: string) => AuditLog[];
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export function AuditProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    traerAuditoria(500)
      .then(setLogs)
      .catch(() => {
        try {
          const saved = localStorage.getItem("veterinaria_audit_logs");
          if (saved) setLogs(JSON.parse(saved));
        } catch {
          // ignore
        }
      });
  }, []);

  const addLog = (action: string, module: string, details: string) => {
    try {
      const userStr = localStorage.getItem("veterinaria_user");
      if (!userStr) return;
      const user = JSON.parse(userStr);

      const partial: Omit<AuditLog, "id" | "timestamp"> = {
        userId: user.id,
        userName: user.fullName,
        userRole: user.roleName ?? user.roleId ?? "",
        action: action as AuditLog["action"],
        module: module as AuditLog["module"],
        details,
        ipAddress: "127.0.0.1",
      };

      registrarAuditoria(partial).then((newLog) => {
        setLogs((prev) => [newLog, ...prev].slice(0, 1000));
      });
    } catch {
      // ignore
    }
  };

  const getLogs = () => logs;

  const getLogsByModule = (module: string) =>
    logs.filter((log) => log.module === module);

  const getLogsByUser = (userId: string) =>
    logs.filter((log) => log.userId === userId);

  return (
    <AuditContext.Provider value={{ logs, addLog, getLogs, getLogsByModule, getLogsByUser }}>
      {children}
    </AuditContext.Provider>
  );
}

export function useAudit() {
  const context = useContext(AuditContext);
  if (context === undefined) {
    throw new Error("useAudit must be used within an AuditProvider");
  }
  return context;
}

export { traerAuditoriaPorModulo, traerAuditoriaPorUsuario };
