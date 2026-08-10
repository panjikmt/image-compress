"use client";

// Full-page drag & drop. Listens at the window level so users can drop
// files anywhere on the page. Shows a translucent overlay while dragging.

import { useEffect, useState } from "react";
import { UploadCloud } from "lucide-react";

interface DropOverlayProps {
  onFiles: (files: File[]) => void;
}

export function DropOverlay({ onFiles }: DropOverlayProps) {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let counter = 0;

    const hasFiles = (e: DragEvent) =>
      !!e.dataTransfer?.types?.includes("Files");

    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      counter += 1;
      setDragging(true);
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      counter -= 1;
      if (counter <= 0) {
        counter = 0;
        setDragging(false);
      }
    };
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      counter = 0;
      setDragging(false);
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length > 0) onFiles(files);
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [onFiles]);

  if (!dragging) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
      <div className="rounded-2xl border-2 border-dashed border-primary bg-card/95 px-12 py-10 shadow-2xl">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <UploadCloud className="h-8 w-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold">Drop your images</p>
            <p className="text-sm text-muted-foreground">
              PNG, JPG, WebP, BMP, TIFF, HEIC, AVIF, GIF
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
