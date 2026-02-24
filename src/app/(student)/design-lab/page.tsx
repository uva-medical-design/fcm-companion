"use client";

import { useState, useCallback, useRef } from "react";
import { Palette, RotateCcw, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeExtractor } from "@/components/theme-extractor";
import { ThemeGallery } from "@/components/theme-gallery";
import { useDesignTheme } from "@/lib/design-theme-context";
import type { DesignTokens } from "@/types";

export default function DesignLabPage() {
  const { activeTheme, clearTheme, setActiveTheme } = useDesignTheme();
  const [galleryRefresh, setGalleryRefresh] = useState(0);
  const [peeking, setPeeking] = useState(false);
  const savedThemeRef = useRef<DesignTokens | null>(null);

  const togglePeek = useCallback(() => {
    if (peeking) {
      // Restore the theme
      if (savedThemeRef.current) {
        setActiveTheme(savedThemeRef.current);
        savedThemeRef.current = null;
      }
      setPeeking(false);
    } else {
      // Temporarily remove theme to show default
      savedThemeRef.current = activeTheme;
      setActiveTheme(null);
      setPeeking(true);
    }
  }, [peeking, activeTheme, setActiveTheme]);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Design Lab
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a screenshot, pick a preset, or paste a URL. The app
            transforms in real-time.
          </p>
        </div>
        {(activeTheme || peeking) && (
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant={peeking ? "default" : "outline"}
              onClick={togglePeek}
            >
              {peeking ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 mr-1" />
                  Peeking at Default
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Compare
                </>
              )}
            </Button>
            {!peeking && (
              <Button
                size="sm"
                variant="outline"
                onClick={clearTheme}
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Peek banner */}
      {peeking && (
        <div className="bg-muted border rounded-lg px-4 py-2 flex items-center justify-between">
          <p className="text-sm">
            Showing the <strong>default theme</strong>. Click{" "}
            <strong>Compare</strong> again to restore your theme.
          </p>
        </div>
      )}

      {/* Two-panel layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Extractor */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Create a Theme</h2>
          <ThemeExtractor
            onThemeSaved={() => setGalleryRefresh((n) => n + 1)}
          />
        </div>

        {/* Right: Gallery */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Shared Themes</h2>
          <ThemeGallery refreshTrigger={galleryRefresh} />
        </div>
      </div>
    </div>
  );
}
