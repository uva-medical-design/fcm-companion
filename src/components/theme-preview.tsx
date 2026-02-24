"use client";

import { useState, useCallback } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDesignTheme } from "@/lib/design-theme-context";
import type { DesignTokens } from "@/types";

interface ThemePreviewProps {
  tokens: DesignTokens;
  mood: string | null;
  onTokensChange: (tokens: DesignTokens) => void;
  onSave: (name: string) => void;
  saving: boolean;
}

const TOKEN_LABELS: { key: keyof DesignTokens; label: string; isColor: boolean }[] = [
  { key: "primary", label: "Primary", isColor: true },
  { key: "background", label: "Background", isColor: true },
  { key: "foreground", label: "Text", isColor: true },
  { key: "card", label: "Card", isColor: true },
  { key: "card_foreground", label: "Card Text", isColor: true },
  { key: "border", label: "Border", isColor: true },
  { key: "muted", label: "Muted BG", isColor: true },
  { key: "muted_foreground", label: "Muted Text", isColor: true },
  { key: "sidebar", label: "Sidebar", isColor: true },
  { key: "radius", label: "Radius", isColor: false },
];

export function ThemePreview({
  tokens,
  mood,
  onTokensChange,
  onSave,
  saving,
}: ThemePreviewProps) {
  const { activeTheme, clearTheme, setActiveTheme } = useDesignTheme();
  const [themeName, setThemeName] = useState("");
  const isApplied = activeTheme !== null;

  const handleColorChange = useCallback(
    (key: keyof DesignTokens, value: string) => {
      const updated = { ...tokens, [key]: value };
      onTokensChange(updated);
      // If actively applied, update live
      if (isApplied) {
        setActiveTheme(updated);
      }
    },
    [tokens, onTokensChange, isApplied, setActiveTheme]
  );

  const handleApply = () => {
    setActiveTheme(tokens);
  };

  const handleReset = () => {
    clearTheme();
  };

  const handleSave = () => {
    if (!themeName.trim()) return;
    onSave(themeName.trim());
    setThemeName("");
  };

  return (
    <div className="space-y-4">
      {/* Mood label */}
      {mood && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Mood:</span>
          <Badge variant="secondary">{mood}</Badge>
        </div>
      )}

      {/* Token grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {TOKEN_LABELS.map(({ key, label, isColor }) => (
          <div key={key} className="space-y-1">
            <label className="text-[11px] text-muted-foreground">{label}</label>
            {isColor ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={tokens[key]}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="h-7 w-7 rounded border border-foreground/10 cursor-pointer bg-transparent p-0"
                />
                <span className="text-xs font-mono text-muted-foreground">
                  {tokens[key]}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.125"
                  value={parseFloat(tokens[key]) || 0}
                  onChange={(e) =>
                    handleColorChange(key, `${e.target.value}rem`)
                  }
                  className="flex-1 h-1.5 accent-primary"
                />
                <span className="text-xs font-mono text-muted-foreground w-12">
                  {tokens[key]}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mini preview card */}
      <div
        className="rounded-lg border p-3 space-y-2"
        style={{
          backgroundColor: tokens.card,
          color: tokens.card_foreground,
          borderColor: tokens.border,
          borderRadius: tokens.radius,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: tokens.primary }}
          />
          <span className="text-xs font-medium">Preview Card</span>
        </div>
        <p
          className="text-[11px]"
          style={{ color: tokens.muted_foreground }}
        >
          This is how secondary text will look.
        </p>
        <div
          className="text-[11px] px-2 py-1 rounded inline-block"
          style={{
            backgroundColor: tokens.primary,
            color: tokens.background,
            borderRadius: tokens.radius,
          }}
        >
          Button
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={handleApply}>
          Apply to App
        </Button>
        {isApplied && (
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset to Default
          </Button>
        )}
      </div>

      {/* Save */}
      <div className="flex gap-2">
        <Input
          placeholder="Name your theme..."
          value={themeName}
          onChange={(e) => setThemeName(e.target.value)}
          className="text-sm h-8"
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={!themeName.trim() || saving}
          className="h-8 shrink-0"
        >
          {saving ? "Saving..." : "Save Theme"}
        </Button>
      </div>
    </div>
  );
}
