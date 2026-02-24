"use client";

import { useState, useEffect, useCallback } from "react";
import { ThemeCard } from "@/components/theme-card";
import { useDesignTheme } from "@/lib/design-theme-context";
import { useUser } from "@/lib/user-context";
import type { DesignTheme } from "@/types";

interface ThemeGalleryProps {
  refreshTrigger: number;
}

export function ThemeGallery({ refreshTrigger }: ThemeGalleryProps) {
  const { user } = useUser();
  const { activeThemeId, setActiveTheme } = useDesignTheme();
  const [themes, setThemes] = useState<DesignTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchThemes = useCallback(async () => {
    try {
      const params = user ? `?user_id=${user.id}` : "";
      const res = await fetch(`/api/themes${params}`);
      if (res.ok) {
        const data = await res.json();
        setThemes(data.themes || []);
      }
    } catch {
      // Silently fail — gallery is non-critical
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchThemes();
  }, [fetchThemes, refreshTrigger]);

  const handleApply = (theme: DesignTheme) => {
    setActiveTheme(theme.tokens, theme.id);
  };

  const handleDelete = async (theme: DesignTheme) => {
    if (!user) return;
    try {
      const res = await fetch("/api/themes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: theme.id, user_id: user.id }),
      });
      if (res.ok) {
        setThemes((prev) => prev.filter((t) => t.id !== theme.id));
      }
    } catch {
      // Silently fail
    }
  };

  // Get unique authors for filter
  const authors = Array.from(new Set(themes.map((t) => t.author_name || "Unknown")));

  const filtered =
    filter === "all"
      ? themes
      : themes.filter((t) => (t.author_name || "Unknown") === filter);

  if (loading) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Loading shared themes...
      </div>
    );
  }

  if (themes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">
          No themes shared yet. Be the first!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Author filter */}
      {authors.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter("all")}
            className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
              filter === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "text-muted-foreground border-border hover:border-foreground/20"
            }`}
          >
            All
          </button>
          {authors.map((author) => (
            <button
              key={author}
              onClick={() => setFilter(author)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                filter === author
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground border-border hover:border-foreground/20"
              }`}
            >
              {author}
            </button>
          ))}
        </div>
      )}

      {/* Theme grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filtered.map((theme) => (
          <ThemeCard
            key={theme.id}
            theme={theme}
            isActive={activeThemeId === theme.id}
            isOwn={user?.id === theme.user_id}
            onApply={handleApply}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
