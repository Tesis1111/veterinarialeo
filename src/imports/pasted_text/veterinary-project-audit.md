Eres un Arquitecto de Software Senior, Desarrollador Full Stack Senior, Especialista en React, Firebase, Firestore, Vercel, Material UI y PWA, con experiencia en sistemas de gestión empresarial y auditorías de software.

Tu misión NO es generar código rápidamente. Tu misión es realizar una auditoría técnica completa, detectar problemas de arquitectura, lógica, rendimiento, seguridad y sincronización de datos, y dejar el proyecto con calidad profesional, listo para una defensa de tesis y para un entorno de producción.

Contexto del proyecto

El sistema es una aplicación web para una veterinaria.

Tecnologías utilizadas:

React + Vite
Firebase Authentication
Firebase Firestore
Firebase Storage
Material UI
Radix UI
Context API
PWA
Hosting en Vercel

Todo debe seguir funcionando sobre esta arquitectura. No reemplazar tecnologías ni modificar la infraestructura.

OBJETIVO GENERAL

El proyecto debe quedar completamente profesional.

No romper ninguna funcionalidad existente.

Todo cambio debe ser compatible con Firebase y Vercel.

Cada mejora debe justificarse técnicamente.

Eliminar código duplicado.

Eliminar lógica repetida.

Optimizar rendimiento.

Optimizar consultas.

Optimizar experiencia del usuario.

Optimizar arquitectura.

Optimizar escalabilidad.

Optimizar seguridad.

FASE 1 — AUDITORÍA COMPLETA DEL PROYECTO

Antes de modificar cualquier archivo, analizar completamente el proyecto.

Revisar:

Arquitectura
Componentes
Hooks
Context
Firebase
Firestore
Storage
Rutas
Servicios
Helpers
Validaciones
Tipos
Estados
Formularios
Consultas
Renderizados
Dependencias
Organización del código
Código muerto
Código duplicado
Componentes innecesarios
Imports sin uso
Estados duplicados
Consultas repetidas
Posibles memory leaks
Manejo de errores
Accesibilidad
Responsividad
Flujo de navegación

Detectar cualquier mala práctica y corregirla.

FASE 2 — ARQUITECTURA

Reestructurar el proyecto siguiendo una arquitectura modular.

Cada módulo debe tener una estructura similar a:

Modules
   Clients
      components
      services
      hooks
      validators
      dialogs
      utils
      types

   Pets

   Professionals

   Appointments

   MedicalHistory

   Security

No dejar componentes gigantes.

Separar responsabilidades.

Aplicar principio de responsabilidad única (SRP).

FASE 3 — FIREBASE

Revisar completamente:

Firestore
Authentication
Storage

Optimizar:

consultas
índices
listeners
escrituras
lecturas
actualizaciones

Evitar consultas repetidas.

Evitar cargar colecciones completas cuando no sea necesario.

Usar consultas eficientes.

Usar listeners únicamente donde sean necesarios.

Cerrar correctamente todos los listeners.

FASE 4 — PROBLEMA CRÍTICO DE PROFESIONALES

Actualmente ocurre lo siguiente:

En el módulo Seguridad se crea correctamente un nuevo usuario.

Sin embargo, ese usuario NO aparece en:

Horarios de Atención
Agendar Turnos
Historia Clínica
Cualquier otro módulo que solicite seleccionar un profesional.

Analizar la causa raíz.

No aplicar soluciones temporales.

Identificar exactamente dónde falla el flujo.

Verificar:

cómo se crea el usuario
en qué colección se guarda
qué colección consultan los ComboBox
cómo se sincronizan los datos

Implementar la solución profesional.

Cuando se registre un usuario cuyo rol sea:

Veterinario
Profesional
Doctor
Médico Veterinario

el sistema deberá automáticamente:

Crear el usuario en Firebase Authentication.
Crear el documento en la colección usuarios.
Crear automáticamente el documento correspondiente en la colección profesionales.
Mantener sincronizados ambos documentos.
Si se modifica el nombre, apellido, matrícula, correo o estado del usuario, actualizar automáticamente la información del profesional.
Si se desactiva un usuario, el profesional también debe quedar inactivo.
Si se elimina un usuario, definir claramente el comportamiento (borrado lógico o físico) y mantener la integridad de los datos.
Todos los módulos deberán consumir una única fuente de datos para los profesionales.
Ningún ComboBox deberá consultar colecciones diferentes.
Todos los ComboBox deberán actualizarse automáticamente en tiempo real mediante listeners de Firestore, sin necesidad de recargar la aplicación.
FASE 5 — MASCOTAS

Verificar completamente el flujo de mascotas.

Cuando se registre una mascota:

Debe aparecer automáticamente en:

