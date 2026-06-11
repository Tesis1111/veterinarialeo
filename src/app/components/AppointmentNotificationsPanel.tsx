import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
  Bell,
  BellOff,
  Mail,
  MessageCircle,
  Send,
  CheckCircle2,
  AlertCircle,
  Settings,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import {
  AppointmentNotification,
  NotificationSettings,
  getNotificationSettings,
  saveNotificationSettings,
  processNotifications,
  shouldNotify
} from "../utils/appointmentNotifications";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface AppointmentNotificationsPanelProps {
  appointments: any[];
  clients: any[];
  pets: any[];
  doctors: any[];
}

export default function AppointmentNotificationsPanel({
  appointments,
  clients,
  pets,
  doctors
}: AppointmentNotificationsPanelProps) {
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [notifications, setNotifications] = useState<AppointmentNotification[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  // Cargar notificaciones al montar
  useEffect(() => {
    checkNotifications();
    // Auto-check cada 30 minutos
    const interval = setInterval(checkNotifications, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [appointments, clients, pets, doctors]);

  const checkNotifications = async () => {
    setIsProcessing(true);
    try {
      const pendingNotifications = await processNotifications(
        appointments,
        clients,
        pets,
        doctors
      );
      setNotifications(pendingNotifications);
      setLastCheck(new Date());

      const sentCount = pendingNotifications.filter(n => n.notificationStatus === "sent").length;
      if (sentCount > 0) {
        toast.success(`${sentCount} notificación(es) enviada(s)`);
      }
    } catch (error) {
      toast.error("Error al procesar notificaciones");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSettingsChange = (key: keyof NotificationSettings, value: any) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveNotificationSettings(updated);
    toast.success("Configuración guardada");
  };

  const upcomingAppointmentsNeedingNotification = appointments.filter(apt => {
    if (apt.status === "cancelled" || apt.status === "completed") return false;
    return shouldNotify(new Date(apt.date), apt.startTime || "00:00", settings);
  }).length;

  return (
    <Card className="border-blue-200 shadow-md">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-blue-800 flex items-center gap-2">
              {settings.enabled ? (
                <Bell className="h-5 w-5 text-blue-600" />
              ) : (
                <BellOff className="h-5 w-5 text-gray-400" />
              )}
              Notificaciones Automáticas
            </CardTitle>
            <CardDescription>
              Recordatorios automáticos {settings.hoursBeforeAppointment}hs antes del turno
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowSettings(!showSettings)}
              className="border-blue-300 hover:bg-blue-50"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={checkNotifications}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${isProcessing ? "animate-spin" : ""}`} />
              {isProcessing ? "Procesando..." : "Verificar"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Estado general */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">Estado</span>
            </div>
            <p className="font-semibold text-blue-900">
              {settings.enabled ? "Activo" : "Desactivado"}
            </p>
          </div>

          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <span className="text-xs text-orange-600 font-medium">Pendientes</span>
            </div>
            <p className="font-semibold text-orange-900">
              {upcomingAppointmentsNeedingNotification}
            </p>
          </div>

          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xs text-green-600 font-medium">Enviadas</span>
            </div>
            <p className="font-semibold text-green-900">
              {notifications.filter(n => n.notificationStatus === "sent").length}
            </p>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="h-4 w-4 text-gray-600" />
              <span className="text-xs text-gray-600 font-medium">Última verificación</span>
            </div>
            <p className="text-xs text-gray-900 font-medium">
              {lastCheck ? format(lastCheck, "HH:mm", { locale: es }) : "—"}
            </p>
          </div>
        </div>

        {/* Configuración */}
        {showSettings && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuración de Notificaciones
            </h4>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Activar notificaciones automáticas</Label>
                  <p className="text-xs text-gray-500">Enviar recordatorios a los clientes</p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => handleSettingsChange("enabled", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Horas antes del turno para notificar
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="72"
                  value={settings.hoursBeforeAppointment}
                  onChange={(e) =>
                    handleSettingsChange("hoursBeforeAppointment", parseInt(e.target.value))
                  }
                  className="max-w-[120px]"
                />
                <p className="text-xs text-gray-500">Por defecto: 24 horas</p>
              </div>

              <div className="space-y-3 pt-2 border-t">
                <Label className="text-sm font-medium">Canales de notificación</Label>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Email</span>
                  </div>
                  <Switch
                    checked={settings.sendEmail}
                    onCheckedChange={(checked) => handleSettingsChange("sendEmail", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">WhatsApp</span>
                  </div>
                  <Switch
                    checked={settings.sendWhatsApp}
                    onCheckedChange={(checked) => handleSettingsChange("sendWhatsApp", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">SMS</span>
                  </div>
                  <Switch
                    checked={settings.sendSMS}
                    onCheckedChange={(checked) => handleSettingsChange("sendSMS", checked)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista de notificaciones */}
        {notifications.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">
              Notificaciones Recientes ({notifications.length})
            </h4>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 rounded-lg border-2 ${
                    notif.notificationStatus === "sent"
                      ? "bg-green-50 border-green-200"
                      : notif.notificationStatus === "failed"
                      ? "bg-red-50 border-red-200"
                      : "bg-yellow-50 border-yellow-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{notif.petName}</span>
                        <Badge variant="outline" className="text-xs">
                          {notif.petSpecies}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{notif.clientName}</p>
                    </div>
                    <Badge
                      className={
                        notif.notificationStatus === "sent"
                          ? "bg-green-100 text-green-800"
                          : notif.notificationStatus === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {notif.notificationStatus === "sent"
                        ? "Enviado"
                        : notif.notificationStatus === "failed"
                        ? "Falló"
                        : "Pendiente"}
                    </Badge>
                  </div>

                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p>
                      📅 {format(notif.appointmentDate, "dd/MM/yyyy", { locale: es })} a las{" "}
                      {notif.appointmentTime}
                    </p>
                    {notif.reason && <p>📝 {notif.reason}</p>}
                    <p className="text-blue-600 font-medium">⏱️ En {notif.hoursUntil}hs</p>
                    {notif.notificationSentAt && (
                      <p className="text-green-600">
                        ✓ Enviado: {format(notif.notificationSentAt, "dd/MM HH:mm", { locale: es })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {notifications.length === 0 && !isProcessing && (
          <div className="text-center py-8 text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No hay notificaciones pendientes en este momento</p>
            <p className="text-xs mt-1">
              Las notificaciones se envían automáticamente {settings.hoursBeforeAppointment}hs
              antes
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
