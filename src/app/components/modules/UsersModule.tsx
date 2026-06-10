import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { User, Doctor, DoctorSchedule } from "../../types";
import { doctors as initialDoctors } from "../../data/mockData";
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
  CheckCircle2, Users, Eye, EyeOff, Info, Calendar as CalendarIcon
} from "lucide-react";
import { toast } from "sonner@2.0.3";

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
  const [users, setUsers] = useState<User[]>([
    {
      id: "1", username: "admin", password: "admin123", fullName: "Administrador Principal",
      role: "admin", email: "admin@veterinaria.com", phone: "+54 11 1234-5678",
      active: true, permissions: getPermissionsForRole("admin"), createdAt: new Date(2020, 0, 1)
    } as any,
    {
      id: "2", username: "veterinario", password: "vet123", fullName: "Dra. María Fernández",
      role: "veterinario", email: "veterinario@veterinaria.com", phone: "+54 11 2345-6789",
      active: true, permissions: getPermissionsForRole("veterinario"), createdAt: new Date(2021, 0, 1)
    } as any,
    {
      id: "3", username: "recepcionista", password: "rec123", fullName: "Juan Pérez",
      role: "recepcionista", email: "recepcionista@veterinaria.com", phone: "+54 11 9876-5432",
      active: true, permissions: getPermissionsForRole("recepcionista"), createdAt: new Date(2021, 6, 1)
    } as any,
  ]);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: "", password: "", fullName: "", role: "recepcionista" as RoleType,
    email: "", phone: "", active: true,
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

  // ── Persistencia ──────────────────────────────────────
  useEffect(() => {
    const savedSchedules = localStorage.getItem("veterinaria_doctor_schedules");
    const savedDoctors = localStorage.getItem("veterinaria_doctors");
    setSchedules(savedSchedules ? JSON.parse(savedSchedules) : []);
    setDoctors(savedDoctors ? JSON.parse(savedDoctors) : initialDoctors);
  }, []);

  useEffect(() => {
    localStorage.setItem("veterinaria_doctor_schedules", JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    if (doctors.length > 0) {
      localStorage.setItem("veterinaria_doctors", JSON.stringify(doctors));
    }
  }, [doctors]);

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
  
  // Mostrar TODOS los profesionales/doctores sin filtrar por rol
  const allDoctors = doctors;

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
      password: (user as any).password || "",
      fullName: user.fullName,
      role: (user as any).role as RoleType,
      email: user.email,
      phone: (user as any).phone || "",
      active: user.active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveUser = () => {
    if (!formData.username || !formData.password || !formData.fullName || !formData.email) {
      toast.error("Complete todos los campos obligatorios");
      return;
    }
    const permissions = getPermissionsForRole(formData.role);

    if (isEditing && selectedUser) {
      setUsers(prev => prev.map(u =>
        u.id === selectedUser.id ? { ...u, ...formData, permissions, updatedAt: new Date() } : u
      ));
      toast.success("Usuario actualizado exitosamente");
    } else {
      const newUserId = Date.now().toString();
      const newUser: any = { id: newUserId, ...formData, permissions, createdAt: new Date() };
      setUsers(prev => [...prev, newUser]);

      if (needsSchedule(formData.role)) {
        const newDoctor: Doctor = {
          id: `doc_${newUserId}`,
          userId: newUserId,
          name: formData.fullName,
          specialty: formData.role === "veterinario" ? "Medicina General" : "Peluquería",
          available: true,
          createdAt: new Date(),
        };
        setDoctors(prev => [...prev, newDoctor]);
        toast.success("Usuario creado y perfil de profesional generado");
      } else {
        toast.success("Usuario creado exitosamente");
      }
    }
    handleCancelUser();
  };

  const handleCancelUser = () => {
    setFormData({ username: "", password: "", fullName: "", role: "recepcionista", email: "", phone: "", active: true });
    setSelectedUser(null);
    setIsEditing(false);
    setShowPassword(false);
  };

  // ── Horarios: acciones ──────────────────────────────────────
  const handleAddSchedule = () => {
    if (!selectedDoctorId) {
      toast.error("Seleccione un profesional primero");
      return;
    }
    if (scheduleForm.startTime >= scheduleForm.endTime) {
      toast.error("La hora de inicio debe ser anterior a la hora de fin");
      return;
    }
    const hasConflict = schedules
      .filter(s => s.doctorId === selectedDoctorId && s.dayOfWeek === scheduleForm.dayOfWeek && s.active)
      .some(s =>
        (scheduleForm.startTime >= s.startTime && scheduleForm.startTime < s.endTime) ||
        (scheduleForm.endTime > s.startTime && scheduleForm.endTime <= s.endTime) ||
        (scheduleForm.startTime <= s.startTime && scheduleForm.endTime >= s.endTime)
      );
    if (hasConflict) {
      toast.error("Ya existe un horario en ese día y rango horario");
      return;
    }
    const newSchedule: DoctorSchedule = {
      id: Date.now().toString(),
      doctorId: selectedDoctorId,
      dayOfWeek: scheduleForm.dayOfWeek,
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      active: scheduleForm.active,
      createdAt: new Date(),
    };
    setSchedules(prev => [...prev, newSchedule]);
    toast.success("Horario agregado exitosamente");
    setScheduleForm({ dayOfWeek: 1, startTime: "09:00", endTime: "17:00", active: true });
  };

  const handleToggleSchedule = (id: string) => {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
    toast.success("Estado del horario actualizado");
  };

  const handleDeleteSchedule = () => {
    if (selectedSchedule) {
      setSchedules(prev => prev.filter(s => s.id !== selectedSchedule.id));
      toast.success("Horario eliminado");
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

              {/* Campos básicos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de Usuario <span className="text-red-500">*</span></Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(p => ({ ...p, username: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && document.getElementById("password")?.focus()}
                    placeholder="Ej: jperez"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña <span className="text-red-500">*</span></Label>
                  <div className="flex gap-2">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && document.getElementById("fullName")?.focus()}
                      placeholder="Contraseña segura"
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Nombre Completo <span className="text-red-500">*</span></Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData(p => ({ ...p, fullName: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && document.getElementById("email")?.focus()}
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && document.getElementById("phone")?.focus()}
                    placeholder="usuario@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono (opcional)</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+54 11 1234-5678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rol <span className="text-red-500">*</span></Label>
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