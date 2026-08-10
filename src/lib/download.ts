// Download helpers: single file + multi-file ZIP.

import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { ImageRecord } from "./storage";
import { getFormat } from "./formats";

function ensureExtension(name: string, formatId: ImageRecord["format"]): string {
  const info = getFormat(formatId);
  const ext = info.extensions[0];
  const dot = name.toLowerCase().lastIndexOf(`.${ext}`);
  if (dot === name.length - ext.length - 1) return name;
  return `${name}.${ext}`;
}

export function downloadRecord(record: ImageRecord): void {
  const fileName = ensureExtension(record.name, record.format);
  saveAs(record.blob, fileName);
}

export async function downloadRecordsAsZip(
  records: ImageRecord[],
  zipName = "converted-images.zip"
): Promise<void> {
  if (records.length === 0) return;

  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const record of records) {
    let fileName = ensureExtension(record.name, record.format);
    // De-duplicate names inside the archive.
    if (usedNames.has(fileName.toLowerCase())) {
      const info = getFormat(record.format);
      const ext = info.extensions[0];
      const base = record.name.replace(new RegExp(`\\.${ext}$`, "i"), "");
      let i = 1;
      while (usedNames.has(`${base}-${i}.${ext}`.toLowerCase())) i++;
      fileName = `${base}-${i}.${ext}`;
    }
    usedNames.add(fileName.toLowerCase());
    zip.file(fileName, record.blob);
  }

  const content = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  saveAs(content, zipName);
}
