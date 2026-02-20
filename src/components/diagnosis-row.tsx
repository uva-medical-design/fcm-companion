"use client";

import { useState } from "react";
import type { DiagnosisEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import { ConfidenceRating } from "@/components/confidence-rating";

export function DiagnosisRow({
  entry,
  index,
  total,
  disabled,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUpdateConfidence,
  onUpdateReasoning,
}: {
  entry: DiagnosisEntry;
  index: number;
  total: number;
  disabled?: boolean;
  onRemove: (i: number) => void;
  onMoveUp: (i: number) => void;
  onMoveDown: (i: number) => void;
  onUpdateConfidence: (i: number, c: number) => void;
  onUpdateReasoning: (i: number, r: string) => void;
}) {
  const [showReasoning, setShowReasoning] = useState(Boolean(entry.reasoning));

  return (
    <Card className="py-3">
      <CardContent className="px-4 py-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs text-muted-foreground font-medium shrink-0">
              {index + 1}.
            </span>
            <span className="text-sm font-medium truncate">
              {entry.diagnosis}
            </span>
          </div>
          {!disabled && (
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onMoveUp(index)}
                disabled={index === 0}
                aria-label="Move up"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onMoveDown(index)}
                disabled={index === total - 1}
                aria-label="Move down"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onRemove(index)}
                aria-label="Remove diagnosis"
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
        {!disabled && (
          <ConfidenceRating
            value={entry.confidence}
            onChange={(val) => onUpdateConfidence(index, val)}
          />
        )}
        {!disabled && !showReasoning ? (
          <button
            type="button"
            onClick={() => setShowReasoning(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Why this diagnosis?
          </button>
        ) : (
          showReasoning &&
          !disabled && (
            <Textarea
              value={entry.reasoning || ""}
              onChange={(e) => onUpdateReasoning(index, e.target.value)}
              placeholder="What about this patient makes you consider this? (optional)"
              className="min-h-16 text-xs"
              rows={2}
            />
          )
        )}
      </CardContent>
    </Card>
  );
}
