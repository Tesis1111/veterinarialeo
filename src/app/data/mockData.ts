import { Client, Pet, MedicalRecord, Appointment, Doctor } from "../types";

export const initialClients: Client[] = [
  {
    id: "1",
    fullName: "María García López",
    dniCuit: "20-12345678-9",
    phone: "+54 11 4567-8900",
    address: "Av. Libertador 1234, CABA",
    email: "maria.garcia@email.com",
    observations: "Cliente preferencial desde 2020",
    createdAt: new Date(2020, 5, 15),
    createdBy: "1"
  },
  {
    id: "2",
    fullName: "Juan Pérez Rodríguez",
    dniCuit: "20-98765432-1",
    phone: "+54 11 9876-5432",
    address: "Calle Falsa 456, CABA",
    email: "juan.perez@email.com",
    observations: "",
    createdAt: new Date(2021, 2, 10),
    createdBy: "1"
  },
  {
    id: "3",
    fullName: "Ana Martínez Silva",
    dniCuit: "27-23456789-3",
    phone: "15-6789-0123",
    address: "San Martín 789, Buenos Aires",
    email: "ana.martinez@email.com",
    observations: "Prefiere contacto por WhatsApp",
    createdAt: new Date(2021, 8, 5),
    createdBy: "2"
  },
  {
    id: "4",
    fullName: "Carlos Fernández Torres",
    dniCuit: "20-34567890-2",
    phone: "+54 11 3456-7890",
    address: "Av. Corrientes 2345, CABA",
    email: "carlos.fernandez@email.com",
    observations: "Tiene 3 mascotas",
    createdAt: new Date(2022, 1, 20),
    createdBy: "1"
  },
  {
    id: "5",
    fullName: "Laura Sánchez Romero",
    dniCuit: "27-45678901-4",
    phone: "+54 11 4567-8901",
    address: "Calle Uruguay 567, CABA",
    email: "laura.sanchez@email.com",
    observations: "Veterinaria de profesión",
    createdAt: new Date(2022, 4, 10),
    createdBy: "2"
  },
  {
    id: "6",
    fullName: "Roberto González Díaz",
    dniCuit: "20-56789012-5",
    phone: "+54 11 5678-9012",
    address: "Av. Santa Fe 890, CABA",
    email: "roberto.gonzalez@email.com",
    createdAt: new Date(2022, 7, 15),
    createdBy: "1"
  },
  {
    id: "7",
    fullName: "Patricia Ruiz Morales",
    dniCuit: "27-67890123-6",
    phone: "+54 11 6789-0123",
    address: "Calle Belgrano 1234, CABA",
    email: "patricia.ruiz@email.com",
    observations: "Cliente VIP",
    createdAt: new Date(2023, 0, 5),
    createdBy: "2"
  },
  {
    id: "8",
    fullName: "Diego Ramírez Castro",
    dniCuit: "20-78901234-7",
    phone: "+54 11 7890-1234",
    address: "Av. Callao 456, CABA",
    email: "diego.ramirez@email.com",
    createdAt: new Date(2023, 3, 12),
    createdBy: "1"
  }
];

