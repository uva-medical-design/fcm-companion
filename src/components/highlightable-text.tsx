"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Bold, Highlighter, X } from "lucide-react";

export interface Annotation {
  start: number;
  end: number;
  type: "highlight" | "bold";
}

export interface LinkedFinding {
  text: string;
  color: string;
}

interface Toolbar {
  top: number;
  left: number;
  selStart: number;
  selEnd: number;
}

/**
 * Compute auto-bold ranges for "• Label:" prefixes on each line.
 */
function computeLabelAnnotations(text: string): Annotation[] {
  const result: Annotation[] = [];
  let offset = 0;
  for (const line of text.split("\n")) {
    const match = line.match(/^•\s+([^:]+):/);
    if (match) {
      const bulletLen = line.indexOf(match[1]);
      result.push({
        start: offset + bulletLen,
        end: offset + bulletLen + match[1].length,
        type: "bold",
      });
    }
    offset += line.length + 1;
  }
  return result;
}

/**
 * Build a map of character ranges that correspond to clickable findings.
 * Finds each finding's exact position in the source text.
 * Handles pipe-separated sub-items that were split from a single line.
 */
function buildFindingRanges(
  text: string,
  clickableFindings: string[]
): { start: number; end: number; finding: string }[] {
  if (!clickableFindings.length) return [];
  const ranges: { start: number; end: number; finding: string }[] = [];
  const lowerText = text.toLowerCase();
  const used = new Set<string>(); // avoid duplicate ranges

  for (const f of clickableFindings) {
    const needle = f.toLowerCase();
    let pos = 0;
    while (pos < lowerText.length) {
      const idx = lowerText.indexOf(needle, pos);
      if (idx === -1) break;
      const key = `${idx}-${idx + f.length}`;
      if (!used.has(key)) {
        used.add(key);
        ranges.push({ start: idx, end: idx + f.length, finding: f });
      }
      pos = idx + f.length;
    }
  }

  // Sort by start position to avoid overlapping issues
  ranges.sort((a, b) => a.start - b.start);
  return ranges;
}

/**
 * Find positions where linked-finding text appears in the source text.
 */
function findLinkedRanges(
  text: string,
  linkedFindings: LinkedFinding[]
): { start: number; end: number; color: string; text: string }[] {
  const ranges: { start: number; end: number; color: string; text: string }[] = [];
  for (const lf of linkedFindings) {
    const needle = lf.text.toLowerCase();
    const haystack = text.toLowerCase();
    let pos = 0;
    while (pos < haystack.length) {
      const idx = haystack.indexOf(needle, pos);
      if (idx === -1) break;
      ranges.push({ start: idx, end: idx + lf.text.length, color: lf.color, text: lf.text });
      pos = idx + lf.text.length;
    }
  }
  return ranges;
}

/** Split text into annotated segments and render spans */
function renderAnnotated(
  text: string,
  annotations: Annotation[],
  linkedFindings?: LinkedFinding[],
  onFindingClick?: (findingText: string) => void,
  clickableFindings?: string[],
  onClickableFindingClick?: (finding: string) => void,
  selectedEvidence?: string[]
) {
  const allAnnotations = [...computeLabelAnnotations(text), ...annotations];
  const linkedRanges = linkedFindings?.length ? findLinkedRanges(text, linkedFindings) : [];
  const findingRanges = clickableFindings?.length ? buildFindingRanges(text, clickableFindings) : [];

  if (!allAnnotations.length && !linkedRanges.length && !findingRanges.length) {
    return <>{text}</>;
  }

  const boundaries = new Set([0, text.length]);
  for (const ann of allAnnotations) {
    if (ann.start >= 0 && ann.end <= text.length) {
      boundaries.add(ann.start);
      boundaries.add(ann.end);
    }
  }
  for (const lr of linkedRanges) {
    if (lr.start >= 0 && lr.end <= text.length) {
      boundaries.add(lr.start);
      boundaries.add(lr.end);
    }
  }
  for (const fr of findingRanges) {
    if (fr.start >= 0 && fr.end <= text.length) {
      boundaries.add(fr.start);
      boundaries.add(fr.end);
    }
  }

  const points = Array.from(boundaries).sort((a, b) => a - b);

  return (
    <>
      {points.slice(0, -1).map((start, i) => {
        const end = points[i + 1];
        const segment = text.slice(start, end);
        const active = allAnnotations.filter((a) => a.start <= start && a.end >= end);
        const highlighted = active.some((a) => a.type === "highlight");
        const bold = active.some((a) => a.type === "bold");

        // Linked findings (color-coded underlines from hovered diagnosis)
        const activeLinks = linkedRanges.filter((lr) => lr.start <= start && lr.end >= end);
        const hasLink = activeLinks.length > 0;
        const linkColor = hasLink ? activeLinks[0].color : undefined;

        // Clickable findings (all findings, clickable when a diagnosis is selected)
        const activeFinding = findingRanges.find((fr) => fr.start <= start && fr.end >= end);
        const isClickableFinding = !!activeFinding && !!onClickableFindingClick;
        const isSelected = activeFinding && selectedEvidence?.includes(activeFinding.finding);

        // For linked finding click → scroll to diagnosis
        const matchedLinked = hasLink && linkedFindings
          ? linkedFindings.find((lf) =>
              activeLinks.some(
                (lr) => lr.text.toLowerCase() === lf.text.toLowerCase()
              )
            )
          : undefined;

        const handleClick = isClickableFinding
          ? (e: React.MouseEvent) => {
              e.stopPropagation();
              onClickableFindingClick!(activeFinding!.finding);
            }
          : matchedLinked && onFindingClick
          ? (e: React.MouseEvent) => {
              e.stopPropagation();
              onFindingClick(matchedLinked.text);
            }
          : undefined;

        return (
          <span
            key={`${start}-${end}`}
            onClick={handleClick}
            className={cn(
              highlighted && "bg-yellow-200 dark:bg-yellow-700/60 rounded-[2px]",
              bold && "font-semibold",
              hasLink && "rounded-[2px] cursor-pointer transition-colors",
              isClickableFinding && !hasLink && !isSelected && "rounded-[2px] cursor-pointer underline decoration-dashed decoration-muted-foreground/50 underline-offset-2 hover:bg-primary/10 transition-colors",
              isSelected && !hasLink && "bg-primary/15 dark:bg-primary/25 rounded-[2px] cursor-pointer underline decoration-solid decoration-primary underline-offset-2"
            )}
            style={
              hasLink && linkColor
                ? {
                    backgroundColor: `${linkColor}20`,
                    borderBottom: `2px solid ${linkColor}`,
                  }
                : undefined
            }
          >
            {segment}
          </span>
        );
      })}
    </>
  );
}

