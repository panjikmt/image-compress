// Client-side image decoding, encoding & compression.
//
// Decoding:
//   - Native Canvas/createImageBitmap for PNG/JPG/WebP/BMP/GIF/AVIF
//   - UTIF for TIFF
//   - heic2any for HEIC/HEIF
//
// Encoding:
//   - Canvas.toBlob for PNG/JPEG/WebP
//   - Manual BMP encoder (canvas doesn't expose image/bmp)
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

export async function decodeImage(
  file: Blob,
  format: ImageFormat
): Promise<ImageBitmap> {
  switch (format) {
    case "tiff":
      return await decodeTiff(file);
    case "heic":
      return await decodeHeic(file);
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
  const hasAlpha = format === "png" || format === "webp";

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
  const bitmap = await decodeImage(blob, format);
  const dims = { width: bitmap.width, height: bitmap.height };
  if (typeof bitmap.close === "function") bitmap.close();
  return dims;
}
