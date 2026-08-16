// Client-side image decoding, encoding & compression.
//
// Decoding:
//   - Native Canvas/createImageBitmap for PNG/JPG/WebP/BMP/GIF/AVIF
//   - UTIF for TIFF
//   - heic2any for HEIC/HEIF
//   - <img> + Canvas rasterization for SVG (handles "auto" sizes via viewBox)
//     and ICO (all browsers render ICO in <img>, picking the largest entry)
//
// Encoding:
//   - Canvas.toBlob for PNG/JPEG/WebP
//   - Manual BMP encoder (canvas doesn't expose image/bmp)
//   - Manual ICO encoder (multi-size container with PNG entries, 16–256px)
//
// Compression strategy (TinyPNG-like):
//   - JPEG/WebP: configurable quality (default 0.8, "balanced")
//   - PNG: re-encode + optional max-dimension downscale + palette-minded
//     re-draw. PNG is lossless so the main wins come from metadata stripping
//     and dimension caps.

import type { ImageFormat } from "./formats";
import { getFormat } from "./formats";

// ---- Quality presets ------------------------------------------------------

export type CompressionLevel = "balanced" | "high" | "max";

export interface ConvertOptions {
  targetFormat: ImageFormat;
  quality: CompressionLevel; // maps to numeric quality for lossy formats
  maxWidthOrHeight?: number; // optional cap; undefined = keep original
  backgroundColor?: string; // for formats without alpha (jpeg/bmp)
}

const QUALITY_MAP: Record<CompressionLevel, number> = {
  balanced: 0.8,
  high: 0.65,
  max: 0.5,
};

// ---- Decoding -------------------------------------------------------------

async function decodeNative(file: Blob): Promise<ImageBitmap> {
  // createImageBitmap is the fastest path and works for all canvas-supported
  // formats. It fails for TIFF/HEIC which we handle separately.
  return await createImageBitmap(file);
}

async function decodeTiff(file: Blob): Promise<ImageBitmap> {
  // UTIF decodes TIFF pages into RGBA byte arrays.
  const UTIF = await import("utif");
  const buffer = await file.arrayBuffer();
  const ifds = UTIF.decode(buffer);
  if (ifds.length === 0) throw new Error("TIFF: no images found");
  const first = ifds[0];
  UTIF.decodeImage(buffer, first);
  const rgba = UTIF.toRGBA8(first);
  const width: number = first.width;
  const height: number = first.height;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(rgba);
  ctx.putImageData(imageData, 0, 0);
  return await createImageBitmap(canvas);
}

async function decodeHeic(file: Blob): Promise<ImageBitmap> {
  // heic2any converts HEIC -> PNG/JPEG blob in the browser (uses libheif).
  const heic2any = (await import("heic2any")).default;
  const converted = (await heic2any({
    blob: file,
    toType: "image/png",
    quality: 0.9,
  })) as Blob | Blob[];
  const pngBlob = Array.isArray(converted) ? converted[0] : converted;
  return await createImageBitmap(pngBlob);
}

// ---- SVG decoding ---------------------------------------------------------

// SVGs frequently declare no fixed pixel size — width/height are "auto",
// percentages, or missing — and often carry only a viewBox. SVG is vector, so
// we rasterize at a consistent default height of 1080px and derive the width
// automatically from the source SVG's aspect ratio.
const SVG_DEFAULT_RENDER_HEIGHT = 1080; // px — default raster height for SVGs
const SVG_MAX_RENDER_SIZE = 4096; // safety cap on the longest raster side

