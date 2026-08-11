// Format definitions and helpers for image compression/conversion

export type ImageFormat =
  | "png"
  | "jpeg"
  | "webp"
  | "bmp"
  | "tiff"
  | "heic"
  | "avif"
  | "gif"
  | "svg"
  | "ico";

export interface FormatInfo {
  id: ImageFormat;
  label: string;
  extensions: string[];
  mimeType: string;
  canDecode: boolean; // can we read this format in the browser
  canEncode: boolean; // can we output this format
  description: string;
}

// Master list of supported formats.
// Decode support relies on native Canvas + UTIF (TIFF) + heic2any (HEIC).
// Encode support relies on Canvas.toBlob (PNG/JPEG/WebP/BMP) — others have no
// reliable browser encoder, so we expose them as decode-only.
export const FORMATS: FormatInfo[] = [
  {
    id: "png",
    label: "PNG",
    extensions: ["png"],
    mimeType: "image/png",
    canDecode: true,
    canEncode: true,
    description: "Lossless raster format, great for graphics with transparency.",
  },
  {
    id: "jpeg",
    label: "JPG / JPEG",
    extensions: ["jpg", "jpeg"],
    mimeType: "image/jpeg",
    canDecode: true,
    canEncode: true,
    description: "Lossy format, best for photographs.",
  },
  {
    id: "webp",
    label: "WebP",
    extensions: ["webp"],
    mimeType: "image/webp",
    canDecode: true,
    canEncode: true,
    description: "Modern format with excellent compression & transparency.",
  },
  {
    id: "bmp",
    label: "BMP",
    extensions: ["bmp"],
    mimeType: "image/bmp",
    canDecode: true,
    canEncode: true,
    description: "Uncompressed bitmap format.",
  },
  {
    id: "tiff",
    label: "TIFF",
    extensions: ["tiff", "tif"],
    mimeType: "image/tiff",
    canDecode: true,
    canEncode: false,
    description: "High-quality format (decode only — no browser encoder).",
  },
  {
    id: "heic",
    label: "HEIC",
    extensions: ["heic", "heif"],
    mimeType: "image/heic",
    canDecode: true,
    canEncode: false,
    description: "Apple's high-efficiency format (decode only).",
  },
  {
    id: "avif",
    label: "AVIF",
    extensions: ["avif"],
    mimeType: "image/avif",
    canDecode: true,
    canEncode: false,
    description: "Next-gen format (decode support varies by browser).",
  },
  {
    id: "gif",
    label: "GIF",
    extensions: ["gif"],
    mimeType: "image/gif",
    canDecode: true,
    canEncode: false,
    description: "Animated/limited-color format (decode only).",
  },
  {
    id: "svg",
    label: "SVG",
    extensions: ["svg"],
    mimeType: "image/svg+xml",
    canDecode: true,
    canEncode: false, // vector source only — rasterized on import
    description: "Vector format (source only — rasterized to a bitmap on import).",
  },
  {
    id: "ico",
    label: "ICO",
    extensions: ["ico"],
    mimeType: "image/x-icon",
    canDecode: false,
    canEncode: false,
    description: "Windows icon format (limited support).",
  },
];

export const ENCODABLE_FORMATS = FORMATS.filter((f) => f.canEncode);

export function getFormatByExtension(ext: string): FormatInfo | undefined {
  const normalized = ext.toLowerCase().replace(/^\./, "");
  return FORMATS.find((f) => f.extensions.includes(normalized));
}

export function getFormat(id: ImageFormat): FormatInfo {
  return FORMATS.find((f) => f.id === id)!;
}

export function detectFormatFromFile(file: File): ImageFormat | null {
  // Prefer the declared MIME type when it is specific enough.
  const byMime = FORMATS.find((f) => f.mimeType === file.type);
  if (byMime) return byMime.id;

  // Fall back to extension.
  const ext = file.name.split(".").pop() ?? "";
  const byExt = getFormatByExtension(ext);
  if (byExt) return byExt.id;

  // Some browsers report generic types; try extension again for those.
  if (file.type === "image/tiff" || file.type === "image/heic") {
    return file.type === "image/tiff" ? "tiff" : "heic";
  }

  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function compressionRatio(original: number, compressed: number): number {
  if (original === 0) return 0;
  return Math.round(((original - compressed) / original) * 100);
}
