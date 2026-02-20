/**
 * Build a comprehensive M1-level diagnosis vocabulary using Claude API.
 * Outputs src/data/clinical-vocabulary.json.
 *
 * Run: npx tsx scripts/build-vocabulary.ts
 *
 * Requires ANTHROPIC_API_KEY environment variable.
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

interface DiagnosisLookupEntry {
  term: string;
  abbreviations: string[];
  body_system?: string;
  vindicate_category?: string;
}

const OUTPUT_FILE = path.join(
  __dirname,
  "../src/data/clinical-vocabulary.json"
);

// Load existing curated entries to preserve
const EXISTING_FILE = path.join(
  __dirname,
  "../src/data/clinical-vocabulary.json"
);

const BODY_SYSTEMS = [
  "Cardiovascular",
  "Pulmonary",
  "Gastrointestinal",
  "Hepatobiliary",
  "Musculoskeletal",
  "Neurological",
  "Renal/GU",
  "OB/GYN",
  "Infectious Disease",
  "Endocrine/Metabolic",
  "Hematologic/Oncologic",
  "Dermatologic",
  "Psychiatric",
  "Rheumatologic",
  "ENT",
  "Ophthalmologic",
  "Toxicology",
  "General/Constitutional",
];

const VINDICATE_MAP: Record<string, string> = {
  Vascular: "V",
  Infectious: "I",
  Neoplastic: "N",
  Degenerative: "D",
  "Iatrogenic/Intoxication": "I2",
  Congenital: "C",
  "Autoimmune/Allergic": "A",
  Traumatic: "T",
  "Endocrine/Metabolic": "E",
};

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set");
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  let existingTerms: string[] = [];
  if (fs.existsSync(EXISTING_FILE)) {
    const existing: DiagnosisLookupEntry[] = JSON.parse(
      fs.readFileSync(EXISTING_FILE, "utf-8")
    );
    existingTerms = existing.map((e) => e.term.toLowerCase());
  }

  const prompt = `Generate a comprehensive JSON array of medical diagnoses for an M1 medical student differential diagnosis tool.

Requirements:
- 800+ entries total
- Cover all major body systems: ${BODY_SYSTEMS.join(", ")}
- Each entry needs: term (proper medical name), abbreviations (common shorthand), body_system, vindicate_category (one of: V=Vascular, I=Infectious, N=Neoplastic, D=Degenerative, I2=Iatrogenic, C=Congenital, A=Autoimmune/Allergic, T=Traumatic, E=Endocrine/Metabolic)
- Focus on diagnoses relevant to early clinical reasoning (not super-specialized)
- Include common and can't-miss diagnoses
- Avoid duplicates with these existing terms: ${existingTerms.slice(0, 50).join(", ")}...

Format each entry as:
{"term": "Diagnosis Name", "abbreviations": ["ABBR"], "body_system": "System", "vindicate_category": "V"}

Return ONLY valid JSON array, no markdown.`;

  console.log("Requesting vocabulary from Claude...");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const generated: DiagnosisLookupEntry[] = JSON.parse(text);

    // Merge with existing, dedup by lowercase term
    let merged: DiagnosisLookupEntry[] = [];
    if (fs.existsSync(EXISTING_FILE)) {
      merged = JSON.parse(fs.readFileSync(EXISTING_FILE, "utf-8"));
    }

    const seen = new Set(merged.map((e) => e.term.toLowerCase()));
    for (const entry of generated) {
      if (!seen.has(entry.term.toLowerCase())) {
        merged.push(entry);
        seen.add(entry.term.toLowerCase());
      }
    }

    // Sort alphabetically
    merged.sort((a, b) => a.term.localeCompare(b.term));

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(merged, null, 2));
    console.log(`Wrote ${merged.length} entries to ${OUTPUT_FILE}`);
  } catch (e) {
    console.error("Failed to parse response:", e);
    // Save raw response for debugging
    fs.writeFileSync(OUTPUT_FILE + ".raw.txt", text);
    console.error("Raw response saved to", OUTPUT_FILE + ".raw.txt");
    process.exit(1);
  }
}

main().catch(console.error);
