/**
 * Diagnostic test vocabulary for autocomplete.
 * Mirrors the scoring algorithm from diagnosis-lookup.ts.
 */

import testData from "./diagnostic-tests.json";
import type { DiagnosticTestEntry } from "@/types";

export const DIAGNOSTIC_TESTS: DiagnosticTestEntry[] = testData;

export interface DiagnosticTestSearchResult {
  term: string;
  matchedAbbrev?: string;
}

export function searchDiagnosticTests(query: string, limit = 8): DiagnosticTestSearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: { term: string; matchedAbbrev?: string; score: number }[] = [];

  for (const entry of DIAGNOSTIC_TESTS) {
    const termLower = entry.term.toLowerCase();

    const exactAbbrev = entry.abbreviations.find((a) => a.toLowerCase() === q);
    if (exactAbbrev) {
      results.push({ term: entry.term, matchedAbbrev: exactAbbrev, score: 3 });
      continue;
    }

    if (termLower.startsWith(q)) {
      results.push({ term: entry.term, score: 2 });
      continue;
    }

    const startsAbbrev = entry.abbreviations.find((a) => a.toLowerCase().startsWith(q));
    if (startsAbbrev) {
      results.push({ term: entry.term, matchedAbbrev: startsAbbrev, score: 1.5 });
      continue;
    }

    if (termLower.includes(q)) {
      results.push({ term: entry.term, score: 1 });
      continue;
    }

    const subAbbrev = entry.abbreviations.find((a) => a.toLowerCase().includes(q));
    if (subAbbrev) {
      results.push({ term: entry.term, matchedAbbrev: subAbbrev, score: 0.5 });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => ({ term: r.term, matchedAbbrev: r.matchedAbbrev }));
}
