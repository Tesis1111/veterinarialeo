import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, FIREBASE_CONFIGURED } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast, Toaster } from "sonner";
import { sendPasswordRecovery } from "../services/resendService";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Dog,
  Lock,
  AlertCircle,
  Mail,
  KeyRound,
  Send,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

export default function Login() {
  const { login } = useAuth();

  // ── Login form state ──────────────────────────────────────────
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Password recovery state ───────────────────────────────────
  const [showRecover, setShowRecover] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [recoverySending, setRecoverySending] = useState(false);

  // ── Login submit ──────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!email.trim() || !password) {
      setLoginError("Por favor, complete todos los campos.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setLoginError("Ingrese un correo electrónico válido.");
      return;
    }

    setSubmitting(true);
    try {
      const ok = await login(email.trim(), password);
      if (!ok) {
        setLoginError(
          "Credenciales incorrectas. Verifique su correo y contraseña."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Password recovery ─────────────────────────────────────────
  const handleRecover = async () => {
    setRecoveryError("");

    if (!recoveryEmail.trim()) {
      setRecoveryError("Ingrese su correo electrónico.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recoveryEmail.trim())) {
      setRecoveryError("Ingrese un correo electrónico válido.");
      return;
    }

    if (!FIREBASE_CONFIGURED || !auth) {
      setRecoveryError(
        "La recuperación de contraseña requiere Firebase configurado."
      );
      return;
    }

    setRecoverySending(true);
    try {
      if (FIREBASE_CONFIGURED && auth) {
        // Enviar el correo oficial de Firebase (asegura el reseteo real)
        await sendPasswordResetEmail(auth, recoveryEmail.trim());
        
        // Opcional: Enviar también el correo formateado por Resend (Requisito de Tesis)
        sendPasswordRecovery(recoveryEmail.trim(), {
          clientName: "Usuario",
          recoveryLink: "Revisa tu correo para el enlace oficial de Firebase."
        }).catch(console.error);

        setRecoverySuccess(true);
        toast.success("Correo enviado", {
          description: "Revisa tu bandeja de entrada o spam para encontrar el enlace oficial."
        });
      }
      setTimeout(() => {
        setShowRecover(false);
        setRecoveryEmail("");
        setRecoverySuccess(false);
      }, 3500);
    } catch (err: any) {
      // Firebase returns auth/user-not-found for unknown emails.
      // We intentionally show the same generic message to avoid user enumeration.
      setRecoveryError(
        "No se pudo enviar el correo. Verifique que el email esté registrado."
      );
    } finally {
      setRecoverySending(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg mb-4">
            <Dog className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-orange-800 mb-1">Veterinaria Leo</h1>
          <p className="text-gray-500 text-sm">Sistema de Gestión Profesional</p>
        </div>

        {/* Firebase not configured warning */}
        {!FIREBASE_CONFIGURED && (
          <Alert className="mb-4 border-amber-300 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 text-sm">
              <strong>Modo sin conexión:</strong> Firebase no está configurado.
              Configure las variables de entorno{" "}
              <code className="text-xs bg-amber-100 px-1 rounded">VITE_FIREBASE_*</code>{" "}
              para habilitar la autenticación real.
            </AlertDescription>
          </Alert>
        )}

        {/* Login Card */}
        <Card className="border-orange-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-white pb-4">
            <CardTitle className="text-orange-800 text-center">
              Iniciar Sesión
            </CardTitle>
            <CardDescription className="text-center text-sm">
              Ingrese sus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {loginError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@veterinarialeo.com"
                    className="pl-10"
                    autoComplete="email"
                    autoFocus
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                    autoComplete="current-password"
                    disabled={submitting}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Ingresando...
                  </span>
                ) : (
                  "Ingresar"
                )}
              </Button>
            </form>

            {/* Forgot password link */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setRecoveryEmail("");
                  setRecoveryError("");
                  setRecoverySuccess(false);
                  setShowRecover(true);
                }}
                className="text-sm text-orange-600 hover:text-orange-700 hover:underline font-medium inline-flex items-center gap-1.5"
              >
                <KeyRound className="h-3.5 w-3.5" />
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Audit notice */}
            <div className="mt-5 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-700 text-center">
                Sistema de auditoría activo · Todos los accesos quedan registrados
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Veterinaria Leo · Todos los derechos reservados
        </p>
      </div>

      {/* Password recovery modal */}
      <Dialog
        open={showRecover}
        onOpenChange={(open) => {
          setShowRecover(open);
          if (!open) {
            setRecoveryEmail("");
            setRecoveryError("");
            setRecoverySuccess(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md border-orange-200">
          <DialogHeader>
            <div className="flex items-center justify-center w-14 h-14 mx-auto mb-3 bg-orange-100 rounded-full">
              <KeyRound className="h-7 w-7 text-orange-600" />
            </div>
            <DialogTitle className="text-center text-orange-800">
              Recuperar contraseña
            </DialogTitle>
            <DialogDescription className="text-center text-sm">
              Ingrese su correo electrónico y le enviaremos un enlace para
              restablecer su contraseña.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="recover-email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="recover-email"
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="usuario@veterinarialeo.com"
                  className="pl-10"
                  autoFocus
                  disabled={recoverySending || recoverySuccess}
                  onKeyDown={(e) => e.key === "Enter" && handleRecover()}
                />
              </div>
            </div>

            {recoveryError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{recoveryError}</AlertDescription>
              </Alert>
            )}

            {recoverySuccess && (
              <Alert className="border-green-300 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  ¡Correo enviado! Revise su bandeja de entrada.
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="button"
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              onClick={handleRecover}
              disabled={recoverySending || recoverySuccess}
            >
              {recoverySending ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Enviando...
                </span>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {recoverySuccess ? "Correo enviado" : "Enviar enlace"}
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Si no recibe el correo en unos minutos, revise la carpeta de spam.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
