/**
 * Clinical diagnosis vocabulary for autocomplete in FCM differential builder.
 * Data sourced from clinical-vocabulary.json (generated via scripts/generate-vocabulary.ts).
 */

import vocabularyData from "./clinical-vocabulary.json";

export interface DiagnosisLookupEntry {
  term: string;
  abbreviations: string[];
  body_system?: string;
  vindicate_category?: string;
}

export const DIAGNOSIS_LOOKUP: DiagnosisLookupEntry[] = vocabularyData;

export interface DiagnosisSearchResult {
  term: string;
  matchedAbbrev?: string;
}

/**
 * Search diagnoses by term or abbreviation (case-insensitive substring match).
 * Returns up to `limit` results with optional matched abbreviation.
 */
export function searchDiagnoses(query: string, limit = 8): DiagnosisSearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const results: { term: string; matchedAbbrev?: string; score: number }[] = [];

  for (const entry of DIAGNOSIS_LOOKUP) {
    const termLower = entry.term.toLowerCase();

    // Exact abbreviation match gets highest priority
    const exactAbbrev = entry.abbreviations.find((a) => a.toLowerCase() === q);
    if (exactAbbrev) {
      results.push({ term: entry.term, matchedAbbrev: exactAbbrev, score: 3 });
      continue;
    }

    // Term starts with query
    if (termLower.startsWith(q)) {
      results.push({ term: entry.term, score: 2 });
      continue;
    }

    // Abbreviation starts with query
    const startsAbbrev = entry.abbreviations.find((a) => a.toLowerCase().startsWith(q));
    if (startsAbbrev) {
      results.push({ term: entry.term, matchedAbbrev: startsAbbrev, score: 1.5 });
      continue;
    }

    // Substring match on term
    if (termLower.includes(q)) {
      results.push({ term: entry.term, score: 1 });
      continue;
    }

    // Substring match on abbreviation
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
