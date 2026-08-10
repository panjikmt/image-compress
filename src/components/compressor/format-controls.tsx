"use client";

// Output format checkboxes + compression level + optional max-dimension.

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ENCODABLE_FORMATS } from "@/lib/formats";
import type { CompressionLevel } from "@/lib/image-processing";
import { Gauge, Maximize2 } from "lucide-react";

interface FormatControlsProps {
  selectedFormats: string[];
  onFormatsChange: (formats: string[]) => void;
  compression: CompressionLevel;
  onCompressionChange: (level: CompressionLevel) => void;
  maxDimension: string;
  onMaxDimensionChange: (value: string) => void;
  compact?: boolean;
}

export function FormatControls({
  selectedFormats,
  onFormatsChange,
  compression,
  onCompressionChange,
  maxDimension,
  onMaxDimensionChange,
  compact = false,
}: FormatControlsProps) {
  const toggleFormat = (id: string) => {
    if (selectedFormats.includes(id)) {
      onFormatsChange(selectedFormats.filter((f) => f !== id));
    } else {
      onFormatsChange([...selectedFormats, id]);
    }
  };

  return (
    <div
      className={
        compact
          ? "flex flex-wrap items-center gap-3"
          : "flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6"
      }
    >
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-medium mb-2 text-muted-foreground">
          Output format
        </p>
        <div className="flex flex-wrap gap-3">
          {ENCODABLE_FORMATS.map((f) => (
            <label
              key={f.id}
              className="flex items-center gap-2 cursor-pointer select-none rounded-md border border-input bg-background px-3 py-2 hover:bg-accent transition-colors"
            >
              <Checkbox
                checked={selectedFormats.includes(f.id)}
                onCheckedChange={() => toggleFormat(f.id)}
              />
              <span className="text-sm font-medium">{f.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <Gauge className="h-3.5 w-3.5" /> Compression
        </Label>
        <Select
          value={compression}
          onValueChange={(v) => onCompressionChange(v as CompressionLevel)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="balanced">Balanced</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="max">Max</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <Maximize2 className="h-3.5 w-3.5" /> Max side (px)
        </Label>
        <Input
          type="number"
          min={64}
          max={20000}
          placeholder="Original"
          value={maxDimension}
          onChange={(e) => onMaxDimensionChange(e.target.value)}
          className="w-[140px]"
        />
      </div>
    </div>
  );
}
