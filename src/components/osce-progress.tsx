"use client";

import { Check, ClipboardList, FileText, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: "door_prep" as const, label: "Door Prep", icon: ClipboardList },
  { key: "soap_note" as const, label: "SOAP Note", icon: FileText },
  { key: "completed" as const, label: "Feedback", icon: MessageSquare },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

const STEP_ORDER: Record<StepKey, number> = {
  door_prep: 1,
  soap_note: 2,
  completed: 3,
};

interface OsceProgressProps {
  currentStep: StepKey;
  onNavigate?: (step: StepKey) => void;
}

export function OsceProgress({ currentStep, onNavigate }: OsceProgressProps) {
  const currentOrder = STEP_ORDER[currentStep];

  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, i) => {
        const stepOrder = STEP_ORDER[step.key];
        const isCompleted = currentOrder > stepOrder;
        const isCurrent = currentStep === step.key;
        const isClickable = isCompleted && !!onNavigate;
        const Icon = isCompleted ? Check : step.icon;

        return (
          <div key={step.key} className="flex items-center flex-1">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onNavigate?.(step.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors w-full justify-center",
                isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1 ring-offset-background",
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
                  currentOrder > stepOrder ? "bg-green-400" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
