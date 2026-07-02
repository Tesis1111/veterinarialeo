import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAudit } from "../../context/AuditContext";
import { Appointment, Client, Pet, AppointmentType, AppointmentStatus, Doctor, DoctorSchedule, TipoEvento, DoctorPerfil } from "../../types";
import {
  registrarTurno,
  modificarTurno,
  cancelarTurno,
} from "../../services/turnoService";
import { traerClientes } from "../../services/clienteService";
import { traerMascotas } from "../../services/mascotaService";
import { traerTodosLosHorarios } from "../../services/horarioService";
import { suscribirTiposEvento } from "../../services/parametrosService";
import { traerDoctores } from "../../services/doctorService";
import { db, FIREBASE_CONFIGURED } from "../../firebase/config";
import {
  collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp, Timestamp, query, orderBy,
} from "firebase/firestore";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Calendar as CalendarIcon, Clock, PawPrint, X, Save, AlertTriangle, Bell, CheckCircle2, FileSpreadsheet, FileText, XCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format, isSameDay, isBefore, differenceInHours, startOfDay, addDays } from "date-fns";
import { es } from "date-fns/locale";
import {
  validateAppointmentDate,
  validateDateRange,
  canEditAppointment,
  validateAppointmentFields,
} from "../../utils/appointmentValidations";
import AppointmentNotificationsPanel from "../AppointmentNotificationsPanel";
import { exportToExcel, exportToPDF } from "../../utils/exportUtils";

