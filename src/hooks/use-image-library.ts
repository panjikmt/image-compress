"use client";

// React hook that exposes the image library backed by IndexedDB.
// All mutations are persisted; the in-memory list is kept in sync.

import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import {
  baseName,
  deleteRecord,
  deleteRecords,
  getAllRecords,
  saveRecord,
  clearAll as clearDB,
  type ImageRecord,
} from "@/lib/storage";
import {
  convertImage,
  getImageDimensions,
  type CompressionLevel,
} from "@/lib/image-processing";
import { detectFormatFromFile, getFormat, type ImageFormat } from "@/lib/formats";

export interface ConvertParams {
  targetFormat: ImageFormat;
  quality: CompressionLevel;
  maxWidthOrHeight?: number;
}

export function useImageLibrary() {
  const [records, setRecords] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const busyRef = useRef(busyIds);
  busyRef.current = busyIds;

  const refresh = useCallback(async () => {
    const all = await getAllRecords();
    setRecords(all);
  }, []);

  useEffect(() => {
    let mounted = true;
    getAllRecords()
      .then((all) => {
        if (mounted) setRecords(all);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      const accepted: ImageRecord[] = [];
      for (const file of files) {
        const format = detectFormatFromFile(file);
        if (!format) continue;
        const info = getFormat(format);
        if (!info.canDecode) continue;
        let dims = { width: 0, height: 0 };
        try {
          dims = await getImageDimensions(file, format);
        } catch {
          // skip dimension read failure; still store the file
        }
        const id = uuid();
        const record: ImageRecord = {
          id,
          name: baseName(file.name),
          format,
          mimeType: info.mimeType,
          size: file.size,
          blob: file,
          width: dims.width,
          height: dims.height,
          createdAt: Date.now(),
          parentId: null,
          sourceFormat: null,
          rootId: id,
        };
        await saveRecord(record);
        accepted.push(record);
      }
      if (accepted.length) setRecords((prev) => [...prev, ...accepted]);
      return accepted.length;
    },
    []
  );

  const convert = useCallback(
    async (source: ImageRecord, params: ConvertParams) => {
      if (busyRef.current.has(source.id)) return;
      setBusyIds((prev) => new Set(prev).add(source.id));
      try {
        const result = await convertImage(source.blob, source.format, {
          targetFormat: params.targetFormat,
          quality: params.quality,
          maxWidthOrHeight: params.maxWidthOrHeight,
        });
        const info = getFormat(params.targetFormat);
        const id = uuid();
        const record: ImageRecord = {
          id,
          name: source.name, // keep base name; extension applied on download
          format: params.targetFormat,
          mimeType: info.mimeType,
          size: result.blob.size,
          blob: result.blob,
          width: result.width,
          height: result.height,
          createdAt: Date.now(),
          parentId: source.id,
          sourceFormat: source.format,
          rootId: source.rootId,
        };
        await saveRecord(record);
        setRecords((prev) => [...prev, record]);
        return record;
      } finally {
        setBusyIds((prev) => {
          const next = new Set(prev);
          next.delete(source.id);
          return next;
        });
      }
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await deleteRecord(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const removeMany = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    await deleteRecords(ids);
    const set = new Set(ids);
    setRecords((prev) => prev.filter((r) => !set.has(r.id)));
  }, []);

  const clearAll = useCallback(async () => {
    await clearDB();
    setRecords([]);
  }, []);

  return {
    records,
    loading,
    busyIds,
    addFiles,
    convert,
    remove,
    removeMany,
    clearAll,
    refresh,
  };
}
