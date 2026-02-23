"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light" as const, icon: Sun, label: "Light" },
    { value: "dark" as const, icon: Moon, label: "Dark" },
    { value: "system" as const, icon: Monitor, label: "System" },
  ];

  return (
    <div className="flex rounded-lg border p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setTheme(opt.value)}
          className={cn(
            "flex items-center justify-center rounded-md p-1.5 transition-colors",
            theme === opt.value
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label={`${opt.label} theme`}
        >
          <opt.icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
