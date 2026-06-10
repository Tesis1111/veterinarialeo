# 🔐 Datos de Prueba - VetCare PWA

## Credenciales de Acceso

Para probar todas las funcionalidades del sistema, usa las siguientes credenciales:

---

## 👥 Usuarios del Sistema

### 👨‍💼 Administrador

```
Usuario: admin
Contraseña: admin123

Permisos:
✅ Módulo Clientes (CRUD)
✅ Módulo Mascotas (CRUD)
✅ Módulo Atención Médica (CRUD)
✅ Módulo Turnos (CRUD)
✅ Módulo Seguridad/Usuarios (CRUD)
✅ Módulo Auditoría (Solo lectura)
✅ Módulo Horarios de Atención (CRUD)
```

**Qué puedes hacer como Admin:**
- Crear, editar y eliminar usuarios
- Ver todos los movimientos en Auditoría
- Configurar horarios de profesionales
- Acceso completo a todos los módulos
- Gestionar permisos de otros usuarios

---

### 👨‍⚕️ Veterinario

```
Usuario: vet
Contraseña: vet123

Permisos:
✅ Módulo Clientes (CRUD)
✅ Módulo Mascotas (CRUD)
✅ Módulo Atención Médica (CRUD)
✅ Módulo Turnos (Lectura y edición de propios)
❌ Módulo Seguridad/Usuarios
❌ Módulo Auditoría
✅ Módulo Horarios de Atención (Solo propios)
```

**Qué puedes hacer como Veterinario:**
- Registrar consultas médicas
- Subir archivos (radiografías, estudios)
- Ver y editar historial médico
- Gestionar tus propios turnos
- Configurar tu propio horario de atención
- Ver clientes y mascotas

---

### 👩‍💼 Recepcionista

```
Usuario: recep
Contraseña: recep123

Permisos:
✅ Módulo Clientes (CRUD)
✅ Módulo Mascotas (CRUD)
✅ Módulo Turnos (CRUD)
✅ Módulo Atención Médica (Solo lectura)
❌ Módulo Seguridad/Usuarios
❌ Módulo Auditoría
```

**Qué puedes hacer como Recepcionista:**
- Registrar nuevos clientes
- Registrar nuevas mascotas
- Agendar, modificar y cancelar turnos
- Ver historiales médicos (solo lectura)
- Consultar disponibilidad de profesionales

---

## 📊 Datos Precargados

El sistema viene con datos de ejemplo para facilitar las pruebas:

### 👥 Clientes (3)

1. **María García López**
   - DNI: 20-12345678-9
   - Teléfono: +54 11 4567-8900
   - Email: maria.garcia@email.com
   - Observación: Cliente preferencial desde 2020

2. **Juan Pérez Rodríguez**
   - DNI: 20-98765432-1
   - Teléfono: +54 11 9876-5432
   - Email: juan.perez@email.com

3. **Ana Martínez Silva**
   - DNI: 27-23456789-3
   - Teléfono: 15-6789-0123
   - Email: ana.martinez@email.com
   - Observación: Alérgica a ciertos medicamentos

---

### 🐕 Mascotas (5)

1. **Max** (Perro - Golden Retriever)
   - Dueño: María García López
   - Edad: 5 años
   - Peso: 32 kg
   - Chip: 123456789012345

2. **Luna** (Gato - Siamés)
   - Dueño: María García López
   - Edad: 3 años
   - Peso: 4.5 kg
   - Chip: 987654321098765

3. **Rocky** (Perro - Bulldog Francés)
   - Dueño: Juan Pérez Rodríguez
   - Edad: 2 años
   - Peso: 12 kg

4. **Michi** (Gato - Persa)
   - Dueño: Ana Martínez Silva
   - Edad: 4 años
   - Peso: 5.2 kg

5. **Toby** (Perro - Labrador)
   - Dueño: Juan Pérez Rodríguez
   - Edad: 7 años
   - Peso: 30 kg
   - Chip: 111222333444555

---

### 🏥 Profesionales (3)

1. **Dr. Carlos Rodríguez**
   - Especialidad: Medicina General
   - Licencia: VET-001-2015
   - Horarios: Lun-Vie 9:00-17:00

2. **Dra. Laura Fernández**
   - Especialidad: Cirugía
   - Licencia: VET-002-2018
   - Horarios: Mar-Jue 10:00-18:00

3. **Dr. Miguel Torres**
   - Especialidad: Dermatología
   - Licencia: VET-003-2019
   - Horarios: Lun-Mie-Vie 14:00-20:00

---

### 📋 Historiales Médicos (3)

Los siguientes registros están precargados:

1. **Max - Control Anual 2024**
   - Fecha: Enero 2024
   - Profesional: Dr. Carlos Rodríguez
   - Diagnóstico: Control de rutina
   - Peso: 32 kg
   - Vacunas: Antirrábica, Sextuple

2. **Luna - Consulta Urgencia**
   - Fecha: Febrero 2024
   - Profesional: Dra. Laura Fernández
   - Diagnóstico: Gastroenteritis leve
   - Tratamiento: Dieta blanda, hidratación

