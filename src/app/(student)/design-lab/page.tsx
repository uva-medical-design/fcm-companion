"use client";

import { useState } from "react";
import { Palette, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeExtractor } from "@/components/theme-extractor";
import { ThemeGallery } from "@/components/theme-gallery";
import { useDesignTheme } from "@/lib/design-theme-context";

export default function DesignLabPage() {
  const { activeTheme, clearTheme } = useDesignTheme();
  const [galleryRefresh, setGalleryRefresh] = useState(0);

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
        {activeTheme && (
          <Button
            size="sm"
            variant="outline"
            onClick={clearTheme}
            className="shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>
        )}
      </div>

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
