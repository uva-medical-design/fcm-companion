"use client";

import { useState, useCallback } from "react";
import { GripVertical, ChevronUp, ChevronDown, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DiagnosisEntry } from "@/types";

interface DdxRankingProps {
  diagnoses: DiagnosisEntry[];
  onReorder: (diagnoses: DiagnosisEntry[]) => void;
  onRemove?: (index: number) => void;
  disabled?: boolean;
}

export function DdxRanking({
  diagnoses,
  onReorder,
  onRemove,
  disabled = false,
}: DdxRankingProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const moveItem = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex || disabled) return;
      const next = [...diagnoses];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      onReorder(next.map((d, i) => ({ ...d, sort_order: i })));
    },
    [diagnoses, onReorder, disabled]
  );

  function handleDragStart(e: React.DragEvent, index: number) {
    if (disabled) return;
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, toIndex: number) {
    e.preventDefault();
    if (dragIndex !== null) {
      moveItem(dragIndex, toIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  if (diagnoses.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
        No diagnoses yet. Add diagnoses above to build your differential.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground mb-2">
        Drag to rank by likelihood, or use arrows
      </p>
      {diagnoses.map((entry, index) => (
        <Card
          key={`${entry.diagnosis}-${index}`}
          draggable={!disabled}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          className={cn(
            "flex items-center gap-2 p-2.5 transition-all",
            !disabled && "cursor-grab active:cursor-grabbing",
            dragIndex === index && "opacity-50",
            dragOverIndex === index &&
              dragIndex !== index &&
              "border-primary shadow-sm"
          )}
        >
          {!disabled && (
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <Badge
            variant="outline"
            className="shrink-0 h-6 w-6 items-center justify-center p-0 text-xs"
          >
            {index + 1}
          </Badge>
          <span className="flex-1 text-sm font-medium truncate">
            {entry.diagnosis}
          </span>
          {!disabled && (
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => moveItem(index, index - 1)}
                disabled={index === 0}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => moveItem(index, index + 1)}
                disabled={index === diagnoses.length - 1}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
              {onRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