3. **Rocky - Control Piel**
   - Fecha: Marzo 2024
   - Profesional: Dr. Miguel Torres
   - Diagnóstico: Dermatitis alérgica
   - Tratamiento: Antihistamínicos

---

### 📅 Turnos Precargados

El sistema incluye turnos de ejemplo para cada servicio:

**Consulta Médica:**
- Max con Dr. Carlos Rodríguez - Mañana a las 10:00
- Luna con Dra. Laura Fernández - Pasado mañana a las 15:00

**Guardería:**
- Toby - Hoy todo el día

**Peluquería:**
- Michi - Esta tarde a las 16:00

**Urgencia:**
- Rocky - Atención inmediata (ejemplo de urgencia)

---

## 🧪 Escenarios de Prueba

### Escenario 1: Nuevo Cliente con Mascota

```
1. Login como: recepcionista (recep/recep123)
2. Ir a módulo "Clientes"
3. Click "Nuevo Cliente"
4. Completar datos:
   - Nombre: Pedro González
   - DNI: 20-11223344-5
   - Teléfono: 11-2233-4455
   - Email: pedro@email.com
5. Guardar
6. Ir a módulo "Mascotas"
7. Click "Nueva Mascota"
8. Seleccionar cliente: Pedro González
9. Completar datos:
   - Nombre: Rex
   - Especie: Perro
   - Raza: Pastor Alemán
   - Fecha nacimiento: 01/01/2022
10. Guardar
```

**Resultado esperado:** Cliente y mascota creados. Registro en auditoría.

---

### Escenario 2: Agendar Turno con Profesional

```
1. Login como: recepcionista (recep/recep123)
2. Ir a módulo "Turnos"
3. Click "Nuevo Turno"
4. Seleccionar:
   - Cliente: María García López
   - Mascota: Max
   - Servicio: Consulta Médica
   - Profesional: Dr. Carlos Rodríguez
5. Verificar que solo se muestran horarios disponibles del profesional
6. Seleccionar fecha y hora disponible
7. Agregar motivo: "Vacunación anual"
8. Guardar
```

**Resultado esperado:** Turno creado. Aparece en calendario. Registro en auditoría.

---

### Escenario 3: Registrar Atención Médica

```
1. Login como: veterinario (vet/vet123)
2. Ir a módulo "Atención Médica"
3. Click "Nueva Consulta"
4. Seleccionar:
   - Cliente: Juan Pérez Rodríguez
   - Mascota: Rocky
5. Completar:
   - Motivo: Control de piel
   - Peso: 12.5 (solo números permitidos)
   - Temperatura: 38.5
   - Síntomas: Picazón leve
   - Diagnóstico: Piel seca estacional
   - Tratamiento: Shampoo medicado
   - Medicamentos: Antihistamínico oral
6. Click "Subir Archivo" → Simular subida de foto de piel
7. Guardar
```

**Resultado esperado:** Consulta registrada. Archivos adjuntos. Registro en auditoría.

---

### Escenario 4: Configurar Horario de Atención

```
1. Login como: veterinario (vet/vet123)
2. Ir a módulo "Seguridad" → Pestaña "Horarios de Atención"
3. Verificar que solo ves tu propio horario
4. Click "Editar Horario"
5. Configurar disponibilidad:
   - Lunes: 09:00 - 13:00, 15:00 - 19:00
   - Martes: 10:00 - 18:00
   - Miércoles: OFF
   - Jueves: 09:00 - 17:00
   - Viernes: 08:00 - 14:00
6. Guardar
```

**Resultado esperado:** Horario actualizado. Solo estos horarios aparecen disponibles para agendar con este profesional.

---

### Escenario 5: Ver Auditoría (Solo Admin)

```
1. Login como: administrador (admin/admin123)
2. Ir a módulo "Auditoría"
3. Verificar que se muestran TODOS los movimientos:
   - Creación de clientes
   - Creación de mascotas
   - Registro de consultas
   - Creación de turnos
   - Modificación de horarios
   - Todo sin excepción
4. Filtrar por:
   - Usuario específico
   - Rango de fechas
   - Tipo de acción
```

**Resultado esperado:** Historial completo visible. Filtros funcionan. Posible exportar a Excel.

---

### Escenario 6: Probar Modo Offline

```
1. Login con cualquier usuario
2. Navegar por varios módulos
3. Abrir algunos registros (clientes, mascotas, historiales)
4. Activar modo avión o desconectar WiFi
5. Navegar por la app
6. Verificar que puedes ver:
   - Datos previamente cargados
   - Navegación entre módulos
   - Dashboard
7. Intentar crear nuevo registro
8. Reconectar internet
9. Verificar que datos se sincronizan
```

**Resultado esperado:** App funciona offline. Muestra indicador de conexión. Sincroniza al reconectar.

---

### Escenario 7: Instalar PWA

```
1. Abrir VetCare en navegador (móvil o desktop)
2. Esperar 3 segundos
3. Verificar que aparece banner de instalación
4. Click en "Instalar"
5. Confirmar instalación
6. Verificar que se abre en pantalla completa
7. Cerrar app
8. Buscar ícono en pantalla de inicio
9. Abrir desde el ícono
10. Verificar que funciona como app nativa
```

