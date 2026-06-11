import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { Client, Pet } from "../../types";
import { initialClients, initialPets } from "../../data/mockData";
import {
  traerClientes,
  registrarCliente,
  asociarCliente,
  eliminarCliente,
  ValidarUnicidadCliente,
} from "../../services/clienteService";
import { traerMascotas } from "../../services/mascotaService";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Search, UserPlus, Save, X, Trash2, Edit, Users, FileSpreadsheet, FileText, HelpCircle, List } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { exportToExcel, exportToPDF } from "../../utils/exportUtils";

export default function ClientsModule() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("list");

  useEffect(() => {
    const tab = localStorage.getItem("clients_initial_tab");
    if (tab) {
      setActiveTab(tab);
      localStorage.removeItem("clients_initial_tab");
    }
  }, []);

  const [formData, setFormData] = useState({
    fullName: "",
    dniCuit: "",
    phone: "",
    address: "",
    email: "",
    observations: ""
  });

  const [errors, setErrors] = useState({
    fullName: "",
    dniCuit: "",
    phone: "",
    address: "",
    email: ""
  });

  useEffect(() => {
    traerClientes().then(setClients).catch(() => {
      const saved = localStorage.getItem("veterinaria_clients");
      setClients(saved ? JSON.parse(saved) : initialClients);
    });
    traerMascotas().then(setPets).catch(() => {
      const savedPets = localStorage.getItem("veterinaria_pets");
      setPets(savedPets ? JSON.parse(savedPets) : initialPets);
    });
  }, []);

  const filteredClients = useMemo(() => {
    return clients.filter(client =>
      !client.deleted && (
        client.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.dniCuit.includes(searchTerm) ||
        client.phone.includes(searchTerm)
      )
    );
  }, [clients, searchTerm]);

  const selectedClientHasAlivePets = useMemo(() => {
    if (!selectedClient) return false;
    return pets.some(pet => pet.clientId === selectedClient.id && !pet.deceased);
  }, [selectedClient, pets]);

  const validateDniCuit = (value: string): string => {
    if (!value) return "DNI/CUIT es obligatorio";
    if (!/^[\d\-]+$/.test(value)) return "Solo se permiten dígitos y guiones";
    return "";
  };

  const validatePhone = (value: string): string => {
    if (!value) return "Teléfono es obligatorio";
    if (!/^[\d\+\-\s]+$/.test(value)) return "Solo se permiten números, +, - y espacios";
    return "";
  };

  const validateEmail = (value: string): string => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Formato de email inválido";
    }
    return "";
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    let error = "";
    if (field === "dniCuit") error = validateDniCuit(value);
    if (field === "phone") error = validatePhone(value);
    if (field === "email") error = validateEmail(value);
    if (field === "fullName" && !value) error = "Nombre completo es obligatorio";
    if (field === "address" && !value) error = "Dirección es obligatoria";

    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const selectClient = (client: Client) => {
    setSelectedClient(client);
    setIsEditing(true);
    setActiveTab("new");
    setFormData({
      fullName: client.fullName,
      dniCuit: client.dniCuit,
      phone: client.phone,
      address: client.address,
      email: client.email || "",
      observations: client.observations || ""
    });
  };

  const handleSave = async () => {
    const newErrors = {
      fullName: !formData.fullName ? "Nombre completo es obligatorio" : "",
      dniCuit: validateDniCuit(formData.dniCuit),
      phone: validatePhone(formData.phone),
      address: !formData.address ? "Dirección es obligatoria" : "",
      email: validateEmail(formData.email)
    };

    setErrors(newErrors);

    if (Object.values(newErrors).some(error => error !== "")) {
      toast.error("Por favor, corrija los errores en el formulario");
      return;
    }

    // ValidarUnicidadCliente — Gestor Alta/Modificar Cliente
    const isUnique = await ValidarUnicidadCliente(formData.dniCuit, selectedClient?.id);
    if (!isUnique) {
      setErrors(prev => ({ ...prev, dniCuit: "Ya existe un cliente con ese DNI/CUIT" }));
      toast.error("El DNI/CUIT ya está registrado");
      return;
    }

    try {
      if (isEditing && selectedClient) {
        const updated = await asociarCliente(selectedClient.id, formData, user?.id || "1");
        setClients(prev => prev.map(c => c.id === selectedClient.id ? updated : c));
        toast.success("Cliente actualizado exitosamente");
      } else {
        const newClient = await registrarCliente(formData, user?.id || "1");
        setClients(prev => [...prev, newClient]);
        toast.success("Cliente registrado exitosamente");
      }
      handleCancel();
    } catch {
      toast.error("Error al guardar el cliente. Intente nuevamente.");
    }
  };

  const handleCancel = () => {
    setFormData({
      fullName: "",
      dniCuit: "",
      phone: "",
      address: "",
      email: "",
      observations: ""
    });
    setErrors({
      fullName: "",
      dniCuit: "",
      phone: "",
      address: "",
      email: ""
    });
    setSelectedClient(null);
    setIsEditing(false);
    setActiveTab("list");
  };

  const handleDelete = async () => {
    if (selectedClient) {
      try {
        await eliminarCliente(selectedClient.id, user?.id || "1");
        setClients(prev => prev.filter(client => client.id !== selectedClient.id));
        toast.success("Cliente eliminado exitosamente");
        handleCancel();
      } catch {
        toast.error("Error al eliminar el cliente.");
      }
      setDeleteDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-orange-800 flex items-center gap-2">
            <Users className="h-8 w-8" />
            Gestión de Clientes
          </h1>
          <p className="text-gray-600 mt-1">Registro y administración de clientes</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-50"
            onClick={() => {
              exportToExcel(
                "clientes",
                ["Nombre Completo", "DNI/CUIT", "Teléfono", "Email", "Dirección", "Observaciones", "Alta"],
                filteredClients.map(c => [
                  c.fullName, c.dniCuit, c.phone, c.email || "—",
                  c.address, c.observations || "—",
                  c.createdAt ? format(new Date(c.createdAt), "dd/MM/yyyy") : "—"
                ]),
                "Listado de Clientes"
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
                "Listado de Clientes",
                `Total: ${filteredClients.length} clientes`,
                ["Nombre Completo", "DNI/CUIT", "Teléfono", "Email", "Dirección"],
                filteredClients.map(c => [c.fullName, c.dniCuit, c.phone, c.email || "—", c.address]),
                { "Total de clientes": String(filteredClients.length) }
              );
              toast.success("PDF generado — use Ctrl+P para guardar");
            }}
          >
            <FileText className="mr-2 h-4 w-4" />PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 bg-orange-50 mb-6">
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            Lista de Clientes
          </TabsTrigger>
          <TabsTrigger value="new">
            <UserPlus className="h-4 w-4 mr-2" />
            {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new">
          <Card className="border-orange-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-white">
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <UserPlus className="h-5 w-5" />
                {isEditing ? "Editar Cliente" : "Nuevo Cliente"}
              </CardTitle>
              <CardDescription>
                Complete los campos obligatorios marcados con *
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="fullName">
                Nombre Completo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => handleInputChange("fullName", e.target.value)}
                placeholder="Ej: Juan Pérez"
                className={errors.fullName ? "border-red-500" : ""}
              />
              {errors.fullName && (
                <p className="text-sm text-red-500">{errors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dniCuit">
                DNI/CUIT <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dniCuit"
                value={formData.dniCuit}
                onChange={(e) => handleInputChange("dniCuit", e.target.value)}
                placeholder="Ej: 20-12345678-9"
                className={errors.dniCuit ? "border-red-500" : ""}
              />
              {errors.dniCuit && (
                <p className="text-sm text-red-500">{errors.dniCuit}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Teléfono <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Ej: +54 11 1234-5678"
                className={errors.phone ? "border-red-500" : ""}
              />
              {errors.phone && (
                <p className="text-sm text-red-500">{errors.phone}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">
                Dirección <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Ej: Av. Principal 123, Ciudad"
                className={errors.address ? "border-red-500" : ""}
              />
              {errors.address && (
                <p className="text-sm text-red-500">{errors.address}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="cliente@email.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="observations">Observaciones (opcional)</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => handleInputChange("observations", e.target.value)}
                placeholder="Información adicional sobre el cliente..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? "Actualizar" : "Guardar"}
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1 border-orange-300 hover:bg-orange-50"
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
            {isEditing && (
              <div className="relative flex-1 group">
                <Button
                  onClick={() => !selectedClientHasAlivePets && setDeleteDialogOpen(true)}
                  variant="destructive"
                  className="w-full"
                  disabled={selectedClientHasAlivePets}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar cliente
                  {selectedClientHasAlivePets && <HelpCircle className="ml-2 h-4 w-4 opacity-80" />}
                </Button>
                {selectedClientHasAlivePets && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                    No puedes eliminar un cliente si tiene mascotas vivas asociadas
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="list">
      <Card className="border-orange-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-white">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Search className="h-5 w-5" />
            Lista de Clientes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, DNI/CUIT o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-orange-50">
                    <TableHead>Nombre Completo</TableHead>
                    <TableHead>DNI/CUIT</TableHead>
                    <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No se encontraron clientes
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((client) => (
                      <TableRow
                        key={client.id}
                        className="hover:bg-orange-50/50 transition-colors"
                      >
                        <TableCell>{client.fullName}</TableCell>
                        <TableCell>{client.dniCuit}</TableCell>
                        <TableCell className="hidden md:table-cell">{client.phone}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {client.email || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => selectClient(client)}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <p className="text-sm text-gray-600 mt-4">
            Total de clientes: <span className="text-orange-700">{filteredClients.length}</span>
          </p>
        </CardContent>
      </Card>
      </TabsContent>
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro de eliminar este cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el cliente{" "}
              <span className="font-semibold">{selectedClient?.fullName}</span> del sistema.
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