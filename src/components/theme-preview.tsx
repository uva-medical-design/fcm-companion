"use client";

import { useState, useCallback } from "react";
import { RotateCcw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDesignTheme } from "@/lib/design-theme-context";
import { cn } from "@/lib/utils";
import type { DesignTokens } from "@/types";

interface ThemePreviewProps {
  tokens: DesignTokens;
  mood: string | null;
  onTokensChange: (tokens: DesignTokens) => void;
  onSave: (name: string) => void;
  saving: boolean;
}

const COLOR_TOKENS: { key: keyof DesignTokens; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "background", label: "Background" },
  { key: "foreground", label: "Text" },
  { key: "card", label: "Card" },
  { key: "card_foreground", label: "Card Text" },
  { key: "border", label: "Border" },
  { key: "muted", label: "Muted BG" },
  { key: "muted_foreground", label: "Muted Text" },
  { key: "sidebar", label: "Sidebar" },
];

const BODY_FONTS = [
  "Inter",
  "Poppins",
  "DM Sans",
  "Plus Jakarta Sans",
  "Merriweather",
  "Lora",
  "Space Grotesk",
  "IBM Plex Sans",
];

const MONO_FONTS = [
  "JetBrains Mono",
  "Fira Code",
  "Source Code Pro",
  "IBM Plex Mono",
];

