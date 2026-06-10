import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AuditLog } from "../types";

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
    const savedLogs = localStorage.getItem("veterinaria_audit_logs");
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    }
  }, []);

  useEffect(() => {
    if (logs.length > 0) {
      localStorage.setItem("veterinaria_audit_logs", JSON.stringify(logs));
    }
  }, [logs]);

  const addLog = (action: string, module: string, details: string) => {
    const userStr = localStorage.getItem("veterinaria_user");
    if (!userStr) return;

    const user = JSON.parse(userStr);

    const newLog: AuditLog = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action,
      module,
      details,
      timestamp: new Date(),
      ipAddress: "127.0.0.1"
    };

    setLogs(prev => [newLog, ...prev].slice(0, 1000));
  };

  const getLogs = () => logs;

  const getLogsByModule = (module: string) => 
    logs.filter(log => log.module === module);

  const getLogsByUser = (userId: string) => 
    logs.filter(log => log.userId === userId);

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
