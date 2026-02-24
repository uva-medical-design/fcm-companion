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
const STYLE_ID = "design-theme-overrides";

// Shadow presets
const SHADOW_VALUES: Record<string, string> = {
  none: "none",
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
};

// Density → root font-size
const DENSITY_SIZES: Record<string, string> = {
  compact: "14px",
  default: "16px",
  spacious: "18px",
};

// --- Color utilities ---

function hexToHsl(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l * 100];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let hue = 0;
  if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) hue = ((b - r) / d + 2) / 6;
  else hue = ((r - g) / d + 4) / 6;

  return [hue * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const s1 = s / 100;
  const l1 = l / 100;
  const c = (1 - Math.abs(2 * l1 - 1)) * s1;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l1 - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v: number) =>
    Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function clamp(min: number, val: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

type ColorRole = "bg" | "fg" | "border" | "primary";

function toDark(hex: string, role: ColorRole): string {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return hex;
  const [h, s, l] = hexToHsl(hex);
  switch (role) {
    case "bg":
      // Light backgrounds → dark backgrounds
      return hslToHex(h, clamp(3, s * 0.7, 30), clamp(7, 100 - l * 0.92, 16));
    case "fg":
      // Dark foregrounds → light foregrounds
      return hslToHex(h, clamp(2, s * 0.6, 20), clamp(88, 100 - l * 0.85, 97));
    case "border":
      // Light borders → dark borders
      return hslToHex(h, clamp(3, s * 0.5, 20), clamp(20, 100 - l * 0.72, 32));
    case "primary":
      // Lighten primary for dark background visibility
      return hslToHex(h, clamp(30, s, 90), clamp(50, l + 15, 72));
  }
}

// --- Google Fonts loading ---

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

// --- Apply / clear tokens via <style> injection ---

function buildStyleSheet(tokens: DesignTokens): string {
  // Light mode colors
  const lightVars = [
    `--primary: ${tokens.primary}`,
    `--background: ${tokens.background}`,
    `--foreground: ${tokens.foreground}`,
    `--card: ${tokens.card}`,
    `--card-foreground: ${tokens.card_foreground}`,
    `--border: ${tokens.border}`,
    `--muted: ${tokens.muted}`,
    `--muted-foreground: ${tokens.muted_foreground}`,
    `--sidebar: ${tokens.sidebar}`,
    `--radius: ${tokens.radius}`,
    // Derived
    `--popover: ${tokens.card}`,
    `--popover-foreground: ${tokens.card_foreground}`,
    `--input: ${tokens.border}`,
    `--secondary: ${tokens.muted}`,
    `--secondary-foreground: ${tokens.foreground}`,
    `--sidebar-foreground: ${tokens.foreground}`,
    `--sidebar-border: ${tokens.border}`,
  ];

  // Dark mode counterparts
  const darkPrimary = toDark(tokens.primary, "primary");
  const darkBg = toDark(tokens.background, "bg");
  const darkFg = toDark(tokens.foreground, "fg");
  const darkCard = toDark(tokens.card, "bg");
  const darkCardFg = toDark(tokens.card_foreground, "fg");
  const darkBorder = toDark(tokens.border, "border");
  const darkMuted = toDark(tokens.muted, "bg");
  const darkMutedFg = toDark(tokens.muted_foreground, "fg");
  const darkSidebar = toDark(tokens.sidebar, "bg");

  const darkVars = [
    `--primary: ${darkPrimary}`,
    `--primary-foreground: ${darkBg}`,
    `--background: ${darkBg}`,
    `--foreground: ${darkFg}`,
    `--card: ${darkCard}`,
    `--card-foreground: ${darkCardFg}`,
    `--border: ${darkBorder}`,
    `--muted: ${darkMuted}`,
    `--muted-foreground: ${darkMutedFg}`,
    `--sidebar: ${darkSidebar}`,
    `--radius: ${tokens.radius}`,
    // Derived
    `--popover: ${darkCard}`,
    `--popover-foreground: ${darkCardFg}`,
    `--input: ${darkBorder}`,
    `--secondary: ${darkMuted}`,
    `--secondary-foreground: ${darkFg}`,
    `--sidebar-foreground: ${darkFg}`,
    `--sidebar-border: ${darkBorder}`,
    `--sidebar-primary: ${darkPrimary}`,
    `--sidebar-primary-foreground: ${darkBg}`,
  ];

  // Shadow + border width (same in both modes)
  const shadow = tokens.shadow && SHADOW_VALUES[tokens.shadow]
    ? SHADOW_VALUES[tokens.shadow]
    : SHADOW_VALUES.sm;
  const borderWidth = tokens.border_width ?? "1";
  const sharedVars = [
    `--card-shadow: ${shadow}`,
    `--card-border-width: ${borderWidth}px`,
  ];

  // Font
  const fontVars: string[] = [];
  if (tokens.font_body) {
    fontVars.push(`--font-sans: "${tokens.font_body}", sans-serif`);
  }
  if (tokens.font_mono) {
    fontVars.push(`--font-mono: "${tokens.font_mono}", monospace`);
  }

  return [
    `:root { ${[...lightVars, ...sharedVars, ...fontVars].join("; ")}; }`,
    `.dark { ${darkVars.join("; ")}; }`,
  ].join("\n");
}

function applyTokens(tokens: DesignTokens) {
  // Load fonts
  if (tokens.font_body) loadGoogleFont(tokens.font_body);
  if (tokens.font_mono) loadGoogleFont(tokens.font_mono);

  // Inject or update <style> tag
  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = buildStyleSheet(tokens);

  // Density (root font-size — must be inline to override browser default)
  const root = document.documentElement;
  if (tokens.density && DENSITY_SIZES[tokens.density]) {
    root.style.fontSize = DENSITY_SIZES[tokens.density];
  } else {
    root.style.removeProperty("font-size");
  }

  // Component styles via data attributes
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
  // Remove injected style tag
  const styleEl = document.getElementById(STYLE_ID);
  if (styleEl) styleEl.remove();

  // Clear inline overrides
  const root = document.documentElement;
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
