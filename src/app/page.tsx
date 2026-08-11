"use client";

import { useMemo, useRef, useState } from "react";
import { useImageLibrary } from "@/hooks/use-image-library";
import { DropOverlay } from "@/components/compressor/drop-overlay";
import { FormatControls } from "@/components/compressor/format-controls";
import { FileCard } from "@/components/compressor/file-card";
import { ClearCacheDialog } from "@/components/compressor/clear-cache-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { CompressionLevel } from "@/lib/image-processing";
import {
  FORMATS,
  formatFileSize,
  getFormat,
  type ImageFormat,
} from "@/lib/formats";
import {
  downloadRecord,
  downloadRecordsAsZip,
} from "@/lib/download";
import type { ImageRecord } from "@/lib/storage";
import {
  UploadCloud,
  Image as ImageIcon,
  Download,
  Trash2,
  PackageCheck,
  Layers,
  Zap,
  ShieldCheck,
  MousePointerClick,
} from "lucide-react";

export default function Home() {
  const {
    records,
    loading,
    busyIds,
    addFiles,
    convert,
    remove,
    removeMany,
    clearAll,
  } = useImageLibrary();
  const { toast } = useToast();

  // Conversion settings
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["webp"]);
  const [compression, setCompression] = useState<CompressionLevel>("balanced");
  const [maxDimension, setMaxDimension] = useState("");

  // Selection
  const [selectedOriginals, setSelectedOriginals] = useState<Set<string>>(
    new Set()
  );
  const [selectedConverted, setSelectedConverted] = useState<Set<string>>(
    new Set()
  );
  const [batchBusy, setBatchBusy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Split records into originals vs converted.
  const originals = useMemo(
    () => records.filter((r) => r.parentId === null),
    [records]
  );
  const converted = useMemo(
    () => records.filter((r) => r.parentId !== null),
    [records]
  );

  // Map rootId -> original size, for ratio display on converted cards.
  const originalSizeByRoot = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of records) {
      if (r.parentId === null) map.set(r.rootId, r.size);
    }
    return map;
  }, [records]);

  const maxDimNumber = (() => {
    const n = Number(maxDimension);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  })();

  const handleAddFiles = async (files: File[]) => {
    const accepted = await addFiles(files);
    if (accepted > 0) {
      toast({
        title: `${accepted} ${accepted === 1 ? "file" : "files"} added`,
        description: "Ready to convert.",
      });
    } else {
      toast({
        title: "No supported images found",
        description: "Drop PNG, JPG, WebP, BMP, TIFF, HEIC, AVIF, GIF or SVG.",
        variant: "destructive",
      });
    }
  };

  const handleConvertOne = async (
    source: ImageRecord,
    target: ImageFormat
  ) => {
    try {
      const rec = await convert(source, {
        targetFormat: target,
        quality: compression,
        maxWidthOrHeight: maxDimNumber,
      });
      toast({
        title: `Converted to ${getFormat(target).label}`,
        description: `${rec.name}.${getFormat(target).extensions[0]} · ${formatFileSize(
          rec.size
        )}`,
      });
    } catch (err) {
      toast({
        title: "Conversion failed",
        description:
          err instanceof Error ? err.message : "Unexpected error during convert.",
        variant: "destructive",
      });
    }
  };

  const handleConvertAllSelected = async () => {
    if (selectedOriginals.size === 0 || selectedFormats.length === 0) return;
    setBatchBusy(true);
    const sources = originals.filter((r) => selectedOriginals.has(r.id));
    const targets = selectedFormats as ImageFormat[];
    let done = 0;
    let failed = 0;
    try {
      for (const source of sources) {
        for (const target of targets) {
          try {
            await convert(source, {
              targetFormat: target,
              quality: compression,
              maxWidthOrHeight: maxDimNumber,
            });
            done += 1;
          } catch {
            failed += 1;
          }
        }
      }
      toast({
        title: `Batch complete`,
        description: `${done} converted${failed ? `, ${failed} failed` : ""}.`,
      });
    } finally {
      setBatchBusy(false);
    }
  };

  const toggleOriginal = (id: string) => {
    setSelectedOriginals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleConverted = (id: string) => {
    setSelectedConverted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOriginals = (checked: boolean) => {
    setSelectedOriginals(checked ? new Set(originals.map((r) => r.id)) : new Set());
  };
  const selectAllConverted = (checked: boolean) => {
    setSelectedConverted(
      checked ? new Set(converted.map((r) => r.id)) : new Set()
    );
  };

  const handleDownloadZip = async () => {
    const items = converted.filter((r) => selectedConverted.has(r.id));
    if (items.length === 0) return;
    try {
      await downloadRecordsAsZip(items);
      toast({
        title: "Download started",
        description: `${items.length} files zipped.`,
      });
    } catch {
      toast({
        title: "ZIP failed",
        description: "Could not create the archive.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSelectedConverted = async () => {
    const ids = Array.from(selectedConverted);
    if (ids.length === 0) return;
    await removeMany(ids);
    setSelectedConverted(new Set());
    toast({ title: `Deleted ${ids.length} files` });
  };

  const handleClearAll = async () => {
    await clearAll();
    setSelectedOriginals(new Set());
    setSelectedConverted(new Set());
    toast({ title: "Cache cleared" });
  };

  const totalOriginalSize = originals.reduce((s, r) => s + r.size, 0);
  const totalConvertedSize = converted.reduce((s, r) => s + r.size, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DropOverlay onFiles={handleAddFiles} />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.webp"
              alt="kompres.web.id logo"
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg"
            />
            <div className="leading-tight">
              <span className="text-base font-semibold tracking-tight">
                kompres<span className="text-muted-foreground">.web.id</span>
              </span>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Compress &amp; convert images in your browser
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden md:flex gap-1">
              <Layers className="h-3 w-3" />
              {records.length} {records.length === 1 ? "file" : "files"}
            </Badge>
            <ClearCacheDialog
              onConfirm={handleClearAll}
              count={records.length}
            />
          </div>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={FORMATS.map((f) => `.${f.extensions[0]}`).join(",")}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) handleAddFiles(files);
          e.target.value = "";
        }}
      />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
        {/* Hero */}
        <section className="text-center mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Compress &amp; convert images in your browser
          </h1>
          <p className="mt-2 text-muted-foreground max-w-xl mx-auto">
            Drag &amp; drop to compress and convert images to PNG, JPG, WebP,
            AVIF, BMP and more. Everything runs locally on your device — fast,
            free, and 100% private.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="h-4 w-4" />
              Upload images
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              100% private — no uploads
            </div>
          </div>
        </section>

        {/* Drop zone (when empty) */}
        {loading ? (
          <div className="rounded-xl border-2 border-dashed py-16 text-center text-muted-foreground">
            Loading your library…
          </div>
        ) : records.length === 0 ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card py-16 transition-colors hover:border-primary/50 hover:bg-accent/40"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 transition-transform group-hover:scale-110">
              <UploadCloud className="h-8 w-8 text-primary" />
            </div>
            <p className="mt-4 text-lg font-medium">
              Drop images here or click to browse
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Supports PNG, JPG, WebP, BMP, TIFF, HEIC, AVIF, GIF, SVG
            </p>
          </button>
        ) : (
          <div className="space-y-8">
            {/* Conversion controls */}
            <section className="rounded-xl border bg-card p-4 sm:p-5">
              <FormatControls
                selectedFormats={selectedFormats}
                onFormatsChange={setSelectedFormats}
                compression={compression}
                onCompressionChange={setCompression}
                maxDimension={maxDimension}
                onMaxDimensionChange={setMaxDimension}
              />
            </section>

            {/* Originals */}
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Your files
                  </h3>
                  <Badge variant="secondary">
                    {originals.length} · {formatFileSize(totalOriginalSize)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {originals.length > 0 && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <Checkbox
                        checked={
                          originals.length > 0 &&
                          selectedOriginals.size === originals.length
                        }
                        onCheckedChange={(v) => selectAllOriginals(!!v)}
                      />
                      Select all
                    </label>
                  )}
                  <Button
                    size="sm"
                    onClick={handleConvertAllSelected}
                    disabled={
                      selectedOriginals.size === 0 ||
                      selectedFormats.length === 0 ||
                      batchBusy
                    }
                  >
                    <Zap className="h-3.5 w-3.5" />
                    {batchBusy
                      ? "Converting…"
                      : `Convert ${selectedOriginals.size || ""} → ${
                          selectedFormats
                            .map((f) => getFormat(f as ImageFormat).label.split(" ")[0])
                            .join(",") || "?"
                        }`}
                  </Button>
                </div>
              </div>
              {originals.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No files yet — drop some images above.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {originals.map((record) => (
                    <FileCard
                      key={record.id}
                      record={record}
                      selected={selectedOriginals.has(record.id)}
                      onToggleSelect={() => toggleOriginal(record.id)}
                      busy={busyIds.has(record.id)}
                      onConvert={(target) => handleConvertOne(record, target)}
                      onDownload={() => downloadRecord(record)}
                      onDelete={async () => {
                        await remove(record.id);
                        setSelectedOriginals((prev) => {
                          const n = new Set(prev);
                          n.delete(record.id);
                          return n;
                        });
                      }}
                      isConverted={false}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Converted results */}
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <PackageCheck className="h-4 w-4" />
                    Converted
                  </h3>
                  <Badge variant="secondary">
                    {converted.length} · {formatFileSize(totalConvertedSize)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {converted.length > 0 && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <Checkbox
                        checked={
                          converted.length > 0 &&
                          selectedConverted.size === converted.length
                        }
                        onCheckedChange={(v) => selectAllConverted(!!v)}
                      />
                      Select all
                    </label>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDeleteSelectedConverted}
                    disabled={selectedConverted.size === 0}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete ({selectedConverted.size})
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDownloadZip}
                    disabled={selectedConverted.size === 0}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download ZIP ({selectedConverted.size})
                  </Button>
                </div>
              </div>
              {converted.length === 0 ? (
                <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                  <MousePointerClick className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  No converted files yet. Use the “Convert to” button on any file.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {converted.map((record) => (
                    <FileCard
                      key={record.id}
                      record={record}
                      selected={selectedConverted.has(record.id)}
                      onToggleSelect={() => toggleConverted(record.id)}
                      busy={busyIds.has(record.id)}
                      onConvert={(target) => handleConvertOne(record, target)}
                      onDownload={() => downloadRecord(record)}
                      onDelete={async () => {
                        await remove(record.id);
                        setSelectedConverted((prev) => {
                          const n = new Set(prev);
                          n.delete(record.id);
                          return n;
                        });
                      }}
                      isConverted
                      originalSize={originalSizeByRoot.get(record.rootId)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Footer (sticky to bottom) */}
      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto max-w-6xl px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>
            kompres.web.id · All processing happens locally in your browser.
          </p>
          <p>
            Files are stored in your device&apos;s browser storage (IndexedDB).
          </p>
        </div>
      </footer>
    </div>
  );
}