function parseSvgLength(value: string | null): number | null {
  // Percentages and keywords like "auto" carry no intrinsic pixel size.
  if (!value || value.includes("%")) return null;
  const n = parseFloat(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function capRasterSize({
  width,
  height,
}: {
  width: number;
  height: number;
}): { width: number; height: number } {
  const longest = Math.max(width, height);
  let w = width;
  let h = height;
  if (longest > SVG_MAX_RENDER_SIZE) {
    const scale = SVG_MAX_RENDER_SIZE / longest;
    w *= scale;
    h *= scale;
  }
  return {
    width: Math.max(1, Math.round(w)),
    height: Math.max(1, Math.round(h)),
  };
}

// Resolve the pixel size to rasterize an SVG at. The default is height =
// 1080px with the width auto-derived from the source SVG's aspect ratio
// (explicit width/height if both are in px, otherwise the viewBox). Falls back
// to a square 1080x1080 when no aspect ratio can be determined. The longest
// side is capped at SVG_MAX_RENDER_SIZE for memory safety (only affects extreme
// aspect ratios, e.g. ultra-wide panoramas).
export async function getSvgRasterSize(
  file: Blob
): Promise<{ width: number; height: number }> {
  let ratio: number | null = null; // width / height

  try {
    const text = await file.text();
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const svg = doc.documentElement;
    if (svg && svg.tagName.toLowerCase() === "svg") {
      const w = parseSvgLength(svg.getAttribute("width"));
      const h = parseSvgLength(svg.getAttribute("height"));
      if (w && h) {
        ratio = w / h;
      } else {
        const vb = svg.getAttribute("viewBox");
        if (vb) {
          const parts = vb.trim().split(/[\s,]+/).map(Number);
          if (
            parts.length === 4 &&
            parts.every((n) => Number.isFinite(n)) &&
            parts[2] > 0 &&
            parts[3] > 0
          ) {
            ratio = parts[2] / parts[3];
          }
        }
      }
    }
  } catch {
    // Malformed/empty SVG — fall back to the square default below.
  }

  const height = SVG_DEFAULT_RENDER_HEIGHT;
  const width = ratio ? Math.max(1, Math.round(height * ratio)) : height;
  return capRasterSize({ width, height });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

async function decodeSvg(file: Blob): Promise<ImageBitmap> {
  // Rasterize via an <img> at the resolved size. Specifying the destination
  // width/height in drawImage lets browsers render unsized ("auto") SVGs
  // deterministically using their viewBox.
  const { width, height } = await getSvgRasterSize(file);
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);
    return await createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---- ICO decoding ---------------------------------------------------------

// An ICO is a 6-byte ICONDIR followed by 16-byte directory entries:
//   [0..1] reserved, [2..3] type (1 = icon), [4..5] entry count
// Each entry starts with 1-byte width and height where 0 means 256.
// Reading the largest entry's dimensions avoids a full decode.
export async function getIcoDimensions(
  file: Blob
): Promise<{ width: number; height: number }> {
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength < 8) throw new Error("ICO: file too small");
  const view = new DataView(buffer);
  const count = view.getUint16(4, true);
  if (count === 0) throw new Error("ICO: no images found");

  let best = { width: 0, height: 0 };
  for (let i = 0; i < count; i++) {
    const entry = 6 + i * 16;
    if (entry + 2 > buffer.byteLength) break;
    const w = view.getUint8(entry) || 256;
    const h = view.getUint8(entry + 1) || 256;
    if (w * h > best.width * best.height) best = { width: w, height: h };
  }
  if (best.width === 0 || best.height === 0) {
    throw new Error("ICO: no readable directory entries");
  }
  return best;
}

async function decodeIco(file: Blob): Promise<ImageBitmap> {
  // All browsers render ICO in <img> (choosing the largest entry for the
  // intrinsic size), which is more compatible than createImageBitmap here.
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0);
    return await createImageBitmap(canvas);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function decodeImage(
  file: Blob,
  format: ImageFormat
): Promise<ImageBitmap> {
  switch (format) {
    case "tiff":
      return await decodeTiff(file);
    case "heic":
      return await decodeHeic(file);
    case "svg":
      return await decodeSvg(file);
    case "ico":
      return await decodeIco(file);
    default:
      return await decodeNative(file);
  }
}

// ---- BMP encoding (canvas doesn't support image/bmp) ----------------------

function encodeBmp(
  canvas: HTMLCanvasElement,
  backgroundColor = "#ffffff"
): Blob {
  const ctx = canvas.getContext("2d")!;
  const width = canvas.width;
  const height = canvas.height;

  // Composite over a background (BMP 24-bit has no alpha).
  const tmp = document.createElement("canvas");
  tmp.width = width;
  tmp.height = height;
  const tctx = tmp.getContext("2d")!;
  tctx.fillStyle = backgroundColor;
  tctx.fillRect(0, 0, width, height);
  tctx.drawImage(canvas, 0, 0);

  const imageData = tctx.getImageData(0, 0, width, height);
  const src = imageData.data;

  // BMP rows are padded to 4 bytes, bottom-up, BGR.
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileHeaderSize = 14;
  const infoHeaderSize = 40;
  const fileSize = fileHeaderSize + infoHeaderSize + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  let offset = 0;

  // BITMAPFILEHEADER
  view.setUint8(offset++, 0x42); // 'B'
  view.setUint8(offset++, 0x4d); // 'M'
  view.setUint32(offset, fileSize, true);
  offset += 4;
  view.setUint16(offset, 0, true);
  offset += 2; // reserved1
  view.setUint16(offset, 0, true);
  offset += 2; // reserved2
  view.setUint32(offset, fileHeaderSize + infoHeaderSize, true);
  offset += 4; // pixel data offset

  // BITMAPINFOHEADER
  view.setUint32(offset, infoHeaderSize, true);
  offset += 4;
  view.setInt32(offset, width, true);
  offset += 4;
  view.setInt32(offset, height, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2; // planes
  view.setUint16(offset, 24, true);
  offset += 2; // bpp
  view.setUint32(offset, 0, true);
  offset += 4; // compression (BI_RGB)
  view.setUint32(offset, pixelArraySize, true);
  offset += 4; // image size
  view.setInt32(offset, 2835, true);
  offset += 4; // ppm x (72 dpi)
  view.setInt32(offset, 2835, true);
  offset += 4; // ppm y
  view.setUint32(offset, 0, true);
  offset += 4; // colors used
  view.setUint32(offset, 0, true);
  offset += 4; // important colors

  // Pixel data — bottom-up, BGR, padded.
  const rowStride = width * 3;
  for (let y = height - 1; y >= 0; y--) {
    const rowStart = offset + (height - 1 - y) * rowSize;
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = rowStart + x * 3;
      view.setUint8(dstIdx, src[srcIdx + 2]); // B
      view.setUint8(dstIdx + 1, src[srcIdx + 1]); // G
      view.setUint8(dstIdx + 2, src[srcIdx]); // R
    }
    // Padding bytes are already zero.
  }

  return new Blob([buffer], { type: "image/bmp" });
}

// ---- Encoding -------------------------------------------------------------

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`Failed to encode ${type}`));
      },
      type,
      quality
    );
  });
}

