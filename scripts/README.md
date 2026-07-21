# Scripts de administración

## migrate-turnos.mjs

Normaliza la colección `turnos` al shape canónico (campos en inglés, estados en
español), repara `endTime` inválidos y crea los locks de `slots/` para los
turnos vigentes. Hace backup completo antes de escribir. Idempotente.

### Requisitos

1. **Service account key** de Firebase:
   Consola de Firebase → ⚙ Configuración del proyecto → Cuentas de servicio →
   *Generar nueva clave privada*. Guardar el JSON como
   `scripts/serviceAccountKey.json`.

   ⚠ **NUNCA commitear esta clave** (ya está en `.gitignore`). Da acceso total
   al proyecto. Tampoco subirla a Vercel.

2. Instalar dependencias del script (aisladas del proyecto):

   ```bash
   cd scripts
   npm install
   ```

### Uso

```bash
# 1. Simulación: reporta qué cambiaría, no escribe nada
node migrate-turnos.mjs --dry

# 2. Ejecución real (hace backup en scripts/backups/ antes de escribir)
node migrate-turnos.mjs
```

### Orden de despliegue (importante)

1. `firebase deploy --only firestore:rules` (reglas con `slots/` ya agregadas)
2. `node migrate-turnos.mjs --dry` → revisar → `node migrate-turnos.mjs`
3. Deploy del código nuevo a Vercel
4. Re-correr `node migrate-turnos.mjs` una vez más (cubre turnos creados por
   clientes con el bundle viejo entre los pasos 2 y 3)

Si el reporte muestra `⚠ CONFLICTOS`, hay dos turnos vigentes reservando el
mismo horario del mismo profesional (dobles reservas previas a este fix):
cancelar/reprogramar uno de los dos a mano en la app.