export default function AppointmentsModule() {
  const { user, hasPermission } = useAuth();
  const { addLog } = useAudit();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorSchedules, setDoctorSchedules] = useState<DoctorSchedule[]>([]);
  const [tiposEvento, setTiposEvento] = useState<TipoEvento[]>([]);
  const [doctoresPerfil, setDoctoresPerfil] = useState<DoctorPerfil[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dateFromOpen, setDateFromOpen] = useState(false);
  const [dateToOpen, setDateToOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("calendar");

  useEffect(() => {
    const tab = localStorage.getItem("appointments_initial_tab");
    if (tab) {
      setActiveTab(tab);
      localStorage.removeItem("appointments_initial_tab");
    }
  }, []);

  const [formData, setFormData] = useState({
    type: "clinic" as AppointmentType,
    clientId: "",
    petId: "",
    doctorId: "",
    eventoTipoId: "",
    date: new Date(),
    startTime: "",
    endTime: "",
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
    reason: "",
    notes: ""
  });

  useEffect(() => {
    // ── Real-time subscription to turnos via onSnapshot ────────────────
    if (FIREBASE_CONFIGURED && db) {
      // Sin orderBy para evitar requerir índice compuesto — ordenamos client-side
      const q = query(collection(db, "turnos"));
      const unsub = onSnapshot(q, (snap) => {
        const safeDate = (v: any): Date => {
          if (!v) return new Date();
          if (v instanceof Timestamp) return v.toDate();
          if (v instanceof Date) return v;
          const d = new Date(v);
          return isNaN(d.getTime()) ? new Date() : d;
        };
        const safeOptDate = (v: any): Date | undefined => {
          if (!v) return undefined;
          if (v instanceof Timestamp) return v.toDate();
          if (v instanceof Date) return v;
          const d = new Date(v);
          return isNaN(d.getTime()) ? undefined : d;
        };
        const appts = snap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            clientId: data.clientId ?? data.clienteId ?? "",
            petId: data.petId ?? data.mascotaId ?? "",
            serviceId: data.serviceId ?? data.type ?? "clinic",
            doctorId: data.doctorId ?? null,
            date: safeDate(data.date ?? data.fecha),
            startTime: data.startTime ?? data.hora ?? "",
            endTime: data.endTime ?? "",
            status: data.status ?? data.estado ?? "Confirmado",
            reason: data.reason ?? "",
            notes: data.notes ?? data.notas ?? "",
            tiposEvento: data.tiposEvento ?? [],
            type: data.type ?? "clinic",
            dateFrom: safeOptDate(data.dateFrom),
            dateTo: safeOptDate(data.dateTo),
            createdAt: safeDate(data.createdAt),
            createdBy: data.createdBy ?? "",
          } as any;
        });
        // Sort client-side by date desc
        appts.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAppointments(appts);
      }, (err) => {
        console.error("[AppointmentsModule] onSnapshot error:", err);
        
      });
      // Load reference data (not real-time needed)
      traerClientes().then(setClients).catch(() => {
        
      });
      traerMascotas().then(setPets).catch(() => {
        
      });
      traerTodosLosHorarios().then(setDoctorSchedules).catch(() => setDoctorSchedules([]));
      suscribirTiposEvento(setTiposEvento);

      // Real-time doctors subscription so new vets appear automatically
      const unsubDoctors = onSnapshot(
        query(collection(db, "doctores"), where("available", "==", true)),
        (snap) => {
          setDoctoresPerfil(snap.docs.map(d => ({
            id: d.id,
            fullName: d.data().fullName ?? d.data().name ?? "",
            specialty: d.data().specialty ?? "",
            licenseNumber: d.data().licenseNumber,
            userId: d.data().userId,
            available: d.data().available !== false,
            createdAt: d.data().createdAt instanceof Timestamp ? d.data().createdAt.toDate() : new Date(),
          })));
        },
        () => traerDoctores().then(setDoctoresPerfil)
      );
      
      return () => { unsub(); unsubDoctors(); };
    } else {
      // Firebase not configured — show empty state
      console.warn("[AppointmentsModule] Firebase no configurado. Los datos no se cargarán.");
    }
  }, []);

  // ── Helpers ──────────────────────────────────────
  const getClientName = (clientId: string) => clients.find(c => c.id === clientId)?.fullName || "";
  const getPetName = (petId: string) => pets.find(p => p.id === petId)?.name || "";
  const getDoctorName = (doctorId?: string) => {
    if (!doctorId) return "-";
    const fromPerfil = doctoresPerfil.find(d => d.id === doctorId);
    if (fromPerfil) return fromPerfil.fullName;
    return (doctors.find(d => d.id === doctorId) as any)?.name || "Desconocido";
  };
  const getPetsByClient = (clientId: string) => pets.filter(p => p.clientId === clientId);

  const getStatusColor = (status: AppointmentStatus): string => {
    switch (status) {
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "confirmed": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: AppointmentStatus): string => {
    switch (status) {
      case "scheduled": return "Programado";
      case "confirmed": return "Confirmado";
      case "completed": return "Completado";
      case "cancelled": return "Cancelado";
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "clinic": return "Clínica";
      case "grooming": return "Peluquería";
      case "daycare": return "Guardería";
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "clinic": return "bg-blue-100 text-blue-800";
      case "grooming": return "bg-purple-100 text-purple-800";
      case "daycare": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // ── Modificadores del Calendario ────────────────────────────────
  const modifiers = useMemo(() => {
    const daysWithAppts = (appointments ?? [])
      .filter(apt => apt.status !== "Cancelado" && apt.status !== "cancelled")
      .map(apt => {
        try { return new Date(apt.date); } catch { return null; }
      })
      .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()));
    return { hasAppointment: daysWithAppts };
  }, [appointments]);

  const modifiersClassNames = {
    hasAppointment: "font-bold text-orange-700 underline decoration-orange-500 decoration-2 underline-offset-4 bg-orange-50/50"
  };

  // ── Appointments filtrados ──────────────────────────────────────
  const appointmentsForDate = useMemo(() => {
    return (appointments ?? [])
      .filter(apt => {
        if (!apt || !apt.date) return false;
        if (apt.status === "Cancelado" || apt.status === "cancelled") return false;
        if (apt.type === "clinic" || apt.type === "grooming") {
          return isSameDay(new Date(apt.date), selectedDate);
        }
        if (apt.type === "daycare" && apt.dateFrom && apt.dateTo) {
          const from = new Date(apt.dateFrom); from.setHours(0, 0, 0, 0);
          const to = new Date(apt.dateTo); to.setHours(0, 0, 0, 0);
          const sel = new Date(selectedDate); sel.setHours(0, 0, 0, 0);
          return sel >= from && sel <= to;
        }
        return false;
      })
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  }, [appointments, selectedDate]);

  const upcomingAppointments = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return (appointments ?? [])
      .filter(apt => {
        if (!apt || !apt.date) return false;
        try {
          const aptDate = new Date(apt.date); aptDate.setHours(0, 0, 0, 0);
          return aptDate >= today && apt.status !== "Cancelado" && apt.status !== "cancelled" && apt.status !== "Completado" && apt.status !== "completed";
        } catch { return false; }
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 12);
  }, [appointments]);

  const isWithin24Hours = (apt: Appointment): boolean => {
    const now = new Date();
    const aptDate = new Date(apt.date);
    if (apt.startTime) {
      const [h, m] = apt.startTime.split(':').map(Number);
      aptDate.setHours(h, m, 0, 0);
    }
    const hoursUntil = differenceInHours(aptDate, now);
    return hoursUntil >= 0 && hoursUntil <= 24;
  };

  // ── Cambiar estado ──────────────────────────────────────
  const handleStatusChange = async (appointmentId: string, newStatus: AppointmentStatus) => {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment) return;

    try {
      if (FIREBASE_CONFIGURED && db) {
        await updateDoc(doc(db, "turnos", appointmentId), {
          status: newStatus,
          estado: newStatus,
          updatedAt: serverTimestamp(),
          updatedBy: user?.id || "1",
        });
        // onSnapshot updates the list automatically
      } else {
        await modificarTurno(appointmentId, { status: newStatus }, user?.id || "1");
        setAppointments(prev => prev.map(apt => apt.id === appointmentId ? { ...apt, status: newStatus } : apt));
      }
      toast.success(`Estado actualizado a ${newStatus}`);
      addLog("Actualizar", "turnos", `Turno de ${getPetName(appointment.petId)} → ${newStatus}`);
    } catch (err: any) {
      console.error("[AppointmentsModule] Error actualizando estado:", err);
      toast.error(err?.code === "permission-denied" ? "Sin permisos para actualizar el turno." : "Error al actualizar el estado del turno.");
    }
  };

  // ── Slots de horario del doctor ──────────────────────────────────────
  const getAvailableTimeSlotsForDoctor = (doctorId: string, date: Date): string[] => {
    if (!doctorId) return [];
    const dayOfWeek = date.getDay();
    const schedulesForDay = doctorSchedules.filter(
      s => s.doctorId === doctorId && s.dayOfWeek === dayOfWeek && s.active
    );
    if (schedulesForDay.length === 0) return [];

    const slots: string[] = [];
    schedulesForDay.forEach(schedule => {
      const [startH, startM] = schedule.startTime.split(':').map(Number);
      const [endH, endM] = schedule.endTime.split(':').map(Number);
      let h = startH, m = startM;
      while (h < endH || (h === endH && m < endM)) {
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        m += 30;
        if (m >= 60) { m = 0; h++; }
      }
    });
    return slots.sort();
  };

  const availableTimeSlots = useMemo(
    () => getAvailableTimeSlotsForDoctor(formData.doctorId, formData.date),
    [formData.doctorId, formData.date, doctorSchedules]
  );

  const isTimeSlotAvailable = (time: string, doctorId: string): boolean =>
    !appointmentsForDate.some(apt => apt.startTime === time && apt.doctorId === doctorId && apt.id !== selectedAppointment?.id);

  // ── Verificar duplicados ──────────────────────────────────────
  const checkDuplicate = (): boolean => {
    if (formData.type === "clinic" || formData.type === "grooming") {
      return !!appointments.find(apt =>
        apt.id !== selectedAppointment?.id &&
        apt.clientId === formData.clientId &&
        apt.petId === formData.petId &&
        isSameDay(new Date(apt.date), formData.date) &&
        apt.startTime === formData.startTime &&
        apt.status !== "cancelled"
      );
    }
    if (formData.type === "daycare" && formData.dateFrom && formData.dateTo) {
      return !!appointments.find(apt => {
        if (apt.id === selectedAppointment?.id || apt.type !== "daycare" || apt.status === "cancelled" ||
          apt.clientId !== formData.clientId || apt.petId !== formData.petId || !apt.dateFrom || !apt.dateTo) return false;
        return formData.dateFrom! <= new Date(apt.dateTo) && formData.dateTo! >= new Date(apt.dateFrom);
      });
    }
    return false;
  };

  // ── Guardar ──────────────────────────────────────
  const handleSave = async () => {
    const validation = validateAppointmentFields(
      formData.type, formData.clientId, formData.petId,
      "skip", // reason field removed from UI — always skip this validation
      formData.doctorId, formData.startTime, formData.dateFrom, formData.dateTo
    );
    if (!validation.isValid) { toast.error(validation.error); return; }

    if (formData.type === "clinic" || formData.type === "grooming") {
      const dateVal = validateAppointmentDate(formData.date);
      if (!dateVal.isValid) { toast.error(dateVal.error || "No se permiten turnos en fechas pasadas."); return; }
    }

    if (formData.type === "daycare" && formData.dateFrom && formData.dateTo) {
      const rangeVal = validateDateRange(formData.dateFrom, formData.dateTo);
      if (!rangeVal.isValid) { toast.error(rangeVal.error); return; }
    }

    if (isEditing && selectedAppointment) {
      const canEdit = canEditAppointment(selectedAppointment);
      if (!canEdit.isValid) { toast.error(canEdit.error || "No se puede editar este turno."); return; }
    }

    if (!hasPermission("manage_appointments")) { toast.error("Sin permisos para gestionar turnos"); return; }
    if (checkDuplicate()) { toast.error("Ya existe un turno con los mismos detalles"); return; }

    const calcEndTime = (start: string) =>
      `${parseInt(start.split(':')[0])}:${(parseInt(start.split(':')[1]) + 30).toString().padStart(2, '0')}`;

    try {
      if (isEditing && selectedAppointment) {
        // ── Update existing appointment ────────────────────────────────
        const updatePayload: Record<string, any> = {
          clientId: formData.clientId,
          petId: formData.petId,
          doctorId: formData.doctorId || null,
          date: formData.date,
          startTime: formData.startTime || null,
          endTime: formData.startTime ? calcEndTime(formData.startTime) : null,
          status: selectedAppointment.status,
          reason: formData.reason || null,
          notes: formData.notes || null,
          tiposEvento: formData.eventoTipoId ? formData.eventoTipoId.split(",").filter(Boolean) : [],
          type: formData.type,
          updatedAt: FIREBASE_CONFIGURED ? serverTimestamp() : new Date(),
          updatedBy: user?.id || "1",
        };
        if (formData.type === "daycare") {
          updatePayload.dateFrom = formData.dateFrom ?? null;
          updatePayload.dateTo = formData.dateTo ?? null;
        }
        if (FIREBASE_CONFIGURED && db) {
          await updateDoc(doc(db, "turnos", selectedAppointment.id), updatePayload);
        } else {
          await modificarTurno(selectedAppointment.id, formData as any, user?.id || "1");
          setAppointments(prev => prev.map(apt => apt.id === selectedAppointment.id ? { ...apt, ...updatePayload } : apt));
        }
        toast.success("Turno actualizado exitosamente");
        addLog("Actualizar", "turnos", `Turno actualizado para ${getPetName(formData.petId)}`);
      } else {
        // ── Create new appointment — write directly to Firestore ────────
        const newPayload: Record<string, any> = {
          clientId: formData.clientId,
          clienteId: formData.clientId, // alias for compatibility
          petId: formData.petId,
          mascotaId: formData.petId,
          doctorId: formData.doctorId || null,
          date: formData.date,
          fecha: formData.date,
          startTime: formData.startTime || null,
          hora: formData.startTime || null,
          endTime: formData.startTime ? calcEndTime(formData.startTime) : null,
          status: "Confirmado",
          estado: "Confirmado",
          reason: formData.reason || null,
          notes: formData.notes || null,
          notas: formData.notes || null,
          tiposEvento: formData.eventoTipoId ? formData.eventoTipoId.split(",").filter(Boolean) : [],
          type: formData.type,
          serviceId: formData.type,
          creadoEn: FIREBASE_CONFIGURED ? serverTimestamp() : new Date(),
          createdAt: FIREBASE_CONFIGURED ? serverTimestamp() : new Date(),
          createdBy: user?.id || "1",
        };
        if (formData.type === "daycare") {
          newPayload.dateFrom = formData.dateFrom ?? null;
          newPayload.dateTo = formData.dateTo ?? null;
        }

        if (FIREBASE_CONFIGURED && db) {
          await addDoc(collection(db, "turnos"), newPayload);
          // onSnapshot will update the list automatically
        } else {
          // localStorage fallback
          const newApt = await registrarTurno(formData as any, user?.id || "1");
          setAppointments(prev => [...prev, newApt]);
        }
        toast.success("✓ Turno agendado y confirmado");
        addLog("Crear", "turnos", `Turno creado para ${getPetName(formData.petId)} — ${getClientName(formData.clientId)}`);
      }
      handleCancel();
    } catch (err: any) {
      console.error("[AppointmentsModule] Error guardando turno:", err);
      const msg = err?.code === "permission-denied"
        ? "Sin permisos. Verificá que estás autenticado como recepcionista o admin."
        : err?.message ?? "Error al guardar el turno. Intente nuevamente.";
      toast.error(msg);
    }
  };

  const handleCancel = () => {
    setFormData({ type: "clinic", clientId: "", petId: "", doctorId: "", eventoTipoId: "", date: new Date(), startTime: "", endTime: "", dateFrom: undefined, dateTo: undefined, reason: "", notes: "" });
    setSelectedAppointment(null);
    setIsEditing(false);
  };

  const handleEdit = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setIsEditing(true);
    setFormData({
      type: apt.type,
      clientId: apt.clientId,
      petId: apt.petId,
      doctorId: apt.doctorId || "",
      date: new Date(apt.date),
      startTime: apt.startTime || "",
      endTime: apt.endTime || "",
      dateFrom: apt.dateFrom ? new Date(apt.dateFrom) : undefined,
      dateTo: apt.dateTo ? new Date(apt.dateTo) : undefined,
      reason: apt.reason || "",
      notes: apt.notes || ""
    });
  };

  const handleDelete = async () => {
    if (selectedAppointment) {
      try {
        if (FIREBASE_CONFIGURED && db) {
          await updateDoc(doc(db, "turnos", selectedAppointment.id), {
            status: "Cancelado",
            estado: "Cancelado",
            cancellationReason: "Eliminado por el usuario",
            cancelledAt: serverTimestamp(),
            updatedBy: user?.id || "1",
          });
          // onSnapshot removes it from list automatically if filtered
        } else {
          await cancelarTurno(selectedAppointment.id, "Eliminado por el usuario", user?.id || "1");
          setAppointments(prev => prev.filter(apt => apt.id !== selectedAppointment.id));
        }
        toast.success("Turno cancelado");
        addLog("Eliminar", "turnos", `Turno ${selectedAppointment.id} cancelado`);
        handleCancel();
      } catch (err: any) {
        toast.error(err?.code === "permission-denied" ? "Sin permisos para cancelar el turno." : "Error al cancelar el turno.");
      }
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-orange-800 flex items-center gap-2">
            <CalendarIcon className="h-8 w-8" />
            Calendario Turnos
          </h1>
          <p className="text-gray-600 mt-1">Agende y administre turnos de clínica, peluquería y guardería</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-50"
            onClick={() => {
              exportToExcel(
                "turnos_proximos",
                ["Fecha", "Hora", "Tipo", "Mascota", "Cliente", "Profesional", "Estado", "Motivo"],
                upcomingAppointments.map(apt => [
                  format(new Date(apt.date), "dd/MM/yyyy"),
                  apt.startTime || (apt.type === "daycare" && apt.dateFrom && apt.dateTo ? `${format(new Date(apt.dateFrom), "dd/MM")} - ${format(new Date(apt.dateTo), "dd/MM")}` : "—"),
                  getTypeLabel(apt.type),
                  getPetName(apt.petId),
                  getClientName(apt.clientId),
                  getDoctorName(apt.doctorId),
                  getStatusLabel(apt.status),
                  apt.reason || "—"
                ]),
                "Próximos Turnos"
              );
              toast.success("Excel exportado exitosamente");
            }}
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />Excel
          </Button>
          <Button
            size="sm"
            className="bg-orange-600 hover:bg-orange-700"
            onClick={() => {
              exportToPDF(
                "Listado de Próximos Turnos",
                `Generado el ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
                ["Fecha", "Hora", "Tipo", "Mascota", "Cliente", "Profesional", "Estado"],
                upcomingAppointments.map(apt => [
                  format(new Date(apt.date), "dd/MM/yyyy"),
                  apt.startTime || "—",
                  getTypeLabel(apt.type),
                  getPetName(apt.petId),
                  getClientName(apt.clientId),
                  getDoctorName(apt.doctorId),
                  getStatusLabel(apt.status),
                ]),
                { "Total de turnos": String(upcomingAppointments.length) }
              );
              toast.success("PDF generado — use Ctrl+P para guardar");
            }}
          >
            <FileText className="mr-2 h-4 w-4" />PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 bg-orange-50">
          <TabsTrigger value="calendar">Calendario</TabsTrigger>
          <TabsTrigger value="schedule">Agendar Turno</TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-1.5" />
            Notificaciones
          </TabsTrigger>
        </TabsList>

        {/* ══ CALENDARIO ════════════════════════════════ */}
        <TabsContent value="calendar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Selector de fecha */}
            <div className="lg:col-span-1">
              <Card className="border-orange-200 shadow-md">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-white">
                  <CardTitle className="text-orange-800">Seleccionar Fecha</CardTitle>
                  <CardDescription>Navegue por el calendario</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 pb-6">
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      className="rounded-xl border shadow-sm p-4 md:p-6"
                      locale={es}
                      modifiers={modifiers}
                      modifiersClassNames={modifiersClassNames}
                    />
                  </div>
                  <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <p className="text-xs font-medium text-orange-700 mb-1.5 uppercase tracking-wide">Fecha Seleccionada</p>
                    <p className="font-semibold text-orange-900">{format(selectedDate, "PPP", { locale: es })}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Turnos del día */}
            <div className="lg:col-span-2">
              <Card className="border-orange-200 shadow-md">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-white">
                  <CardTitle className="text-orange-800">
                    Agenda del {format(selectedDate, "dd/MM/yyyy")}
                  </CardTitle>
                  <CardDescription>
                    {appointmentsForDate.length} turno{appointmentsForDate.length !== 1 ? "s" : ""} programado{appointmentsForDate.length !== 1 ? "s" : ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {appointmentsForDate.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-gray-200" />
                      <p className="font-medium text-gray-500">No hay turnos para esta fecha</p>
                      <p className="text-sm mt-1">Seleccione otra fecha o agende un nuevo turno</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {appointmentsForDate.map(apt => {
                        const client = clients.find(c => c.id === apt.clientId);
                        const pet = pets.find(p => p.id === apt.petId);
                        return (
                          <div key={apt.id} className="p-4 bg-white rounded-lg border-2 border-orange-100 hover:border-orange-300 transition-all shadow-sm">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="bg-orange-100 p-2 rounded">
                                  <Clock className="h-4 w-4 text-orange-600" />
                                </div>
                                <div>
                                  <span className="text-orange-900 font-semibold">
                                    {apt.startTime || "Sin horario"}
                                  </span>
                                  {apt.endTime && (
                                    <span className="text-gray-400 text-sm ml-1">- {apt.endTime}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Badge className={getTypeColor(apt.type)}>{getTypeLabel(apt.type)}</Badge>
                                <Badge className={getStatusColor(apt.status)}>{getStatusLabel(apt.status)}</Badge>
                              </div>
                            </div>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex items-start">
                                <span className="font-medium text-gray-600 min-w-[90px]">Mascota:</span>
                                <span className="text-gray-900">{pet?.name} <span className="text-gray-500">({(pet as any)?.species})</span></span>
                              </div>
                              <div className="flex items-start">
                                <span className="font-medium text-gray-600 min-w-[90px]">Cliente:</span>
                                <span className="text-gray-900">{client?.fullName}</span>
                              </div>
                              {apt.doctorId && (
                                <div className="flex items-start">
                                  <span className="font-medium text-gray-600 min-w-[90px]">Profesional:</span>
                                  <span className="text-gray-900">{getDoctorName(apt.doctorId)}</span>
                                </div>
                              )}
                              {apt.reason && (
                                <div className="flex items-start">
                                  <span className="font-medium text-gray-600 min-w-[90px]">Motivo:</span>
                                  <span className="text-gray-900">{apt.reason}</span>
                                </div>
                              )}
                              {apt.type === "daycare" && apt.dateFrom && apt.dateTo && (
                                <div className="flex items-start">
                                  <span className="font-medium text-gray-600 min-w-[90px]">Estadía:</span>
                                  <span className="text-gray-900">
                                    {format(new Date(apt.dateFrom), "dd/MM")} → {format(new Date(apt.dateTo), "dd/MM")}
                                  </span>
                                </div>
                              )}
                              {/* Motivos de consulta */}
                              {(apt as any).tiposEvento?.length > 0 && tiposEvento.length > 0 && (
                                <div className="flex items-start flex-wrap gap-1 pt-1">
                                  <span className="font-medium text-gray-600 min-w-[90px] text-xs mt-0.5">Motivos:</span>
                                  {(apt as any).tiposEvento.map((tid: string) => {
                                    const t = tiposEvento.find(t => t.id === tid);
                                    return t ? <span key={tid} className={`px-2 py-0.5 rounded-full text-xs ${t.color}`}>{t.name}</span> : null;
                                  })}
                                </div>
                              )}
                            </div>

                            {/* ── Botones de Estado ─────────────────────── */}
                            {apt.status !== "Cancelado" && apt.status !== "Completado" && hasPermission("manage_appointments") && (
                              <div className="mt-3 pt-3 border-t border-orange-100 flex gap-2 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-green-300 text-green-700 hover:bg-green-50 text-xs h-7"
                                  onClick={() => handleStatusChange(apt.id, "Completado")}
                                >
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                  Turno finalizado
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-300 text-red-700 hover:bg-red-50 text-xs h-7"
                                  onClick={() => { setSelectedAppointment(apt); setDeleteDialogOpen(true); }}
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                  Cancelar turno
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-orange-600 hover:bg-orange-50 text-xs h-7"
                                  onClick={() => { setSelectedAppointment(apt); setIsEditing(true); setActiveTab("schedule"); setFormData({ type: apt.type as AppointmentType, clientId: apt.clientId, petId: apt.petId, doctorId: apt.doctorId || "", eventoTipoId: (apt as any).tiposEvento?.join(",") || "", date: new Date(apt.date), startTime: apt.startTime || "", endTime: apt.endTime || "", dateFrom: apt.dateFrom ? new Date(apt.dateFrom) : undefined, dateTo: apt.dateTo ? new Date(apt.dateTo) : undefined, reason: apt.reason || "", notes: apt.notes || "" }); }}
                                >
                                  <Save className="h-3.5 w-3.5 mr-1" />
                                  Editar
                                </Button>
                              </div>
                            )}
                            {(apt.status === "Cancelado" || apt.status === "Completado") && (
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${apt.status === "Cancelado" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                                  {apt.status === "Cancelado" ? "Turno cancelado" : "Turno completado"}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ══ AGENDAR ════════════════════════════════ */}
        <TabsContent value="schedule">
          <Card className="border-orange-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-white">
              <CardTitle className="text-orange-800">
                {isEditing ? "Editar Turno" : "Agendar Nuevo Turno"}
              </CardTitle>
              <CardDescription>
                {isEditing
                  ? "Modifique los datos del turno"
                  : "El turno se agendará con estado Confirmado automáticamente"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* Info auto-confirmado (solo al crear) */}
                {!isEditing && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-700">
                      Al agendar, el turno quedará en estado <strong>Confirmado</strong> automáticamente.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Servicio <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: AppointmentType) => setFormData(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clinic">Clínica Veterinaria</SelectItem>
                        <SelectItem value="grooming">Peluquería Canina</SelectItem>
                        <SelectItem value="daycare">Guardería</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Cliente <span className="text-red-500">*</span></Label>
                    <Select value={formData.clientId} onValueChange={(v) => setFormData(prev => ({ ...prev, clientId: v, petId: "" }))}>
                      <SelectTrigger><SelectValue placeholder="Seleccione cliente" /></SelectTrigger>
                      <SelectContent>
                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Mascota <span className="text-red-500">*</span></Label>
                    <Select
                      value={formData.petId}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, petId: v }))}
                      disabled={!formData.clientId}
                    >
                      <SelectTrigger><SelectValue placeholder="Seleccione mascota" /></SelectTrigger>
                      <SelectContent>
                        {getPetsByClient(formData.clientId).map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name} — {(p as any).species}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Motivo / Tipos de Evento (multi-selección) */}
                {formData.type === "clinic" && tiposEvento.length > 0 && (
                  <div className="space-y-2">
                    <Label>Motivo / Tipos de Consulta <span className="text-xs text-gray-400 font-normal">(puede seleccionar varios)</span></Label>
                    <div className="flex flex-wrap gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50/50 min-h-[42px]">
                      {tiposEvento.map(t => {
                        const selectedIds: string[] = formData.eventoTipoId ? formData.eventoTipoId.split(",").filter(Boolean) : [];
                        const isSelected = selectedIds.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              const current = formData.eventoTipoId ? formData.eventoTipoId.split(",").filter(Boolean) : [];
                              const updated = isSelected ? current.filter(id => id !== t.id) : [...current, t.id];
                              setFormData(prev => ({ ...prev, eventoTipoId: updated.join(",") }));
                            }}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all border-2 ${
                              isSelected ? `${t.color} border-current shadow-sm` : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                            }`}
                          >
                            {isSelected && <span className="mr-1">✓</span>}
                            {t.name}
                          </button>
                        );
                      })}
                    </div>
                    {formData.eventoTipoId && (
                      <p className="text-xs text-gray-500">
                        Seleccionados: {formData.eventoTipoId.split(",").filter(Boolean).map(id => tiposEvento.find(t => t.id === id)?.name).filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {/* Campos de fecha/hora según tipo */}
                {(formData.type === "clinic" || formData.type === "grooming") ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Fecha <span className="text-red-500">*</span></Label>
                      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(formData.date, "PPP", { locale: es })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.date}
                            onSelect={(date) => { if (date) { setFormData(prev => ({ ...prev, date })); setCalendarOpen(false); } }}
                            disabled={(date) => isBefore(date, startOfDay(new Date()))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Profesional <span className="text-red-500">*</span></Label>
                      <Select value={formData.doctorId} onValueChange={(v) => setFormData(prev => ({ ...prev, doctorId: v }))}>
                        <SelectTrigger><SelectValue placeholder="Seleccione profesional" /></SelectTrigger>
                        <SelectContent>
                          {(doctoresPerfil.length > 0 ? doctoresPerfil : doctors.filter(d => d.available)).map(d => (
                            <SelectItem key={d.id} value={d.id}>
                              {(d as any).fullName ?? (d as any).name}
                              {(d as any).specialty ? ` — ${(d as any).specialty}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Horario <span className="text-red-500">*</span></Label>
                      <Select
                        value={formData.startTime}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, startTime: v }))}
                        disabled={!formData.doctorId || availableTimeSlots.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={
                            !formData.doctorId ? "Primero seleccione profesional"
                              : availableTimeSlots.length === 0 ? "Sin horarios para este día"
                                : "Seleccione horario"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTimeSlots.length === 0 ? (
                            <div className="px-3 py-4 text-center text-sm text-gray-500">
                              Sin horarios configurados para este día.<br />
                              Configure en Módulo de Seguridad.
                            </div>
                          ) : (
                            availableTimeSlots.map(time => {
                              const avail = isTimeSlotAvailable(time, formData.doctorId);
                              return (
                                <SelectItem key={time} value={time} disabled={!avail}>
                                  {time}{!avail ? " (Ocupado)" : ""}
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                      {formData.doctorId && availableTimeSlots.length === 0 && (
                        <p className="text-xs text-orange-600">
                          Sin horarios para {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][formData.date.getDay()]}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fecha Desde <span className="text-red-500">*</span></Label>
                      <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.dateFrom ? format(formData.dateFrom, "PPP", { locale: es }) : "Seleccionar fecha"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.dateFrom}
                            onSelect={(date) => { if (date) { setFormData(prev => ({ ...prev, dateFrom: date, date })); setDateFromOpen(false); } }}
                            disabled={(date) => isBefore(date, startOfDay(new Date()))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Fecha Hasta <span className="text-red-500">*</span></Label>
                      <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.dateTo ? format(formData.dateTo, "PPP", { locale: es }) : "Seleccionar fecha"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formData.dateTo}
                            onSelect={(date) => { if (date) { setFormData(prev => ({ ...prev, dateTo: date })); setDateToOpen(false); } }}
                            disabled={(date) => date < (formData.dateFrom || new Date())}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Notas Adicionales (opcional)</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Información adicional sobre el turno..."
                    rows={3}
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleSave}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                    disabled={!hasPermission("manage_appointments")}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? "Actualizar Turno" : "Agendar y Confirmar"}
                  </Button>
                  <Button onClick={handleCancel} variant="outline" className="flex-1 border-orange-300 hover:bg-orange-50">
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ NOTIFICACIONES ════════════════════════════════ */}
        <TabsContent value="notifications">
          <AppointmentNotificationsPanel
            appointments={appointments}
            clients={clients}
            pets={pets}
            doctors={doctors}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este turno?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}