// ---- ICO encoding (no browser encoder; build the container manually) ------

// Sizes packed into the generated icon, smallest to largest. Entries are
// PNG-compressed (supported by Windows Vista+ and all modern browsers), so
// quality settings don't apply — the PNG encoder is lossless.
const ICO_SIZES = [16, 32, 48, 64, 128, 256];

async function encodeIco(source: HTMLCanvasElement): Promise<Blob> {
  // Only downscale: skip sizes larger than the source, and never exceed the
  // 256px per-side ICO limit.
  const longest = Math.max(source.width, source.height);
  const sizes = ICO_SIZES.filter((s) => s <= longest);
  if (sizes.length === 0) {
    // Tiny source (< 16px): pack it at its own size so the file stays valid.
    sizes.push(Math.max(1, Math.min(longest, 256)));
  }

  // Render + PNG-encode each size, preserving the source aspect ratio.
  const entries: { blob: Blob; width: number; height: number }[] = [];
  for (const size of sizes) {
    const scale = size / longest;
    const w = Math.max(1, Math.round(source.width * scale));
    const h = Math.max(1, Math.round(source.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, w, h);
    const blob = await canvasToBlob(canvas, "image/png");
    entries.push({ blob, width: w, height: h });
  }

  // ICONDIR (6 bytes) + one 16-byte ICONDIRENTRY per image, then the blobs.
  const headerSize = 6 + entries.length * 16;
  const totalSize = headerSize + entries.reduce((s, e) => s + e.blob.size, 0);
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: 1 = icon
  view.setUint16(4, entries.length, true);

  let offset = headerSize;
  entries.forEach((entry, i) => {
    const at = 6 + i * 16;
    view.setUint8(at, entry.width >= 256 ? 0 : entry.width); // 0 means 256
    view.setUint8(at + 1, entry.height >= 256 ? 0 : entry.height);
    view.setUint8(at + 2, 0); // color palette count
    view.setUint8(at + 3, 0); // reserved
    view.setUint16(at + 4, 1, true); // color planes
    view.setUint16(at + 6, 32, true); // bits per pixel
    view.setUint32(at + 8, entry.blob.size, true); // image size in bytes
    view.setUint32(at + 12, offset, true); // offset from file start
    offset += entry.blob.size;
  });

  const bytes = new Uint8Array(buffer);
  let pos = headerSize;
  for (const entry of entries) {
    bytes.set(new Uint8Array(await entry.blob.arrayBuffer()), pos);
    pos += entry.blob.size;
  }

  return new Blob([buffer], { type: "image/x-icon" });
}

export async function encodeImage(
  source: HTMLCanvasElement | ImageBitmap,
  format: ImageFormat,
  options: ConvertOptions
): Promise<Blob> {
  // Resolve target canvas with optional dimension cap + alpha handling.
  const sw =
    source instanceof HTMLCanvasElement ? source.width : source.width;
  const sh =
    source instanceof HTMLCanvasElement ? source.height : source.height;

  const cap = options.maxWidthOrHeight;
  let targetW = sw;
  let targetH = sh;
  if (cap && Math.max(sw, sh) > cap) {
    const scale = cap / Math.max(sw, sh);
    targetW = Math.round(sw * scale);
    targetH = Math.round(sh * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const formatInfo = getFormat(format);
  const hasAlpha = format === "png" || format === "webp" || format === "ico";

  if (!hasAlpha) {
    // Flatten alpha onto background for formats without transparency.
    ctx.fillStyle = options.backgroundColor ?? "#ffffff";
    ctx.fillRect(0, 0, targetW, targetH);
  }
  ctx.drawImage(
    source instanceof HTMLCanvasElement ? source : source,
    0,
    0,
    targetW,
    targetH
  );

  switch (format) {
    case "png":
      // PNG is lossless; quality is ignored. Compression comes from metadata
      // stripping + optional downscale. We re-encode via canvas.
      return await canvasToBlob(canvas, "image/png");
    case "jpeg":
      return await canvasToBlob(
        canvas,
        "image/jpeg",
        QUALITY_MAP[options.quality]
      );
    case "webp":
      return await canvasToBlob(
        canvas,
        "image/webp",
        QUALITY_MAP[options.quality]
      );
    case "bmp":
      return encodeBmp(canvas, options.backgroundColor ?? "#ffffff");
    case "ico":
      // Entries are PNG-compressed and lossless; quality/max-dimension are
      // applied above (canvas) and sizes are capped at 256px inside encodeIco.
      return await encodeIco(canvas);
    default:
      throw new Error(
        `Encoding to ${formatInfo.label} is not supported in the browser.`
      );
  }
}

// ---- High-level convert ---------------------------------------------------

export interface ConvertResult {
  blob: Blob;
  width: number;
  height: number;
}

export async function convertImage(
  sourceBlob: Blob,
  sourceFormat: ImageFormat,
  options: ConvertOptions
): Promise<ConvertResult> {
  const bitmap = await decodeImage(sourceBlob, sourceFormat);
  try {
    const blob = await encodeImage(bitmap, options.targetFormat, options);
    return { blob, width: bitmap.width, height: bitmap.height };
  } finally {
    if ("close" in bitmap && typeof bitmap.close === "function") {
      bitmap.close();
    }
  }
}

// Read intrinsic dimensions of a blob without full decode where possible.
export async function getImageDimensions(
  blob: Blob,
  format: ImageFormat
): Promise<{ width: number; height: number }> {
  // SVG has no inherent pixel size; parse the markup instead of rasterizing.
  if (format === "svg") return await getSvgRasterSize(blob);
  // ICO directory entries carry explicit dimensions; read them directly.
  if (format === "ico") return await getIcoDimensions(blob);
  const bitmap = await decodeImage(blob, format);
  const dims = { width: bitmap.width, height: bitmap.height };
  if (typeof bitmap.close === "function") bitmap.close();
  return dims;
}