export const initialPets: Pet[] = [
  {
    id: "1",
    name: "Max",
    species: "Perro",
    sex: "Macho",
    clientId: "1",
    race: "Labrador",
    birthDate: new Date(2020, 5, 15),
    size: "Grande",
    weight: "30kg",
    colorObservations: "Color dorado, muy activo y juguetón",
    createdAt: new Date(2020, 6, 1),
    createdBy: "1"
  },
  {
    id: "2",
    name: "Luna",
    species: "Gato",
    sex: "Hembra",
    clientId: "2",
    race: "Siamés",
    birthDate: new Date(2021, 2, 10),
    size: "Mediano",
    weight: "4kg",
    colorObservations: "Pelaje blanco con manchas marrones",
    createdAt: new Date(2021, 3, 15),
    createdBy: "1"
  },
  {
    id: "3",
    name: "Rocky",
    species: "Perro",
    sex: "Macho",
    clientId: "1",
    race: "Pastor Alemán",
    birthDate: new Date(2019, 0, 20),
    size: "Grande",
    weight: "35kg",
    colorObservations: "Color negro y café, muy protector",
    createdAt: new Date(2019, 2, 10),
    createdBy: "1"
  },
  {
    id: "4",
    name: "Mimi",
    species: "Gato",
    sex: "Hembra",
    clientId: "3",
    race: "Persa",
    birthDate: new Date(2022, 5, 10),
    size: "Pequeño",
    weight: "3kg",
    colorObservations: "Pelaje gris, ojos verdes",
    createdAt: new Date(2022, 6, 1),
    createdBy: "2"
  },
  {
    id: "5",
    name: "Toby",
    species: "Perro",
    sex: "Macho",
    clientId: "4",
    race: "Golden Retriever",
    birthDate: new Date(2021, 3, 5),
    size: "Grande",
    weight: "32kg",
    colorObservations: "Dorado claro, muy sociable",
    createdAt: new Date(2021, 4, 1),
    createdBy: "1"
  },
  {
    id: "6",
    name: "Bella",
    species: "Perro",
    sex: "Hembra",
    clientId: "4",
    race: "Cocker Spaniel",
    birthDate: new Date(2022, 1, 14),
    size: "Mediano",
    weight: "12kg",
    colorObservations: "Marrón con manchas blancas",
    createdAt: new Date(2022, 2, 10),
    createdBy: "2"
  },
  {
    id: "7",
    name: "Zeus",
    species: "Perro",
    sex: "Macho",
    clientId: "4",
    race: "Doberman",
    birthDate: new Date(2020, 8, 20),
    size: "Grande",
    weight: "40kg",
    colorObservations: "Negro y café, muy disciplinado",
    createdAt: new Date(2020, 9, 15),
    createdBy: "1"
  },
  {
    id: "8",
    name: "Coco",
    species: "Gato",
    sex: "Hembra",
    clientId: "5",
    race: "Angora",
    birthDate: new Date(2021, 6, 8),
    size: "Mediano",
    weight: "4.5kg",
    colorObservations: "Blanco puro, muy cariñosa",
    createdAt: new Date(2021, 7, 1),
    createdBy: "2"
  },
  {
    id: "9",
    name: "Simba",
    species: "Gato",
    sex: "Macho",
    clientId: "6",
    race: "Maine Coon",
    birthDate: new Date(2020, 11, 3),
    size: "Grande",
    weight: "7kg",
    colorObservations: "Atigrado, pelaje largo",
    createdAt: new Date(2021, 0, 10),
    createdBy: "1"
  },
  {
    id: "10",
    name: "Nina",
    species: "Perro",
    sex: "Hembra",
    clientId: "7",
    race: "Caniche",
    birthDate: new Date(2022, 4, 12),
    size: "Pequeño",
    weight: "6kg",
    colorObservations: "Blanco, rizado",
    createdAt: new Date(2022, 5, 5),
    createdBy: "2"
  },
  {
    id: "11",
    name: "Bruno",
    species: "Perro",
    sex: "Macho",
    clientId: "8",
    race: "Bulldog Francés",
    birthDate: new Date(2021, 9, 18),
    size: "Mediano",
    weight: "13kg",
    colorObservations: "Atigrado, orejas grandes",
    createdAt: new Date(2021, 10, 1),
    createdBy: "1"
  }
];

