"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, Link, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ThemePreview } from "@/components/theme-preview";
import { useDesignTheme } from "@/lib/design-theme-context";
import { useUser } from "@/lib/user-context";
import type { DesignTokens } from "@/types";

type Tab = "upload" | "url" | "presets";

const PRESETS = [
  {
    id: "clinical-sharp",
    name: "Clinical Sharp",
    desc: "Blue-gray, tight radius, high contrast",
    colors: ["#3b82f6", "#f8fafc", "#0f172a", "#cbd5e1"],
  },
  {
    id: "warm-rounded",
    name: "Warm Rounded",
    desc: "Earth tones, generous radius, comfortable",
    colors: ["#c2410c", "#fefce8", "#422006", "#fde68a"],
  },
  {
    id: "material-you",
    name: "Material You",
    desc: "Purple-tinted, large radius, playful",
    colors: ["#7c3aed", "#faf5ff", "#1e1b4b", "#ddd6fe"],
  },
  {
    id: "mono-minimal",
    name: "Mono Minimal",
    desc: "Black & white, no radius, monospace",
    colors: ["#171717", "#ffffff", "#171717", "#e5e5e5"],
  },
];

interface ThemeExtractorProps {
  onThemeSaved: () => void;
}

export function ThemeExtractor({ onThemeSaved }: ThemeExtractorProps) {
  const { user } = useUser();
  const { setActiveTheme } = useDesignTheme();
  const [tab, setTab] = useState<Tab>("presets");
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedTokens, setExtractedTokens] = useState<DesignTokens | null>(null);
  const [extractedMood, setExtractedMood] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<"screenshot" | "url" | "preset">("preset");
  const [sourceLabel, setSourceLabel] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resize image to max 1024px on longest side to keep payload small
  const resizeImage = useCallback((dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          const scale = MAX / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => resolve(dataUrl); // fallback to original
      img.src = dataUrl;
    });
  }, []);

  const extractFromImage = useCallback(async (base64: string, label: string) => {
    setExtracting(true);
    setError(null);
    setSourceType("screenshot");
    setSourceLabel(label);
    try {
      // Resize to keep payload under limits
      const resized = await resizeImage(base64);
      const res = await fetch("/api/extract-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: resized }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Extraction failed");
      }
      const data = await res.json();
      setExtractedTokens(data.tokens);
      setExtractedMood(data.mood);
      setActiveTheme(data.tokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  }, [setActiveTheme, resizeImage]);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file (PNG, JPG, etc.)");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Image must be under 10MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          extractFromImage(reader.result, file.name);
        }
      };
      reader.readAsDataURL(file);
    },
    [extractFromImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleUrlSubmit = async () => {
    if (!imageUrl.trim()) return;
    setExtracting(true);
    setError(null);
    setSourceType("url");
    setSourceLabel(imageUrl.trim());
    try {
      const res = await fetch("/api/extract-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: imageUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Extraction failed");
      }
      setExtractedTokens(data.tokens);
      setExtractedMood(data.mood);
      setActiveTheme(data.tokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const handlePreset = async (presetId: string, presetName: string) => {
    setExtracting(true);
    setError(null);
    setSourceType("preset");
    setSourceLabel(presetName);
    try {
      const res = await fetch("/api/extract-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: presetId }),
      });
      if (!res.ok) throw new Error("Failed to load preset");
      const data = await res.json();
      setExtractedTokens(data.tokens);
      setExtractedMood(data.mood);
      setActiveTheme(data.tokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load preset");
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async (name: string) => {
    if (!user || !extractedTokens) return;
    setSaving(true);
    try {
      const res = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          name,
          tokens: extractedTokens,
          source_type: sourceType,
          source_label: sourceLabel,
          mood: extractedMood,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      // Update context with saved theme ID
      setActiveTheme(extractedTokens, data.theme.id);
      onThemeSaved();
    } catch {
      setError("Failed to save theme");
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Upload }[] = [
    { id: "presets", label: "Presets", icon: Sparkles },
    { id: "upload", label: "Upload", icon: Upload },
    { id: "url", label: "URL", icon: Link },
  ];

  return (
    <div className="space-y-4">
      {/* Tab buttons */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 flex-1 justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "upload" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-foreground/20"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file);
            }}
          />
          {extracting ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Analyzing design...
              </p>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Drop a screenshot here</p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG or JPG from Mobbin, Dribbble, Maze, etc.
              </p>
            </>
          )}
        </div>
      )}

      {tab === "url" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Paste a direct URL to a screenshot or UI image.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/screenshot.png"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="text-sm h-9"
              onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            />
            <Button
              size="sm"
              onClick={handleUrlSubmit}
              disabled={extracting || !imageUrl.trim()}
              className="h-9 shrink-0"
            >
              {extracting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Extract"
              )}
            </Button>
          </div>
        </div>
      )}

      {tab === "presets" && (
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePreset(preset.id, preset.name)}
              disabled={extracting}
              className="text-left border rounded-lg p-3 hover:border-foreground/20 transition-colors disabled:opacity-50"
            >
              <div className="flex gap-1 mb-2">
                {preset.colors.map((c, i) => (
                  <div
                    key={i}
                    className="h-4 w-4 rounded-full border border-foreground/10"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <p className="text-sm font-medium">{preset.name}</p>
              <p className="text-[11px] text-muted-foreground">{preset.desc}</p>
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Extracted tokens preview + editing */}
      {extractedTokens && !extracting && (
        <Card>
          <CardContent className="pt-4">
            <ThemePreview
              tokens={extractedTokens}
              mood={extractedMood}
              onTokensChange={setExtractedTokens}
              onSave={handleSave}
              saving={saving}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
