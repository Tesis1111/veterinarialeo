Eres un Arquitecto de Software Senior especializado en React, Firebase Authentication, Firestore, Material UI, Context API y Vercel.

Analiza completamente el proyecto antes de realizar cualquier modificación. No apliques soluciones temporales ni parches. Identifica la causa raíz de cada problema y realiza una implementación limpia, escalable y profesional, manteniendo la compatibilidad con todas las funcionalidades existentes.

OBJETIVO

Corregir inconsistencias funcionales entre los módulos de Seguridad, Profesionales, Auditoría, Horarios, Turnos e Historia Clínica, manteniendo una arquitectura limpia y una única fuente de datos para cada entidad.

1. AUDITORÍA DEL SISTEMA

Implementar un sistema de auditoría completo.

Toda acción realizada por cualquier usuario debe registrarse automáticamente en la colección de auditoría.

Registrar como mínimo:

Inicio de sesión.
Cierre de sesión.
Registro de usuarios.
Modificación de usuarios.
Activación e inactivación de usuarios.
Eliminación lógica de usuarios.
Registro de clientes.
Modificación de clientes.
Registro de mascotas.
Modificación de mascotas.
Eliminación lógica de mascotas.
Registro de profesionales.
Modificación de profesionales.
Registro de horarios de atención.
Modificación de horarios.
Eliminación de horarios.
Registro de turnos.
Reprogramación de turnos.
Cancelación de turnos.
Confirmación de turnos.
Registro de historias clínicas.
Modificación de historias clínicas.
Registro de vacunas.
Registro de peluquería.
Registro de guardería.
Cambios de parámetros del sistema.
Cualquier operación CRUD sobre entidades principales.

Cada registro de auditoría deberá almacenar:

Fecha y hora.
Usuario autenticado.
Nombre completo del usuario.
Rol.
Acción realizada.
Módulo.
Entidad afectada.
ID del registro.
Estado anterior (cuando corresponda).
Estado nuevo (cuando corresponda).
Dirección IP (si está disponible).
Navegador o dispositivo (si está disponible).

Toda operación debe quedar registrada automáticamente, sin depender de la interfaz de usuario.

2. MÓDULO SEGURIDAD

Eliminar completamente la pestaña "Horarios de Atención" del módulo Seguridad.

Los horarios deben administrarse únicamente desde su módulo específico.

Eliminar:

Menú.
Ruta.
Botones relacionados.
Accesos.
Componentes sin uso.
Imports innecesarios.

Verificar que no existan referencias rotas.

3. REGISTRO DE TURNOS

Eliminar completamente la pestaña "Notificaciones" del módulo Registrar Turnos.

Eliminar:

Componentes.
Estados.
Contextos.
Imports.
Botones.
Funciones relacionadas.

No dejar código muerto.

4. CORREGIR EL MODELO DE PROFESIONALES

Actualmente existe un error de diseño.

Hoy el sistema identifica a un profesional únicamente cuando el campo Rol es igual a Veterinario.

Este comportamiento es incorrecto.

Debe separarse completamente el concepto de:

Rol
Profesión
Rol

Define permisos dentro del sistema.

Ejemplos:

Administrador
Recepcionista
Profesional
Supervisor
Profesión

Define la actividad del usuario.

Ejemplos:

Veterinario
Cirujano Veterinario
Especialista en Felinos
Cardiólogo Veterinario
Peluquero
Bañador
Auxiliar
Técnico
Otra profesión creada desde Parámetros.

Estos conceptos no deben depender uno del otro.

5. NUEVO MODELO DE DATOS

Cada profesional debe almacenar como mínimo:

ID
Usuario asociado
Nombre
Apellido
Profesión
Matrícula
Especialidad
Estado
Fecha de alta

El Rol únicamente controlará permisos.

La Profesión únicamente describirá la actividad.

Nunca utilizar el Rol para determinar quién aparece en los módulos funcionales.

6. CORREGIR TODOS LOS COMBOBOX

Actualmente los ComboBox obtienen profesionales filtrando:

Rol = Veterinario

Eso debe eliminarse.

Todos los ComboBox deberán consultar la entidad Profesionales.

Los módulos afectados incluyen como mínimo:

Horarios de Atención.
Agendar Turnos.
Historia Clínica.
Vacunación.
Peluquería.
Guardería.
Cualquier otro módulo que requiera seleccionar un profesional.

Los ComboBox deberán mostrar:

Nombre Completo – Profesión

Ejemplo:

Juan Pérez — Veterinario
María López — Cirujana Veterinaria
Carlos Gómez — Peluquero

No utilizar el Rol como criterio de filtrado.

7. REGISTRO DE PROFESIONALES

Cuando se registre un nuevo usuario que tenga permisos para trabajar como profesional:

Crear el usuario en Firebase Authentication.
Crear el documento correspondiente en Usuarios.
Crear automáticamente el documento correspondiente en Profesionales.
Asociar la Profesión seleccionada desde Parámetros.
Sincronizar automáticamente cualquier modificación posterior.

La Profesión deberá obtenerse exclusivamente desde la tabla o colección Parámetros.

Nunca codificar profesiones manualmente.

8. SINCRONIZACIÓN

Si cambia:

Nombre.
Apellido.
Profesión.
Estado.
Matrícula.

Actualizar automáticamente todos los módulos que utilizan esa información.

Los ComboBox deberán reflejar el cambio inmediatamente mediante listeners de Firestore, sin necesidad de recargar la aplicación.

9. REVISIÓN GENERAL

Realizar una búsqueda global del proyecto para identificar cualquier lugar donde se utilice:

rol == "Veterinario"

o cualquier lógica equivalente para identificar profesionales.

Reemplazar esa lógica por consultas basadas en la entidad Profesionales.

No dejar dependencias ocultas ni filtros heredados.

10. VALIDACIÓN FINAL

Antes de finalizar, comprobar que:

Todos los registros CRUD generan auditoría.
La pestaña Horarios de Atención ya no existe dentro de Seguridad.
La pestaña Notificaciones ya no existe en Registrar Turnos.
Un usuario con rol Profesional puede tener cualquier profesión definida en Parámetros.
Los profesionales aparecen correctamente en todos los ComboBox sin depender del rol.
Los ComboBox muestran Nombre Completo – Profesión.
Los cambios se sincronizan automáticamente en toda la aplicación.
No existen errores de compilación, advertencias críticas ni regresiones funcionales.
El proyecto continúa siendo compatible con Firebase y Vercel.

Objetivo final: dejar el sistema con un modelo de datos consistente, donde los permisos dependan del Rol, las funciones laborales dependan de la Profesión, todos los eventos relevantes se registren en Auditoría y todos los módulos consuman una única fuente de datos para los profesionales, garantizando coherencia, escalabilidad y calidad profesional para una defensa de tesis.