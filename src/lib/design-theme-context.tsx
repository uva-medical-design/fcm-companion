"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { DesignTokens } from "@/types";

interface DesignThemeContextValue {
  activeTheme: DesignTokens | null;
  activeThemeId: string | null;
  setActiveTheme: (tokens: DesignTokens | null, id?: string | null) => void;
  clearTheme: () => void;
}

const DesignThemeContext = createContext<DesignThemeContextValue>({
  activeTheme: null,
  activeThemeId: null,
  setActiveTheme: () => {},
  clearTheme: () => {},
});

const STORAGE_KEY = "fcm-design-theme";
const STORAGE_ID_KEY = "fcm-design-theme-id";

// Color token → CSS custom property mapping
const COLOR_TOKEN_TO_CSS: Record<string, string[]> = {
  primary: ["--primary"],
  background: ["--background"],
  foreground: ["--foreground"],
  card: ["--card"],
  card_foreground: ["--card-foreground"],
  border: ["--border"],
  muted: ["--muted"],
  muted_foreground: ["--muted-foreground"],
  sidebar: ["--sidebar"],
  radius: ["--radius"],
};

// Shadow presets
const SHADOW_VALUES: Record<string, string> = {
  none: "none",
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
};

// Density → root font-size (rem-based layout scales proportionally)
const DENSITY_SIZES: Record<string, string> = {
  compact: "14px",
  default: "16px",
  spacious: "18px",
};

// Google Fonts we support (body + mono pairings)
const FONT_LINK_CACHE = new Set<string>();

function loadGoogleFont(fontName: string) {
  if (!fontName || fontName === "Inter" || fontName === "JetBrains Mono") return;
  if (FONT_LINK_CACHE.has(fontName)) return;
  FONT_LINK_CACHE.add(fontName);

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}

function applyTokens(tokens: DesignTokens) {
  const root = document.documentElement;

  // Color tokens
  for (const [key, cssVars] of Object.entries(COLOR_TOKEN_TO_CSS)) {
    const value = tokens[key as keyof DesignTokens];
    if (value) {
      for (const cssVar of cssVars) {
        root.style.setProperty(cssVar, value as string);
      }
    }
  }

  // Derived color variables
  root.style.setProperty("--popover", tokens.card);
  root.style.setProperty("--popover-foreground", tokens.card_foreground);
  root.style.setProperty("--input", tokens.border);
  root.style.setProperty("--secondary", tokens.muted);
  root.style.setProperty("--secondary-foreground", tokens.foreground);
  root.style.setProperty("--sidebar-foreground", tokens.foreground);
  root.style.setProperty("--sidebar-border", tokens.border);

  // Font
  if (tokens.font_body) {
    loadGoogleFont(tokens.font_body);
    root.style.setProperty("--font-sans", `"${tokens.font_body}", sans-serif`);
  }
  if (tokens.font_mono) {
    loadGoogleFont(tokens.font_mono);
    root.style.setProperty("--font-mono", `"${tokens.font_mono}", monospace`);
  }

  // Shadow
  if (tokens.shadow && SHADOW_VALUES[tokens.shadow]) {
    root.style.setProperty("--card-shadow", SHADOW_VALUES[tokens.shadow]);
  }

  // Border width
  if (tokens.border_width) {
    root.style.setProperty("--card-border-width", `${tokens.border_width}px`);
  }

  // Density (scales all rem-based spacing)
  if (tokens.density && DENSITY_SIZES[tokens.density]) {
    root.style.fontSize = DENSITY_SIZES[tokens.density];
  }

  // Component styles (via data attributes for CSS targeting)
  if (tokens.button_style && tokens.button_style !== "default") {
    root.setAttribute("data-button-style", tokens.button_style);
  } else {
    root.removeAttribute("data-button-style");
  }
  if (tokens.card_style && tokens.card_style !== "default") {
    root.setAttribute("data-card-style", tokens.card_style);
  } else {
    root.removeAttribute("data-card-style");
  }
}

function clearTokens() {
  const root = document.documentElement;
  const allVars = [
    ...Object.values(COLOR_TOKEN_TO_CSS).flat(),
    "--popover",
    "--popover-foreground",
    "--input",
    "--secondary",
    "--secondary-foreground",
    "--sidebar-foreground",
    "--sidebar-border",
    "--font-sans",
    "--font-mono",
    "--card-shadow",
    "--card-border-width",
  ];
  for (const cssVar of allVars) {
    root.style.removeProperty(cssVar);
  }
  root.style.removeProperty("font-size");
  root.removeAttribute("data-button-style");
  root.removeAttribute("data-card-style");
}

export function DesignThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeTheme, setActiveThemeState] = useState<DesignTokens | null>(
    null
  );
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const storedId = localStorage.getItem(STORAGE_ID_KEY);
      if (stored) {
        const tokens = JSON.parse(stored) as DesignTokens;
        setActiveThemeState(tokens);
        setActiveThemeId(storedId);
        applyTokens(tokens);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const setActiveTheme = useCallback(
    (tokens: DesignTokens | null, id?: string | null) => {
      if (tokens) {
        setActiveThemeState(tokens);
        setActiveThemeId(id ?? null);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
        if (id) {
          localStorage.setItem(STORAGE_ID_KEY, id);
        } else {
          localStorage.removeItem(STORAGE_ID_KEY);
        }
        applyTokens(tokens);
      } else {
        setActiveThemeState(null);
        setActiveThemeId(null);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_ID_KEY);
        clearTokens();
      }
    },
    []
  );

  const clearTheme = useCallback(() => {
    setActiveTheme(null);
  }, [setActiveTheme]);

  return (
    <DesignThemeContext.Provider
      value={{ activeTheme, activeThemeId, setActiveTheme, clearTheme }}
    >
      {children}
    </DesignThemeContext.Provider>
  );
}

export function useDesignTheme() {
  return useContext(DesignThemeContext);
}
