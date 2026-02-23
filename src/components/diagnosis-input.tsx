"use client";

import { useState, useCallback, useRef } from "react";
import { searchDiagnoses, type DiagnosisSearchResult } from "@/data/diagnosis-lookup";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
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
  const [isFocused, setIsFocused] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  function handleInputChange(value: string) {
    setInputValue(value);
    if (value.trim().length >= 3) {
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
      <div
        className={cn(
          "flex gap-2 rounded-xl border-2 bg-card p-1.5 transition-all duration-200",
          isFocused
            ? "border-primary/50 shadow-md shadow-primary/5"
            : "border-border hover:border-primary/25"
        )}
      >
        <div className="relative flex-1">
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
            isFocused ? "text-primary" : "text-muted-foreground"
          )} />
          <input
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
              setIsFocused(true);
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            placeholder="Start typing a diagnosis..."
            className="h-11 w-full rounded-lg bg-transparent pl-10 pr-3 text-base outline-none placeholder:text-muted-foreground/60 disabled:opacity-50"
            disabled={disabled}
            autoComplete="off"
          />
        </div>
        <Button
          onClick={addDiagnosis}
          disabled={!inputValue.trim() || disabled}
          size="lg"
          className="h-11 shrink-0 rounded-lg px-5"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-xl border bg-popover shadow-lg"
        >
          <div className="max-h-64 overflow-y-auto py-1">
            {suggestions.map((s, i) => (
              <button
                key={s.term}
                type="button"
                className={cn(
                  "w-full px-4 py-2.5 text-left text-sm transition-colors",
                  i === highlightedIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  addDiagnosisWithName(s.term);
                }}
              >
                <span className="font-medium">{s.term}</span>
                {s.matchedAbbrev && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({s.matchedAbbrev})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
