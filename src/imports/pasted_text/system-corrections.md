# Correcciones obligatorias del sistema

Realizar las siguientes modificaciones respetando la arquitectura actual del proyecto. **No modificar la conexión existente con Firebase ni el despliegue en Vercel.** Todas las correcciones deben integrarse sobre la estructura actual del sistema sin eliminar funcionalidades ya implementadas.

## 1. Corrección del módulo de Usuarios / Profesionales

Actualmente el sistema no permite crear correctamente un nuevo usuario/profesional.

### Debe corregirse para que:

* El alta de un usuario funcione correctamente y almacene la información en Firebase.
* Cada usuario creado quede registrado permanentemente en la base de datos.
* Cada usuario pueda desempeñarse como profesional del sistema.
* No utilizar listas estáticas ni datos hardcodeados.
* Toda la información debe obtenerse dinámicamente desde Firebase.

Una vez creado un usuario, deberá aparecer automáticamente en todos los módulos donde se solicite seleccionar un usuario o profesional, por ejemplo:

* Gestión de Turnos.
* Historia Clínica.
* Alertas.
* Auditoría.
* Reportes.
* Cualquier otro formulario que solicite un profesional.

Todos estos ComboBox deberán consultar la colección correspondiente en Firebase y actualizarse automáticamente cuando se agregue un nuevo profesional.

---

## 2. Perfil Profesional

Dentro del alta de usuario existe la sección "Perfil Profesional".

Actualmente el campo Profesión no debe ser un texto libre.

Modificarlo para que sea un ComboBox.

Las profesiones deberán administrarse desde el módulo Parámetros.

Crear la parametrización correspondiente.

Debe existir una nueva categoría de parámetros llamada:

* Profesiones

Desde allí el administrador podrá:

* Agregar profesiones.
* Editarlas.
* Eliminarlas.
* Activarlas o desactivarlas.

El ComboBox de Profesión deberá cargarse únicamente desde Firebase utilizando esos parámetros.

No debe existir ninguna lista fija dentro del código.

---

## 3. Corrección del error de Historia Clínica

Actualmente, al seleccionar un cliente y una mascota e intentar agregar un nuevo registro clínico aparece el siguiente error:

doctors is not defined

Este error debe corregirse.

Analizar la causa.

Probablemente la variable "doctors" no está inicializada o está intentando consumir una colección inexistente.

La solución deberá:

* Obtener correctamente la lista de profesionales desde Firebase.
* Evitar referencias a variables inexistentes.
* Manejar correctamente estados vacíos.
* Evitar errores cuando todavía no existan profesionales registrados.

La pantalla no debe romperse bajo ninguna circunstancia.

Si no existen profesionales registrados, deberá mostrarse un mensaje amigable indicando que primero debe registrarse un profesional.

---

## 4. Relación entre Usuarios, Profesionales y Mascotas

Revisar completamente las relaciones entre:

* Clientes
* Mascotas
* Usuarios
* Profesionales
* Turnos
* Historia Clínica

Corregir cualquier relación incorrecta.

Todo el sistema debe trabajar utilizando los IDs almacenados en Firebase y no textos duplicados.

Cada turno deberá almacenar correctamente:

* ID del Cliente.
* ID de la Mascota.
* ID del Profesional.

Cada registro clínico deberá almacenar:

* ID de la Mascota.
* ID del Profesional.
* Fecha.
* Tipo de evento.
* Observaciones.
* Archivos asociados (si existen).

Las consultas deberán mostrar los nombres correspondientes resolviendo esas relaciones desde Firebase.

---

## 5. Gestión de Turnos

Revisar completamente el módulo.

Corregir la relación entre:

Cliente → Mascota → Profesional.

El flujo debe ser:

* Seleccionar Cliente.
* Mostrar únicamente las mascotas pertenecientes a ese cliente.
* Seleccionar Profesional desde Firebase.
* Registrar el turno.

No deben existir inconsistencias de datos.

---

## 6. Sincronización completa del sistema

Cada vez que se agregue un nuevo:

* Cliente
* Mascota
* Usuario
* Profesional
* Profesión

El dato deberá aparecer automáticamente en todos los módulos correspondientes sin necesidad de modificar código.

Toda la aplicación debe consumir información directamente desde Firebase.

No deben existir arreglos locales con datos fijos.

---

## 7. Reportes

Actualizar el módulo Reportes para que utilice las relaciones reales de Firebase.

Los reportes deberán poder consultar correctamente:

* Clientes.
* Mascotas.
* Profesionales.
* Usuarios.
* Turnos.
* Historia Clínica.

No utilizar datos duplicados.

Toda la información deberá provenir de las colecciones existentes.

---

## 8. Buenas prácticas

Durante todas las correcciones:

* No romper ninguna funcionalidad existente.
* No modificar la configuración de Firebase.
* No modificar la configuración de Vercel.
* Mantener la estructura actual del proyecto.
* Reutilizar componentes existentes siempre que sea posible.
* Evitar código duplicado.
* Centralizar las consultas a Firebase.
* Agregar manejo de errores y validaciones.
* Mostrar mensajes claros al usuario cuando ocurra un error.
* Mantener compatibilidad con la versión actual del sistema.

## Objetivo final

Al finalizar estas correcciones:

* El alta de usuarios/profesionales deberá funcionar correctamente.
* Los profesionales deberán obtenerse siempre desde Firebase.
* Las profesiones deberán administrarse desde Parámetros.
* El error "doctors is not defined" deberá quedar completamente resuelto.
* Los ComboBox deberán actualizarse automáticamente con la información almacenada en Firebase.
* Las relaciones entre Clientes, Mascotas, Profesionales, Turnos e Historia Clínica deberán quedar correctamente implementadas mediante IDs.
* El módulo Reportes deberá consumir la misma información y relaciones que utiliza el resto del sistema.
* Todo el sistema deberá mantener la compatibilidad con Firebase y Vercel sin alterar la arquitectura existente.
