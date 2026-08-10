// IndexedDB-backed local storage for image files.
//
// Note: the product spec says "localStorage", but localStorage is capped at
// ~5 MB and cannot hold binary Blobs. IndexedDB is the correct browser API
// for persisting image data locally — we expose it through a simple interface
// so the rest of the app treats it like a local file store.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ImageFormat } from "./formats";

export interface ImageRecord {
  id: string;
  name: string; // display name (without extension)
  format: ImageFormat;
  mimeType: string;
  size: number;
  blob: Blob;
  width: number;
  height: number;
  createdAt: number;
  // Conversion lineage
  parentId: string | null; // null for originals (uploaded files)
  sourceFormat: ImageFormat | null; // format before conversion (null for originals)
  // Original reference (always points to the uploaded root file)
  rootId: string;
}

interface ImageStoreDB extends DBSchema {
  images: {
    key: string;
    value: ImageRecord;
    indexes: {
      "by-createdAt": number;
      "by-root": string;
      "by-parent": string;
    };
  };
}

const DB_NAME = "image-compressor-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ImageStoreDB>> | null = null;

function getDB(): Promise<IDBPDatabase<ImageStoreDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ImageStoreDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("images", { keyPath: "id" });
        store.createIndex("by-createdAt", "createdAt");
        store.createIndex("by-root", "rootId");
        store.createIndex("by-parent", "parentId");
      },
    });
  }
  return dbPromise;
}

export async function saveRecord(record: ImageRecord): Promise<void> {
  const db = await getDB();
  await db.put("images", record);
}

export async function getRecord(id: string): Promise<ImageRecord | undefined> {
  const db = await getDB();
  return db.get("images", id);
}

export async function getAllRecords(): Promise<ImageRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("images", "by-createdAt");
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function deleteRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("images", id);
}

export async function deleteRecords(ids: string[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("images", "readwrite");
  await Promise.all(ids.map((id) => tx.store.delete(id)));
  await tx.done;
}

export async function clearAll(): Promise<void> {
  const db = await getDB();
  await db.clear("images");
}

export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
}> {
  if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
    const est = await navigator.storage.estimate();
    return { usage: est.usage ?? 0, quota: est.quota ?? 0 };
  }
  return { usage: 0, quota: 0 };
}

export function baseName(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(0, dot) : fileName;
}