export const initialMedicalRecords: MedicalRecord[] = [
  // ── 2024 legacy records ──────────────────────────────────────
  {
    id: "1",
    petId: "1",
    date: new Date(2024, 10, 5),
    eventType: "Consulta médica",
    description: "Control general de rutina. Mascota en buen estado de salud. Peso: 30kg. Temperatura: 38.5°C.",
    professionalId: "doc1",
    createdAt: new Date(2024, 10, 5),
    createdBy: "1"
  },
  {
    id: "2",
    petId: "1",
    date: new Date(2024, 9, 15),
    eventType: "Vacuna",
    description: "Aplicación de vacuna antirrábica anual. Próxima dosis en 12 meses. No presentó reacciones adversas.",
    professionalId: "doc1",
    createdAt: new Date(2024, 9, 15),
    createdBy: "1"
  },
  {
    id: "3",
    petId: "2",
    date: new Date(2024, 10, 1),
    eventType: "Consulta médica",
    description: "Consulta por vómitos ocasionales. Gastritis leve. Tratamiento con protector gástrico por 10 días.",
    professionalId: "doc2",
    createdAt: new Date(2024, 10, 1),
    createdBy: "2"
  },
  {
    id: "4",
    petId: "3",
    date: new Date(2024, 9, 10),
    eventType: "Desparasitación",
    description: "Desparasitación interna y externa. Aplicación de pipeta antipulgas. Próxima desparasitación en 3 meses.",
    professionalId: "doc1",
    createdAt: new Date(2024, 9, 10),
    createdBy: "1"
  },
  {
    id: "5",
    petId: "5",
    date: new Date(2024, 10, 8),
    eventType: "Vacuna",
    description: "Aplicación de vacuna quíntuple. No presentó reacciones. Próxima dosis en 1 año.",
    professionalId: "doc1",
    createdAt: new Date(2024, 10, 8),
    createdBy: "1"
  },

  // ── 2025 records (Mayo – Diciembre) ────────────────────────────
  { id: "6",  petId: "2",  date: new Date(2025, 4, 7),  eventType: "Consulta médica",   description: "Revisión general. Peso estable 4kg. Temperatura 38.2°C. Se indica continuación de dieta balanceada.",                          professionalId: "doc1", weight: 4,   temperature: 38.2, createdAt: new Date(2025, 4, 7),  createdBy: "1" } as any,
  { id: "7",  petId: "3",  date: new Date(2025, 4, 12), eventType: "Vacuna",             description: "Vacuna polivalente. Sin reacciones adversas. Próximo refuerzo en 12 meses.",                                                      professionalId: "doc2", weight: 35,  temperature: 38.6, createdAt: new Date(2025, 4, 12), createdBy: "1" } as any,
  { id: "8",  petId: "4",  date: new Date(2025, 4, 20), eventType: "Control",            description: "Control post-operatorio. Herida cicatrizada correctamente. Alta médica definitiva.",                                             professionalId: "doc2", weight: 3,   temperature: 38.0, createdAt: new Date(2025, 4, 20), createdBy: "2" } as any,
  { id: "9",  petId: "5",  date: new Date(2025, 4, 25), eventType: "Análisis clínico",   description: "Hemograma completo y perfil bioquímico. Resultados dentro de parámetros normales.",                                             professionalId: "doc5", weight: 32,  temperature: 38.5, createdAt: new Date(2025, 4, 25), createdBy: "1" } as any,
  { id: "10", petId: "6",  date: new Date(2025, 5, 3),  eventType: "Desparasitación",    description: "Desparasitación interna con Milbemax. Pipeta antipulgas Frontline Plus. Próxima en 3 meses.",                                   professionalId: "doc1", weight: 12,  temperature: 38.3, createdAt: new Date(2025, 5, 3),  createdBy: "1" } as any,
  { id: "11", petId: "7",  date: new Date(2025, 5, 10), eventType: "Consulta médica",   description: "Consulta por cojera en pata delantera izquierda. Radiografía indica contractura muscular. Antiinflamatorio 7 días.",           professionalId: "doc7", weight: 40,  temperature: 39.1, createdAt: new Date(2025, 5, 10), createdBy: "2" } as any,
  { id: "12", petId: "8",  date: new Date(2025, 5, 18), eventType: "Vacuna",             description: "Triple felina + Leucemia. Sin complicaciones. Se agenda próxima dosis.",                                                          professionalId: "doc1", weight: 4.5, temperature: 38.1, createdAt: new Date(2025, 5, 18), createdBy: "1" } as any,
  { id: "13", petId: "9",  date: new Date(2025, 5, 25), eventType: "Ecografía",          description: "Ecografía abdominal por distensión leve. Sin hallazgos patológicos significativos. Se recomienda dieta liviana.",                professionalId: "doc5", weight: 7,   temperature: 38.4, createdAt: new Date(2025, 5, 25), createdBy: "1" } as any,
  { id: "14", petId: "1",  date: new Date(2025, 6, 5),  eventType: "Cirugía",            description: "Castración electiva. Procedimiento sin complicaciones. Alta a las 4 horas. Antibiótico preventivo 5 días.",                     professionalId: "doc2", weight: 30,  temperature: 38.5, createdAt: new Date(2025, 6, 5),  createdBy: "1" } as any,
  { id: "15", petId: "10", date: new Date(2025, 6, 14), eventType: "Consulta médica",   description: "Control anual. Masa corporal ideal. Dientes en buen estado. Se recomienda limpieza dental preventiva.",                          professionalId: "doc1", weight: 6,   temperature: 38.2, createdAt: new Date(2025, 6, 14), createdBy: "2" } as any,
  { id: "16", petId: "11", date: new Date(2025, 6, 22), eventType: "Desparasitación",    description: "Desparasitación trimestral. Buen estado general. Se indica suplemento vitamínico.",                                             professionalId: "doc8", weight: 13,  temperature: 38.3, createdAt: new Date(2025, 6, 22), createdBy: "1" } as any,
  { id: "17", petId: "2",  date: new Date(2025, 7, 8),  eventType: "Consulta médica",   description: "Consulta por estornudos frecuentes. Rinitis alérgica leve. Antihistamínico 10 días. Control en 2 semanas.",                     professionalId: "doc3", weight: 4,   temperature: 38.0, createdAt: new Date(2025, 7, 8),  createdBy: "2" } as any,
  { id: "18", petId: "3",  date: new Date(2025, 7, 15), eventType: "Control",            description: "Control post-cirugía de castración. Herida en perfectas condiciones. Alta definitiva. Retiro de puntos.",                       professionalId: "doc2", weight: 35,  temperature: 38.5, createdAt: new Date(2025, 7, 15), createdBy: "1" } as any,
  { id: "19", petId: "4",  date: new Date(2025, 7, 20), eventType: "Vacuna",             description: "Vacuna triple felina de refuerzo anual. Tolerada correctamente.",                                                                professionalId: "doc1", weight: 3.1, temperature: 38.1, createdAt: new Date(2025, 7, 20), createdBy: "1" } as any,
  { id: "20", petId: "5",  date: new Date(2025, 8, 3),  eventType: "Análisis clínico",   description: "Análisis pre-quirúrgico completo. Todos los valores normales. Autorizado para procedimiento.",                                  professionalId: "doc5", weight: 32,  temperature: 38.4, createdAt: new Date(2025, 8, 3),  createdBy: "2" } as any,
  { id: "21", petId: "6",  date: new Date(2025, 8, 12), eventType: "Consulta médica",   description: "Otitis externa bilateral. Cultivo positivo para Malassezia. Tratamiento con Otomax 2 veces/día por 10 días.",                   professionalId: "doc3", weight: 12,  temperature: 38.2, createdAt: new Date(2025, 8, 12), createdBy: "1" } as any,
  { id: "22", petId: "7",  date: new Date(2025, 8, 20), eventType: "Radiografía",        description: "Radiografía de columna. Sin lesiones óseas. Se diagnostica artrosis leve L3-L4. Condroprotector.",                             professionalId: "doc7", weight: 40,  temperature: 38.6, createdAt: new Date(2025, 8, 20), createdBy: "2" } as any,
  { id: "23", petId: "8",  date: new Date(2025, 9, 7),  eventType: "Desparasitación",    description: "Desparasitación interna y externa programada. Estado de salud excelente.",                                                      professionalId: "doc1", weight: 4.6, temperature: 38.2, createdAt: new Date(2025, 9, 7),  createdBy: "1" } as any,
  { id: "24", petId: "9",  date: new Date(2025, 9, 15), eventType: "Consulta médica",   description: "Pérdida de peso 800g en 2 meses. Hipertiroidismo leve. Inicio de tratamiento con Felimazole.",                                  professionalId: "doc5", weight: 6.2, temperature: 38.5, createdAt: new Date(2025, 9, 15), createdBy: "1" } as any,
  { id: "25", petId: "10", date: new Date(2025, 9, 22), eventType: "Vacuna",             description: "Vacuna antirrábica + cuádruple. Sin reacciones. Certificado internacional emitido.",                                            professionalId: "doc1", weight: 6,   temperature: 38.1, createdAt: new Date(2025, 9, 22), createdBy: "2" } as any,
  { id: "26", petId: "1",  date: new Date(2025, 10, 5), eventType: "Control",            description: "Control semestral. Excelente estado general post-castración. Peso ideal. Continuar mismo plan.",                                professionalId: "doc1", weight: 29,  temperature: 38.3, createdAt: new Date(2025, 10, 5), createdBy: "1" } as any,
  { id: "27", petId: "11", date: new Date(2025, 10, 12),eventType: "Emergencia",         description: "Ingesta de cuerpo extraño (hueso de pollo). Extracción endoscópica exitosa. Control en 48hs.",                                 professionalId: "doc2", weight: 13,  temperature: 39.4, createdAt: new Date(2025, 10, 12),createdBy: "2" } as any,
  { id: "28", petId: "2",  date: new Date(2025, 10, 18),eventType: "Análisis clínico",   description: "Perfil renal completo: creatinina 1.4, urea 35. Valores normales. Seguimiento en 6 meses.",                                     professionalId: "doc5", weight: 4.1, temperature: 38.0, createdAt: new Date(2025, 10, 18),createdBy: "1" } as any,
  { id: "29", petId: "3",  date: new Date(2025, 11, 3), eventType: "Desparasitación",    description: "Desparasitación trimestral. Se agrega suplemento omega-3 para pelaje.",                                                         professionalId: "doc8", weight: 35,  temperature: 38.5, createdAt: new Date(2025, 11, 3), createdBy: "1" } as any,
  { id: "30", petId: "5",  date: new Date(2025, 11, 10),eventType: "Cirugía",            description: "Orquiectomía electiva. Sin complicaciones intraoperatorias. Alta en el día.",                                                   professionalId: "doc2", weight: 32,  temperature: 38.4, createdAt: new Date(2025, 11, 10),createdBy: "2" } as any,
  { id: "31", petId: "6",  date: new Date(2025, 11, 18),eventType: "Consulta médica",   description: "Revisión semestral. Otitis resuelta. Dentadura con sarro moderado. Se programa limpieza dental.",                               professionalId: "doc1", weight: 12,  temperature: 38.2, createdAt: new Date(2025, 11, 18),createdBy: "1" } as any,

  // ── 2026 records (Enero – Abril) ───────────────────────────────
  { id: "32", petId: "7",  date: new Date(2026, 0, 8),  eventType: "Control",            description: "Control de artrosis. Mejor respuesta al condroprotector. Movimiento más fluido. Continuar tratamiento.",                        professionalId: "doc7", weight: 40,  temperature: 38.5, createdAt: new Date(2026, 0, 8),  createdBy: "2" } as any,
  { id: "33", petId: "8",  date: new Date(2026, 0, 15), eventType: "Vacuna",             description: "Triple felina anual. Sin complicaciones. Se entrega certificado vacunatorio.",                                                   professionalId: "doc1", weight: 4.7, temperature: 38.1, createdAt: new Date(2026, 0, 15), createdBy: "1" } as any,
  { id: "34", petId: "9",  date: new Date(2026, 0, 22), eventType: "Análisis clínico",   description: "Control de hipertiroidismo. T4 normalizado con medicación. Mantener dosis actual. Próximo control en 3 meses.",                 professionalId: "doc5", weight: 6.5, temperature: 38.2, createdAt: new Date(2026, 0, 22), createdBy: "1" } as any,
  { id: "35", petId: "10", date: new Date(2026, 1, 5),  eventType: "Consulta médica",   description: "Consulta por lamido excesivo de patas. Dermatitis atópica. Iniciamos inmunoterapia. Control en 4 semanas.",                     professionalId: "doc3", weight: 6.1, temperature: 38.0, createdAt: new Date(2026, 1, 5),  createdBy: "2" } as any,
  { id: "36", petId: "1",  date: new Date(2026, 1, 12), eventType: "Desparasitación",    description: "Desparasitación cuatrimestral. Excelente condición física. Se recomienda aumentar actividad física.",                           professionalId: "doc8", weight: 29,  temperature: 38.3, createdAt: new Date(2026, 1, 12), createdBy: "1" } as any,
  { id: "37", petId: "11", date: new Date(2026, 1, 20), eventType: "Control",            description: "Control post-emergencia 3 meses. Recuperación completa. Radiografía de control negativa.",                                      professionalId: "doc2", weight: 13,  temperature: 38.4, createdAt: new Date(2026, 1, 20), createdBy: "2" } as any,
  { id: "38", petId: "2",  date: new Date(2026, 2, 3),  eventType: "Consulta médica",   description: "Revisión semestral. Excelente estado. Limpieza dental preventiva realizada. Próxima visita en 6 meses.",                        professionalId: "doc1", weight: 4.1, temperature: 38.0, createdAt: new Date(2026, 2, 3),  createdBy: "1" } as any,
  { id: "39", petId: "3",  date: new Date(2026, 2, 11), eventType: "Vacuna",             description: "Vacuna antirrábica anual + polivalente. Tolerada perfectamente.",                                                               professionalId: "doc1", weight: 35,  temperature: 38.5, createdAt: new Date(2026, 2, 11), createdBy: "1" } as any,
  { id: "40", petId: "4",  date: new Date(2026, 2, 18), eventType: "Análisis clínico",   description: "Hemograma + bioquímica anual. Todos los valores dentro de rango. Felicidades al propietario.",                                  professionalId: "doc5", weight: 3.2, temperature: 38.1, createdAt: new Date(2026, 2, 18), createdBy: "2" } as any,
  { id: "41", petId: "5",  date: new Date(2026, 2, 25), eventType: "Control",            description: "Control post-cirugía 4 meses. Excelente recuperación. Alta definitiva.",                                                        professionalId: "doc2", weight: 33,  temperature: 38.4, createdAt: new Date(2026, 2, 25), createdBy: "1" } as any,
  { id: "42", petId: "6",  date: new Date(2026, 3, 2),  eventType: "Consulta médica",   description: "Consulta por pérdida apetito. Estomatitis leve. Limpieza dental + antibiótico oral 7 días.",                                    professionalId: "doc1", weight: 11.5,temperature: 38.3, createdAt: new Date(2026, 3, 2),  createdBy: "1" } as any,
  { id: "43", petId: "7",  date: new Date(2026, 3, 8),  eventType: "Radiografía",        description: "Radiografía de control artrosis. Leve mejoría articular. Continuar condroprotector.",                                           professionalId: "doc7", weight: 40,  temperature: 38.5, createdAt: new Date(2026, 3, 8),  createdBy: "2" } as any,
  { id: "44", petId: "8",  date: new Date(2026, 3, 14), eventType: "Desparasitación",    description: "Desparasitación interna cuatrimestral. Estado de salud óptimo.",                                                               professionalId: "doc1", weight: 4.7, temperature: 38.2, createdAt: new Date(2026, 3, 14), createdBy: "1" } as any,
  { id: "45", petId: "9",  date: new Date(2026, 3, 20), eventType: "Ecograf��a",          description: "Ecografía tiroidea de control. Glándula de tamaño normal. Medicación exitosa.",                                                professionalId: "doc5", weight: 6.6, temperature: 38.1, createdAt: new Date(2026, 3, 20), createdBy: "1" } as any,
  { id: "46", petId: "10", date: new Date(2026, 3, 23), eventType: "Control",            description: "Control dermatitis atópica. Gran mejoría con inmunoterapia. Reducimos dosis al 50%.",                                           professionalId: "doc3", weight: 6.1, temperature: 38.0, createdAt: new Date(2026, 3, 23), createdBy: "2" } as any,
] as MedicalRecord[];

