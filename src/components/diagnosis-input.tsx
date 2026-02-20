"use client";

import { useState, useCallback, useRef } from "react";
import { searchDiagnoses, type DiagnosisSearchResult } from "@/data/diagnosis-lookup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function DiagnosisInput({
  onAdd,
  existingDiagnoses,
  disabled,
}: {
  onAdd: (name: string) => void;
  existingDiagnoses: string[];
  disabled?: boolean;
}) {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<DiagnosisSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  function handleInputChange(value: string) {
    setInputValue(value);
    if (value.trim().length >= 2) {
      const results = searchDiagnoses(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setHighlightedIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  const addDiagnosisWithName = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const alreadyExists = existingDiagnoses.some(
        (d) => d.toLowerCase() === trimmed.toLowerCase()
      );
      if (alreadyExists) return;
      onAdd(trimmed);
      setInputValue("");
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    },
    [existingDiagnoses, onAdd]
  );

  const addDiagnosis = useCallback(() => {
    addDiagnosisWithName(inputValue);
  }, [inputValue, addDiagnosisWithName]);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" && showSuggestions) {
              e.preventDefault();
              setHighlightedIndex((prev) =>
                prev < suggestions.length - 1 ? prev + 1 : 0
              );
            } else if (e.key === "ArrowUp" && showSuggestions) {
              e.preventDefault();
              setHighlightedIndex((prev) =>
                prev > 0 ? prev - 1 : suggestions.length - 1
              );
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (highlightedIndex >= 0 && showSuggestions) {
                addDiagnosisWithName(suggestions[highlightedIndex].term);
              } else {
                addDiagnosis();
              }
            } else if (e.key === "Escape") {
              setShowSuggestions(false);
            }
          }}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 150);
          }}
          placeholder="Add a diagnosis..."
          className="h-11 text-base"
          disabled={disabled}
          autoComplete="off"
        />
        <Button
          onClick={addDiagnosis}
          disabled={!inputValue.trim() || disabled}
          size="lg"
          className="h-11 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute left-0 right-12 top-full z-10 mt-1 rounded-md border bg-popover shadow-md"
        >
          {suggestions.map((s, i) => (
            <button
              key={s.term}
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-accent",
                i === highlightedIndex && "bg-accent"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                addDiagnosisWithName(s.term);
              }}
            >
              {s.term}
              {s.matchedAbbrev && (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  ({s.matchedAbbrev})
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