const SHADOW_OPTIONS = [
  { value: "none", label: "Flat" },
  { value: "sm", label: "Subtle" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Elevated" },
] as const;

const BORDER_WIDTH_OPTIONS = [
  { value: "0", label: "None" },
  { value: "1", label: "Thin" },
  { value: "2", label: "Thick" },
] as const;

const DENSITY_OPTIONS = [
  { value: "compact", label: "Compact" },
  { value: "default", label: "Default" },
  { value: "spacious", label: "Spacious" },
] as const;

const BUTTON_STYLE_OPTIONS = [
  { value: "default", label: "Rounded" },
  { value: "pill", label: "Pill" },
  { value: "sharp", label: "Sharp" },
  { value: "outline-heavy", label: "Outline" },
] as const;

const CARD_STYLE_OPTIONS = [
  { value: "default", label: "Bordered" },
  { value: "elevated", label: "Elevated" },
  { value: "flat", label: "Flat" },
  { value: "glass", label: "Glass" },
] as const;

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex bg-muted rounded-md p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 text-[11px] py-1 px-2 rounded transition-colors",
            value === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ThemePreview({
  tokens,
  mood,
  onTokensChange,
  onSave,
  saving,
}: ThemePreviewProps) {
  const { activeTheme, clearTheme, setActiveTheme } = useDesignTheme();
  const [themeName, setThemeName] = useState("");
  const [copied, setCopied] = useState(false);
  const isApplied = activeTheme !== null;

  const updateToken = useCallback(
    (key: keyof DesignTokens, value: string) => {
      const updated = { ...tokens, [key]: value };
      onTokensChange(updated);
      if (isApplied) {
        setActiveTheme(updated);
      }
    },
    [tokens, onTokensChange, isApplied, setActiveTheme]
  );

  const handleApply = () => setActiveTheme(tokens);
  const handleReset = () => clearTheme();

  const handleSave = () => {
    if (!themeName.trim()) return;
    onSave(themeName.trim());
    setThemeName("");
  };

  const handleCopyCss = useCallback(() => {
    const lines = [
      `/* Design Lab Theme${mood ? ` — ${mood}` : ""} */`,
      `:root {`,
      `  --primary: ${tokens.primary};`,
      `  --background: ${tokens.background};`,
      `  --foreground: ${tokens.foreground};`,
      `  --card: ${tokens.card};`,
      `  --card-foreground: ${tokens.card_foreground};`,
      `  --border: ${tokens.border};`,
      `  --muted: ${tokens.muted};`,
      `  --muted-foreground: ${tokens.muted_foreground};`,
      `  --sidebar: ${tokens.sidebar};`,
      `  --radius: ${tokens.radius};`,
    ];
    if (tokens.font_body && tokens.font_body !== "Inter") {
      lines.push(`  --font-sans: "${tokens.font_body}", sans-serif;`);
    }
    if (tokens.font_mono && tokens.font_mono !== "JetBrains Mono") {
      lines.push(`  --font-mono: "${tokens.font_mono}", monospace;`);
    }
    lines.push(`}`);

    // Add font import if non-default
    const imports: string[] = [];
    if (tokens.font_body && tokens.font_body !== "Inter") {
      imports.push(tokens.font_body);
    }
    if (tokens.font_mono && tokens.font_mono !== "JetBrains Mono") {
      imports.push(tokens.font_mono);
    }
    if (imports.length > 0) {
      const families = imports.map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`).join("&");
      lines.unshift(`@import url('https://fonts.googleapis.com/css2?${families}&display=swap');`, "");
    }

    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [tokens, mood]);

  return (
    <div className="space-y-4">
      {/* Mood label */}
      {mood && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Mood:</span>
          <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">
            {mood}
          </span>
        </div>
      )}

      {/* Color grid */}
      <div>
        <p className="text-[11px] font-medium text-muted-foreground mb-2">Colors</p>
        <div className="grid grid-cols-3 gap-2">
          {COLOR_TOKENS.map(({ key, label }) => (
            <div key={key} className="space-y-0.5">
              <label className="text-[10px] text-muted-foreground">{label}</label>
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={tokens[key] as string}
                  onChange={(e) => updateToken(key, e.target.value)}
                  className="h-6 w-6 rounded border border-foreground/10 cursor-pointer bg-transparent p-0"
                />
                <span className="text-[10px] font-mono text-muted-foreground">
                  {(tokens[key] as string)?.slice(0, 7)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Radius */}
      <div>
        <p className="text-[11px] font-medium text-muted-foreground mb-1">
          Radius: {tokens.radius}
        </p>
        <input
          type="range"
          min="0"
          max="1.5"
          step="0.125"
          value={parseFloat(tokens.radius) || 0}
          onChange={(e) => updateToken("radius", `${e.target.value}rem`)}
          className="w-full h-1.5 accent-primary"
        />
      </div>

      {/* Fonts */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">
            Body Font
          </label>
          <select
            value={tokens.font_body || "Inter"}
            onChange={(e) => updateToken("font_body", e.target.value)}
            className="w-full text-xs h-8 rounded-md border bg-background px-2"
          >
            {BODY_FONTS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium text-muted-foreground block mb-1">
            Mono Font
          </label>
          <select
            value={tokens.font_mono || "JetBrains Mono"}
            onChange={(e) => updateToken("font_mono", e.target.value)}
            className="w-full text-xs h-8 rounded-md border bg-background px-2"
          >
            {MONO_FONTS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Shadow */}
      <div>
        <p className="text-[11px] font-medium text-muted-foreground mb-1">Card Shadow</p>
        <SegmentedControl
          options={SHADOW_OPTIONS}
          value={(tokens.shadow as typeof SHADOW_OPTIONS[number]["value"]) || "sm"}
          onChange={(v) => updateToken("shadow", v)}
        />
      </div>

      {/* Border width */}
      <div>
        <p className="text-[11px] font-medium text-muted-foreground mb-1">Card Border</p>
        <SegmentedControl
          options={BORDER_WIDTH_OPTIONS}
          value={(tokens.border_width as typeof BORDER_WIDTH_OPTIONS[number]["value"]) || "1"}
          onChange={(v) => updateToken("border_width", v)}
        />
      </div>

      {/* Density */}
      <div>
        <p className="text-[11px] font-medium text-muted-foreground mb-1">Density</p>
        <SegmentedControl
          options={DENSITY_OPTIONS}
          value={(tokens.density as typeof DENSITY_OPTIONS[number]["value"]) || "default"}
          onChange={(v) => updateToken("density", v)}
        />
      </div>

      {/* Button style */}
      <div>
        <p className="text-[11px] font-medium text-muted-foreground mb-1">Button Style</p>
        <SegmentedControl
          options={BUTTON_STYLE_OPTIONS}
          value={(tokens.button_style as typeof BUTTON_STYLE_OPTIONS[number]["value"]) || "default"}
          onChange={(v) => updateToken("button_style", v)}
        />
      </div>

      {/* Card style */}
      <div>
        <p className="text-[11px] font-medium text-muted-foreground mb-1">Card Style</p>
        <SegmentedControl
          options={CARD_STYLE_OPTIONS}
          value={(tokens.card_style as typeof CARD_STYLE_OPTIONS[number]["value"]) || "default"}
          onChange={(v) => updateToken("card_style", v)}
        />
      </div>

      {/* Mini preview card */}
      <div
        className="rounded-lg p-3 space-y-2"
        style={{
          backgroundColor:
            tokens.card_style === "flat"
              ? tokens.muted
              : tokens.card_style === "glass"
              ? `color-mix(in srgb, ${tokens.card} 70%, transparent)`
              : tokens.card,
          color: tokens.card_foreground,
          borderColor:
            tokens.card_style === "glass"
              ? `color-mix(in srgb, ${tokens.border} 50%, transparent)`
              : tokens.border,
          borderWidth:
            tokens.card_style === "elevated" || tokens.card_style === "flat"
              ? "0px"
              : `${tokens.border_width || "1"}px`,
          borderStyle: "solid",
          borderRadius: tokens.radius,
          boxShadow:
            tokens.card_style === "elevated"
              ? "0 10px 25px -5px rgb(0 0 0 / 0.1), 0 4px 10px -4px rgb(0 0 0 / 0.06)"
              : tokens.card_style === "flat"
              ? "none"
              : tokens.shadow === "none"
              ? "none"
              : tokens.shadow === "lg"
              ? "0 10px 15px -3px rgb(0 0 0 / 0.1)"
              : tokens.shadow === "md"
              ? "0 4px 6px -1px rgb(0 0 0 / 0.1)"
              : "0 1px 2px 0 rgb(0 0 0 / 0.05)",
          backdropFilter: tokens.card_style === "glass" ? "blur(12px)" : undefined,
          fontFamily: tokens.font_body
            ? `"${tokens.font_body}", sans-serif`
            : undefined,
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
          Secondary text in {tokens.font_body || "Inter"}.{" "}
          <span
            style={{
              fontFamily: tokens.font_mono
                ? `"${tokens.font_mono}", monospace`
                : undefined,
            }}
          >
            code_sample()
          </span>
        </p>
        <div
          className="text-[11px] px-2 py-1 inline-block font-medium"
          style={{
            backgroundColor:
              tokens.button_style === "outline-heavy"
                ? "transparent"
                : tokens.primary,
            color:
              tokens.button_style === "outline-heavy"
                ? tokens.primary
                : tokens.background,
            border:
              tokens.button_style === "outline-heavy"
                ? `2px solid ${tokens.primary}`
                : "none",
            borderRadius:
              tokens.button_style === "pill"
                ? "9999px"
                : tokens.button_style === "sharp"
                ? "0"
                : tokens.radius,
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

      {/* Copy CSS */}
      <Button
        size="sm"
        variant="ghost"
        onClick={handleCopyCss}
        className="w-full h-8 text-xs text-muted-foreground"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 mr-1" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5 mr-1" />
            Copy CSS Variables
          </>
        )}
      </Button>
    </div>
  );
}
