"use client";

import { useState } from "react";
import type { RevisedDiagnosis } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import { AutocompleteInput } from "@/components/autocomplete-input";
import { searchDiagnosticTests } from "@/data/diagnostic-test-lookup";
import { searchTherapeuticOptions } from "@/data/therapeutic-lookup";
import { cn } from "@/lib/utils";

export function RevisedDiagnosisRow({
  diagnosis,
  index,
  total,
  findings,
  disabled,
  isLinking,
  onEvidenceFocus,
  onRemove,
  onMoveUp,
  onMoveDown,
  onUpdate,
}: {
  diagnosis: RevisedDiagnosis;
  index: number;
  total: number;
  findings: string[];
  disabled?: boolean;
  isLinking?: boolean;
  onEvidenceFocus?: (index: number) => void;
  onRemove: (i: number) => void;
  onMoveUp: (i: number) => void;
  onMoveDown: (i: number) => void;
  onUpdate: (i: number, updated: RevisedDiagnosis) => void;
}) {
  const [expanded, setExpanded] = useState(!disabled);

  function updateField(fields: Partial<RevisedDiagnosis>) {
    onUpdate(index, { ...diagnosis, ...fields });
  }

  function toggleEvidence(finding: string) {
    const current = diagnosis.evidence;
    if (current.includes(finding)) {
      updateField({ evidence: current.filter((f) => f !== finding) });
    } else {
      updateField({ evidence: [...current, finding] });
    }
  }

  function addDiagnosticPlan(term: string) {
    updateField({ diagnostic_plan: [...diagnosis.diagnostic_plan, term] });
  }

  function removeDiagnosticPlan(i: number) {
    updateField({ diagnostic_plan: diagnosis.diagnostic_plan.filter((_, idx) => idx !== i) });
  }

  function addTherapeuticPlan(term: string) {
    updateField({ therapeutic_plan: [...diagnosis.therapeutic_plan, term] });
  }

  function removeTherapeuticPlan(i: number) {
    updateField({ therapeutic_plan: diagnosis.therapeutic_plan.filter((_, idx) => idx !== i) });
  }

  const hasContent =
    diagnosis.evidence.length > 0 ||
    diagnosis.diagnostic_plan.length > 0 ||
    diagnosis.therapeutic_plan.length > 0;

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
          <div className="flex flex-wrap gap-2 pb-1">
            {diagnosis.evidence.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {diagnosis.evidence.length} finding{diagnosis.evidence.length !== 1 ? "s" : ""}
              </span>
            )}
            {diagnosis.diagnostic_plan.length > 0 && (
              <span className="text-xs text-muted-foreground">
                · Dx: {diagnosis.diagnostic_plan.join(", ")}
              </span>
            )}
            {diagnosis.therapeutic_plan.length > 0 && (
              <span className="text-xs text-muted-foreground">
                · Tx: {diagnosis.therapeutic_plan.join(", ")}
              </span>
            )}
            {!hasContent && (
              <span className="text-xs text-muted-foreground italic">No answers recorded</span>
            )}
          </div>
        )}

        {/* Expanded content */}
        {expanded && (
          <>
            {/* Supporting evidence */}
            {disabled ? (
              diagnosis.evidence.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Supporting Evidence
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {diagnosis.evidence.map((e, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {e}
                      </Badge>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div
                className="space-y-1.5"
                onFocus={() => onEvidenceFocus?.(index)}
                onClick={() => onEvidenceFocus?.(index)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Supporting Evidence
                  </span>
                  {isLinking ? (
                    <span className="text-[10px] font-medium text-primary animate-pulse">
                      Click findings in S/O
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
                    >
                      Link from S/O
                    </button>
                  )}
                </div>
                {diagnosis.evidence.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {diagnosis.evidence.map((e, ei) => (
                      <Badge key={ei} variant="secondary" className="gap-1 pr-1">
                        <span className="text-xs max-w-[200px] truncate">{e}</span>
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            toggleEvidence(e);
                          }}
                          className="ml-0.5 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No evidence linked yet
                  </p>
                )}
              </div>
            )}

            {/* Diagnostic Plan */}
            {disabled ? (
              diagnosis.diagnostic_plan.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Diagnostic Plan
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {diagnosis.diagnostic_plan.map((t, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Diagnostic Plan
                </span>
                <AutocompleteInput
                  onAdd={addDiagnosticPlan}
                  existingTerms={diagnosis.diagnostic_plan}
                  searchFn={searchDiagnosticTests}
                  placeholder="Search or type (CBC, CXR, CT...)"
                  minChars={2}
                  hideAddButton
                />
                {diagnosis.diagnostic_plan.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {diagnosis.diagnostic_plan.map((t, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 pr-1">
                        <span className="text-xs">{t}</span>
                        <button
                          type="button"
                          onClick={() => removeDiagnosticPlan(i)}
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

            {/* Therapeutic Plan */}
            {disabled ? (
              diagnosis.therapeutic_plan.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Therapeutic Plan
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {diagnosis.therapeutic_plan.map((t, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Therapeutic Plan
                </span>
                <AutocompleteInput
                  onAdd={addTherapeuticPlan}
                  existingTerms={diagnosis.therapeutic_plan}
                  searchFn={searchTherapeuticOptions}
                  placeholder="Search or type (IV fluids, O2, NSAIDs...)"
                  minChars={2}
                  hideAddButton
                />
                {diagnosis.therapeutic_plan.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {diagnosis.therapeutic_plan.map((t, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 pr-1">
                        <span className="text-xs">{t}</span>
                        <button
                          type="button"
                          onClick={() => removeTherapeuticPlan(i)}
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
