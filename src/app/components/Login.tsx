import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db, FIREBASE_CONFIGURED } from "../firebase/config";
import { useAuth } from "../context/AuthContext";
import { format } from "date-fns";
import { query, collection, where, getDocs } from "firebase/firestore";
import { sendAdminPasswordRecoveryNotification } from "../services/resendService";
import { registrarAuditoria } from "../services/auditoriaService";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast, Toaster } from "sonner";
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

// Helper to parse User Agent for OS and Browser
const parseUA = (ua: string) => {
  let browser = "Desconocido";
  let os = "Desconocido";

  // OS Detection
  if (/Windows/i.test(ua)) {
    os = "Windows";
    if (/Windows NT 10.0/i.test(ua)) os = "Windows 11";
    else if (/Windows NT 6.3/i.test(ua)) os = "Windows 8.1";
    else if (/Windows NT 6.2/i.test(ua)) os = "Windows 8";
    else if (/Windows NT 6.1/i.test(ua)) os = "Windows 7";
  } else if (/Macintosh|Mac OS/i.test(ua)) {
    os = "macOS";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
  } else if (/Android/i.test(ua)) {
    os = "Android";
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    os = "iOS";
  }

  // Browser Detection
  if (/Edg/i.test(ua)) {
    browser = "Microsoft Edge";
  } else if (/Chrome/i.test(ua) && !/Chromium/i.test(ua)) {
    const match = ua.match(/Chrome\/([0-9]+)/);
    browser = match ? `Google Chrome ${match[1]}` : "Google Chrome";
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = "Safari";
  } else if (/Firefox/i.test(ua)) {
    const match = ua.match(/Firefox\/([0-9]+)/);
    browser = match ? `Firefox ${match[1]}` : "Firefox";
  }

  return { browser, os };
};