**Resultado esperado:** App instalada. Ícono visible. Abre en pantalla completa. Funciona igual que en navegador.

---

### Escenario 8: Gestionar Usuarios (Solo Admin)

```
1. Login como: administrador (admin/admin123)
2. Ir a módulo "Seguridad" → Pestaña "Usuarios"
3. Click "Nuevo Usuario"
4. Completar:
   - Nombre: Dr. Roberto Sánchez
   - Email: roberto@vetcare.com
   - Usuario: roberto
   - Contraseña: roberto123
   - Rol: Empleado
5. Al seleccionar "Empleado", aparece ComboBox adicional
6. Seleccionar tipo: Veterinario
7. Configurar permisos granulares
8. Guardar
9. Logout
10. Login con: roberto/roberto123
11. Verificar permisos asignados
```

**Resultado esperado:** Usuario creado con rol y permisos específicos. Puede hacer login. Auditoría registra la creación.

---

### Escenario 9: Dashboard Configurable

```
1. Login como: administrador (admin/admin123)
2. Ir a Dashboard
3. Click en "Configurar Dashboard"
4. Seleccionar widgets a mostrar:
   - Total de clientes
   - Total de mascotas
   - Turnos hoy
   - Turnos próximos (24h)
   - Gráfico de auditoría (opcional)
5. Guardar configuración
6. Verificar que dashboard muestra solo widgets seleccionados
7. Cambiar configuración
8. Verificar que se actualiza
```

**Resultado esperado:** Dashboard personalizable. Muestra solo lo seleccionado. Cambios se guardan.

---

### Escenario 10: Calendario con Alertas

```
1. Login como: recepcionista (recep/recep123)
2. Ir a módulo "Turnos" → Vista Calendario
3. Verificar turnos próximos (24h) con alerta naranja
4. Click en un turno
5. Opciones de cambio rápido de estado:
   - Confirmar
   - Completar
   - Cancelar
6. Cambiar estado de turno
7. Verificar que color cambia en calendario
8. Verificar registro en auditoría
```

**Resultado esperado:** Alertas visibles. Cambios de estado rápidos. Calendario actualizado. Auditoría registrada.

---

## 🔍 Validaciones a Verificar

### Campo de Peso
```
❌ "30kg" → No permite letras
❌ "treinta" → No permite texto
✅ "30" → Acepta
✅ "30.5" → Acepta decimales
✅ "12,5" → Convierte coma a punto
```

### Cálculo de Edad de Mascotas
```
Fecha nacimiento: 01/01/2023
Fecha actual: 30/01/2026

Resultado esperado: "3 años, 0 meses"

Fecha nacimiento: 15/06/2024
Fecha actual: 30/01/2026

Resultado esperado: "1 año, 7 meses"
```

### Restricciones de Fechas
```
✅ Permite seleccionar cualquier fecha en el pasado
✅ Permite seleccionar fechas futuras
✅ No hay límites artificiales
✅ Funciona en todos los módulos
```

### Validación de Turnos Duplicados
```
Intenta crear:
- Mismo profesional
- Misma fecha y hora
- Mismo servicio

Resultado esperado: ❌ Error - "Ya existe un turno en ese horario"
```

### Auditoría Completa
```
Verificar que se registran:
✅ Creación de clientes
✅ Edición de clientes
✅ Eliminación de clientes
✅ Creación de mascotas
✅ Edición de mascotas
✅ Eliminación de mascotas
✅ Creación de consultas médicas
✅ Subida de archivos
✅ Creación de turnos
✅ Cambio de estado de turnos
✅ Cancelación de turnos
✅ Creación de usuarios
✅ Edición de permisos
✅ Configuración de horarios
✅ TODOS los movimientos sin excepción
```

---

## 💡 Tips para Pruebas

### Preparación
- Usa modo incógnito para probar diferentes usuarios sin hacer logout
- Ten DevTools abierto para ver errores en consola
- Prueba en diferentes dispositivos (móvil, tablet, desktop)
- Prueba en diferentes navegadores (Chrome, Safari, Edge)

### Durante las Pruebas
- Verifica que cada acción se registre en auditoría
- Comprueba que los permisos se respeten
- Valida que los datos se guarden correctamente
- Verifica la responsividad en diferentes tamaños

### Modo Offline
- Abre la app con internet
- Navega por varios módulos
- Desconecta internet
- Verifica que sigue funcionando
- Reconecta y verifica sincronización

---

## 📝 Reporte de Bugs

Si encuentras un problema durante las pruebas:

```
Bug Report Template:

Usuario probando: ___________
Fecha: ___________
Navegador: ___________
Dispositivo: ___________

Descripción del problema:
_________________________

Pasos para reproducir:
1. _________________________
2. _________________________
3. _________________________

Resultado esperado:
_________________________

Resultado actual:
_________________________

Captura de pantalla: [adjuntar]
Error en consola: [copiar]
```

---

**VetCare - Sistema de Gestión Veterinaria** 🐕  
*Datos de Prueba y Escenarios*

**Versión:** 1.0  
**Última actualización:** Enero 2026