interface HighlightableTextProps {
  text: string;
  annotations: Annotation[];
  onChange: (annotations: Annotation[]) => void;
  className?: string;
  linkedFindings?: LinkedFinding[];
  onFindingClick?: (findingText: string) => void;
  /** All findings that can be clicked to toggle evidence */
  clickableFindings?: string[];
  /** Called when a clickable finding is clicked */
  onClickableFindingClick?: (finding: string) => void;
  /** Currently selected evidence for the active diagnosis */
  selectedEvidence?: string[];
}

export function HighlightableText({
  text,
  annotations,
  onChange,
  className,
  linkedFindings,
  onFindingClick,
  clickableFindings,
  onClickableFindingClick,
  selectedEvidence,
}: HighlightableTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<Toolbar | null>(null);

  /** Dismiss toolbar on outside click */
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setToolbar(null);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const processSelection = useCallback(() => {
    // Longer delay for mobile to let browser finalize selection
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !containerRef.current) {
        return;
      }

      const range = sel.getRangeAt(0);
      const containerText = containerRef.current.textContent ?? "";

      // Get character offsets relative to the container text
      const preRange = document.createRange();
      preRange.selectNodeContents(containerRef.current);
      preRange.setEnd(range.startContainer, range.startOffset);
      const start = preRange.toString().length;
      const end = start + range.toString().length;

      if (start >= end || end > containerText.length) {
        return;
      }

      // Position toolbar above the selection — use viewport coords (fixed positioning)
      const rect = range.getBoundingClientRect();
      setToolbar({
        top: rect.top - 44,
        left: Math.max(8, rect.left + rect.width / 2 - 60),
        selStart: start,
        selEnd: end,
      });
    }, 50);
  }, []);

  function addAnnotation(type: "highlight" | "bold") {
    if (!toolbar) return;
    const { selStart, selEnd } = toolbar;

    // Toggle off if identical annotation already exists
    const exact = annotations.findIndex(
      (a) => a.type === type && a.start === selStart && a.end === selEnd
    );
    if (exact !== -1) {
      onChange(annotations.filter((_, i) => i !== exact));
    } else {
      onChange([...annotations, { start: selStart, end: selEnd, type }]);
    }

    window.getSelection()?.removeAllRanges();
    setToolbar(null);
  }

  function clearAll() {
    onChange([]);
    setToolbar(null);
  }

  return (
    <>
      {/* Floating toolbar */}
      {toolbar && (
        <div
          className="fixed z-50 flex items-center gap-1 rounded-md border bg-popover shadow-md px-1 py-1"
          style={{ top: toolbar.top, left: toolbar.left }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            title="Highlight"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addAnnotation("highlight");
            }}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors"
          >
            <Highlighter className="h-4 w-4 text-yellow-600" />
          </button>
          <button
            type="button"
            title="Bold"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addAnnotation("bold");
            }}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-muted transition-colors"
          >
            <Bold className="h-4 w-4" />
          </button>
          {annotations.length > 0 && (
            <button
              type="button"
              title="Clear all"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearAll();
              }}
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-destructive/10 transition-colors"
            >
              <X className="h-4 w-4 text-destructive" />
            </button>
          )}
        </div>
      )}

      {/* Text */}
      <div
        ref={containerRef}
        onMouseUp={processSelection}
        onTouchEnd={processSelection}
        className={cn("select-text whitespace-pre-line cursor-text", className)}
      >
        {renderAnnotated(
          text,
          annotations,
          linkedFindings,
          onFindingClick,
          clickableFindings,
          onClickableFindingClick,
          selectedEvidence
        )}
      </div>
    </>
  );
}
