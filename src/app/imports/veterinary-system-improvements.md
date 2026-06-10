# Solicitud de Mejora y Corrección del Sistema de Gestión Veterinaria

## Contexto del Proyecto

El sistema corresponde a una aplicación de gestión para una clínica veterinaria que incluye los módulos:

* Gestión de Clientes
* Gestión de Mascotas
* Historial Clínico
* Gestión de Turnos
* Gestión de Usuarios
* Sistema de Permisos
* Auditoría del sistema
* Mensajería interna

La base de datos se implementará utilizando **PostgreSQL en Supabase**, por lo que el modelo de datos y las funcionalidades deben ser optimizadas para un entorno relacional moderno y escalable.

El objetivo de esta solicitud es **corregir inconsistencias del sistema actual, mejorar la arquitectura y garantizar un funcionamiento profesional del software.**

---

# 1. Reestructuración del Sistema de Roles y Permisos

## Problema actual

Actualmente el sistema utiliza una estructura llamada **PermisosUsuario**, lo cual obliga a asignar permisos manualmente a cada usuario.

Este enfoque presenta los siguientes problemas:

* Alta complejidad de gestión
* Difícil escalabilidad
* Riesgo de inconsistencias en permisos
* Mala práctica arquitectónica

## Solución solicitada

Se debe implementar un sistema profesional basado en **Roles y Permisos jerárquicos**.

### Nueva estructura de entidades

Tabla **Rol**

Campos sugeridos:

* id_rol (PK)
* nombre
* descripcion

Ejemplos de roles:

* Administrador
* Veterinario
* Recepcionista

---

Tabla **Permiso**

Campos sugeridos:

* id_permiso (PK)
* nombre
* descripcion

Ejemplos:

* gestionar_clientes
* gestionar_mascotas
* gestionar_turnos
* gestionar_historial
* gestionar_usuarios
* ver_auditoria

---

Tabla **RolPermiso**

Tabla intermedia para relación muchos a muchos.

Campos:

* id_rol (FK)
* id_permiso (FK)

---

Tabla **Usuario**

Debe modificarse para incluir:

* id_usuario
* id_rol (FK)
* nombre
* email
* password_hash
* estado

## Funcionamiento esperado

Los usuarios **NO deben tener permisos individuales**.

El sistema debe funcionar de la siguiente manera:

1. Al crear un usuario se selecciona únicamente un **ROL**.
2. Los permisos se heredan automáticamente desde el rol.
3. El sistema valida acceso según el rol asignado.

Esto simplifica la gestión de seguridad y mejora la escalabilidad del sistema.

---

# 2. Corrección del modelo de datos de Mascotas

## Problema detectado

Actualmente el atributo **Peso** está almacenado en la entidad **Mascota**.

Esto es incorrecto desde el punto de vista clínico porque el peso de una mascota cambia con el tiempo.

## Cambio solicitado

Eliminar el campo:

peso

de la entidad:

Mascota

y moverlo a la entidad:

HistorialClinico

## Nuevo enfoque

Cada registro clínico podrá almacenar:

* peso
* diagnóstico
* tratamiento
* observaciones

Esto permitirá tener un **histórico de peso por consulta**, lo cual es médicamente correcto.

---

# 3. Mejora del Módulo de Historial Clínico

La entidad **HistorialClinico** debe registrar eventos clínicos.

Debe incluir al menos los siguientes campos:

* id_historial
* id_mascota
* id_usuario (veterinario)
* fecha
* tipo_evento
* descripcion
* peso
* observaciones

Tipos de eventos posibles:

* Consulta
* Vacunación
* Cirugía
* Tratamiento
* Desparasitación
* Control

Esto permitirá que el sistema tenga un historial médico completo.

---

# 4. Corrección del Sistema de Turnos y Calendario

## Problema actual

El módulo de turnos no está estructurado de forma óptima para representar correctamente el calendario de atención.

## Cambios requeridos

La entidad **Turno** debe contener:

* id_turno
* id_cliente
* id_mascota
* id_usuario (profesional)
* id_servicio
* fecha
* hora
* estado
* observaciones

Estados posibles del turno:

* Programado
* Confirmado
* Cancelado
* Completado

---

## Mejora del calendario

El calendario debe:

1. Mostrar los turnos organizados por **día y hora**.
2. Permitir visualizar la agenda de cada profesional.
3. Bloquear horarios ocupados.
4. Evitar la creación de turnos en fechas pasadas.
5. Permitir modificar o cancelar turnos según el estado.

El sistema debe comportarse como una **agenda médica profesional**.

---

# 5. Implementación de Servicios Veterinarios

Se debe agregar una nueva entidad:

Servicio

Campos sugeridos:

* id_servicio
* nombre
* descripcion
* duracion_estimada
* requiere_profesional

Ejemplos:

* Consulta
* Vacunación
* Peluquería
* Cirugía
* Desparasitación

Relación:

Servicio 1 — N Turnos

---

# 6. Mejora del Sistema de Auditoría

La entidad **RegistroAuditoria** debe registrar todas las acciones importantes del sistema.

Campos sugeridos:

* id_auditoria
* id_usuario
* accion
* modulo
* fecha_hora
* detalle

Ejemplos de eventos registrados:

* creación de cliente
* modificación de mascota
* creación de turno
* cancelación de turno
* inicio de sesión

Esto permite trazabilidad completa del sistema.

---

# 7. Mejora del Modelo de Mascotas

La estructura correcta debe incluir:

Entidad **Especie**

* id_especie
* nombre

Entidad **Raza**

* id_raza
* id_especie
* nombre

Entidad **Mascota**

* id_mascota
* id_cliente
* id_raza
* nombre
* sexo
* fecha_nacimiento
* color
* observaciones

Relaciones:

Cliente 1 — N Mascota
Especie 1 — N Raza
Raza 1 — N Mascota

---

# 8. Reglas de validación del sistema

El sistema debe implementar las siguientes validaciones:

* No permitir turnos en fechas pasadas
* No permitir duplicación de horarios
* Validar campos obligatorios en registros
* Controlar permisos según rol
* Registrar acciones críticas en auditoría

---

# 9. Objetivo final del rediseño

El objetivo de estas mejoras es garantizar que el sistema tenga:

* arquitectura escalable
* modelo de datos normalizado
* gestión de seguridad profesional
* historial clínico correcto
* sistema de turnos funcional
* trazabilidad completa de acciones

El resultado esperado es un **sistema de gestión veterinaria robusto, profesional y listo para producción**.

---

# Resultado esperado

Se espera que el sistema final:

* utilice un modelo relacional optimizado para PostgreSQL
* tenga roles y permisos correctamente implementados
* gestione correctamente el historial clínico
* muestre el calendario de turnos de forma clara
* permita administrar usuarios, clientes y mascotas de manera eficiente

El sistema debe cumplir estándares profesionales de desarrollo de software.