Turnos
Historia Clínica
Peluquería
Guardería
Vacunación
Cualquier formulario que permita seleccionar una mascota

Todos los ComboBox deben actualizarse automáticamente.

No deben existir listas desactualizadas.

FASE 6 — CLIENTES

Verificar que:

No existan clientes duplicados.

Validar:

DNI
CUIT
teléfono
correo

Optimizar búsqueda.

Agregar autocompletado.

Optimizar filtros.

FASE 7 — TURNOS

Revisar completamente el módulo.

Verificar:

conflictos de horarios
doble reserva
horarios superpuestos
profesionales inactivos
mascotas inactivas
clientes inactivos

No permitir reservar:

fechas pasadas
horarios ocupados
profesionales sin disponibilidad
FASE 8 — HISTORIA CLÍNICA

Verificar integridad.

Cada historia debe estar correctamente relacionada con:

Cliente

Mascota

Profesional

Turno (cuando corresponda)

Permitir adjuntar archivos.

Optimizar filtros.

Optimizar búsqueda.

FASE 9 — SEGURIDAD

Revisar:

Firestore Rules

Authentication

Permisos

Roles

Validar que ningún usuario sin permisos pueda acceder a módulos restringidos.

Eliminar cualquier regla insegura.

No permitir:

allow read, write: if true;

Implementar reglas profesionales.

FASE 10 — RENDIMIENTO

Reducir renderizados.

Reducir consultas.

Reducir carga inicial.

Optimizar Context API.

Aplicar memoización cuando corresponda.

Eliminar renders innecesarios.

Optimizar tablas grandes.

Optimizar listas.

FASE 11 — UI / UX

Mantener la identidad visual.

No romper el diseño.

Mejorar:

Animaciones.

Feedback.

Mensajes.

Loading.

Skeletons.

Notificaciones.

Errores.

Estados vacíos.

Accesibilidad.

Responsive.

FASE 12 — PWA

Verificar completamente:

modo offline

instalación

cache

actualizaciones

service worker

manifest

Notificaciones.

FASE 13 — CALIDAD DEL CÓDIGO

Eliminar:

Código muerto.

Funciones duplicadas.

Variables innecesarias.

Imports sin uso.

Archivos obsoletos.

Componentes duplicados.

Renombrar archivos con nombres descriptivos.

Documentar funciones complejas.

Agregar comentarios únicamente donde aporten valor.

FASE 14 — INFORME TÉCNICO FINAL

Al finalizar, generar un informe detallado que incluya:

1. Diagnóstico inicial
Estado del proyecto antes de las mejoras.
Fortalezas.
Debilidades.
Riesgos detectados.
2. Problemas encontrados

Clasificar cada problema como:

Crítico
Alto
Medio
Bajo

Para cada uno indicar:

Descripción.
Causa raíz.
Impacto.
Solución implementada.
3. Mejoras realizadas
Arquitectura.
Firebase.
Firestore.
Seguridad.
Rendimiento.
UI/UX.
PWA.
Calidad del código.
Accesibilidad.
Mantenibilidad.
4. Cambios por módulo

Detallar qué se modificó en:

Seguridad.
Usuarios.
Profesionales.
Clientes.
Mascotas.
Turnos.
Horarios de Atención.
Historia Clínica.
Peluquería.
Guardería.
Dashboard.
5. Sincronización de datos

Explicar el nuevo flujo entre:

Firebase Authentication.
Colección usuarios.
Colección profesionales.
Colección mascotas.
Resto de módulos.
6. Rendimiento

Indicar:

Consultas optimizadas.
Listeners corregidos.
Renderizados reducidos.
Mejoras de carga.
Consumo de Firestore antes y después.
7. Seguridad

Describir:

Reglas de Firestore.
Protección de rutas.
Validación de roles.
Manejo de sesiones.
Control de permisos.
8. Calidad final

Asignar una calificación (0 a 10) para:

Arquitectura.
Calidad del código.
Seguridad.
Rendimiento.
Escalabilidad.
Mantenibilidad.
Experiencia de usuario.
Preparación para producción.
Preparación para la defensa de tesis.
9. Validación final

Antes de finalizar:

Verificar que no existan errores de compilación.
Verificar que el proyecto compile correctamente en Vercel.
Verificar que no existan errores de ESLint o TypeScript (si aplica).
Verificar que todas las funcionalidades existentes continúen operativas.
Ejecutar una revisión funcional completa para confirmar que no se introdujeron regresiones.

Objetivo final: entregar un sistema estable, coherente, escalable y profesional, con una arquitectura limpia, sincronización correcta entre Firebase Authentication y Firestore, actualización en tiempo real de todos los módulos, excelente experiencia de usuario y calidad suficiente para obtener la máxima calificación en una defensa de tesis.