"use client";

import type { DdxSnapshot } from "@/components/simulation-flow";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DdxEvolutionProps {
  snapshots: DdxSnapshot[];
  correctDiagnosis: string;
}

export function DdxEvolution({ snapshots, correctDiagnosis }: DdxEvolutionProps) {
  // Filter out empty snapshots
  const validSnapshots = snapshots.filter((s) => s.diagnoses.length > 0);
  if (validSnapshots.length === 0) return null;

  const correctLower = correctDiagnosis.toLowerCase().trim();

  function isCorrect(diagnosis: string) {
    const dLower = diagnosis.toLowerCase().trim();
    return dLower === correctLower || dLower.includes(correctLower) || correctLower.includes(dLower);
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold">DDx Evolution</h4>
        <p className="text-xs text-muted-foreground">
          How your differential changed over time
        </p>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${validSnapshots.length}, 1fr)` }}>
        {validSnapshots.map((snapshot) => (
          <Card key={snapshot.label}>
            <CardContent className="p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                {snapshot.label}
              </p>
              <ol className="space-y-1">
                {snapshot.diagnoses
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((d, i) => (
                    <li
                      key={i}
                      className={cn(
                        "text-xs flex items-center gap-1.5",
                        isCorrect(d.diagnosis) && "font-semibold text-green-700 dark:text-green-400"
                      )}
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-4 w-4 p-0 flex items-center justify-center text-[10px] shrink-0",
                          isCorrect(d.diagnosis) && "border-green-500 text-green-700 dark:text-green-400"
                        )}
                      >
                        {i + 1}
                      </Badge>
                      <span className="truncate">{d.diagnosis}</span>
                    </li>
                  ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
