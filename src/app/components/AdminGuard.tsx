import { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { Shield, Lock, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

interface AdminGuardProps {
  children: ReactNode;
  /** Minimum role required. Defaults to 'admin'. */
  requiredRole?: "admin" | "veterinario" | "recepcionista" | "peluquero";
  /** Custom fallback instead of the default blocked screen. */
  fallback?: ReactNode;
  /** Called when the back button is clicked on the blocked screen. */
  onBack?: () => void;
}

const ROLE_HIERARCHY: Record<string, number> = {
  admin: 3,
  veterinario: 2,
  recepcionista: 1,
  peluquero: 0,
};

/**
 * AdminGuard wraps any module/section and blocks rendering if the current
 * user's role does not meet the required access level.
 *
 * Verification order:
 *   1. loading → spinner (prevents flash of unauthorised content while
 *      onAuthStateChanged + Firestore /usuarios/{uid} load resolves)
 *   2. !user → redirect to login (App.tsx handles this already, but guard
 *      is defensive)
 *   3. role level check → blocked screen or children
 */
export default function AdminGuard({
  children,
  requiredRole = "admin",
  fallback,
  onBack,
}: AdminGuardProps) {
  const { user, loading } = useAuth();

  // While Firebase/Firestore is still resolving the user session, show a
  // neutral spinner so we never flash the blocked screen to an admin.
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const userLevel = ROLE_HIERARCHY[user.roleName ?? user.roleId] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 3;
  const hasAccess = userLevel >= requiredLevel;

  if (hasAccess) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <div className="space-y-6">
      <Card className="border-red-100 shadow-sm">
        <CardContent className="pt-16 pb-16">
          <div className="text-center max-w-md mx-auto">
            <div className="relative inline-flex mb-6">
              <div className="h-20 w-20 rounded-full bg-red-50 flex items-center justify-center">
                <Shield className="h-10 w-10 text-red-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-red-100 flex items-center justify-center">
                <Lock className="h-3.5 w-3.5 text-red-500" />
              </div>
            </div>

            <h2 className="text-gray-800 mb-2">Acceso restringido</h2>
            <p className="text-gray-500 text-sm mb-1">
              Esta sección requiere el rol{" "}
              <span className="font-medium text-orange-700 capitalize">{requiredRole}</span>.
            </p>
            <p className="text-gray-400 text-xs mb-8">
              Su rol actual es{" "}
              <span className="font-medium capitalize">{user.roleName ?? user.roleId}</span>.
              Contacte al administrador si necesita acceso.
            </p>

            <div className="flex items-center justify-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100 mb-6 text-left">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                Todos los intentos de acceso no autorizado quedan registrados en el log de auditoría.
              </p>
            </div>

            {onBack && (
              <Button
                variant="outline"
                onClick={onBack}
                className="border-orange-200 text-orange-700 hover:bg-orange-50"
              >
                Volver al inicio
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
