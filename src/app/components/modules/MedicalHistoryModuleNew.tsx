import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAudit } from "../../context/AuditContext";
import { MedicalRecord, Client, Pet, MedicalAttachment } from "../../types";
import { initialMedicalRecords, initialClients, initialPets, doctors } from "../../data/mockData";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";
import {
  FileText, Eye, Download, Calendar as CalendarIcon, Plus, Upload, X,
  File, Image as ImageIcon, FileType, Thermometer, Scale,
  Stethoscope, Pill, ClipboardList, AlertCircle, Mail, CheckSquare, Square, Send,
  FileSpreadsheet, Skull, AlertTriangle
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { exportToExcel, exportToPDF } from "../../utils/exportUtils";

// Solo tipos de eventos clínicos (sin peluquería ni guardería)
const CLINICAL_EVENT_TYPES = [
  { value: "Consulta médica", label: "Consulta médica", color: "bg-blue-100 text-blue-800" },
  { value: "Vacuna", label: "Vacuna / Inmunización", color: "bg-green-100 text-green-800" },
  { value: "Cirugía", label: "Cirugía", color: "bg-red-100 text-red-800" },
  { value: "Análisis clínico", label: "Análisis clínico / Laboratorio", color: "bg-purple-100 text-purple-800" },
  { value: "Radiografía", label: "Radiografía", color: "bg-indigo-100 text-indigo-800" },
  { value: "Tomografía", label: "Tomografía (TAC)", color: "bg-pink-100 text-pink-800" },
  { value: "Ecografía", label: "Ecografía", color: "bg-cyan-100 text-cyan-800" },
  { value: "Desparasitación", label: "Desparasitación", color: "bg-yellow-100 text-yellow-800" },
  { value: "Control", label: "Control / Seguimiento", color: "bg-teal-100 text-teal-800" },
  { value: "Emergencia", label: "Emergencia / Urgencia", color: "bg-red-200 text-red-900" },
  { value: "Internación", label: "Internación", color: "bg-orange-100 text-orange-800" },
  { value: "Otro", label: "Otro procedimiento clínico", color: "bg-gray-100 text-gray-700" },
];

const getEventColor = (eventType: string) =>
  CLINICAL_EVENT_TYPES.find(e => e.value === eventType)?.color || "bg-gray-100 text-gray-700";

export default function MedicalHistoryModule() {
  const { user, hasPermission } = useAuth();
  const { addLog } = useAudit();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPetId, setSelectedPetId] = useState("");
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<MedicalAttachment[]>([]);
  const [activeTab, setActiveTab] = useState("consult");
  const [sendEmail, setSendEmail] = useState(false);
  const [deceasedDialogOpen, setDeceasedDialogOpen] = useState(false);
  const [deceasedCalendarOpen, setDeceasedCalendarOpen] = useState(false);
  const [deceasedForm, setDeceasedForm] = useState({
    deceasedDate: new Date(),
    deceasedReason: "",
    deceasedNotes: ""
  });

  const [addForm, setAddForm] = useState({
    date: new Date(),
    eventType: "",
    professionalId: "",
    weight: "",
    temperature: "",
    description: "",
    diagnosis: "",
    treatment: "",
    medication: "",
    notes: "",
  });

  useEffect(() => {
    const savedRecords = localStorage.getItem("veterinaria_medical_records");
    const savedClients = localStorage.getItem("veterinaria_clients");
    const savedPets = localStorage.getItem("veterinaria_pets");
    setRecords(savedRecords ? JSON.parse(savedRecords) : initialMedicalRecords);
    setClients(savedClients ? JSON.parse(savedClients) : initialClients);
    setPets(savedPets ? JSON.parse(savedPets) : initialPets);
  }, []);

  useEffect(() => {
    if (records.length > 0) {
      localStorage.setItem("veterinaria_medical_records", JSON.stringify(records));
    }
  }, [records]);

  // ── Helpers ──────────────────────────────────────
  const getClientName = (clientId: string) =>
    clients.find(c => c.id === clientId)?.fullName || "";
  const getClientEmail = (clientId: string) =>
    (clients.find(c => c.id === clientId) as any)?.email || "";
  const getPetName = (petId: string) =>
    pets.find(p => p.id === petId)?.name || "";
  const getPetSpecies = (petId: string) =>
    (pets.find(p => p.id === petId) as any)?.species || "";
  const getDoctorName = (doctorId: string) =>
    doctors.find(d => d.id === doctorId)?.name || "Desconocido";
  const getDoctorSpecialty = (doctorId: string) =>
    doctors.find(d => d.id === doctorId)?.specialty || "";
  const getPetsByClient = (clientId: string) =>
    pets.filter(pet => pet.clientId === clientId);

  const lastWeight = useMemo(() => {
    if (!selectedPetId) return null;
    const withWeight = records
      .filter(r => r.petId === selectedPetId && (r as any).weight)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return withWeight.length > 0 ? (withWeight[0] as any).weight : null;
  }, [records, selectedPetId]);

  const petHistory = useMemo(() => {
    if (!selectedPetId) return [];
    return records
      .filter(r => r.petId === selectedPetId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, selectedPetId]);

  // ── Archivos ──────────────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newAttachments: MedicalAttachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'image/gif'];
      if (!allowed.includes(file.type)) { toast.error(`Tipo no permitido: ${file.name}`); continue; }
      if (file.size > 10 * 1024 * 1024) { toast.error(`Archivo muy grande: ${file.name}`); continue; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const att: MedicalAttachment = {
          id: Date.now().toString() + i,
          medicalRecordId: "",
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          fileUrl: ev.target?.result as string,
          uploadedAt: new Date(),
          uploadedBy: user?.id || "1",
          deleted: false,
        };
        newAttachments.push(att);
        if (newAttachments.length === files.length) {
          setUploadedFiles(prev => [...prev, ...newAttachments]);
          toast.success(`${files.length} archivo(s) cargado(s)`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = (id: string) => setUploadedFiles(prev => prev.filter(f => f.id !== id));

  const downloadFile = (att: MedicalAttachment) => {
    const a = document.createElement('a');
    a.href = att.fileUrl;
    a.download = att.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Descargado");
  };

  const formatFileSize = (b: number) => {
    if (!b) return '0 B';
    const k = 1024, s = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return Math.round(b / Math.pow(k, i) * 100) / 100 + ' ' + s[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4 text-blue-500" />;
    if (type === 'application/pdf') return <FileType className="h-4 w-4 text-red-500" />;
    return <File className="h-4 w-4 text-gray-500" />;
  };

  // ── Reset form ──────────────────────────────────────
  const resetForm = () => {
    setAddForm({ date: new Date(), eventType: "", professionalId: "", weight: "", temperature: "", description: "", diagnosis: "", treatment: "", medication: "", notes: "" });
    setUploadedFiles([]);
    setSendEmail(false);
  };

  // ── Guardar registro ──────────────────────────────────────
  const handleRegister = () => {
    if (!selectedClientId || !selectedPetId || !addForm.eventType || !addForm.professionalId || !addForm.description.trim()) {
      toast.error("Complete los campos obligatorios: Tipo de evento, Profesional y Descripción");
      return;
    }
    if (!hasPermission("manage_medical_history")) {
      toast.error("No tiene permisos para agregar registros médicos");
      return;
    }
    if (isPetDeceased) {
      toast.error("No se pueden agregar registros a una mascota fallecida");
      return;
    }

    // Guardar el dueño vigente al momento del registro
    const currentOwner = clients.find(c => c.id === selectedClientId);

    const newRecord = {
      id: Date.now().toString(),
      petId: selectedPetId,
      date: addForm.date,
      eventType: addForm.eventType,
      description: addForm.description,
      professionalId: addForm.professionalId,
      weight: addForm.weight ? parseFloat(addForm.weight) : undefined,
      temperature: addForm.temperature ? parseFloat(addForm.temperature) : undefined,
      diagnosis: addForm.diagnosis || undefined,
      treatment: addForm.treatment || undefined,
      medication: addForm.medication || undefined,
      notes: addForm.notes || undefined,
      // Guardar dueño vigente al momento del registro
      clientIdAtTime: selectedClientId,
      clientNameAtTime: currentOwner?.fullName || "Desconocido",
      attachments: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      createdAt: new Date(),
      createdBy: user?.id || "1",
      deleted: false,
    } as any;

    setRecords(prev => [...prev, newRecord]);
    addLog("Crear", "Historial Clínico", `Registro clínico agregado para ${getPetName(selectedPetId)}`);
    toast.success("Registro agregado al historial clínico");

    // Enviar email si se seleccionó
    if (sendEmail) {
      const clientEmail = getClientEmail(selectedClientId);
      const clientName = getClientName(selectedClientId);
      const petName = getPetName(selectedPetId);
      if (clientEmail) {
        // Simulación del envío (en producción se conectaría al backend)
        setTimeout(() => {
          toast.success(`✉️ Historial enviado a ${clientName} (${clientEmail})`);
          addLog("Exportar", "Historial Clínico", `Historial de ${petName} enviado por email a ${clientEmail}`);
        }, 800);
      } else {
        toast.warning("El cliente no tiene email registrado");
      }
    }

    resetForm();
    setActiveTab("consult");
  };

  // ── Exportar CSV ──────────────────────────────────────
  const handleExport = () => {
    if (petHistory.length === 0) { toast.error("No hay historial para exportar"); return; }
    const csv = [
      ["Fecha", "Tipo de Evento", "Profesional", "Peso (kg)", "Temp (°C)", "Descripción", "Diagnóstico", "Tratamiento", "Medicación"],
      ...petHistory.map(r => [
        format(new Date(r.date), "dd/MM/yyyy"),
        r.eventType,
        getDoctorName(r.professionalId),
        (r as any).weight || "",
        (r as any).temperature || "",
        r.description.replace(/\n/g, " "),
        (r as any).diagnosis || "",
        (r as any).treatment || "",
        (r as any).medication || "",
      ])
    ].map(row => row.map(c => `"${c}"`).join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `historial_${getPetName(selectedPetId)}_${format(new Date(), "ddMMyyyy")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addLog("Exportar", "Historial Clínico", `Historial de ${getPetName(selectedPetId)} exportado`);
    toast.success("Historial exportado");
  };

  const handleExportExcel = () => {
    if (petHistory.length === 0) { toast.error("No hay historial para exportar"); return; }
    exportToExcel(
      `historial_${getPetName(selectedPetId)}`,
      ["Fecha", "Tipo de Evento", "Profesional", "Peso (kg)", "Temp (°C)", "Descripción", "Diagnóstico", "Tratamiento"],
      petHistory.map(r => [
        format(new Date(r.date), "dd/MM/yyyy"),
        r.eventType,
        getDoctorName(r.professionalId),
        (r as any).weight || "—",
        (r as any).temperature || "—",
        r.description,
        (r as any).diagnosis || "—",
        (r as any).treatment || "—",
      ]),
      `Historial Clínico — ${getPetName(selectedPetId)}`
    );
    addLog("Exportar", "Historial Clínico", `Historial de ${getPetName(selectedPetId)} exportado a Excel`);
    toast.success("Excel exportado exitosamente");
  };

  const handleExportPDF = () => {
    if (petHistory.length === 0) { toast.error("No hay historial para exportar"); return; }
    const petInfo = pets.find(p => p.id === selectedPetId);
    exportToPDF(
      `Historial Clínico — ${getPetName(selectedPetId)}`,
      `${(petInfo as any)?.species || ""} · ${(petInfo as any)?.race || ""} · ${petInfo?.sex || ""}`,
      ["Fecha", "Tipo de Evento", "Profesional", "Peso", "Temp.", "Descripción / Diagnóstico"],
      petHistory.map(r => [
        format(new Date(r.date), "dd/MM/yyyy"),
        r.eventType,
        getDoctorName(r.professionalId),
        (r as any).weight ? `${(r as any).weight} kg` : "—",
        (r as any).temperature ? `${(r as any).temperature}°C` : "—",
        `${r.description}${(r as any).diagnosis ? ` | Dx: ${(r as any).diagnosis}` : ""}`,
      ]),
      {
        "Paciente": getPetName(selectedPetId),
        "Propietario": getClientName(selectedClientId),
        "Total de registros": String(petHistory.length),
      }
    );
    addLog("Exportar", "Historial Clínico", `Historial PDF de ${getPetName(selectedPetId)} generado`);
    toast.success("PDF generado — use Ctrl+P para guardar");
  };

  const selectedPetInfo = pets.find(p => p.id === selectedPetId);
  const selectedClientInfo = clients.find(c => c.id === selectedClientId);
  const clientEmail = getClientEmail(selectedClientId);
  const isPetDeceased = selectedPetInfo?.deceased || false;

  // ── Marcar mascota como fallecida ──────────────────────────────────────
  const handleMarkAsDeceased = () => {
    if (!selectedPetId || !deceasedForm.deceasedReason.trim()) {
      toast.error("Debe ingresar el motivo del fallecimiento");
      return;
    }

    const updatedPets = pets.map(p =>
      p.id === selectedPetId
        ? {
            ...p,
            deceased: true,
            deceasedDate: deceasedForm.deceasedDate,
            deceasedReason: deceasedForm.deceasedReason,
            deceasedNotes: deceasedForm.deceasedNotes
          }
        : p
    );

    setPets(updatedPets);
    localStorage.setItem("veterinaria_pets", JSON.stringify(updatedPets));

    addLog("Actualizar", "Mascotas", `Mascota ${getPetName(selectedPetId)} marcada como fallecida`);
    toast.success(`${getPetName(selectedPetId)} ha sido marcada como fallecida`);

    setDeceasedDialogOpen(false);
    setDeceasedForm({ deceasedDate: new Date(), deceasedReason: "", deceasedNotes: "" });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-orange-800 flex items-center gap-2 text-2xl md:text-3xl">
          <FileText className="h-6 w-6 md:h-8 md:w-8" />
          Historial Clínico
        </h1>
        <p className="text-gray-600 mt-1 text-sm md:text-base">
          Registro completo de diagnósticos, signos vitales, tratamientos y evolución
        </p>
      </div>

      {/* Selección de Paciente */}
      <Card className="border-orange-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-white pb-3">
          <CardTitle className="text-orange-800 flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Selección del Paciente
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={selectedClientId} onValueChange={(v) => { setSelectedClientId(v); setSelectedPetId(""); }}>
                <SelectTrigger><SelectValue placeholder="Seleccione cliente" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mascota</Label>
              <Select value={selectedPetId} onValueChange={setSelectedPetId} disabled={!selectedClientId}>
                <SelectTrigger><SelectValue placeholder="Seleccione mascota" /></SelectTrigger>
                <SelectContent>
                  {getPetsByClient(selectedClientId).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — {(p as any).species}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Resumen del Paciente</Label>
              {selectedPetId && selectedPetInfo ? (
                <div className={`px-3 py-2 border rounded-md text-sm space-y-1 ${
                  isPetDeceased
                    ? "bg-gray-100 border-gray-400"
                    : "bg-orange-50 border-orange-200"
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isPetDeceased ? "text-gray-600" : "text-orange-700"}`}>
                      {selectedPetInfo.name}
                    </span>
                    <Badge className={isPetDeceased ? "bg-gray-200 text-gray-700 text-xs" : "bg-orange-100 text-orange-800 text-xs"}>
                      {(selectedPetInfo as any).species}
                    </Badge>
                    {isPetDeceased && (
                      <Badge className="bg-red-100 text-red-800 text-xs flex items-center gap-1">
                        <Skull className="h-3 w-3" />
                        Fallecida
                      </Badge>
                    )}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {(selectedPetInfo as any).race} · {selectedPetInfo.sex}
                  </div>
                  {lastWeight && (
                    <div className="flex items-center gap-1 text-xs text-blue-700">
                      <Scale className="h-3 w-3" />
                      Último peso: <strong>{lastWeight} kg</strong>
                    </div>
                  )}
                  {isPetDeceased && selectedPetInfo.deceasedDate && (
                    <div className="text-xs text-red-700 flex items-center gap-1 pt-1">
                      <Skull className="h-3 w-3" />
                      Fallecimiento: {format(new Date(selectedPetInfo.deceasedDate), "dd/MM/yyyy")}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-[60px] flex items-center px-3 border rounded-md bg-gray-50 text-sm text-gray-400">
                  Seleccione cliente y mascota
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerta si la mascota está fallecida */}
      {selectedPetId && isPetDeceased && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Skull className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-800">Mascota fallecida</h3>
                <p className="text-sm text-red-700 mt-1">
                  Esta mascota está marcada como fallecida. No se pueden agregar ni modificar registros en su historial clínico.
                </p>
                {selectedPetInfo?.deceasedReason && (
                  <p className="text-sm text-red-600 mt-2">
                    <strong>Motivo:</strong> {selectedPetInfo.deceasedReason}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 bg-orange-50">
          <TabsTrigger value="consult">Consultar Historial</TabsTrigger>
          <TabsTrigger value="add" disabled={!hasPermission("manage_medical_history") || isPetDeceased}>
            Agregar Registro
          </TabsTrigger>
        </TabsList>

        {/* ══ CONSULTAR ════════════════════════════════ */}
        <TabsContent value="consult">
          <Card className="border-orange-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-orange-800">Historial Clínico</CardTitle>
                  <CardDescription>
                    {selectedPetId
                      ? `${getPetName(selectedPetId)} — ${petHistory.length} registro(s)`
                      : "Seleccione un paciente para ver su historial"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {selectedPetId && !isPetDeceased && hasPermission("manage_medical_history") && (
                    <Button
                      onClick={() => setDeceasedDialogOpen(true)}
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      size="sm"
                    >
                      <Skull className="mr-2 h-4 w-4" />
                      Marcar Fallecida
                    </Button>
                  )}
                  <Button
                    onClick={handleExportExcel}
                    disabled={!selectedPetId || petHistory.length === 0}
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-50"
                    size="sm"
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                  <Button
                    onClick={handleExportPDF}
                    disabled={!selectedPetId || petHistory.length === 0}
                    className="bg-orange-600 hover:bg-orange-700"
                    size="sm"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {!selectedPetId ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>Seleccione un cliente y mascota para ver el historial</p>
                </div>
              ) : petHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>Sin registros clínicos para esta mascota</p>
                  {hasPermission("manage_medical_history") && (
                    <Button variant="outline" className="mt-4 border-orange-300 hover:bg-orange-50" onClick={() => setActiveTab("add")}>
                      <Plus className="mr-2 h-4 w-4" /> Agregar primer registro
                    </Button>
                  )}
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-orange-50">
                          <TableHead>Fecha</TableHead>
                          <TableHead>Tipo de Evento</TableHead>
                          <TableHead className="hidden md:table-cell">Profesional</TableHead>
                          <TableHead className="hidden xl:table-cell">Dueño vigente</TableHead>
                          <TableHead className="hidden lg:table-cell text-center">Peso / Temp.</TableHead>
                          <TableHead className="hidden md:table-cell">Diagnóstico</TableHead>
                          <TableHead className="text-center">Detalle</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {petHistory.map(record => {
                          const currentClient = clients.find(c => c.id === selectedClientId);
                          const recordOwner = (record as any).clientNameAtTime;
                          const ownerChanged = recordOwner && recordOwner !== currentClient?.fullName;

                          return (
                            <TableRow key={record.id} className="hover:bg-orange-50/50">
                              <TableCell className="text-sm whitespace-nowrap">
                                {format(new Date(record.date), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell>
                                <Badge className={getEventColor(record.eventType)}>{record.eventType}</Badge>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-sm">{getDoctorName(record.professionalId)}</TableCell>
                              <TableCell className="hidden xl:table-cell text-xs">
                                {recordOwner ? (
                                  <div className={`${ownerChanged ? "text-blue-600 font-medium" : "text-gray-500"}`}>
                                    {recordOwner}
                                    {ownerChanged && (
                                      <Badge variant="outline" className="ml-1 text-xs border-blue-400 text-blue-700">
                                        Previo
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                              <div className="flex items-center justify-center gap-2 text-xs flex-wrap">
                                {(record as any).weight && (
                                  <span className="flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded">
                                    <Scale className="h-3 w-3 text-blue-500" />{(record as any).weight}kg
                                  </span>
                                )}
                                {(record as any).temperature && (
                                  <span className="flex items-center gap-1 bg-red-50 px-1.5 py-0.5 rounded">
                                    <Thermometer className="h-3 w-3 text-red-500" />{(record as any).temperature}°C
                                  </span>
                                )}
                                {!(record as any).weight && !(record as any).temperature && <span className="text-gray-400">—</span>}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm max-w-[200px] truncate text-gray-600">
                              {(record as any).diagnosis || <span className="italic text-gray-400">Sin diagnóstico</span>}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button size="sm" variant="ghost" onClick={() => { setSelectedRecord(record); setDetailDialogOpen(true); }} className="text-orange-600 hover:bg-orange-50">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ AGREGAR ════════════════════════════════ */}
        <TabsContent value="add">
          <Card className="border-orange-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-white">
              <CardTitle className="text-orange-800 flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Nuevo Registro Clínico
              </CardTitle>
              <CardDescription>
                Los campos con * son obligatorios. Peso y temperatura son opcionales.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {!selectedPetId ? (
                <div className="text-center py-12 text-gray-500">
                  <Stethoscope className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p>Seleccione un cliente y mascota en la sección superior</p>
                </div>
              ) : isPetDeceased ? (
                <div className="text-center py-12">
                  <Skull className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 font-medium">Mascota fallecida</p>
                  <p className="text-sm text-gray-500 mt-2">
                    No se pueden agregar nuevos registros al historial de una mascota fallecida
                  </p>
                  {selectedPetInfo?.deceasedDate && (
                    <p className="text-xs text-gray-400 mt-3">
                      Fecha: {format(new Date(selectedPetInfo.deceasedDate), "dd/MM/yyyy", { locale: es })}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-8">

                  {/* ── SECCIÓN 1: Datos del evento ── */}
                  <div>
                    <h3 className="text-sm font-semibold text-orange-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" /> Datos del Evento Clínico
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Fecha */}
                      <div className="space-y-2">
                        <Label>Fecha <span className="text-red-500">*</span></Label>
                        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(addForm.date, "PPP", { locale: es })}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={addForm.date}
                              onSelect={(d) => { if (d) { setAddForm(p => ({ ...p, date: d })); setCalendarOpen(false); } }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Tipo de evento */}
                      <div className="space-y-2">
                        <Label>Tipo de Evento Clínico <span className="text-red-500">*</span></Label>
                        <Select value={addForm.eventType} onValueChange={(v) => setAddForm(p => ({ ...p, eventType: v }))}>
                          <SelectTrigger><SelectValue placeholder="Seleccione tipo" /></SelectTrigger>
                          <SelectContent>
                            {CLINICAL_EVENT_TYPES.map(et => (
                              <SelectItem key={et.value} value={et.value}>{et.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Profesional */}
                      <div className="space-y-2">
                        <Label>Profesional Responsable <span className="text-red-500">*</span></Label>
                        <Select value={addForm.professionalId} onValueChange={(v) => setAddForm(p => ({ ...p, professionalId: v }))}>
                          <SelectTrigger><SelectValue placeholder="Seleccione profesional" /></SelectTrigger>
                          <SelectContent>
                            {doctors.map(d => (
                              <SelectItem key={d.id} value={d.id}>{d.name} — {d.specialty}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* ── SECCIÓN 2: Signos vitales (solo peso y temp) ── */}
                  <div>
                    <h3 className="text-sm font-semibold text-orange-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Scale className="h-4 w-4" /> Signos Vitales
                      <span className="text-gray-400 text-xs font-normal normal-case tracking-normal">(opcionales)</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-4 max-w-sm">
                      <div className="space-y-2">
                        <Label htmlFor="weight" className="flex items-center gap-1.5">
                          <Scale className="h-3.5 w-3.5 text-blue-500" /> Peso (kg)
                        </Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.1"
                          min="0"
                          max="200"
                          value={addForm.weight}
                          onChange={(e) => setAddForm(p => ({ ...p, weight: e.target.value }))}
                          onKeyDown={(e) => e.key === "Enter" && document.getElementById("temperature")?.focus()}
                          placeholder="Ej: 12.5"
                          className="border-blue-200 focus:border-blue-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="temperature" className="flex items-center gap-1.5">
                          <Thermometer className="h-3.5 w-3.5 text-red-500" /> Temperatura (°C)
                        </Label>
                        <Input
                          id="temperature"
                          type="number"
                          step="0.1"
                          min="30"
                          max="45"
                          value={addForm.temperature}
                          onChange={(e) => setAddForm(p => ({ ...p, temperature: e.target.value }))}
                          placeholder="Ej: 38.5"
                          className="border-red-200 focus:border-red-400"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Temp. normal: 38–39°C | Si no hay datos, deje en blanco.</p>
                  </div>

                  {/* ── SECCIÓN 3: Clínica ── */}
                  <div>
                    <h3 className="text-sm font-semibold text-orange-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" /> Anamnesis, Diagnóstico y Tratamiento
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="description">
                          Descripción / Anamnesis <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="description"
                          value={addForm.description}
                          onChange={(e) => setAddForm(p => ({ ...p, description: e.target.value }))}
                          placeholder="Motivo de consulta, síntomas, evolución del cuadro, hallazgos del examen físico..."
                          rows={4}
                          className="resize-none"
                        />
                        <p className="text-xs text-gray-400">{addForm.description.length} caracteres</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="diagnosis" className="flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-orange-500" /> Diagnóstico
                        </Label>
                        <Textarea
                          id="diagnosis"
                          value={addForm.diagnosis}
                          onChange={(e) => setAddForm(p => ({ ...p, diagnosis: e.target.value }))}
                          placeholder="Diagnóstico presuntivo o confirmado..."
                          rows={3}
                          className="resize-none"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="treatment" className="flex items-center gap-1.5">
                          <Stethoscope className="h-3.5 w-3.5 text-green-500" /> Tratamiento Indicado
                        </Label>
                        <Textarea
                          id="treatment"
                          value={addForm.treatment}
                          onChange={(e) => setAddForm(p => ({ ...p, treatment: e.target.value }))}
                          placeholder="Procedimientos, terapias, indicaciones..."
                          rows={3}
                          className="resize-none"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="medication" className="flex items-center gap-1.5">
                          <Pill className="h-3.5 w-3.5 text-purple-500" /> Medicación Prescripta
                        </Label>
                        <Input
                          id="medication"
                          value={addForm.medication}
                          onChange={(e) => setAddForm(p => ({ ...p, medication: e.target.value }))}
                          placeholder="Medicamentos, dosis, vía de administración y duración..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── SECCIÓN 4: Observaciones ── */}
                  <div>
                    <h3 className="text-sm font-semibold text-orange-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" /> Observaciones Adicionales
                    </h3>
                    <Textarea
                      id="notes"
                      value={addForm.notes}
                      onChange={(e) => setAddForm(p => ({ ...p, notes: e.target.value }))}
                      placeholder="Recomendaciones al propietario, alertas, cuidados especiales, indicaciones de seguimiento..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  {/* ── SECCIÓN 5: Archivos ── */}
                  <div>
                    <h3 className="text-sm font-semibold text-orange-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Upload className="h-4 w-4" /> Archivos Adjuntos
                      <span className="text-gray-400 text-xs font-normal normal-case tracking-normal">(opcional)</span>
                    </h3>
                    <div className="border-2 border-dashed border-orange-200 rounded-lg p-4 bg-orange-50/20">
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-orange-400" />
                        <p className="text-sm text-gray-600 text-center">Radiografías, tomografías, análisis, fotos clínicas</p>
                        <p className="text-xs text-gray-400">JPG, PNG, PDF, GIF — Máx. 10MB por archivo</p>
                        <Input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg,application/pdf,image/gif"
                          multiple
                          onChange={handleFileUpload}
                          className="mt-2 max-w-xs"
                        />
                      </div>
                      {uploadedFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-medium text-gray-700">Archivos cargados ({uploadedFiles.length}):</p>
                          {uploadedFiles.map(f => (
                            <div key={f.id} className="flex items-center justify-between p-2 bg-white rounded border">
                              <div className="flex items-center gap-2 flex-1">
                                {getFileIcon(f.fileType)}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm truncate">{f.fileName}</p>
                                  <p className="text-xs text-gray-400">{formatFileSize(f.fileSize)}</p>
                                </div>
                              </div>
                              <Button size="sm" variant="ghost" onClick={() => removeFile(f.id)} className="text-red-500 hover:text-red-700 h-8 w-8 p-0">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── SECCIÓN 6: Enviar al cliente ── */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4">
                    <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                      <Mail className="h-4 w-4" /> Notificación al Cliente
                    </h3>

                    <button
                      type="button"
                      onClick={() => setSendEmail(!sendEmail)}
                      className="flex items-start gap-3 w-full text-left group"
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {sendEmail
                          ? <CheckSquare className="h-5 w-5 text-blue-600" />
                          : <Square className="h-5 w-5 text-gray-400 group-hover:text-blue-500" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          Enviar resumen del historial al cliente por email
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Se enviará automáticamente al correo registrado del cliente al guardar este registro.
                        </p>
                      </div>
                    </button>

                    {sendEmail && (
                      <div className="mt-3 ml-8">
                        {clientEmail ? (
                          <div className="flex items-center gap-2 p-2 bg-white rounded border border-blue-200">
                            <Mail className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            <div>
                              <p className="text-xs text-gray-500">Destinatario</p>
                              <p className="text-sm font-medium text-blue-700">
                                {getClientName(selectedClientId)} — <span className="font-normal">{clientEmail}</span>
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-amber-50 rounded border border-amber-200">
                            <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                            <p className="text-xs text-amber-700">
                              Este cliente no tiene email registrado. El envío no se realizará.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Botones ── */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={handleRegister}
                      disabled={!selectedClientId || !selectedPetId || !addForm.eventType || !addForm.professionalId || !addForm.description.trim()}
                      className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50"
                    >
                      {sendEmail && clientEmail
                        ? <><Send className="mr-2 h-4 w-4" /> Guardar y Enviar al Cliente</>
                        : <><Plus className="mr-2 h-4 w-4" /> Registrar Evento Clínico</>
                      }
                    </Button>
                    <Button variant="outline" onClick={resetForm} className="border-orange-300 hover:bg-orange-50">
                      <X className="mr-2 h-4 w-4" /> Limpiar
                    </Button>
                  </div>

                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ══ DIALOG DETALLE ════════════════════════════════ */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-orange-800 flex items-center gap-2">
              <FileText className="h-5 w-5" /> Registro Clínico Completo
            </DialogTitle>
            <DialogDescription>
              {selectedRecord && `${getPetName(selectedRecord.petId)} — ${format(new Date(selectedRecord.date), "PPP", { locale: es })}`}
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-5 pt-2">
              {/* Cabecera */}
              <div className="flex flex-wrap gap-2 items-center">
                <Badge className={getEventColor(selectedRecord.eventType)}>{selectedRecord.eventType}</Badge>
                <span className="text-sm text-gray-600">
                  Atendido por: <strong>{getDoctorName(selectedRecord.professionalId)}</strong>
                  {getDoctorSpecialty(selectedRecord.professionalId) && (
                    <span className="text-gray-400"> — {getDoctorSpecialty(selectedRecord.professionalId)}</span>
                  )}
                </span>
                {(selectedRecord as any).clientNameAtTime && (
                  <Badge variant="outline" className="border-blue-300 text-blue-700">
                    Dueño en ese momento: {(selectedRecord as any).clientNameAtTime}
                  </Badge>
                )}
              </div>

              {/* Signos Vitales */}
              {((selectedRecord as any).weight || (selectedRecord as any).temperature) && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <Scale className="h-4 w-4" /> Signos Vitales
                  </h4>
                  <div className="flex gap-4">
                    {(selectedRecord as any).weight && (
                      <div className="text-center p-3 bg-white rounded border border-blue-100 min-w-[100px]">
                        <Scale className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Peso</p>
                        <p className="font-semibold text-blue-700">{(selectedRecord as any).weight} kg</p>
                      </div>
                    )}
                    {(selectedRecord as any).temperature && (
                      <div className="text-center p-3 bg-white rounded border border-red-100 min-w-[100px]">
                        <Thermometer className="h-5 w-5 text-red-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Temperatura</p>
                        <p className="font-semibold text-red-700">{(selectedRecord as any).temperature}°C</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Descripción */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-orange-500" /> Descripción / Anamnesis
                </h4>
                <p className="text-sm text-gray-700 bg-gray-50 rounded p-3 leading-relaxed whitespace-pre-wrap">{selectedRecord.description}</p>
              </div>

              {(selectedRecord as any).diagnosis && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" /> Diagnóstico
                  </h4>
                  <p className="text-sm text-gray-700 bg-orange-50 rounded p-3 leading-relaxed whitespace-pre-wrap">{(selectedRecord as any).diagnosis}</p>
                </div>
              )}

              {(selectedRecord as any).treatment && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-green-600" /> Tratamiento Indicado
                  </h4>
                  <p className="text-sm text-gray-700 bg-green-50 rounded p-3 leading-relaxed whitespace-pre-wrap">{(selectedRecord as any).treatment}</p>
                </div>
              )}

              {(selectedRecord as any).medication && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Pill className="h-4 w-4 text-purple-600" /> Medicación Prescripta
                  </h4>
                  <p className="text-sm text-gray-700 bg-purple-50 rounded p-3">{(selectedRecord as any).medication}</p>
                </div>
              )}

              {(selectedRecord as any).notes && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Observaciones Adicionales</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded p-3 leading-relaxed whitespace-pre-wrap">{(selectedRecord as any).notes}</p>
                </div>
              )}

              {selectedRecord.attachments && selectedRecord.attachments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Archivos Adjuntos ({selectedRecord.attachments.length})</h4>
                  <div className="space-y-2">
                    {selectedRecord.attachments.map(att => (
                      <div key={att.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                        <div className="flex items-center gap-2">
                          {getFileIcon(att.fileType)}
                          <div>
                            <p className="text-sm">{att.fileName}</p>
                            <p className="text-xs text-gray-400">{formatFileSize(att.fileSize)}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => downloadFile(att)} className="text-blue-600 hover:text-blue-700">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-400 pt-2 border-t">
                Registrado el {format(new Date(selectedRecord.createdAt), "dd/MM/yyyy HH:mm")}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ══ DIALOG MARCAR FALLECIDA ════════════════════════════════ */}
      <Dialog open={deceasedDialogOpen} onOpenChange={setDeceasedDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-800 flex items-center gap-2">
              <Skull className="h-5 w-5" /> Marcar Mascota como Fallecida
            </DialogTitle>
            <DialogDescription>
              {selectedPetId && `${getPetName(selectedPetId)} — Esta acción bloqueará el historial clínico`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <strong>Importante:</strong> Una vez marcada como fallecida, no podrá agregar ni modificar registros en el historial clínico de esta mascota.
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fecha de Fallecimiento <span className="text-red-500">*</span></Label>
              <Popover open={deceasedCalendarOpen} onOpenChange={setDeceasedCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(deceasedForm.deceasedDate, "PPP", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deceasedForm.deceasedDate}
                    onSelect={(d) => {
                      if (d) {
                        setDeceasedForm(p => ({ ...p, deceasedDate: d }));
                        setDeceasedCalendarOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deceasedReason">
                Motivo del Fallecimiento <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="deceasedReason"
                value={deceasedForm.deceasedReason}
                onChange={(e) => setDeceasedForm(p => ({ ...p, deceasedReason: e.target.value }))}
                placeholder="Ej: Enfermedad cardíaca, Edad avanzada, Accidente..."
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deceasedNotes">Observaciones</Label>
              <Textarea
                id="deceasedNotes"
                value={deceasedForm.deceasedNotes}
                onChange={(e) => setDeceasedForm(p => ({ ...p, deceasedNotes: e.target.value }))}
                placeholder="Observaciones adicionales..."
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleMarkAsDeceased}
                disabled={!deceasedForm.deceasedReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <Skull className="mr-2 h-4 w-4" />
                Confirmar Fallecimiento
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDeceasedDialogOpen(false);
                  setDeceasedForm({ deceasedDate: new Date(), deceasedReason: "", deceasedNotes: "" });
                }}
              >
                <X className="mr-2 h-4 w-4" /> Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}