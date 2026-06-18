import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { User, Doctor, DoctorSchedule, DoctorPerfil } from "../../types";
import { doctors as initialDoctors } from "../../data/mockData";
import {
  traerUsuarios,
  registrarUsuario,
  modificarUsuario,
  desactivarUsuario,
  validarUnicidadUsuario,
} from "../../services/usuarioService";
import { asignarRolSeguro, ROLE_META } from "../../services/userService";
import {
  traerTodosLosDoctores,
  registrarDoctor,
  modificarDoctor,
} from "../../services/doctorService";
import {
  traerTodosLosHorarios,
  registrarHorario,
  desactivarHorario,
  validarHorario,
} from "../../services/horarioService";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import {
  Shield, UserPlus, Save, X, Edit, Clock, Trash2, Plus,
  CheckCircle2, Users, Eye, EyeOff, Info, Calendar as CalendarIcon, Stethoscope
} from "lucide-react";
import { toast } from "sonner";

// ══════════════════════════════════════════════
// TIPOS Y CONSTANTES
// ══════════════════════════════════════════════
type RoleType = "admin" | "veterinario" | "recepcionista" | "peluquero";

const rolePermissionsMap: Record<RoleType, { label: string; description: string; color: string }[]> = {
  admin: [
    { label: "Gestionar Clientes", description: "Crear, editar y eliminar clientes", color: "bg-orange-100 text-orange-800" },
    { label: "Gestionar Mascotas", description: "Crear, editar y eliminar mascotas", color: "bg-orange-100 text-orange-800" },
    { label: "Ver Historial Clínico", description: "Consultar historiales médicos", color: "bg-orange-100 text-orange-800" },
    { label: "Gestionar Historial", description: "Agregar y editar registros médicos", color: "bg-orange-100 text-orange-800" },
    { label: "Ver Turnos", description: "Consultar agenda de turnos", color: "bg-orange-100 text-orange-800" },
    { label: "Gestionar Turnos", description: "Crear, editar y cancelar turnos", color: "bg-orange-100 text-orange-800" },
    { label: "Gestionar Usuarios", description: "Crear y editar usuarios del sistema", color: "bg-orange-100 text-orange-800" },
    { label: "Ver Auditoría", description: "Acceso al log de auditoría completo", color: "bg-orange-100 text-orange-800" },
    { label: "Configuración del Sistema", description: "Gestionar configuraciones globales", color: "bg-orange-100 text-orange-800" },
  ],
  veterinario: [
    { label: "Gestionar Clientes", description: "Crear, editar y eliminar clientes", color: "bg-blue-100 text-blue-800" },
    { label: "Gestionar Mascotas", description: "Crear, editar y eliminar mascotas", color: "bg-blue-100 text-blue-800" },
    { label: "Ver Historial Clínico", description: "Consultar historiales médicos", color: "bg-blue-100 text-blue-800" },
    { label: "Gestionar Historial", description: "Agregar y editar registros médicos", color: "bg-blue-100 text-blue-800" },
    { label: "Ver Turnos", description: "Consultar agenda de turnos", color: "bg-blue-100 text-blue-800" },
    { label: "Gestionar Turnos", description: "Confirmar y completar sus turnos", color: "bg-blue-100 text-blue-800" },
  ],
  recepcionista: [
    { label: "Gestionar Clientes", description: "Crear, editar y eliminar clientes", color: "bg-green-100 text-green-800" },
    { label: "Gestionar Mascotas", description: "Crear, editar y eliminar mascotas", color: "bg-green-100 text-green-800" },
    { label: "Ver Historial Clínico", description: "Consultar historiales (solo lectura)", color: "bg-green-100 text-green-800" },
    { label: "Ver Turnos", description: "Consultar agenda de turnos", color: "bg-green-100 text-green-800" },
    { label: "Gestionar Turnos", description: "Crear, editar y cancelar turnos", color: "bg-green-100 text-green-800" },
  ],
  peluquero: [
    { label: "Gestionar Clientes", description: "Ver datos de clientes", color: "bg-purple-100 text-purple-800" },
    { label: "Gestionar Mascotas", description: "Ver fichas de mascotas", color: "bg-purple-100 text-purple-800" },
    { label: "Ver Turnos", description: "Ver turnos de peluquería asignados", color: "bg-purple-100 text-purple-800" },
    { label: "Gestionar Turnos (Peluquería)", description: "Confirmar y completar turnos de peluquería", color: "bg-purple-100 text-purple-800" },
  ],
};

