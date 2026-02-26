"use client";

import { useState, useRef } from "react";
import type { DoorPrepDiagnosis } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import { ConfidenceRating } from "@/components/confidence-rating";
import { AutocompleteInput } from "@/components/autocomplete-input";
import { searchPEManeuvers } from "@/data/pe-lookup";
import { cn } from "@/lib/utils";

export function DoorPrepDiagnosisRow({
  diagnosis,
  index,
  total,
  disabled,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUpdate,
}: {
  diagnosis: DoorPrepDiagnosis;
  index: number;
  total: number;
  disabled?: boolean;
  onRemove: (i: number) => void;
  onMoveUp: (i: number) => void;
  onMoveDown: (i: number) => void;
  onUpdate: (i: number, updated: DoorPrepDiagnosis) => void;
}) {
  const [expanded, setExpanded] = useState(!disabled);
  const newQuestionRef = useRef<HTMLInputElement>(null);

  function updateField(fields: Partial<DoorPrepDiagnosis>) {
    onUpdate(index, { ...diagnosis, ...fields });
  }

  function updateQuestion(qi: number, value: string) {
    const updated = [...diagnosis.history_questions];
    updated[qi] = value;
    updateField({ history_questions: updated });
  }

  function removeQuestion(qi: number) {
    updateField({
      history_questions: diagnosis.history_questions.filter((_, i) => i !== qi),
    });
  }

  function handleQuestionKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    qi: number
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = diagnosis.history_questions[qi]?.trim();
      if (val) {
        // Add a new empty question and focus it
        updateField({
          history_questions: [...diagnosis.history_questions, ""],
        });
        setTimeout(() => newQuestionRef.current?.focus(), 50);
      }
    } else if (
      e.key === "Backspace" &&
      !diagnosis.history_questions[qi] &&
      diagnosis.history_questions.length > 1
    ) {
      e.preventDefault();
      removeQuestion(qi);
    }
  }

  function addManeuver(term: string) {
    updateField({ pe_maneuvers: [...diagnosis.pe_maneuvers, term] });
  }

  function removeManeuver(mi: number) {
    updateField({
      pe_maneuvers: diagnosis.pe_maneuvers.filter((_, i) => i !== mi),
    });
  }

  const filledQuestions = diagnosis.history_questions.filter((q) => q.trim());

  // Ensure at least one empty input row when editing
  const questionRows =
    !disabled && diagnosis.history_questions.length === 0
      ? [""]
      : diagnosis.history_questions;

  // Keep questions state in sync — if we showed a placeholder row, sync it up
  if (!disabled && diagnosis.history_questions.length === 0 && questionRows.length === 1) {
    // Lazily initialize with one empty question
    setTimeout(() => {
      if (diagnosis.history_questions.length === 0) {
        updateField({ history_questions: [""] });
      }
    }, 0);
  }

  return (
    <Card className="py-3">
      <CardContent className="px-4 py-0 space-y-3">
        {/* Top bar */}
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => disabled && setExpanded((v) => !v)}
            className={cn(
              "flex items-center gap-2 min-w-0 flex-1 text-left",
              disabled && "cursor-pointer"
            )}
          >
            <span className="text-xs text-muted-foreground font-medium shrink-0">
              {index + 1}.
            </span>
            <span className="text-sm font-medium truncate">
              {diagnosis.diagnosis}
            </span>
          </button>

          <div className="flex items-center gap-0.5 shrink-0">
            {disabled ? (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? "Collapse" : "Expand"}
              >
                {expanded ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Collapsed read-only summary */}
        {disabled && !expanded && (
          <div className="flex flex-wrap gap-1 pb-1">
            {filledQuestions.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {filledQuestions.length} question{filledQuestions.length !== 1 ? "s" : ""}
              </span>
            )}
            {diagnosis.pe_maneuvers.length > 0 && (
              <span className="text-xs text-muted-foreground">
                · {diagnosis.pe_maneuvers.length} PE maneuver{diagnosis.pe_maneuvers.length !== 1 ? "s" : ""}
              </span>
            )}
            {filledQuestions.length === 0 && diagnosis.pe_maneuvers.length === 0 && (
              <span className="text-xs text-muted-foreground italic">No answers recorded</span>
            )}
          </div>
        )}

        {/* Expanded content */}
        {expanded && (
          <>
            {/* Confidence */}
            {!disabled && (
              <ConfidenceRating
                value={diagnosis.confidence}
                onChange={(val) => updateField({ confidence: val })}
              />
            )}

            {/* History Questions */}
            {disabled ? (
              filledQuestions.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    History Questions
                  </span>
                  <ul className="space-y-1">
                    {filledQuestions.map((q, qi) => (
                      <li key={qi} className="text-sm text-foreground flex gap-2">
                        <span className="text-muted-foreground shrink-0">•</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ) : (
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">
                  History Questions
                </span>
                {questionRows.map((q, qi) => (
                  <div key={qi} className="flex gap-1.5">
                    <Input
                      ref={qi === questionRows.length - 1 ? newQuestionRef : undefined}
                      value={q}
                      onChange={(e) => updateQuestion(qi, e.target.value)}
                      onKeyDown={(e) => handleQuestionKeyDown(e, qi)}
                      placeholder={
                        qi === 0
                          ? "Type a question and press Enter..."
                          : `Question ${qi + 1}...`
                      }
                      className="h-8 text-xs"
                    />
                    {questionRows.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeQuestion(qi)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* PE Maneuvers */}
            {disabled ? (
              diagnosis.pe_maneuvers.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    PE Maneuvers
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {diagnosis.pe_maneuvers.map((m, mi) => (
                      <Badge key={mi} variant="secondary" className="text-xs">
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">
                  PE Maneuvers
                </span>
                <AutocompleteInput
                  onAdd={addManeuver}
                  existingTerms={diagnosis.pe_maneuvers}
                  searchFn={searchPEManeuvers}
                  placeholder="Search PE maneuvers..."
                  hideAddButton
                />
                {diagnosis.pe_maneuvers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {diagnosis.pe_maneuvers.map((m, mi) => (
                      <Badge key={mi} variant="secondary" className="gap-1 pr-1">
                        <span className="text-xs">{m}</span>
                        <button
                          type="button"
                          onClick={() => removeManeuver(mi)}
                          className="ml-0.5 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
