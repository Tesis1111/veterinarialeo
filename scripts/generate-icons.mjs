#!/usr/bin/env node
/**
 * Genera los íconos PWA (huella blanca sobre fondo naranja #f97316) en
 * src/app/public/icons/. Sin dependencias: rasteriza círculos y codifica
 * PNG (RGBA, deflate) a mano.
 *
 * Uso: node scripts/generate-icons.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../src/app/public/icons");
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

const BG = [249, 115, 22];   // #f97316
const FG = [255, 255, 255];  // blanco

// ── Dibujo ────────────────────────────────────────────────────────────────
// Coordenadas normalizadas (0..1). Huella: pad principal + 4 dedos.
const ELLIPSES = [
  // [cx, cy, rx, ry]
  [0.50, 0.62, 0.170, 0.140],  // pad principal
  [0.32, 0.40, 0.075, 0.095],  // dedo izq
  [0.455, 0.30, 0.075, 0.095], // dedo centro-izq
  [0.60, 0.32, 0.075, 0.095],  // dedo centro-der
  [0.72, 0.44, 0.070, 0.088],  // dedo der
];
const CORNER_RADIUS = 0.18; // esquinas redondeadas del fondo

function inRoundedSquare(x, y, size) {
  const r = CORNER_RADIUS * size;
  const cx = Math.min(Math.max(x, r), size - r);
  const cy = Math.min(Math.max(y, r), size - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function inPaw(x, y, size) {
  const nx = x / size, ny = y / size;
  return ELLIPSES.some(([cx, cy, rx, ry]) =>
    ((nx - cx) / rx) ** 2 + ((ny - cy) / ry) ** 2 <= 1
  );
}

function render(size) {
  // 2x supersampling para bordes suaves
  const ss = 2;
  const big = size * ss;
  const raw = Buffer.alloc((big * 4 + 1) * big);
  // primero rasterizamos en un buffer simple RGBA
  const px = new Uint8Array(big * big * 4);
  for (let y = 0; y < big; y++) {
    for (let x = 0; x < big; x++) {
      const i = (y * big + x) * 4;
      if (!inRoundedSquare(x + 0.5, y + 0.5, big)) {
        px[i + 3] = 0; // transparente fuera del cuadrado redondeado
        continue;
      }
      const [r, g, b] = inPaw(x + 0.5, y + 0.5, big) ? FG : BG;
      px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
    }
  }
  // downsample a `size` promediando bloques ss×ss, con filtro 0 por scanline
  const out = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    out[y * (size * 4 + 1)] = 0; // filtro None
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let dy = 0; dy < ss; dy++) {
        for (let dx = 0; dx < ss; dx++) {
          const i = ((y * ss + dy) * big + (x * ss + dx)) * 4;
          r += px[i]; g += px[i + 1]; b += px[i + 2]; a += px[i + 3];
        }
      }
      const n = ss * ss;
      const o = y * (size * 4 + 1) + 1 + x * 4;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = a / n;
    }
  }
  return out;
}

// ── Codificación PNG ──────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, scanlines) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(scanlines, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Main ──────────────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const file = resolve(OUT_DIR, `icon-${size}x${size}.png`);
  writeFileSync(file, encodePng(size, render(size)));
  console.log(`✔ ${file}`);
}
console.log("Íconos generados.");
