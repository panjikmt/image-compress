"use client";

// Individual file card: thumbnail, metadata, and per-file actions.

import { useEffect, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConvertToMenu } from "./convert-to-menu";
import type { ImageRecord } from "@/lib/storage";
import {
  compressionRatio,
  formatFileSize,
  getFormat,
  type ImageFormat,
} from "@/lib/formats";
import { Download, Trash2, Loader2 } from "lucide-react";

interface FileCardProps {
  record: ImageRecord;
  selected: boolean;
  onToggleSelect: () => void;
  busy: boolean;
  onConvert: (target: ImageFormat) => void;
  onDownload: () => void;
  onDelete: () => void;
  isConverted: boolean;
  originalSize?: number; // for ratio display on converted files
  selectable?: boolean;
}

export function FileCard({
  record,
  selected,
  onToggleSelect,
  busy,
  onConvert,
  onDownload,
  onDelete,
  isConverted,
  originalSize,
  selectable = true,
}: FileCardProps) {
  const url = useMemo(() => URL.createObjectURL(record.blob), [record.blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  const info = getFormat(record.format);

  const ratio =
    isConverted && originalSize
      ? compressionRatio(originalSize, record.size)
      : null;

  return (
    <div
      className={`group relative rounded-lg border bg-card transition-all ${
        selected ? "ring-2 ring-primary border-primary" : "hover:border-primary/40"
      }`}
    >
      {/* Selection checkbox */}
      {selectable && (
        <div className="absolute left-2 top-2 z-10">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            className="bg-background/80 backdrop-blur"
          />
        </div>
      )}

      {/* Format badge */}
      <div className="absolute right-2 top-2 z-10">
        <Badge variant="secondary" className="bg-background/80 backdrop-blur uppercase">
          {info.label.split(" ")[0]}
        </Badge>
      </div>

      {/* Thumbnail */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-[conic-gradient(at_50%_50%,#f3f4f6_0deg,#f3f4f6_90deg,#e5e7eb_90deg,#e5e7eb_180deg,#f3f4f6_180deg,#f3f4f6_270deg,#e5e7eb_270deg)] bg-[length:20px_20px]">
        <img
          src={url}
          alt={record.name}
          className="h-full w-full object-contain p-2"
          loading="lazy"
        />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="space-y-2 p-3">
        <p className="truncate text-sm font-medium" title={record.name}>
          {record.name}.{info.extensions[0]}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span>{formatFileSize(record.size)}</span>
          {record.width > 0 && record.height > 0 && (
            <>
              <span aria-hidden>·</span>
              <span>
                {record.width}×{record.height}
              </span>
            </>
          )}
          {ratio !== null && ratio !== 0 && (
            <>
              <span aria-hidden>·</span>
              <Badge
                variant="outline"
                className={`px-1 py-0 text-[10px] ${
                  ratio > 0
                    ? "border-emerald-500/40 text-emerald-600"
                    : "border-amber-500/40 text-amber-600"
                }`}
              >
                {ratio > 0 ? `−${ratio}%` : `+${Math.abs(ratio)}%`}
              </Badge>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-1">
          <ConvertToMenu
            currentFormat={record.format}
            busy={busy}
            onConvert={onConvert}
          />
          {isConverted && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onDownload}
                    disabled={busy}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  disabled={busy}
                  className="ml-auto text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
