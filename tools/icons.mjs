#!/usr/bin/env node
/**
 * Generates the PWA icon PNGs with no image library at all — just Node's zlib.
 * The artwork mirrors reader/icon.svg: a gradient rounded square with a
 * "C#" monogram, so the vector source and the raster icons always agree.
 *
 * Usage:  node tools/icons.mjs
 *
 * Rendered at 4x4 supersampling so the edges are genuinely smooth.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/* --------------------------------------------------------------------- png */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([length, typeBuf, data, crc]);
}

/** @param {number} width @param {Uint8Array} rgba length w*h*4 */
function encodePNG(width, height, rgba) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------------------------------------------------------------- geometry */

const SIZE = 64; // design space, matches the SVG viewBox
const CORNER = 14;

const lerp = (a, b, t) => a + (b - a) * t;
const mix = (c1, c2, t) => [
  lerp(c1[0], c2[0], t),
  lerp(c1[1], c2[1], t),
  lerp(c1[2], c2[2], t),
];

const C1 = [0x63, 0x66, 0xf1];
const C2 = [0xa8, 0x55, 0xf7];
const C3 = [0xec, 0x48, 0x99];

function gradientAt(u, v) {
  const t = Math.min(1, Math.max(0, (u + v) / 2));
  return t <= 0.58 ? mix(C1, C2, t / 0.58) : mix(C2, C3, (t - 0.58) / 0.42);
}

function insideRoundedSquare(x, y, corner) {
  const half = SIZE / 2;
  const inner = half - corner;
  const dx = Math.max(Math.abs(x - half) - inner, 0);
  const dy = Math.max(Math.abs(y - half) - inner, 0);
  if (corner <= 0) return dx === 0 && dy === 0;
  return dx * dx + dy * dy <= corner * corner;
}

/* The "C" is an annulus with the right side open; the "#" is four bars. */
const C_CENTER = [23.72, 32];
const C_MID = 12;
const C_STROKE = 2.3;
const C_GAP = (79.5 * Math.PI) / 180;
const C_CAPS = [
  [C_CENTER[0] + C_MID * Math.cos(-C_GAP), C_CENTER[1] + C_MID * Math.sin(-C_GAP)],
  [C_CENTER[0] + C_MID * Math.cos(C_GAP), C_CENTER[1] + C_MID * Math.sin(C_GAP)],
];

const BARS = [
  { x: 35.6, y: 21, w: 4.2, h: 22 },
  { x: 45.6, y: 21, w: 4.2, h: 22 },
  { x: 31.1, y: 26.4, w: 23, h: 4.2 },
  { x: 31.1, y: 35.2, w: 23, h: 4.2 },
];

function insideBars(x, y, r = 1) {
  for (const b of BARS) {
    const cx = Math.min(Math.max(x, b.x + r), b.x + b.w - r);
    const cy = Math.min(Math.max(y, b.y + r), b.y + b.h - r);
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy <= r * r) return true;
  }
  return false;
}

function insideGlyph(x, y) {
  if (insideBars(x, y)) return true;

  const dx = x - C_CENTER[0];
  const dy = y - C_CENTER[1];
  const dist = Math.hypot(dx, dy);
  const outer = C_MID + C_STROKE;
  const inner = C_MID - C_STROKE;

  if (dist >= inner && dist <= outer) {
    const angle = Math.atan2(dy, dx);
    if (Math.abs(angle) > C_GAP) return true;
  }

  for (const [cx, cy] of C_CAPS) {
    if (Math.hypot(x - cx, y - cy) <= C_STROKE) return true;
  }
  return false;
}

/* ----------------------------------------------------------------- render */

function render(size, { corner = CORNER, glyphScale = 1 } = {}) {
  const out = new Uint8Array(size * size * 4);
  const ss = 4; // supersampling factor per axis
  const step = 1 / ss;
  const scale = SIZE / size;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = (px + (sx + 0.5) * step) * scale;
          const y = (py + (sy + 0.5) * step) * scale;

          const gx = glyphScale === 1 ? x : SIZE / 2 + (x - SIZE / 2) / glyphScale;
          const gy = glyphScale === 1 ? y : SIZE / 2 + (y - SIZE / 2) / glyphScale;

          if (!insideRoundedSquare(x, y, corner)) continue;

          let [cr, cg, cb] = gradientAt(x / SIZE, y / SIZE);

          // Soft highlight across the top third, matching the SVG sheen.
          const sheen = Math.max(0, 0.26 * (1 - y / SIZE / 0.6));
          if (sheen > 0) {
            cr = lerp(cr, 255, sheen);
            cg = lerp(cg, 255, sheen);
            cb = lerp(cb, 255, sheen);
          }

          if (insideGlyph(gx, gy)) {
            cr = 255;
            cg = 255;
            cb = 255;
          }

          r += cr;
          g += cg;
          b += cb;
          a += 1;
        }
      }

      const total = ss * ss;
      const alpha = a / total;
      const index = (py * size + px) * 4;
      if (alpha > 0) {
        out[index] = Math.round(r / a);
        out[index + 1] = Math.round(g / a);
        out[index + 2] = Math.round(b / a);
        out[index + 3] = Math.round(alpha * 255);
      }
    }
  }

  return encodePNG(size, size, out);
}

/* ------------------------------------------------------------------- main */

const target = path.resolve(process.cwd(), 'reader/icons');
fs.mkdirSync(target, { recursive: true });

const jobs = [
  { file: 'icon-192.png', size: 192, options: {} },
  { file: 'icon-512.png', size: 512, options: {} },
  { file: 'icon-maskable-512.png', size: 512, options: { corner: 0, glyphScale: 0.68 } },
];

for (const job of jobs) {
  const png = render(job.size, job.options);
  fs.writeFileSync(path.join(target, job.file), png);
  console.log(`✓ reader/icons/${job.file}  (${(png.length / 1024).toFixed(1)} KB)`);
}
