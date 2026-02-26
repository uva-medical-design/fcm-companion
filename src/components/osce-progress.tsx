"use client";

import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const steps = [
  { key: "door_prep", label: "Door Prep" },
  { key: "soap_note", label: "SOAP Note" },
  { key: "completed", label: "Feedback" },
] as const;

type Phase = "door_prep" | "soap_note" | "completed";

const phaseRoutes: Record<string, string> = {
  door_prep: "door-prep",
  soap_note: "soap-note",
  completed: "feedback",
};

export function OsceProgress({
  currentPhase,
  sessionId,
  sessionCompleted,
}: {
  currentPhase: Phase;
  sessionId?: string;
  sessionCompleted?: boolean;
}) {
  const router = useRouter();
  const currentIndex = steps.findIndex((s) => s.key === currentPhase);

  function handleStepClick(stepKey: string) {
    if (!sessionId || !sessionCompleted) return;
    router.push(`/osce/${sessionId}/${phaseRoutes[stepKey]}`);
  }

  return (
    <div className="py-3">
      {/* Segmented bar */}
      <div className="flex gap-1">
        {steps.map((step, i) => {
          const isComplete = sessionCompleted ? true : i < currentIndex;
          const isCurrent = i === currentIndex;
          const isUpcoming = !isComplete && !isCurrent;
          const isClickable = !!sessionId && !!sessionCompleted;
          return (
            <div key={step.key} className="flex-1 flex flex-col gap-1.5">
              <div
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={() => isClickable && handleStepClick(step.key)}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === "Enter" || e.key === " ")) {
                    handleStepClick(step.key);
                  }
                }}
                className={cn(
                  "h-2 rounded-full transition-colors",
                  isComplete && !isCurrent && "bg-primary",
                  isCurrent && "bg-primary",
                  isUpcoming && "bg-muted",
                  isClickable && "cursor-pointer hover:opacity-80"
                )}
              />
              <span
                onClick={() => isClickable && handleStepClick(step.key)}
                className={cn(
                  "text-[10px] font-medium text-center",
                  isCurrent ? "text-primary" : "text-muted-foreground",
                  isClickable && "cursor-pointer hover:text-foreground transition-colors"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
