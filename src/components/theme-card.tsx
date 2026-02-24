"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DesignTheme } from "@/types";

interface ThemeCardProps {
  theme: DesignTheme;
  isActive: boolean;
  isOwn: boolean;
  onApply: (theme: DesignTheme) => void;
  onDelete?: (theme: DesignTheme) => void;
}

export function ThemeCard({
  theme,
  isActive,
  isOwn,
  onApply,
  onDelete,
}: ThemeCardProps) {
  const t = theme.tokens;
  const swatches = [t.primary, t.background, t.card, t.muted];

  return (
    <div
      className={cn(
        "relative rounded-lg border p-3 transition-colors",
        isActive
          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
          : "hover:border-foreground/20"
      )}
    >
      {isActive && (
        <Badge
          variant="default"
          className="absolute -top-2 right-2 text-[10px] px-1.5 py-0"
        >
          Active
        </Badge>
      )}

      {/* Color swatches */}
      <div className="flex gap-1.5 mb-2">
        {swatches.map((color, i) => (
          <div
            key={i}
            className="h-6 w-6 rounded-full border border-foreground/10"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Name + author */}
      <p className="text-sm font-medium truncate">{theme.name}</p>
      <p className="text-xs text-muted-foreground truncate">
        {theme.author_name || "Unknown"}
      </p>

      {/* Mood tag */}
      {theme.mood && (
        <Badge variant="secondary" className="mt-1.5 text-[10px]">
          {theme.mood}
        </Badge>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        <Button
          size="sm"
          variant={isActive ? "outline" : "default"}
          className="flex-1 h-7 text-xs"
          onClick={() => onApply(theme)}
        >
          {isActive ? "Applied" : "Try It"}
        </Button>
        {isOwn && onDelete && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(theme)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
