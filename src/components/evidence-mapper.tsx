"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Section headers that should not be clickable findings */
const HEADER_PATTERN =
  /^(History|Symptoms|Physical Examination|Test Results|Review of Systems|Past Medical|Social|Family|Medications|Allergies|Objective|Subjective|No subjective|No objective|Vital Signs|Neurological|Blood Tests|Imaging|Electromyography|Patient)\s*$/i;

/**
 * Strip bullet prefix and JSON artifacts from a string.
 */
function cleanText(s: string): string {
  return s
    .replace(/^\s*[•\-]\s*/, "") // strip bullet prefix
    .replace(/[{}\[\]"]/g, "")   // strip JSON syntax characters
    .trim();
}

/**
 * Extract discrete findings from S/O bullet text.
 * Splits pipe-separated items (e.g. "BP: 120/80 | HR: 72") into individual findings.
 * Each finding maps back to its exact text in the original S/O for click targeting.
 */
export function extractFindings(subjective: string, objective: string): string[] {
  const combined = `${subjective}\n${objective}`;
  const findings: string[] = [];

  const lines = combined.split(/\n/);
  for (const line of lines) {
    const stripped = line.replace(/^\s*[•\-]\s*/, "").replace(/[{}\[\]"]/g, "").trim();
    if (!stripped || stripped.length < 5) continue;

    // Check if line has pipe-separated sub-items
    if (stripped.includes(" | ")) {
      // Split off any leading label (e.g. "Vital Signs: Temp: 36°C | BP: 120/80")
      // The label before the first sub-item's colon might be a section header
      const segments = stripped.split(/\s*\|\s*/);
      for (const seg of segments) {
        const trimmed = seg.trim();
        // Skip if it's just a section header label
        const labelOnly = trimmed.replace(/:.*$/, "").trim();
        if (HEADER_PATTERN.test(labelOnly) && !trimmed.includes(":")) continue;
        if (trimmed.length >= 3 && trimmed.length <= 200) {
          findings.push(trimmed);
        }
      }
    } else {
      // Single item line — strip leading "Label: " if it's a pure section header
      const labelOnly = stripped.replace(/:.*$/, "").trim();
      if (HEADER_PATTERN.test(labelOnly) && stripped.endsWith(":")) continue;
      if (HEADER_PATTERN.test(stripped)) continue;
      if (stripped.length <= 200) {
        findings.push(stripped);
      }
    }
  }

  return findings;
}

export function EvidenceMapper({
  findings,
  selectedFindings,
  onToggleFinding,
  disabled,
}: {
  findings: string[];
  selectedFindings: string[];
  onToggleFinding: (finding: string) => void;
  disabled?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFindings = useMemo(() => {
    if (!searchQuery.trim()) return findings;
    const q = searchQuery.toLowerCase();
    return findings.filter((f) => f.toLowerCase().includes(q));
  }, [findings, searchQuery]);

  return (
    <div className="space-y-2">
      <Input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search findings..."
        className="h-8 text-xs"
        disabled={disabled}
      />

      {/* Selected findings */}
      {selectedFindings.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedFindings.map((f, i) => (
            <Badge key={i} variant="default" className="gap-1 pr-1 text-xs">
              <span className="max-w-[200px] truncate">{f}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onToggleFinding(f)}
                  className="ml-0.5 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Available findings */}
      <div className="max-h-32 overflow-y-auto rounded border p-1.5 space-y-0.5">
        {filteredFindings.length === 0 ? (
          <p className="text-xs text-muted-foreground p-1">No findings match your search.</p>
        ) : (
          filteredFindings.map((f, i) => {
            const isSelected = selectedFindings.includes(f);
            return (
              <button
                key={i}
                type="button"
                onClick={() => !disabled && onToggleFinding(f)}
                disabled={disabled}
                className={cn(
                  "w-full text-left text-xs px-2 py-1 rounded transition-colors",
                  isSelected
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-accent text-muted-foreground"
                )}
              >
                {f}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
