Prompt para Claude Code / Agente de desarrollo — Correcciones sistema "VeterinariaLeo"
Contexto: repositorio Tesis1111/veterinarialeo (React + Vite + TypeScript + Firebase/Firestore). Actúa como desarrollador senior full‑stack. Antes de tocar código, clona el repo, instala dependencias y corré la app localmente para reproducir cada bug. Trabajá una tarea a la vez, commiteá por separado y verificá en el navegador (consola sin errores) antes de pasar a la siguiente.
Diagnóstico previo (ya confirmado en el código, usalo como punto de partida)
    • El proyecto tiene una capa de servicios "real" contra Firestore (src/app/services/*.ts: clienteService, mascotaService, doctorService, usuarioService, horarioService, parametrosService, turnoService, historialService), pero conviven con datos estáticos en src/app/data/mockData.ts y src/app/data/speciesAndBreeds.ts, y con fallback a localStorage dentro de casi todos los servicios y módulos (AppointmentsModule.tsx, ClientsModule.tsx, PetsModuleEnhanced.tsx, MedicalHistoryModuleNew.tsx, UsersModule.tsx, BusinessHoursModule.tsx, ReportsModule.tsx, Dashboard.tsx, doctorService.ts).
    • Los servicios de parámetros (parametrosService.ts) tienen constantes SEED_ESPECIES, SEED_RAZAS, SEED_TIPOS_EVENTO, SEED_VACUNAS que se usan como semilla cuando no hay Firebase configurado.
    • Varias queries de Firestore usan where("deleted", "==", false) o where("available", "==", true): si un documento no tiene ese campo seteado explícitamente, Firestore lo excluye del resultado silenciosamente (no tira error). Es una causa típica de "el cliente/doctor recién creado no aparece en los combos".
    • horarioService.ts no tiene una función de borrado real, solo desactivarHorario() (soft delete). Si la UI de "Seguridad" espera poder eliminar horarios definitivamente, esa función no existe.
    • En UsersModule.tsx el campo domicilio es un <input> de texto libre sin ningún validador de formato (a diferencia de email, que sí es type="email"), por eso se puede cargar cualquier cosa (incluido un email) en ese campo.
    • En ParametrosModule.tsx los labels de descripción de especie/raza dicen "(opcional)" y el estado inicial es description: "", pero hay que confirmar en runtime si algo (validación de formulario, regla de Firestore, o un required en el HTML) está bloqueando el submit cuando el campo queda vacío.
Tareas a resolver
1. Eliminar datos estáticos/precargados y unificar la fuente de datos en Firebase
    • Eliminar (o vaciar completamente) src/app/data/mockData.ts y src/app/data/speciesAndBreeds.ts, y quitar todos los imports de initialClients, initialPets, initialAppointments, initialDoctors/doctors, initialMedicalRecords y de speciesAndBreeds en: AppointmentsModule.tsx, ClientsModule.tsx, PetsModuleEnhanced.tsx, MedicalHistoryModuleNew.tsx, UsersModule.tsx, BusinessHoursModule.tsx, ReportsModule.tsx, Dashboard.tsx, doctorService.ts.
    • Eliminar todo el código de fallback a localStorage como fuente de datos (localStorage.getItem("veterinaria_*"), lsLoad/lsSave en los services) en los flujos normales de la app. Cada pantalla debe leer y escribir exclusivamente contra Firestore mediante los services existentes (clienteService, mascotaService, doctorService, usuarioService, horarioService, parametrosService, turnoService, historialService).
    • Las constantes SEED_* de parametrosService.ts deben eliminarse (no usarlas como fallback ni para poblar Firestore automáticamente). Si Firestore está vacío, la UI debe mostrar un estado vacío ("No hay especies cargadas todavía") en vez de datos de ejemplo.
    • Revisar src/app/firebase/config.ts y la variable FIREBASE_CONFIGURED: documentar en env.example/README qué variables de entorno son obligatorias, y hacer que si Firebase no está configurado la app muestre un error claro en vez de degradar silenciosamente a localStorage.
    • Buscar y eliminar cualquier otro arreglo hardcodeado que quede suelto en componentes (buscar literalmente const initial, mockData, SEED_, localStorage.getItem en todo src/app) y confirmar que no queda ninguna referencia.
2. Combos, selects y listas alimentados solo por Firestore
    • Auditar cada <Select>/<SelectContent>/combobox del sistema (clientes, mascotas, doctores/profesionales, especies, razas, tipos de evento, vacunas, horarios) y confirmar que su state se llena únicamente vía onSnapshot/traerX() contra Firestore, sin arrays estáticos de respaldo.
    • Corregir las queries con filtros por campos booleanos que puedan no existir en documentos viejos o mal creados (where("deleted","==",false), where("available","==",true), etc.): asegurar que todo flujo de creación (registrarCliente, registrarMascota, registrarDoctor/perfil de doctor, etc.) setee siempre esos campos, y considerar una migración/normalización de documentos existentes que no los tengan, o cambiar la estrategia de filtrado (por ejemplo filtrar client-side después de traer todo) para que un documento sin el campo no quede invisible.
3. Arreglar la pantalla en blanco al entrar al módulo "Turnos" (AppointmentsModule.tsx)
    • Reproducir el error abriendo el módulo con la consola del navegador abierta y capturar el stack trace exacto (React probablemente está tirando una excepción no controlada durante el render o en el useEffect de carga inicial).
    • Puntos a revisar puntualmente en AppointmentsModule.tsx:
        ◦ El useEffect que decide entre onSnapshot/Firestore y fallback a localStorage (usa FIREBASE_CONFIGURED) — al eliminar el fallback (tarea 1), verificar que no queden variables/hooks huérfanos que rompan el build o el render.
        ◦ Los format(new Date(apt.date), ...), format(new Date(apt.dateFrom), ...) de date-fns: si apt.date, apt.dateFrom o apt.dateTo llegan undefined/null/con formato inválido desde Firestore, date-fns puede lanzar RangeError: Invalid time value y tirar abajo el árbol de React sin manejo de errores. Agregar validaciones/guards antes de cada format(...) (o una función safeFormat que devuelva un placeholder si la fecha es inválida).
        ◦ getAvailableTimeSlotsForDoctor hace schedule.startTime.split(':'): si algún horario en Firestore no tiene startTime/endTime bien formados, esto rompe. Agregar validación defensiva.
        ◦ Confirmar que las colecciones turnos, doctores, clientes, mascotas existen y tienen el shape esperado por toAppointment()/los mapeos manuales dentro del onSnapshot.
    • Agregar un ErrorBoundary general (envolviendo el router de módulos en App.tsx/Navigation.tsx) que muestre un mensaje de error visible en vez de una pantalla en blanco, para que futuros errores similares sean diagnosticables por el usuario final.
4. Todo cliente registrado debe aparecer en los ComboBox de "Turnos" e "Historial Clínico"
    • Confirmar que ClientsModule.tsx (alta de cliente) escribe en la misma colección (clientes) y con el mismo shape de campos (incluyendo deleted: false) que leen AppointmentsModule.tsx (a través de traerClientes()/onSnapshot en clientes) y MedicalHistoryModuleNew.tsx.
    • Verificar que las suscripciones onSnapshot de clientes en AppointmentsModule.tsx y MedicalHistoryModuleNew.tsx sean realmente en tiempo real (sin necesidad de recargar la página) y que el combo de selección de cliente/mascota se re-renderice cuando cambia el state.
    • Mismo chequeo para mascotas: una mascota nueva cargada en el módulo de Mascotas debe reflejarse automáticamente en los combos de Turnos e Historial Clínico (dependen del clientId seleccionado vía getPetsByClient).
    • Escribir una prueba manual: crear un cliente nuevo → sin recargar la página, abrir Turnos y Historial Clínico y confirmar que aparece en ambos combos.
5. Módulo de Seguridad (UsersModule.tsx, BusinessHoursModule.tsx, usuarioService.ts, horarioService.ts)
    • Alta de usuarios: revisar el flujo completo de registrarUsuario/asignarRoles/asignarPermisos en usuarioService.ts y el formulario en UsersModule.tsx. Confirmar que: se crea correctamente el usuario en Firestore (y en Firebase Auth si corresponde), que validarUnicidadUsuario funciona bien contra Firestore (no contra localStorage), y que los roles/permisos asignados se guardan y se reflejan de inmediato en la tabla de usuarios.
    • Horarios: implementar una función real de eliminación (eliminarHorario) en horarioService.ts (borrado definitivo del documento, o dejar explícito en la UI que es un soft-delete/desactivación si esa es la decisión de negocio, pero que el botón y el texto sean coherentes con lo que realmente hace). Confirmar que crear un horario nuevo dispara la actualización de la lista sin recargar, y que validarHorario/validarDisponibilidadProfesional/validarDuplicados evitan solapamientos.
    • Validación de formato por campo: agregar validación real a cada campo del formulario de usuario, no solo al email:
        ◦ email: validar formato de correo (regex o librería) además del type="email" del input.
        ◦ domicilio: debe aceptar solo texto de dirección (bloquear que se ingrese un formato de email o un valor que no tenga sentido como domicilio); agregar una validación de "no es un email" y longitud mínima/máxima razonable.
        ◦ phone/teléfono: validar formato numérico/telefónico.
        ◦ username: validar caracteres permitidos (sin espacios, sin caracteres especiales problemáticos).
        ◦ licenseNumber/matrícula (si aplica a doctores): validar formato esperado.
        ◦ Mostrar mensajes de error de validación por campo (no solo un toast genérico al final), idealmente con feedback inline antes del submit.
6. "Parámetros" → alta de especie/raza solo debe pedir nombre (obligatorio) y descripción (opcional real)
    • En ParametrosModule.tsx, revisar el diálogo de alta/edición de especie y de raza: confirmar en el navegador si el submit realmente se bloquea cuando "Descripción" queda vacío (a pesar de la etiqueta "(opcional)"). Si el bloqueo existe, puede estar en: un required en el <Textarea>/<Input>, una validación en el handler handleSaveEspecie/handleSaveRaza, o una regla de seguridad de Firestore (firestore.rules) que exija el campo description.
    • Corregir para que el único campo obligatorio sea name (ya está validado con if (!especieForm.name.trim())), y que description pueda guardarse como cadena vacía o no enviarse en absoluto (evitar mandar undefined a Firestore, que hoy es aceptable porque addDoc con description: "" es válido, pero confirmar que no se está mandando un objeto con description: undefined explícito, lo cual Firestore rechaza).
    • Revisar también el alta de "Vacunas" y "Tipos de Evento" en el mismo módulo por si tienen el mismo problema de campos supuestamente opcionales que en la práctica son obligatorios.
    • Revisar firestore.rules para confirmar que no exige description como campo requerido en las colecciones especies/razas.
Criterios de aceptación (checklist final)
    • 
      No queda ninguna referencia a mockData.ts, speciesAndBreeds.ts ni a constantes SEED_* en el código de producción; ambos archivos fueron eliminados o vaciados.
    • 
      No queda ningún localStorage.getItem/setItem usado como fuente de datos de negocio (solo se permite para preferencias de UI no críticas, si las hay).
    • 
      Todos los combos/selects de clientes, mascotas, doctores, especies, razas, tipos de evento y horarios se pueblan en tiempo real desde Firestore.
    • 
      El módulo "Turnos" abre sin pantalla en blanco y sin errores en consola, con datos reales o con un estado vacío claro si no hay turnos cargados.
    • 
      Un cliente nuevo aparece de inmediato (sin recargar) en los combos de Turnos e Historial Clínico.
    • 
      Se pueden crear y eliminar (o desactivar, si así se decide, mostrándolo claramente en la UI) usuarios y horarios desde el módulo de Seguridad.
    • 
      Cada campo de los formularios de Seguridad valida formato y muestra error específico si el dato no corresponde (por ejemplo, "domicilio" rechaza un email).
    • 
      En "Parámetros", el alta de especie/raza solo exige el nombre; la descripción puede quedar vacía sin bloquear el guardado.
    • 
      Se agregó un ErrorBoundary global que evita pantallas en blanco ante errores no controlados en cualquier módulo.

