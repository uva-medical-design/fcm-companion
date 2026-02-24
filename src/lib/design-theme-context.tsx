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

// Map token keys to CSS custom property names
const TOKEN_TO_CSS: Record<keyof DesignTokens, string[]> = {
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

function applyTokens(tokens: DesignTokens) {
  const root = document.documentElement;
  for (const [key, cssVars] of Object.entries(TOKEN_TO_CSS)) {
    const value = tokens[key as keyof DesignTokens];
    if (value) {
      for (const cssVar of cssVars) {
        root.style.setProperty(cssVar, value);
      }
    }
  }
  // Also set derived variables for consistency
  root.style.setProperty("--popover", tokens.card);
  root.style.setProperty("--popover-foreground", tokens.card_foreground);
  root.style.setProperty("--input", tokens.border);
  root.style.setProperty("--secondary", tokens.muted);
  root.style.setProperty("--secondary-foreground", tokens.foreground);
  root.style.setProperty("--sidebar-foreground", tokens.foreground);
  root.style.setProperty("--sidebar-border", tokens.border);
}

function clearTokens() {
  const root = document.documentElement;
  const allVars = [
    ...Object.values(TOKEN_TO_CSS).flat(),
    "--popover",
    "--popover-foreground",
    "--input",
    "--secondary",
    "--secondary-foreground",
    "--sidebar-foreground",
    "--sidebar-border",
  ];
  for (const cssVar of allVars) {
    root.style.removeProperty(cssVar);
  }
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
