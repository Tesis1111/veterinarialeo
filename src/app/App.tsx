import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AuditProvider } from "./context/AuditContext";
import { UIPreferencesProvider } from "./context/UIPreferencesContext";
import Login from "./components/Login";
import Navigation from "./components/Navigation";
import Dashboard from "./components/Dashboard";
import ClientsModule from "./components/modules/ClientsModule";
import PetsModuleEnhanced from "./components/modules/PetsModuleEnhanced";
import MedicalHistoryModule from "./components/modules/MedicalHistoryModuleNew";
import AppointmentsModule from "./components/modules/AppointmentsModule";
import UsersModule from "./components/modules/UsersModule";
import BusinessHoursModule from "./components/modules/BusinessHoursModule";
import AuditModule from "./components/modules/AuditModule";
import ReportsModule from "./components/modules/ReportsModule";
import UserProfile from "./components/UserProfile";
import AccessibilityButton from "./components/AccessibilityButton";
import InstallPrompt from "./components/InstallPrompt";
import OfflineIndicator from "./components/OfflineIndicator";
import { registerServiceWorker } from "./utils/registerServiceWorker";

// Registrar el service worker
if (typeof window !== "undefined") {
  registerServiceWorker();
}

type ModuleType =
  | "dashboard"
  | "clients"
  | "pets"
  | "medical"
  | "appointments"
  | "users"
  | "audit"
  | "reports"
  | "profile"
  | "business_hours";

function AppContent() {
  const { user } = useAuth();
  const [activeModule, setActiveModule] =
    useState<ModuleType>("dashboard");

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navigation
        setActiveModule={setActiveModule}
        activeModule={activeModule}
      />
      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 lg:py-8 max-w-7xl">
        {activeModule === "dashboard" && (
          <Dashboard setActiveModule={setActiveModule} />
        )}
        {activeModule === "clients" && <ClientsModule />}
        {activeModule === "pets" && <PetsModuleEnhanced />}
        {activeModule === "medical" && <MedicalHistoryModule />}
        {activeModule === "appointments" && (
          <AppointmentsModule />
        )}
        {activeModule === "users" && <UsersModule />}
        {activeModule === "business_hours" && (
          <BusinessHoursModule />
        )}
        {activeModule === "audit" && <AuditModule />}
        {activeModule === "reports" && <ReportsModule />}
        {activeModule === "profile" && (
          <UserProfile setActiveModule={setActiveModule} />
        )}
      </main>
      <AccessibilityButton />
      <InstallPrompt />
      <OfflineIndicator />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuditProvider>
        <UIPreferencesProvider>
          <AppContent />
        </UIPreferencesProvider>
      </AuditProvider>
    </AuthProvider>
  );
}