"use client";

// Per-file "Convert to" dropdown. Lists encodable formats; selecting one
// triggers conversion using the currently active compression settings.

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Repeat2, Loader2 } from "lucide-react";
import { ENCODABLE_FORMATS } from "@/lib/formats";
import type { ImageFormat } from "@/lib/formats";

interface ConvertToMenuProps {
  currentFormat: ImageFormat;
  disabled?: boolean;
  busy?: boolean;
  onConvert: (target: ImageFormat) => void;
  label?: string;
  size?: "default" | "sm" | "icon";
}

export function ConvertToMenu({
  currentFormat,
  disabled,
  busy,
  onConvert,
  label = "Convert to",
  size = "sm",
}: ConvertToMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size={size} disabled={disabled || busy}>
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Repeat2 className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">{label}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Convert to</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ENCODABLE_FORMATS.map((f) => (
          <DropdownMenuItem
            key={f.id}
            onSelect={(e) => {
              e.preventDefault();
              onConvert(f.id);
            }}
            disabled={f.id === currentFormat}
            className="cursor-pointer justify-between"
          >
            <span>{f.label}</span>
            {f.id === currentFormat && (
              <span className="text-xs text-muted-foreground">current</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
