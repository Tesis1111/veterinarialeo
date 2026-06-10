import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAudit } from "../../context/AuditContext";
import { Pet, Client, PetOwnershipChange } from "../../types";
import { initialPets, initialClients } from "../../data/mockData";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Badge } from "../ui/badge";
import { Search, PawPrint, Save, X, Trash2, Edit, Calendar as CalendarIcon, Info, UserX, Users, History, Skull, AlertTriangle } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  PREDEFINED_SPECIES,
  getBreedsBySpecies,
  getSpeciesName,
  getBreedName
} from "../../data/speciesAndBreeds";

export default function PetsModule() {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showWeightInfo, setShowWeightInfo] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    species: "",
    sex: "",
    clientId: "",
    race: "",
    birthDate: undefined as Date | undefined,
    colorObservations: ""
  });

  useEffect(() => {
    const savedPets = localStorage.getItem("veterinaria_pets");
    const savedClients = localStorage.getItem("veterinaria_clients");
    setPets(savedPets ? JSON.parse(savedPets) : initialPets);
    setClients(savedClients ? JSON.parse(savedClients) : initialClients);
  }, []);

  useEffect(() => {
    if (pets.length > 0) {
      localStorage.setItem("veterinaria_pets", JSON.stringify(pets));
    }
  }, [pets]);

  const calculateAge = (birthDate: Date | undefined): string => {
    if (!birthDate) return "-";
    const today = new Date();
    const birth = new Date(birthDate);
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    if (months < 0) { years--; months += 12; }
    if (months === 0 && today.getDate() < birth.getDate()) { years--; months = 11; }
    else if (today.getDate() < birth.getDate()) { months--; if (months < 0) { years--; months = 11; } }
    if (years === 0 && months === 0) return "Menos de 1 mes";
    if (years === 0) return `${months} mes${months !== 1 ? "es" : ""}`;
    if (months === 0) return `${years} año${years !== 1 ? "s" : ""}`;
    return `${years} año${years !== 1 ? "s" : ""} y ${months} mes${months !== 1 ? "es" : ""}`;
  };

  const getClientName = (clientId: string): string => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.fullName : "Cliente no encontrado";
  };

  const filteredPets = useMemo(() => {
    return pets.filter(pet => {
      const client = clients.find(c => c.id === pet.clientId);
      return (
        pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.species?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client?.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [pets, clients, searchTerm]);

  const selectPet = (pet: Pet) => {
    setSelectedPet(pet);
    setIsEditing(true);
    setFormData({
      name: pet.name,
      species: (pet as any).species || "",
      sex: pet.sex || "",
      clientId: pet.clientId,
      race: (pet as any).race || "",
      birthDate: pet.birthDate ? new Date(pet.birthDate) : undefined,
      colorObservations: (pet as any).colorObservations || ""
    });
  };

  const handleSave = () => {
    if (!formData.name || !formData.species || !formData.sex || !formData.clientId) {
      toast.error("Por favor, complete todos los campos obligatorios");
      return;
    }

    if (isEditing && selectedPet) {
      setPets(prev =>
        prev.map(pet =>
          pet.id === selectedPet.id
            ? { ...pet, ...formData, updatedAt: new Date() }
            : pet
        )
      );
      toast.success("Mascota actualizada exitosamente");
    } else {
      const newPet: Pet = {
        id: Date.now().toString(),
        ...formData,
        createdAt: new Date(),
        createdBy: user?.id || "1"
      } as any;
      setPets(prev => [...prev, newPet]);
      toast.success("Mascota registrada exitosamente");
    }

    handleCancel();
  };

  const handleCancel = () => {
    setFormData({
      name: "",
      species: "",
      sex: "",
      clientId: "",
      race: "",
      birthDate: undefined,
      colorObservations: ""
    });
    setSelectedPet(null);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (selectedPet) {
      setPets(prev => prev.filter(pet => pet.id !== selectedPet.id));
      toast.success("Mascota eliminada exitosamente");
      handleCancel();
      setDeleteDialogOpen(false);
    }
  };

  const getSpeciesBadgeColor = (species: string) => {
    switch (species) {
      case "Perro": return "bg-amber-100 text-amber-800";
      case "Gato": return "bg-purple-100 text-purple-800";
      case "Ave": return "bg-sky-100 text-sky-800";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-orange-800 flex items-center gap-2">
            <PawPrint className="h-8 w-8" />
            Gestión de Mascotas
          </h1>
          <p className="text-gray-600 mt-1">Registro y administración de fichas de mascotas</p>
        </div>
      </div>

      {/* Info peso movido */}
      {showWeightInfo && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-700 flex-1">
            El <strong>peso</strong> de la mascota se registra en cada visita dentro del <strong>Historial Clínico</strong>, permitiendo seguimiento evolutivo.
          </p>
          <button
            onClick={() => setShowWeightInfo(false)}
            className="text-blue-400 hover:text-blue-700 transition-colors ml-2 flex-shrink-0"
            title="Cerrar aviso"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <Card className="border-orange-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-white">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <PawPrint className="h-5 w-5" />
            {isEditing ? "Editar Mascota" : "Nueva Mascota"}
          </CardTitle>
          <CardDescription>
            Complete los campos obligatorios marcados con *
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">

            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && document.getElementById("clientId")?.focus()}
                placeholder="Ej: Max, Luna, Bobby..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientId">
                Cliente Asociado <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}
              >
                <SelectTrigger id="clientId">
                  <SelectValue placeholder="Seleccione cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="species">
                Especie <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.species}
                onValueChange={(value) => setFormData(prev => ({ ...prev, species: value }))}
              >
                <SelectTrigger id="species">
                  <SelectValue placeholder="Seleccione especie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Perro">Perro</SelectItem>
                  <SelectItem value="Gato">Gato</SelectItem>
                  <SelectItem value="Ave">Ave</SelectItem>
                  <SelectItem value="Conejo">Conejo</SelectItem>
                  <SelectItem value="Hamster">Hamster</SelectItem>
                  <SelectItem value="Reptil">Reptil</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sex">
                Sexo <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.sex}
                onValueChange={(value) => setFormData(prev => ({ ...prev, sex: value }))}
              >
                <SelectTrigger id="sex">
                  <SelectValue placeholder="Seleccione sexo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Macho">Macho</SelectItem>
                  <SelectItem value="Hembra">Hembra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="race">Raza (opcional)</Label>
              <Input
                id="race"
                value={formData.race}
                onChange={(e) => setFormData(prev => ({ ...prev, race: e.target.value }))}
                placeholder="Ej: Labrador, Siamés..."
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha de Nacimiento {isEditing && <span className="text-xs text-gray-500">(no editable)</span>}</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left"
                    disabled={isEditing}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.birthDate
                      ? format(formData.birthDate, "PPP", { locale: es })
                      : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                {!isEditing && (
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.birthDate}
                      onSelect={(date) => {
                        setFormData(prev => ({ ...prev, birthDate: date }));
                        setCalendarOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                )}
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Edad (calculada automáticamente)</Label>
              <div className="h-10 flex items-center px-3 border rounded-md bg-gray-50 text-sm text-gray-600">
                {formData.birthDate ? calculateAge(formData.birthDate) : "—"}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="colorObservations">Color / Observaciones (opcional)</Label>
              <Textarea
                id="colorObservations"
                value={formData.colorObservations}
                onChange={(e) => setFormData(prev => ({ ...prev, colorObservations: e.target.value }))}
                placeholder="Descripción física, comportamiento, alergias conocidas..."
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
              <Button
                onClick={() => setDeleteDialogOpen(true)}
                variant="destructive"
                className="flex-1"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-orange-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-white">
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Search className="h-5 w-5" />
            Lista de Mascotas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, especie o dueño..."
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
                    <TableHead>Nombre</TableHead>
                    <TableHead>Especie / Raza</TableHead>
                    <TableHead className="hidden md:table-cell">Dueño</TableHead>
                    <TableHead className="hidden lg:table-cell">Sexo</TableHead>
                    <TableHead className="hidden lg:table-cell">Edad</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No se encontraron mascotas
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPets.map((pet) => (
                      <TableRow
                        key={pet.id}
                        className="hover:bg-orange-50/50 transition-colors"
                      >
                        <TableCell className="font-medium">{pet.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={getSpeciesBadgeColor((pet as any).species || "")}>
                              {(pet as any).species || "-"}
                            </Badge>
                            {(pet as any).race && (
                              <span className="text-xs text-gray-500">{(pet as any).race}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {getClientName(pet.clientId)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="outline" className={pet.sex === "Macho" ? "border-blue-300 text-blue-700" : "border-pink-300 text-pink-700"}>
                            {pet.sex || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-gray-600">
                          {calculateAge(pet.birthDate)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => selectPet(pet)}
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
            Total de mascotas: <span className="text-orange-700 font-medium">{filteredPets.length}</span>
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta mascota?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la ficha de{" "}
              <span className="font-semibold">{selectedPet?.name}</span> del sistema.
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