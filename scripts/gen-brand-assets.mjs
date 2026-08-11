/**
 * Brand asset generator for kompres.web.id
 * Concept: "Squeeze arrows" — two arrows compressing inward toward an image glyph.
 * Accent: indigo (#6366F1 → #4338CA).
 *
 * Outputs (into /public):
 *   logo.svg, logo.webp (512)
 *   favicon.ico (16/32/48, PNG-encoded)
 *   favicon-16x16.png, favicon-32x32.png, icon-192.png, icon-512.png, apple-touch-icon.png (180)
 *   og-image.png (1200x630)
 *
 * Run: node scripts/gen-brand-assets.mjs
 */
import sharp from "sharp";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.resolve(__dirname, "..", "public");

// ---- Master mark (512x512) -------------------------------------------------
const INDIGO_HI = "#6366F1";
const INDIGO_LO = "#4338CA";
const INK = "#312E81"; // deep indigo for image-glyph details

const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${INDIGO_HI}"/>
      <stop offset="1" stop-color="${INDIGO_LO}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <!-- left arrow pointing right (squeeze in) -->
  <path d="M104 208 L104 304 L212 256 Z" fill="#FFFFFF"/>
  <!-- right arrow pointing left (squeeze in) -->
  <path d="M408 208 L408 304 L300 256 Z" fill="#FFFFFF"/>
  <!-- center image thumbnail -->
  <rect x="216" y="216" width="80" height="80" rx="16" fill="#FFFFFF"/>
  <!-- sun -->
  <circle cx="278" cy="240" r="9" fill="${INK}"/>
  <!-- little landscape -->
  <path d="M222 292 L248 262 L266 280 L292 250 L292 292 Z" fill="${INK}"/>
</svg>`;

// ---- OG / social card (1200x630) ------------------------------------------
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#EEF2FF"/>
    </linearGradient>
    <radialGradient id="glow1" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${INDIGO_HI}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${INDIGO_HI}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${INDIGO_LO}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${INDIGO_LO}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#panel)"/>
  <circle cx="1040" cy="70" r="320" fill="url(#glow1)"/>
  <circle cx="120" cy="620" r="300" fill="url(#glow2)"/>

  <!-- logo mark, centered horizontally, scaled to 150px -->
  <g transform="translate(525,96) scale(0.29296875)">
    <rect width="512" height="512" rx="112" fill="url(#bg)"/>
    <path d="M104 208 L104 304 L212 256 Z" fill="#FFFFFF"/>
    <path d="M408 208 L408 304 L300 256 Z" fill="#FFFFFF"/>
    <rect x="216" y="216" width="80" height="80" rx="16" fill="#FFFFFF"/>
    <circle cx="278" cy="240" r="9" fill="${INK}"/>
    <path d="M222 292 L248 262 L266 280 L292 250 L292 292 Z" fill="${INK}"/>
  </g>

  <text x="600" y="402" text-anchor="middle"
        font-family="'Segoe UI', Arial, sans-serif" font-size="92" font-weight="800"
        fill="#1E1B4B" letter-spacing="-2">
    kompres<tspan fill="${INDIGO_LO}">.web.id</tspan>
  </text>

  <text x="600" y="470" text-anchor="middle"
        font-family="'Segoe UI', Arial, sans-serif" font-size="33" font-weight="500"
        fill="#475569">
    Compress &amp; convert images in your browser — fast, private, free.
  </text>

  <!-- format chips -->
  <g font-family="'Segoe UI', Arial, sans-serif" font-size="25" font-weight="700" fill="${INDIGO_LO}">
    <g transform="translate(600,540)">
      <g transform="translate(-330,0)"><rect x="-52" y="-28" width="104" height="48" rx="24" fill="#EEF2FF"/><text text-anchor="middle" dominant-baseline="central">PNG</text></g>
      <g transform="translate(-212,0)"><rect x="-52" y="-28" width="104" height="48" rx="24" fill="#EEF2FF"/><text text-anchor="middle" dominant-baseline="central">JPG</text></g>
      <g transform="translate(-92,0)"><rect x="-58" y="-28" width="116" height="48" rx="24" fill="#EEF2FF"/><text text-anchor="middle" dominant-baseline="central">WebP</text></g>
      <g transform="translate(40,0)"><rect x="-52" y="-28" width="104" height="48" rx="24" fill="#EEF2FF"/><text text-anchor="middle" dominant-baseline="central">AVIF</text></g>
      <g transform="translate(160,0)"><rect x="-52" y="-28" width="104" height="48" rx="24" fill="#EEF2FF"/><text text-anchor="middle" dominant-baseline="central">HEIC</text></g>
      <g transform="translate(282,0)"><rect x="-52" y="-28" width="104" height="48" rx="24" fill="#EEF2FF"/><text text-anchor="middle" dominant-baseline="central">GIF</text></g>
    </g>
  </g>
</svg>`;

// ---- helpers ---------------------------------------------------------------
async function png(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

/** Build a multi-size .ico from PNG buffers (PNG-in-ICO, widely supported). */
function buildIco(pngs) {
  const count = pngs.length;
  const headerLen = 6 + 16 * count;
  let offset = headerLen;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = ICO
  header.writeUInt16LE(count, 4);
  const entries = [];
  for (const p of pngs) {
    const e = Buffer.alloc(16);
    const s = p.size >= 256 ? 0 : p.size;
    e.writeUInt8(s, 0); // width
    e.writeUInt8(s, 1); // height
    e.writeUInt8(0, 2); // colors in palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(p.data.length, 8); // image size
    e.writeUInt32LE(offset, 12); // offset
    entries.push(e);
    offset += p.data.length;
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

// ---- run -------------------------------------------------------------------
await mkdir(PUBLIC, { recursive: true });

const markBuf = Buffer.from(markSvg);

// Logo
await writeFile(path.join(PUBLIC, "logo.svg"), markBuf);
await sharp(markBuf).webp({ quality: 95 }).toFile(path.join(PUBLIC, "logo.webp"));

// PNG icons
const sizes = {
  "favicon-16x16.png": 16,
  "favicon-32x32.png": 32,
  "icon-192.png": 192,
  "icon-512.png": 512,
};
for (const [name, size] of Object.entries(sizes)) {
  await sharp(markBuf).resize(size, size).png().toFile(path.join(PUBLIC, name));
}
await sharp(markBuf).resize(180, 180).png().toFile(path.join(PUBLIC, "apple-touch-icon.png"));

// Multi-size favicon.ico (16/32/48)
const icoPngs = await Promise.all(
  [16, 32, 48].map(async (size) => ({ size, data: await png(markSvg, size) }))
);
await writeFile(path.join(PUBLIC, "favicon.ico"), buildIco(icoPngs));

// OG image
await sharp(Buffer.from(ogSvg)).png().toFile(path.join(PUBLIC, "og-image.png"));

console.log("✓ Brand assets generated in /public");
console.log(
[
  "logo.svg","logo.webp","favicon.ico","favicon-16x16.png","favicon-32x32.png",
  "icon-192.png","icon-512.png","apple-touch-icon.png","og-image.png"
].join(", ")
);