// roleInfo is derived from ROLE_META (imported from userService) for consistency
const roleInfo: Record<RoleType, { displayName: string; color: string; description: string }> = {
  admin: { displayName: "Administrador", color: "bg-orange-100 text-orange-800 border-orange-300", description: "Acceso completo al sistema" },
  veterinario: { displayName: "Veterinario", color: "bg-blue-100 text-blue-800 border-blue-300", description: "Gestión clínica y de turnos" },
  recepcionista: { displayName: "Recepcionista", color: "bg-green-100 text-green-800 border-green-300", description: "Atención al cliente y turnos" },
  peluquero: { displayName: "Peluquero", color: "bg-purple-100 text-purple-800 border-purple-300", description: "Servicios de peluquería" },
};

const daysOfWeek = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

const timeOptions = [
  "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00",
];

const needsSchedule = (role: RoleType) => role === "veterinario" || role === "peluquero";

const getPermissionsForRole = (role: RoleType): string[] => {
  switch (role) {
    case "admin":
      return ["manage_clients", "manage_pets", "view_medical_history", "manage_medical_history",
        "view_appointments", "manage_appointments", "manage_users", "manage_permissions", "view_audit"];
    case "veterinario":
      return ["manage_clients", "manage_pets", "view_medical_history", "manage_medical_history",
        "view_appointments", "manage_appointments"];
    case "recepcionista":
      return ["manage_clients", "manage_pets", "view_medical_history",
        "view_appointments", "manage_appointments"];
    case "peluquero":
      return ["manage_clients", "manage_pets", "view_appointments", "manage_appointments"];
    default:
      return [];
  }
};

