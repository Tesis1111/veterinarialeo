#!/usr/bin/env node
/**
 * Migración de la colección `turnos` al shape canónico + backfill de `slots`.
 *
 * Qué hace (idempotente — se puede correr varias veces):
 *   1. BACKUP: exporta `turnos` y `slots` completos a ./backups/<timestamp>.json
 *   2. Normaliza shape: campos español → inglés
 *        clienteId→clientId, mascotaId→petId, fecha→date, hora→startTime,
 *        estado→status, notas→notes, creadoEn→createdAt
 *      y BORRA las claves españolas + serviceId (legado, duplicaba `type`).
 *   3. Normaliza estados inglés → español:
 *        scheduled→Programado, confirmed→Confirmado,
 *        completed→Completado, cancelled→Cancelado
 *   4. Repara endTime inválidos (p. ej. "9:75") recalculando startTime + 30 min.
 *   5. Agrega deleted:false donde falte.
 *   6. BACKFILL de `slots/{doctorId}_{YYYY-MM-DD}_{HH:mm}` para turnos vigentes
 *      (Programado/Confirmado, fecha >= hoy, con doctorId + startTime, no daycare).
 *      Reporta conflictos (dos turnos vigentes sobre el mismo slot) sin resolverlos.
 *
 * Uso:
 *   cd scripts && npm install
 *   node migrate-turnos.mjs --dry                 # solo reporta, no escribe
 *   node migrate-turnos.mjs                       # ejecuta (hace backup antes)
 *   node migrate-turnos.mjs --key ./mi-clave.json # ruta alternativa de la key
 *
 * Requiere la service account key de Firebase (Consola → Configuración del
 * proyecto → Cuentas de servicio → Generar nueva clave privada) guardada como
 * ./serviceAccountKey.json — NUNCA commitearla (está en .gitignore).
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const keyIdx = args.indexOf("--key");
const KEY_PATH = resolve(__dirname, keyIdx !== -1 ? args[keyIdx + 1] : "./serviceAccountKey.json");

if (!existsSync(KEY_PATH)) {
  console.error(`✖ No se encontró la service account key en: ${KEY_PATH}`);
  console.error("  Descargala desde la consola de Firebase y guardala ahí (no se commitea).");
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(KEY_PATH, "utf8"));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const { FieldValue, Timestamp } = admin.firestore;

const STATUS_MAP = {
  scheduled: "Programado",
  confirmed: "Confirmado",
  completed: "Completado",
  cancelled: "Cancelado",
  canceled: "Cancelado",
  programado: "Programado",
  confirmado: "Confirmado",
  completado: "Completado",
  cancelado: "Cancelado",
};
const VALID_STATUSES = ["Programado", "Confirmado", "Completado", "Cancelado"];
// español → inglés (la clave española se borra tras copiar)
const FIELD_MAP = {
  clienteId: "clientId",
  mascotaId: "petId",
  fecha: "date",
  hora: "startTime",
  estado: "status",
  notas: "notes",
  creadoEn: "createdAt",
};
const LEGACY_ONLY = ["serviceId"]; // duplicaba `type`; se elimina

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function fixTime(t) {
  // "9:75" → suma el desborde de minutos con acarreo; "9:30" → "09:30"
  if (typeof t !== "string" || !t.includes(":")) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const total = h * 60 + m;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function calcEndTime(start, durationMin = 30) {
  const [h, m] = start.split(":").map(Number);
  const t = h * 60 + m + durationMin;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function serialize(value) {
  if (value instanceof Timestamp) return { __ts: value.toDate().toISOString() };
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]));
  }
  return value;
}

async function backup() {
  const dir = resolve(__dirname, "backups");
  mkdirSync(dir, { recursive: true });
  const out = {};
  for (const col of ["turnos", "slots"]) {
    const snap = await db.collection(col).get();
    out[col] = snap.docs.map((d) => ({ id: d.id, data: serialize(d.data()) }));
  }
  const file = resolve(dir, `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`✔ Backup guardado en ${file} (turnos: ${out.turnos.length}, slots: ${out.slots.length})`);
}

async function main() {
  console.log(`${DRY ? "[DRY-RUN] " : ""}Proyecto: ${serviceAccount.project_id}`);
  if (!DRY) await backup();

  const snap = await db.collection("turnos").get();
  console.log(`Turnos totales: ${snap.size}`);

  const stats = { shape: 0, status: 0, endTime: 0, deleted: 0, untouched: 0 };
  let batch = db.batch();
  let ops = 0;
  const flush = async () => {
    if (ops > 0 && !DRY) await batch.commit();
    batch = db.batch();
    ops = 0;
  };

  const migrated = []; // docs post-migración, para el backfill de slots

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const update = {};
    let touched = false;

    // 2. Shape español → inglés (el valor inglés existente tiene prioridad)
    for (const [es, en] of Object.entries(FIELD_MAP)) {
      if (data[es] !== undefined) {
        if (data[en] === undefined) update[en] = data[es];
        update[es] = FieldValue.delete();
        touched = true;
      }
    }
    for (const legacy of LEGACY_ONLY) {
      if (data[legacy] !== undefined) {
        update[legacy] = FieldValue.delete();
        touched = true;
      }
    }
    if (touched) stats.shape++;

    // 3. Estados → español canónico
    const rawStatus = update.status ?? data.status ?? data.estado;
    const mapped = STATUS_MAP[String(rawStatus ?? "").toLowerCase()] ??
      (VALID_STATUSES.includes(rawStatus) ? rawStatus : null);
    const finalStatus = mapped ?? "Confirmado";
    if (finalStatus !== data.status) {
      update.status = finalStatus;
      stats.status++;
      touched = true;
    }

    // 4. endTime inválido → recalcular desde startTime
    const startTime = update.startTime ?? data.startTime ?? null;
    const endTime = data.endTime ?? null;
    if (startTime && TIME_RE.test(String(startTime)) && endTime && !TIME_RE.test(String(endTime))) {
      update.endTime = calcEndTime(startTime);
      stats.endTime++;
      touched = true;
    } else if (startTime && !TIME_RE.test(String(startTime))) {
      const fixed = fixTime(startTime);
      if (fixed) {
        update.startTime = fixed;
        update.endTime = calcEndTime(fixed);
        stats.endTime++;
        touched = true;
      }
    }

    // 5. deleted:false por defecto
    if (data.deleted === undefined) {
      update.deleted = false;
      stats.deleted++;
      touched = true;
    }

    if (touched) {
      if (DRY) {
        console.log(`  ~ ${docSnap.id}:`, Object.keys(update).join(", "));
      } else {
        batch.update(docSnap.ref, update);
        ops++;
        if (ops >= 400) await flush();
      }
    } else {
      stats.untouched++;
    }

    // Estado final del doc para el backfill
    migrated.push({
      id: docSnap.id,
      doctorId: data.doctorId ?? null,
      type: data.type ?? null,
      startTime: (update.startTime !== undefined && typeof update.startTime === "string")
        ? update.startTime
        : (typeof startTime === "string" ? startTime : null),
      status: finalStatus,
      date: (update.date ?? data.date) instanceof Timestamp
        ? (update.date ?? data.date).toDate()
        : new Date(update.date ?? data.date),
    });
  }
  await flush();

  console.log("— Normalización:", JSON.stringify(stats));

  // 6. Backfill de slots para turnos vigentes
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const vigentes = migrated.filter((t) =>
    ["Programado", "Confirmado"].includes(t.status) &&
    t.doctorId && t.startTime && t.type !== "daycare" &&
    t.date instanceof Date && !isNaN(t.date.getTime()) && t.date >= today
  );

  const existing = new Map();
  const slotsSnap = await db.collection("slots").get();
  for (const s of slotsSnap.docs) existing.set(s.id, s.data().turnoId);

  let created = 0;
  const conflicts = [];
  batch = db.batch();
  ops = 0;
  for (const t of vigentes) {
    const slotId = `${t.doctorId}_${toDateStr(t.date)}_${t.startTime}`;
    const owner = existing.get(slotId);
    if (owner === undefined) {
      if (DRY) {
        console.log(`  + slot ${slotId} → turno ${t.id}`);
      } else {
        batch.set(db.collection("slots").doc(slotId), {
          turnoId: t.id,
          doctorId: t.doctorId,
          date: t.date,
          startTime: t.startTime,
          createdBy: "migracion",
          createdAt: FieldValue.serverTimestamp(),
        });
        ops++;
        if (ops >= 400) await flush();
      }
      existing.set(slotId, t.id);
      created++;
    } else if (owner !== t.id) {
      conflicts.push({ slotId, existente: owner, duplicado: t.id });
    }
  }
  await flush();

  console.log(`— Slots vigentes: ${vigentes.length}, creados: ${created}`);
  if (conflicts.length) {
    console.warn(`⚠ CONFLICTOS de doble reserva ya existentes (resolver a mano):`);
    for (const c of conflicts) {
      console.warn(`   slot ${c.slotId}: turno ${c.existente} vs turno ${c.duplicado}`);
    }
  }
  console.log(DRY ? "DRY-RUN terminado (no se escribió nada)." : "✔ Migración completada.");
}

main().catch((e) => {
  console.error("✖ Migración falló:", e);
  process.exit(1);
});
