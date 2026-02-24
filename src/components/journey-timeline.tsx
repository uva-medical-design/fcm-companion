"use client";

import { Plus, Minus, ArrowUpDown, Gauge, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PracticeEvent {
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
}

interface JourneyTimelineProps {
  events: PracticeEvent[];
}

const EVENT_CONFIG: Record<
  string,
  { icon: typeof Plus; label: string; color: string }
> = {
  diagnosis_added: {
    icon: Plus,
    label: "Added diagnosis",
    color: "text-green-600 dark:text-green-400",
  },
  diagnosis_removed: {
    icon: Minus,
    label: "Removed diagnosis",
    color: "text-red-600 dark:text-red-400",
  },
  diagnosis_reordered: {
    icon: ArrowUpDown,
    label: "Reordered differential",
    color: "text-blue-600 dark:text-blue-400",
  },
  confidence_changed: {
    icon: Gauge,
    label: "Changed confidence",
    color: "text-amber-600 dark:text-amber-400",
  },
  submitted: {
    icon: Send,
    label: "Submitted",
    color: "text-primary",
  },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getEventDetail(event: PracticeEvent): string {
  const d = event.event_data;
  switch (event.event_type) {
    case "diagnosis_added":
      return d.diagnosis as string || "";
    case "diagnosis_removed":
      return d.diagnosis as string || "";
    case "diagnosis_reordered":
      return `Moved "${d.diagnosis}" to position ${(d.new_position as number) + 1}`;
    case "confidence_changed":
      return `${d.diagnosis}: ${d.old_confidence || "?"} → ${d.new_confidence}`;
    case "submitted":
      return `${d.count || "?"} diagnoses`;
    default:
      return "";
  }
}

export function JourneyTimeline({ events }: JourneyTimelineProps) {
  if (events.length === 0) return null;

  // Compute time span
  const firstTime = new Date(events[0].created_at).getTime();
  const lastTime = new Date(events[events.length - 1].created_at).getTime();
  const durationSec = Math.round((lastTime - firstTime) / 1000);
  const durationMin = Math.floor(durationSec / 60);
  const durationStr =
    durationMin > 0
      ? `${durationMin}m ${durationSec % 60}s`
      : `${durationSec}s`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Your Decision Path</h4>
        <span className="text-xs text-muted-foreground">
          {events.length} actions in {durationStr}
        </span>
      </div>

      <div className="relative pl-6 space-y-2">
        {/* Vertical line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

        {events.map((event, i) => {
          const config = EVENT_CONFIG[event.event_type] || {
            icon: Plus,
            label: event.event_type,
            color: "text-muted-foreground",
          };
          const Icon = config.icon;
          const detail = getEventDetail(event);

          return (
            <div key={i} className="relative flex items-start gap-2">
              <div
                className={cn(
                  "absolute -left-[15px] mt-0.5 rounded-full bg-background",
                  config.color
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className={cn("font-medium", config.color)}>
                    {config.label}
                  </span>
                  <span className="text-muted-foreground">
                    {formatTime(event.created_at)}
                  </span>
                </div>
                {detail && (
                  <p className="text-xs text-muted-foreground truncate">
                    {detail}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
