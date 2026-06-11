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
import AdminGuard from "./components/AdminGuard";
import { registerServiceWorker } from "./utils/registerServiceWorker";
import { PawPrint } from "lucide-react";

// Register service worker for PWA support
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

// ── Full-screen loading spinner ───────────────────────────────────────────

function AppLoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 to-white">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-100 mb-5 shadow-sm">
          <PawPrint className="h-8 w-8 text-orange-500" />
        </div>
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 rounded-full bg-orange-400 animate-bounce" />
        </div>
        <p className="text-gray-400 text-sm">Cargando Veterinaria Leo...</p>
      </div>
    </div>
  );
}

// ── Main app shell ────────────────────────────────────────────────────────

function AppContent() {
  const { user, loading } = useAuth();
  const [activeModule, setActiveModule] = useState<ModuleType>("dashboard");

  // Block render until Firebase/Firestore resolves the session —
  // prevents flash of the login screen or blocked-access screen for returning users.
  if (loading) return <AppLoadingScreen />;

  if (!user) return <Login />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        setActiveModule={setActiveModule}
        activeModule={activeModule}
      />

      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 lg:py-8 max-w-7xl">

        {/* ── Public modules (all authenticated users) ─────────────── */}
        {activeModule === "dashboard" && (
          <Dashboard setActiveModule={setActiveModule} />
        )}

        {activeModule === "clients" && <ClientsModule />}
        {activeModule === "pets" && <PetsModuleEnhanced />}
        {activeModule === "medical" && <MedicalHistoryModule />}
        {activeModule === "appointments" && <AppointmentsModule />}
        {activeModule === "profile" && (
          <UserProfile setActiveModule={setActiveModule} />
        )}

        {/* ── Admin-only modules ────────────────────────────────────── */}
        {activeModule === "users" && (
          <AdminGuard
            requiredRole="admin"
            onBack={() => setActiveModule("dashboard")}
          >
            <UsersModule />
          </AdminGuard>
        )}

        {activeModule === "business_hours" && (
          <AdminGuard
            requiredRole="admin"
            onBack={() => setActiveModule("dashboard")}
          >
            <BusinessHoursModule />
          </AdminGuard>
        )}

        {activeModule === "audit" && (
          <AdminGuard
            requiredRole="admin"
            onBack={() => setActiveModule("dashboard")}
          >
            <AuditModule />
          </AdminGuard>
        )}

        {/* ── Reports: admin + veterinario ─────────────────────────── */}
        {activeModule === "reports" && (
          <AdminGuard
            requiredRole="veterinario"
            onBack={() => setActiveModule("dashboard")}
          >
            <ReportsModule />
          </AdminGuard>
        )}

      </main>

      <AccessibilityButton />
      <InstallPrompt />
      <OfflineIndicator />
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────

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
