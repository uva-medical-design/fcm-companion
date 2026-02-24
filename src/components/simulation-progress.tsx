"use client";

import { Check, ClipboardList, Search, ListOrdered, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: 1, label: "Review", icon: ClipboardList },
  { key: 2, label: "Gather", icon: Search },
  { key: 3, label: "Differential", icon: ListOrdered },
  { key: 4, label: "Debrief", icon: BarChart3 },
] as const;

interface SimulationProgressProps {
  currentStep: number;
  onNavigate: (step: number) => void;
}

export function SimulationProgress({
  currentStep,
  onNavigate,
}: SimulationProgressProps) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const isCompleted = currentStep > step.key;
        const isCurrent = currentStep === step.key;
        const isClickable = isCompleted;
        const Icon = isCompleted ? Check : step.icon;

        return (
          <div key={step.key} className="flex items-center flex-1">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onNavigate(step.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors w-full justify-center",
                isCurrent && "bg-primary text-primary-foreground",
                isCompleted &&
                  "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-950/60 cursor-pointer",
                !isCurrent &&
                  !isCompleted &&
                  "text-muted-foreground bg-muted/50"
              )}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-2 shrink-0 mx-0.5",
                  currentStep > step.key ? "bg-green-400" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
