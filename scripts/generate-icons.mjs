/**
 * Generates the Credyt PWA icon set as PNGs with no external dependencies.
 *
 * The brand mark (from src/components/Logo.tsx) is rasterized onto a 24-unit
 * design grid: mint ledger bars + a dark "coin" circle, on a green tile.
 *
 * Usage: node scripts/generate-icons.mjs
 */

import zlib from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

// ---- PNG encoder -----------------------------------------------------------

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
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePNG(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  const px = Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: none
    px.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- Rasterizer -----------------------------------------------------------

const GREEN = [22, 124, 90]; // #2D2445
const MINT = [221, 245, 234]; // #E8F6F1
const DARK = [15, 81, 50]; // #2D2445

const rect = (x0, y0, x1, y1) => (px, py) => px >= x0 && px <= x1 && py >= y0 && py <= y1;

const roundRect = (x0, y0, x1, y1, r) => (px, py) => {
  if (px < x0 || px > x1 || py < y0 || py > y1) return false;
  const cx0 = x0 + r, cx1 = x1 - r, cy0 = y0 + r, cy1 = y1 - r;
  if (px < cx0 && py < cy0) return (px - cx0) ** 2 + (py - cy0) ** 2 <= r * r;
  if (px > cx1 && py < cy0) return (px - cx1) ** 2 + (py - cy0) ** 2 <= r * r;
  if (px < cx0 && py > cy1) return (px - cx0) ** 2 + (py - cy1) ** 2 <= r * r;
  if (px > cx1 && py > cy1) return (px - cx1) ** 2 + (py - cy1) ** 2 <= r * r;
  return true;
};

const disk = (cx, cy, r) => (px, py) => (px - cx) ** 2 + (py - cy) ** 2 <= r * r;

/** Coverage-approximating ring: centre stroke at `midR` width `sw`. */
const ring = (cx, cy, midR, sw) => (px, py) => {
  const d = Math.hypot(px - cx, py - cy);
  return Math.abs(d - midR) <= sw / 2;
};

function drawShape(rgba, size, inside, color) {
  const samples = [1 / 6, 1 / 2, 5 / 6];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cov = 0;
      for (const sy of samples) {
        for (const sx of samples) {
          if (inside(x + sx, y + sy)) cov++;
        }
      }
      if (cov === 0) continue;
      const a = cov / 9;
      const i = (y * size + x) * 4;
      rgba[i] = rgba[i] * (1 - a) + color[0] * a;
      rgba[i + 1] = rgba[i + 1] * (1 - a) + color[1] * a;
      rgba[i + 2] = rgba[i + 2] * (1 - a) + color[2] * a;
      rgba[i + 3] = rgba[i + 3] * (1 - a) + 255 * a;
    }
  }
}

/**
 * Rasterizes the Credyt glyph onto `size`x`size` RGBA pixels.
 * `maskable` uses a full-bleed tile + tighter glyph so the favourite sits
 * safely inside the platform mask's 80% circle.
 */
function makeIcon(size, { maskable = false } = {}) {
  const rgba = new Uint8ClampedArray(size * size * 4);
  const pad = maskable ? size * 0.16 : size * 0.125;

  // Background tile
  if (maskable) {
    drawShape(rgba, size, rect(0, 0, size, size), GREEN);
  } else {
    drawShape(rgba, size, roundRect(0, 0, size, size, size * 0.22), GREEN);
  }

  // 24-unit design -> pixels
  const content = size - 2 * pad;
  const g = content / 24;
  const bboxW = 19; // design x: 3..22 (circle reaches 22)
  const bboxH = 17.4; // design y: 4..21.4
  const ox = pad + (content - bboxW * g) / 2;
  const oy = pad + (content - bboxH * g) / 2;
  const X = (u) => ox + (u - 3) * g;
  const Y = (v) => oy + (v - 4) * g;

  const bars = [
    [3, 4, 13, 3, 1.5],
    [3, 9, 9, 3, 1.5],
    [3, 14, 11, 3, 1.5],
    [3, 19, 7, 2.4, 1.2],
  ];
  for (const [ux, uy, uw, uh, ur] of bars) {
    drawShape(rgba, size, roundRect(X(ux), Y(uy), X(ux + uw), Y(uy + uh), ur * g), MINT);
  }

  // Coin: dark fill + mint ring (stroke straddles the radius)
  const cx = X(18.5), cy = Y(16.5);
  const cr = 3.5 * g;
  const csw = 1.2 * g;
  drawShape(rgba, size, disk(cx, cy, cr - csw), DARK);
  drawShape(rgba, size, ring(cx, cy, cr - csw / 2, csw), MINT);

  return encodePNG(size, rgba);
}

// ---- Output ---------------------------------------------------------------

/** Wraps N RGBA PNGs into a single multi-size ICO (icon directory + entries). */
function encodeICO(entries) {
  const dir = Buffer.alloc(6 + 16 * entries.length);
  dir.writeUInt16LE(0, 0); // reserved
  dir.writeUInt16LE(1, 2); // type: icon
  dir.writeUInt16LE(entries.length, 4);
  let offset = 6 + 16 * entries.length;
  entries.forEach(({ size, png }, i) => {
    const o = 6 + 16 * i;
    dir.writeUInt8(size >= 256 ? 0 : size, o); // width (0 = 256)
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1); // height
    dir.writeUInt8(0, o + 2); // palette count
    dir.writeUInt8(0, o + 3); // reserved
    dir.writeUInt16LE(1, o + 4); // colour planes
    dir.writeUInt16LE(32, o + 6); // bits per pixel
    dir.writeUInt32LE(png.length, o + 8); // bytes in resource
    dir.writeUInt32LE(offset, o + 12); // image offset
    offset += png.length;
  });
  return Buffer.concat([dir, ...entries.map((e) => e.png)]);
}

const files = [
  ["icon-192.png", 192, {}],
  ["icon-512.png", 512, {}],
  ["maskable-512.png", 512, { maskable: true }],
  ["apple-touch-icon.png", 180, {}],
];

mkdirSync(PUBLIC, { recursive: true });
for (const [name, size, opts] of files) {
  const png = makeIcon(size, opts);
  writeFileSync(resolve(PUBLIC, name), png);
  console.log(`${name.padEnd(20)} ${size}x${size}  ${(png.length / 1024).toFixed(1)} kB`);
}

// favicon.ico — multi-size, written over Next's default in src/app/
const favSizes = [16, 32, 48];
const ico = encodeICO(favSizes.map((size) => ({ size, png: makeIcon(size) })));
const faviconPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", "src", "app", "favicon.ico");
writeFileSync(faviconPath, ico);
console.log(`${"favicon.ico".padEnd(20)} ${favSizes.join("/")}   ${(ico.length / 1024).toFixed(1)} kB -> src/app/favicon.ico`);

console.log("Wrote icons to public/icons/");