// Helper to fetch client IP address
const getClientIp = async (): Promise<string> => {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip || "127.0.0.1";
  } catch (error) {
    return "127.0.0.1";
  }
};

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

    // 1. Validaciones de entrada (Paso 2)
    const formattedEmail = recoveryEmail.trim().toLowerCase();
    if (!formattedEmail) {
      setRecoveryError("El correo electrónico es obligatorio.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formattedEmail)) {
      setRecoveryError("El formato de correo no es válido.");
      return;
    }

    if (!FIREBASE_CONFIGURED || !auth) {
      setRecoveryError(
        "La recuperación de contraseña requiere Firebase configurado."
      );
      return;
    }

    setRecoverySending(true);

    // Obtener IP e información del dispositivo
    const clientIp = await getClientIp();
    const uaInfo = parseUA(navigator.userAgent);
    const dateStr = format(new Date(), "dd/MM/yyyy");
    const timeStr = format(new Date(), "HH:mm");

    // 2. Rate Limiting (Limitación de solicitudes por IP/local)
    // Limite local: 1 minuto entre solicitudes
    const lastRequest = localStorage.getItem("last_recovery_request");
    if (lastRequest) {
      const diff = Date.now() - parseInt(lastRequest, 10);
      if (diff < 60000) {
        setRecoveryError("Ha enviado una solicitud recientemente. Por favor, intente de nuevo en un minuto.");
        setRecoverySending(false);
        return;
      }
    }

    // Limite en Firestore: Máximo 3 solicitudes cada 5 minutos por IP
    if (db) {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const qRateLimit = query(
          collection(db, "auditoria"),
          where("ipAddress", "==", clientIp),
          where("action", "==", "Solicitud recuperación de contraseña"),
          where("timestamp", ">=", fiveMinutesAgo)
        );
        const snapRateLimit = await getDocs(qRateLimit);
        if (snapRateLimit.size >= 3) {
          // Registrar intento fallido por rate limit en Auditoría
          await registrarAuditoria({
            userId: "No autenticado",
            userName: "No autenticado",
            userRole: "Invitado",
            action: "Solicitud recuperación de contraseña",
            module: "Login",
            details: `Correo: ${formattedEmail} | IP: ${clientIp} | SO: ${uaInfo.os} | Navegador: ${uaInfo.browser} | Origen: Login | Resultado: Intento bloqueado por límite de velocidad (Rate Limiting)`,
            ipAddress: clientIp,
            userAgent: navigator.userAgent
          });

          setRecoveryError("Límite de solicitudes excedido para su dirección IP. Intente de nuevo en unos minutos.");
          setRecoverySending(false);
          return;
        }
      } catch (e) {
        console.error("Error checking rate limit in DB:", e);
      }
    }

    // Registrar marca de tiempo local para el rate limit
    localStorage.setItem("last_recovery_request", Date.now().toString());

    try {
      if (FIREBASE_CONFIGURED && auth) {
        try {
          // Enviar el correo oficial de Firebase (Paso 3)
          await sendPasswordResetEmail(auth, formattedEmail);

          // Notificación de éxito al administrador (Paso 5)
          sendAdminPasswordRecoveryNotification("ferreyraemanuel19@gmail.com", {
            recoveryEmail: formattedEmail,
            date: dateStr,
            time: timeStr,
            ip: clientIp,
            browser: uaInfo.browser,
            os: uaInfo.os,
            origin: "Pantalla Login",
            status: "Solicitud enviada a Firebase correctamente."
          }).catch(console.error);

          // Registro de éxito en Auditoría (Paso 6)
          await registrarAuditoria({
            userId: "No autenticado",
            userName: "No autenticado",
            userRole: "Invitado",
            action: "Solicitud recuperación de contraseña",
            module: "Login",
            details: `Correo: ${formattedEmail} | IP: ${clientIp} | SO: ${uaInfo.os} | Navegador: ${uaInfo.browser} | Origen: Login | Resultado: Solicitud enviada correctamente`,
            ipAddress: clientIp,
            userAgent: navigator.userAgent
          });

        } catch (fbErr: any) {
          console.error("Firebase Auth Error:", fbErr);

          // Si el error es 'auth/user-not-found', actuamos de la misma forma al cliente
          // por seguridad, pero registramos y notificamos
          if (fbErr.code === "auth/user-not-found") {
            // Notificar éxito al admin (Firebase procesó la solicitud)
            sendAdminPasswordRecoveryNotification("ferreyraemanuel19@gmail.com", {
              recoveryEmail: formattedEmail,
              date: dateStr,
              time: timeStr,
              ip: clientIp,
              browser: uaInfo.browser,
              os: uaInfo.os,
              origin: "Pantalla Login",
              status: "Solicitud enviada a Firebase correctamente."
            }).catch(console.error);

            // Registro en Auditoría
            await registrarAuditoria({
              userId: "No autenticado",
              userName: "No autenticado",
              userRole: "Invitado",
              action: "Solicitud recuperación de contraseña",
              module: "Login",
              details: `Correo: ${formattedEmail} | IP: ${clientIp} | SO: ${uaInfo.os} | Navegador: ${uaInfo.browser} | Origen: Login | Resultado: Solicitud enviada correctamente`,
              ipAddress: clientIp,
              userAgent: navigator.userAgent
            });
          } else {
            // Error real e interno (Paso 7)
            const errorDetails = `Firebase returned ${fbErr.code || "INTERNAL_ERROR"}: ${fbErr.message || "Error desconocido"}`;
            
            // Notificar error al admin
            sendAdminPasswordRecoveryNotification("ferreyraemanuel19@gmail.com", {
              recoveryEmail: formattedEmail,
              date: dateStr,
              time: timeStr,
              ip: clientIp,
              browser: uaInfo.browser,
              os: uaInfo.os,
              origin: "Pantalla Login",
              status: "Error al enviar correo de recuperación.",
              errorDetails: errorDetails
            }).catch(console.error);

            // Registrar error en Auditoría
            await registrarAuditoria({
              userId: "No autenticado",
              userName: "No autenticado",
              userRole: "Invitado",
              action: "Solicitud recuperación de contraseña",
              module: "Login",
              details: `Correo: ${formattedEmail} | IP: ${clientIp} | SO: ${uaInfo.os} | Navegador: ${uaInfo.browser} | Origen: Login | Resultado: Error al enviar correo de recuperación. Detalle: ${fbErr.code || "INTERNAL_ERROR"}`,
              ipAddress: clientIp,
              userAgent: navigator.userAgent
            });
          }
        }

        // Siempre mostrar exactamente el mismo mensaje al usuario (Paso 4)
        setRecoverySuccess(true);
        toast.success("Solicitud procesada", {
          description: "Si existe una cuenta asociada a este correo electrónico, recibirás un enlace para restablecer tu contraseña."
        });
      }

      setTimeout(() => {
        setShowRecover(false);
        setRecoveryEmail("");
        setRecoverySuccess(false);
      }, 5000);
    } catch (err: any) {
      setRecoveryError("Ocurrió un error inesperado al procesar la solicitud.");
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
              Recuperación de contraseña
            </DialogTitle>
            <DialogDescription className="text-center text-sm">
              Ingrese la dirección de correo electrónico asociada a su cuenta. Si existe una cuenta registrada con ese correo, recibirá un enlace para restablecer su contraseña.
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
                  Si existe una cuenta asociada a este correo electrónico, recibirás un enlace para restablecer tu contraseña.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-50"
                onClick={() => setShowRecover(false)}
                disabled={recoverySending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
                onClick={handleRecover}
                disabled={recoverySending || recoverySuccess}
              >
                {recoverySending ? (
                  <span className="flex items-center gap-2 justify-center">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  recoverySuccess ? "Enviado" : "Enviar enlace"
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center">
              Si no recibe el correo en unos minutos, revise la carpeta de spam.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