export const doctors: Doctor[] = [
  {
    id: "doc1",
    name: "Dra. María Fernández",
    specialty: "Medicina General",
    available: true
  },
  {
    id: "doc2",
    name: "Dr. Carlos Rodríguez",
    specialty: "Cirugía",
    available: true
  },
  {
    id: "doc3",
    name: "Dra. Ana Martínez",
    specialty: "Dermatología",
    available: true
  },
  {
    id: "doc4",
    name: "Juan García",
    specialty: "Peluquería",
    available: true
  },
  {
    id: "doc5",
    name: "Dr. Roberto Silva",
    specialty: "Cardiología",
    available: true
  },
  {
    id: "doc6",
    name: "Dra. Patricia López",
    specialty: "Oftalmología",
    available: true
  },
  {
    id: "doc7",
    name: "Dr. Diego Ramírez",
    specialty: "Traumatología",
    available: true
  },
  {
    id: "doc8",
    name: "Dra. Laura Sánchez",
    specialty: "Nutrición",
    available: true
  }
];

export const initialAppointments: Appointment[] = [
  {
    id: "1",
    type: "clinic",
    clientId: "1",
    petId: "1",
    doctorId: "doc1",
    date: new Date(2024, 10, 13),
    startTime: "10:00",
    endTime: "10:30",
    status: "scheduled",
    reason: "Control general",
    createdAt: new Date(2024, 10, 5),
    createdBy: "1"
  },
  {
    id: "2",
    type: "clinic",
    clientId: "2",
    petId: "2",
    doctorId: "doc2",
    date: new Date(2024, 10, 14),
    startTime: "15:00",
    endTime: "15:30",
    status: "confirmed",
    reason: "Vacunación",
    notes: "Segunda dosis",
    createdAt: new Date(2024, 10, 6),
    createdBy: "2"
  },
  {
    id: "3",
    type: "daycare",
    clientId: "3",
    petId: "4",
    dateFrom: new Date(2024, 10, 15),
    dateTo: new Date(2024, 10, 20),
    date: new Date(2024, 10, 15),
    status: "scheduled",
    reason: "Guardería - Viaje del dueño",
    notes: "Alimentación especial incluida",
    createdAt: new Date(2024, 10, 8),
    createdBy: "1"
  },
  {
    id: "4",
    type: "clinic",
    clientId: "1",
    petId: "3",
    doctorId: "doc3",
    date: new Date(2024, 10, 16),
    startTime: "11:00",
    endTime: "11:30",
    status: "scheduled",
    reason: "Consulta dermatológica",
    notes: "Irritación en la piel",
    createdAt: new Date(2024, 10, 7),
    createdBy: "2"
  },
  {
    id: "5",
    type: "clinic",
    clientId: "4",
    petId: "5",
    doctorId: "doc1",
    date: new Date(2024, 10, 17),
    startTime: "09:00",
    endTime: "09:30",
    status: "scheduled",
    reason: "Vacuna anual",
    createdAt: new Date(2024, 10, 8),
    createdBy: "1"
  },
  {
    id: "6",
    type: "daycare",
    clientId: "5",
    petId: "8",
    dateFrom: new Date(2024, 10, 18),
    dateTo: new Date(2024, 10, 22),
    date: new Date(2024, 10, 18),
    status: "scheduled",
    reason: "Guardería - Vacaciones",
    createdAt: new Date(2024, 10, 10),
    createdBy: "1"
  }
];