// ══════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════
export default function UsersModule() {
  const { user: currentUser, isAdmin } = useAuth();

  // ── Estado usuarios ──────────────────────────────────────
  const [users, setUsers] = useState<User[]>([]);
  const [doctoresFirestore, setDoctoresFirestore] = useState<DoctorPerfil[]>([]);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    // Nombre y apellido separados (el fullName se arma al guardar)
    nombre: "",
    apellido: "",
    fullName: "",
    role: "recepcionista" as RoleType,
    email: "",
    phone: "",
    sexo: "" as "" | "Masculino" | "Femenino" | "Prefiero no decirlo" | "Otro",
    domicilio: "",
    active: true,
    // Doctor profile fields (only used when role = veterinario or peluquero)
    specialty: "",
    licenseNumber: "",
  });

  // ── Estado horarios ──────────────────────────────────────
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [deleteScheduleDialogOpen, setDeleteScheduleDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<DoctorSchedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    dayOfWeek: 1, startTime: "09:00", endTime: "17:00", active: true,
  });

  // ── Carga inicial ──────────────────────────────────────
  useEffect(() => {
    traerUsuarios().then(setUsers).catch(() => {});
    traerTodosLosHorarios().then(setSchedules).catch(() => {
      const saved = localStorage.getItem("veterinaria_doctor_schedules");
      setSchedules(saved ? JSON.parse(saved) : []);
    });
    // Load doctors from Firestore (fallback to localStorage)
    traerTodosLosDoctores().then(d => {
      setDoctoresFirestore(d);
      // Keep legacy doctors state synced for schedule management
      setDoctors(d.map(dp => ({ id: dp.id, userId: dp.userId ?? "", name: dp.fullName, specialty: dp.specialty, available: dp.available, createdAt: dp.createdAt })) as any);
    }).catch(() => {
      const savedDoctors = localStorage.getItem("veterinaria_doctors");
      setDoctors(savedDoctors ? JSON.parse(savedDoctors) : initialDoctors);
    });
  }, []);

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Card className="border-orange-200 shadow-md">
          <CardContent className="pt-12 pb-12">
            <div className="text-center text-gray-500">
              <Shield className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h2 className="text-gray-700 mb-2">Acceso Restringido</h2>
              <p>Solo los administradores pueden acceder al módulo de seguridad</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Helpers ──────────────────────────────────────
  const getDayName = (n: number) => daysOfWeek.find(d => d.value === n)?.label || "";
  const getRoleBadge = (role: string) => {
    const info = roleInfo[role as RoleType];
    return info ? <Badge className={info.color}>{info.displayName}</Badge> : <Badge>{role}</Badge>;
  };
  
  // Prefer Firestore doctor profiles; fall back to legacy doctors array
  const allDoctors = doctoresFirestore.length > 0
    ? doctoresFirestore
    : doctors;

  const selectedDoctorSchedules = schedules
    .filter(s => s.doctorId === selectedDoctorId)
    .sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.startTime.localeCompare(b.startTime);
    });

  // ── Usuarios: acciones ──────────────────────────────────────
  const selectUser = (user: User) => {
    setSelectedUser(user);
    setIsEditing(true);
    setFormData({
      username: user.username,
      password: "",
      nombre: (user as any).nombre || user.fullName.split(" ")[0] || "",
      apellido: (user as any).apellido || user.fullName.split(" ").slice(1).join(" ") || "",
      fullName: user.fullName,
      role: (user.roleName ?? user.roleId ?? "recepcionista") as RoleType,
      email: user.email,
      phone: user.phone || "",
      sexo: ((user as any).sexo || "") as any,
      domicilio: (user as any).domicilio || "",
      active: user.active,
      specialty: doctoresFirestore.find(d => d.userId === user.id)?.specialty ?? "",
      licenseNumber: doctoresFirestore.find(d => d.userId === user.id)?.licenseNumber ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveUser = async () => {
    // Build fullName from nombre + apellido
    const nombre = formData.nombre.trim();
    const apellido = formData.apellido.trim();
    if (!nombre) { toast.error("El nombre es obligatorio"); return; }
    if (!formData.email) { toast.error("El email es obligatorio"); return; }
    if (!formData.role) { toast.error("El perfil/rol es obligatorio"); return; }
    const fullName = apellido ? `${nombre} ${apellido}` : nombre;
    const username = formData.username.trim() || formData.email.split("@")[0];
    formData.fullName = fullName;
    formData.username = username;

    // validarUnicidadUsuario — Gestor Usuarios y Permisos
    const uniqueCheck = await validarUnicidadUsuario(formData.username, formData.email, selectedUser?.id);
    if (!uniqueCheck.valid) {
      toast.error(uniqueCheck.errors[0]?.message || "El usuario o email ya están en uso");
      return;
    }

    try {
      if (isEditing && selectedUser) {
        const updated = await modificarUsuario(selectedUser.id, {
          username: formData.username,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          active: formData.active,
          roleId: formData.role,
          // Extra fields stored in Firestore
          ...(formData.sexo && { sexo: formData.sexo }),
          ...(formData.domicilio && { domicilio: formData.domicilio }),
          nombre: formData.nombre.trim(),
          apellido: formData.apellido.trim(),
        } as any, currentUser?.id || "1");

        // If the role changed, use the secure role-assignment path
        if (selectedUser.roleName !== formData.role && currentUser) {
          await asignarRolSeguro(
            currentUser,
            selectedUser.id,
            formData.role as "admin" | "veterinario" | "recepcionista" | "peluquero"
          );
        }

        setUsers(prev => prev.map(u => u.id === selectedUser.id ? updated : u));
        toast.success("Usuario actualizado exitosamente");
      } else {
        if (!formData.password) { toast.error("La contraseña es obligatoria"); return; }
        if (formData.password.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres (requisito de Firebase)."); return; }
        const newUser = await registrarUsuario({
          username: formData.username,
          password: formData.password,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          active: formData.active,
          roleId: formData.role,       // always lowercase: admin/veterinario/recepcionista/peluquero
          nombre: formData.nombre.trim(),
          apellido: formData.apellido.trim(),
          sexo: formData.sexo || undefined,
          domicilio: formData.domicilio || undefined,
        } as any, currentUser?.id || "1");
        setUsers(prev => [...prev, newUser]);

        if (needsSchedule(formData.role)) {
          // Persist doctor profile to Firestore
          const specialty = formData.specialty.trim() || (formData.role === "veterinario" ? "Medicina General" : "Peluquería");
          const newDocPerfil = await registrarDoctor({
            userId: newUser.id,
            fullName: formData.fullName,
            specialty,
            licenseNumber: formData.licenseNumber.trim() || undefined,
            phone: formData.phone || undefined,
            available: true,
          }, currentUser?.id || "1");
          setDoctoresFirestore(prev => [...prev, newDocPerfil]);
          setDoctors(prev => [...prev, { id: newDocPerfil.id, userId: newUser.id, name: formData.fullName, specialty, available: true, createdAt: new Date() } as any]);
          toast.success("Usuario creado y perfil de profesional registrado en Firestore");
        } else {
          toast.success("Usuario creado exitosamente");
        }

        // Update specialty/licenseNumber if editing an existing professional
        if (isEditing && selectedUser && needsSchedule(formData.role as RoleType)) {
          const existingDoc = doctoresFirestore.find(d => d.userId === selectedUser.id);
          if (existingDoc) {
            await modificarDoctor(existingDoc.id, {
              fullName: formData.fullName,
              specialty: formData.specialty.trim() || existingDoc.specialty,
              licenseNumber: formData.licenseNumber.trim() || undefined,
            }, currentUser?.id);
            setDoctoresFirestore(prev => prev.map(d => d.id === existingDoc.id ? { ...d, fullName: formData.fullName, specialty: formData.specialty.trim() || d.specialty, licenseNumber: formData.licenseNumber.trim() || d.licenseNumber } : d));
          }
        }
      }
      handleCancelUser();
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar el usuario. Intente nuevamente.");
    }
  };

  const handleCancelUser = () => {
    setFormData({ username: "", password: "", nombre: "", apellido: "", fullName: "", role: "recepcionista", email: "", phone: "", sexo: "", domicilio: "", active: true, specialty: "", licenseNumber: "" });
    setSelectedUser(null);
    setIsEditing(false);
    setShowPassword(false);
  };

  // ── Horarios: acciones ──────────────────────────────────────
  const handleAddSchedule = async () => {
    if (!selectedDoctorId) {
      toast.error("Seleccione un profesional primero");
      return;
    }
    // validarHorario — Gestor Alta Horario
    const validation = await validarHorario(
      selectedDoctorId,
      scheduleForm.dayOfWeek,
      scheduleForm.startTime,
      scheduleForm.endTime
    );
    if (!validation.valid) {
      toast.error(validation.errors[0]?.message || "Error en la validación del horario");
      return;
    }

    try {
      const newSchedule = await registrarHorario(
        selectedDoctorId,
        scheduleForm.dayOfWeek,
        scheduleForm.startTime,
        scheduleForm.endTime
      );
      setSchedules(prev => [...prev, newSchedule]);
      toast.success("Horario agregado exitosamente");
      setScheduleForm({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00", active: true });
    } catch {
      toast.error("Error al guardar el horario.");
    }
  };

  const handleToggleSchedule = async (id: string) => {
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;
    if (schedule.active) {
      await desactivarHorario(id).catch(() => {});
    }
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
    toast.success("Estado del horario actualizado");
  };

  const handleDeleteSchedule = async () => {
    if (selectedSchedule) {
      try {
        await desactivarHorario(selectedSchedule.id);
        setSchedules(prev => prev.filter(s => s.id !== selectedSchedule.id));
        toast.success("Horario eliminado");
      } catch {
        toast.error("Error al eliminar el horario.");
      }
      setDeleteScheduleDialogOpen(false);
      setSelectedSchedule(null);
    }
  };

  const currentRole = formData.role as RoleType;
  const rolePerms = rolePermissionsMap[currentRole] || [];

  // ── Resumen de horarios por día (para la vista de grilla) ──────────────────────────────────────
  const schedulesByDay = daysOfWeek.map(day => ({
    ...day,
    slots: selectedDoctorSchedules.filter(s => s.dayOfWeek === day.value),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-orange-800 flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Módulo de Seguridad
        </h1>
        <p className="text-gray-600 mt-1">Gestión de usuarios y roles del sistema</p>
      </div>

      <div className="space-y-6">
        {/* ── Formulario de usuario ── */}
          <Card className="border-orange-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-white">
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <UserPlus className="h-5 w-5" />
                {isEditing ? "Editar Usuario" : "Nuevo Usuario"}
              </CardTitle>
              <CardDescription>
                Los permisos se asignan automáticamente según el rol seleccionado
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">

              {/* Campos requeridos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Nombre */}
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre <span className="text-red-500">*</span></Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="Ej: Juan"
                    autoFocus
                  />
                </div>

                {/* Apellido */}
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido <span className="text-red-500">*</span></Label>
                  <Input
                    id="apellido"
                    value={formData.apellido}
                    onChange={(e) => setFormData(p => ({ ...p, apellido: e.target.value }))}
                    placeholder="Ej: Pérez"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico (Mail) <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                    placeholder="usuario@veterinarialeo.com"
                  />
                </div>

                {/* Teléfono */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono <span className="text-red-500">*</span></Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+54 11 1234-5678"
                  />
                </div>

                {/* Sexo */}
                <div className="space-y-2">
                  <Label htmlFor="sexo">Sexo <span className="text-red-500">*</span></Label>
                  <Select value={formData.sexo} onValueChange={(v) => setFormData(p => ({ ...p, sexo: v as any }))}>
                    <SelectTrigger id="sexo"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Femenino">Femenino</SelectItem>
                      <SelectItem value="Prefiero no decirlo">Prefiero no decirlo</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Domicilio */}
                <div className="space-y-2">
                  <Label htmlFor="domicilio">Domicilio</Label>
                  <Input
                    id="domicilio"
                    value={formData.domicilio}
                    onChange={(e) => setFormData(p => ({ ...p, domicilio: e.target.value }))}
                    placeholder="Ej: Av. Corrientes 1234, CABA"
                  />
                </div>

                {/* Contraseña */}
                <div className="space-y-2">
                  <Label htmlFor="password">
                    Contraseña {!isEditing && <span className="text-red-500">*</span>}
                    {isEditing && <span className="text-xs text-gray-400 font-normal"> (dejar vacío para no cambiar)</span>}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Perfil / Rol */}
                <div className="space-y-2">
                  <Label htmlFor="role">Perfil / Rol <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.role}
                    onValueChange={(v: RoleType) => setFormData(p => ({ ...p, role: v }))}
                  >
                    <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="veterinario">Veterinario</SelectItem>
                      <SelectItem value="recepcionista">Recepcionista</SelectItem>
                      <SelectItem value="peluquero">Peluquero</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-400">El rol determina los permisos de acceso al sistema.</p>
                </div>

                <div className="space-y-2">
                  <Label>Estado</Label>
                  <div className="flex items-center space-x-2 h-10">
                    <Switch
                      checked={formData.active}
                      onCheckedChange={(v) => setFormData(p => ({ ...p, active: v }))}
                    />
                    <Label className={formData.active ? "text-green-600" : "text-red-600"}>
                      {formData.active ? "Activo" : "Inactivo"}
                    </Label>
                  </div>
                </div>
              </div>

              {/* Perfil de Profesional (solo veterinario/peluquero) */}
              {needsSchedule(formData.role) && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Stethoscope className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-800">Perfil del Profesional</span>
                    <span className="text-xs text-blue-600">(se guarda en Firestore)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="specialty">Especialidad / Profesión</Label>
                      <Input
                        id="specialty"
                        value={formData.specialty}
                        onChange={(e) => setFormData(p => ({ ...p, specialty: e.target.value }))}
                        placeholder={formData.role === "veterinario" ? "Ej: Medicina General, Cirugía..." : "Ej: Peluquería Canina"}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="licenseNumber">Número de Matrícula (opcional)</Label>
                      <Input
                        id="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={(e) => setFormData(p => ({ ...p, licenseNumber: e.target.value }))}
                        placeholder="Ej: MP 12345"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Permisos por rol (informativo) */}
              <div className="rounded-lg border border-orange-200 overflow-hidden">
                <div className="bg-orange-50 px-4 py-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">
                    Permisos del rol: {roleInfo[currentRole]?.displayName}
                  </span>
                  <Badge className={roleInfo[currentRole]?.color + " ml-auto text-xs"}>
                    {roleInfo[currentRole]?.description}
                  </Badge>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {rolePerms.map((perm, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded border text-sm">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-500" />
                      <div>
                        <p className="font-medium text-gray-800">{perm.label}</p>
                        <p className="text-xs text-gray-500">{perm.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-amber-50 px-4 py-2 border-t border-amber-100">
                  <p className="text-xs text-amber-700 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    Los permisos se asignan automáticamente al guardar. No se pueden modificar individualmente.
                  </p>
                </div>
              </div>

              {/* Nota horarios (para vet/peluquero) */}
              {needsSchedule(currentRole) && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <p className="text-sm text-blue-700">
                    Los horarios de atención para este profesional se configuran en la pestaña <strong>Horarios de Atención</strong>.
                  </p>
                </div>
              )}

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={handleSaveUser}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {isEditing ? "Actualizar Usuario" : "Crear Usuario"}
                </Button>
                <Button onClick={handleCancelUser} variant="outline" className="flex-1 border-orange-300 hover:bg-orange-50">
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Lista de usuarios ── */}
          <Card className="border-orange-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-white">
              <CardTitle className="text-orange-800 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Usuarios del Sistema
              </CardTitle>
              <CardDescription>
                {users.length} usuario{users.length !== 1 ? "s" : ""} registrado{users.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-orange-50">
                        <TableHead>Usuario</TableHead>
                        <TableHead>Nombre Completo</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                        <TableHead className="hidden sm:table-cell">Rol</TableHead>
                        <TableHead className="hidden lg:table-cell text-center">Estado</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} className="hover:bg-orange-50/50">
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.fullName}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-gray-600">{user.email}</TableCell>
                          <TableCell className="hidden sm:table-cell">{getRoleBadge((user as any).role)}</TableCell>
                          <TableCell className="hidden lg:table-cell text-center">
                            <Badge className={user.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                              {user.active ? "Activo" : "Inactivo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => selectUser(user)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}