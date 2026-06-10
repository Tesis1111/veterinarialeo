import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useAudit } from "../context/AuditContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Dog, Lock, User, AlertCircle, Shield, Stethoscope, UserCheck, Mail, KeyRound, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner@2.0.3";

export default function Login() {
  const { user, login, users } = useAuth();
  const { addLog } = useAudit();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  // Estados para modales de recuperación
  const [showRecoverUsername, setShowRecoverUsername] = useState(false);
  const [showRecoverPassword, setShowRecoverPassword] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Por favor, complete todos los campos");
      return;
    }

    const success = await login(username, password);
    if (!success) {
      setError("Credenciales inválidas. Por favor, intente nuevamente.");
    }
  };

  const handleRecoverUsername = () => {
    setRecoveryError("");
    setRecoverySuccess(false);

    if (!recoveryEmail) {
      setRecoveryError("Por favor, ingrese su correo electrónico");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recoveryEmail)) {
      setRecoveryError("Por favor, ingrese un correo electrónico válido");
      return;
    }

    // Buscar usuario por email
    const foundUser = users.find(u => u.email.toLowerCase() === recoveryEmail.toLowerCase());

    if (!foundUser) {
      setRecoveryError("No se encontró ninguna cuenta asociada a este correo electrónico");
      return;
    }

    // Simular envío de email
    console.log(`📧 Enviando usuario al correo: ${recoveryEmail}`);
    console.log(`Usuario recuperado: ${foundUser.username}`);
    
    addLog("Recuperación", "Autenticación", `Solicitud de recuperación de usuario enviada a ${recoveryEmail}`);
    
    setRecoverySuccess(true);
    toast.success("Usuario enviado", {
      description: `Se ha enviado tu nombre de usuario al correo ${recoveryEmail}`
    });

    // Cerrar modal después de 3 segundos
    setTimeout(() => {
      setShowRecoverUsername(false);
      setRecoveryEmail("");
      setRecoverySuccess(false);
    }, 3000);
  };

  const handleRecoverPassword = () => {
    setRecoveryError("");
    setRecoverySuccess(false);

    if (!recoveryEmail) {
      setRecoveryError("Por favor, ingrese su correo electrónico");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recoveryEmail)) {
      setRecoveryError("Por favor, ingrese un correo electrónico válido");
      return;
    }

    // Buscar usuario por email
    const foundUser = users.find(u => u.email.toLowerCase() === recoveryEmail.toLowerCase());

    if (!foundUser) {
      setRecoveryError("No se encontró ninguna cuenta asociada a este correo electrónico");
      return;
    }

    // Simular envío de email con instrucciones
    console.log(`📧 Enviando instrucciones de recuperación de contraseña al correo: ${recoveryEmail}`);
    console.log(`Usuario: ${foundUser.username}`);
    console.log(`Contraseña temporal: ${foundUser.password}`); // En producción, esto generaría una nueva contraseña
    
    addLog("Recuperación", "Autenticación", `Solicitud de recuperación de contraseña enviada a ${recoveryEmail}`);
    
    setRecoverySuccess(true);
    toast.success("Instrucciones enviadas", {
      description: `Se han enviado las instrucciones para recuperar tu contraseña a ${recoveryEmail}`
    });

    // Cerrar modal después de 3 segundos
    setTimeout(() => {
      setShowRecoverPassword(false);
      setRecoveryEmail("");
      setRecoverySuccess(false);
    }, 3000);
  };

  const resetRecoveryModal = () => {
    setRecoveryEmail("");
    setRecoveryError("");
    setRecoverySuccess(false);
  };

  // Si el usuario está autenticado, mostrar los children (la aplicación)
  if (user) {
    return <>{children}</>;
  }

  // Si no está autenticado, mostrar el formulario de login
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg mb-4">
            <Dog className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-orange-800 mb-2">Sistema Veterinaria Leo</h1>
          <p className="text-gray-600">Gestión Profesional de Atención Veterinaria</p>
        </div>

        {/* Login Card */}
        <Card className="border-orange-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-white">
            <CardTitle className="text-orange-800 text-center">Iniciar Sesión</CardTitle>
            <CardDescription className="text-center">
              Ingrese sus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ingrese su usuario"
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingrese su contraseña"
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              >
                Ingresar
              </Button>
            </form>

            {/* Enlaces de Recuperación */}
            <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center items-center text-sm">
              <button
                type="button"
                onClick={() => {
                  resetRecoveryModal();
                  setShowRecoverUsername(true);
                }}
                className="text-orange-600 hover:text-orange-700 hover:underline font-medium flex items-center gap-1"
              >
                <User className="h-3.5 w-3.5" />
                ¿Olvidaste tu usuario?
              </button>
              <span className="hidden sm:inline text-gray-300">|</span>
              <button
                type="button"
                onClick={() => {
                  resetRecoveryModal();
                  setShowRecoverPassword(true);
                }}
                className="text-orange-600 hover:text-orange-700 hover:underline font-medium flex items-center gap-1"
              >
                <KeyRound className="h-3.5 w-3.5" />
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-800 mb-3">
                <strong>Credenciales de Acceso por Rol:</strong>
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-2 bg-white rounded">
                  <Shield className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div className="text-xs text-gray-700">
                    <p className="font-semibold">Administrador (Acceso Total)</p>
                    <p className="text-gray-600">Usuario: admin / Contraseña: admin123</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-white rounded">
                  <Stethoscope className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-xs text-gray-700">
                    <p className="font-semibold">Veterinario (Clínico)</p>
                    <p className="text-gray-600">Usuario: veterinario / Contraseña: vet123</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-white rounded">
                  <UserCheck className="h-4 w-4 text-green-600 mt-0.5" />
                  <div className="text-xs text-gray-700">
                    <p className="font-semibold">Recepcionista (Gestión)</p>
                    <p className="text-gray-600">Usuario: recepcionista / Contraseña: rec123</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sistema de Permisos */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>Sistema de Auditoría Activo:</strong> Todas las acciones quedan registradas con usuario, fecha y hora para garantizar la trazabilidad completa.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-600 mt-6">
          © 2025 Veterinaria Leo - Todos los derechos reservados
        </p>
      </div>

      {/* Modal Recuperar Usuario */}
      <Dialog open={showRecoverUsername} onOpenChange={(open) => {
        setShowRecoverUsername(open);
        if (!open) resetRecoveryModal();
      }}>
        <DialogContent className="sm:max-w-[500px] border-orange-200">
          <DialogHeader>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full">
              <User className="h-8 w-8 text-orange-600" />
            </div>
            <DialogTitle className="text-center text-orange-800 text-xl">
              Recuperar Usuario
            </DialogTitle>
            <DialogDescription className="text-center">
              Ingrese su correo electrónico registrado y le enviaremos su nombre de usuario.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="recover-user-email" className="text-orange-800">
                Correo Electrónico Registrado
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="recover-user-email"
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="pl-10"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleRecoverUsername();
                    }
                  }}
                />
              </div>
            </div>

            {recoveryError && (
              <Alert variant="destructive" className="border-red-300">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{recoveryError}</AlertDescription>
              </Alert>
            )}
            
            {recoverySuccess && (
              <Alert className="border-green-300 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  ¡Usuario enviado exitosamente! Revisa tu correo electrónico.
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="button"
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              onClick={handleRecoverUsername}
              disabled={recoverySuccess}
            >
              <Send className="h-4 w-4 mr-2" />
              {recoverySuccess ? "Enviado" : "Enviar Usuario"}
            </Button>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>💡 Nota:</strong> Recibirás un correo con tu nombre de usuario en los próximos minutos.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Recuperar Contraseña */}
      <Dialog open={showRecoverPassword} onOpenChange={(open) => {
        setShowRecoverPassword(open);
        if (!open) resetRecoveryModal();
      }}>
        <DialogContent className="sm:max-w-[500px] border-orange-200">
          <DialogHeader>
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full">
              <KeyRound className="h-8 w-8 text-orange-600" />
            </div>
            <DialogTitle className="text-center text-orange-800 text-xl">
              Recuperar Contraseña
            </DialogTitle>
            <DialogDescription className="text-center">
              Ingrese su correo electrónico registrado y le enviaremos instrucciones para recuperar su contraseña.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="recover-pass-email" className="text-orange-800">
                Correo Electrónico Registrado
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="recover-pass-email"
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="pl-10"
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleRecoverPassword();
                    }
                  }}
                />
              </div>
            </div>

            {recoveryError && (
              <Alert variant="destructive" className="border-red-300">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{recoveryError}</AlertDescription>
              </Alert>
            )}
            
            {recoverySuccess && (
              <Alert className="border-green-300 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  ¡Instrucciones enviadas exitosamente! Revisa tu correo electrónico.
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="button"
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              onClick={handleRecoverPassword}
              disabled={recoverySuccess}
            >
              <Send className="h-4 w-4 mr-2" />
              {recoverySuccess ? "Enviado" : "Enviar Instrucciones"}
            </Button>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>💡 Nota:</strong> Recibirás un correo con las instrucciones de recuperación en los próximos minutos. Revisa también tu carpeta de spam.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}