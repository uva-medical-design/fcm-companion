/**
 * Import UVA FCM cases from extracted case files.
 * Reads case documents, parses chief complaint/demographics/differential,
 * and generates SQL INSERT statements for fcm_cases and fcm_schedule.
 *
 * Usage:
 *   npx tsx scripts/import-uva-cases.ts <cases-directory>
 *
 * Example:
 *   npx tsx scripts/import-uva-cases.ts ~/Downloads/SMD-26-Cases/
 *
 * Output: SQL INSERT statements to stdout. Review before running.
 */

import * as fs from "fs";
import * as path from "path";

interface ParsedCase {
  filename: string;
  case_id: string;
  title: string;
  chief_complaint: string;
  patient_age: number | null;
  patient_gender: string | null;
  body_system: string | null;
  raw_content: string;
}

function parseAge(text: string): number | null {
  const match = text.match(/(\d{1,3})\s*[-–]?\s*year\s*[-–]?\s*old/i);
  if (match) return parseInt(match[1]);
  const yoMatch = text.match(/(\d{1,3})\s*yo\b/i);
  if (yoMatch) return parseInt(yoMatch[1]);
  return null;
}

function parseGender(text: string): string | null {
  const lower = text.toLowerCase();
  if (/\b(male|man|boy|m)\b/.test(lower)) return "male";
  if (/\b(female|woman|girl|f)\b/.test(lower)) return "female";
  return null;
}

function extractChiefComplaint(text: string): string {
  // Look for "Chief Complaint:" or "CC:" patterns
  const ccMatch = text.match(
    /(?:chief\s+complaint|cc|presenting\s+complaint)\s*[:]\s*(.+?)(?:\n|$)/i
  );
  if (ccMatch) return ccMatch[1].trim();

  // Fall back to first meaningful line
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 10);
  return lines[0] || "Unknown chief complaint";
}

function guessBodySystem(text: string): string | null {
  const lower = text.toLowerCase();
  const systemKeywords: Record<string, string[]> = {
    Cardiovascular: [
      "chest pain",
      "palpitations",
      "heart",
      "cardiac",
      "murmur",
      "dyspnea on exertion",
    ],
    Pulmonary: [
      "cough",
      "shortness of breath",
      "dyspnea",
      "wheezing",
      "respiratory",
      "lung",
    ],
    GI: [
      "abdominal pain",
      "nausea",
      "vomiting",
      "diarrhea",
      "constipation",
      "GI",
      "bowel",
    ],
    Musculoskeletal: [
      "back pain",
      "joint pain",
      "knee",
      "shoulder",
      "hip pain",
      "fracture",
    ],
    Neurological: [
      "headache",
      "dizziness",
      "numbness",
      "weakness",
      "seizure",
      "confusion",
    ],
    "Renal/GU": [
      "urinary",
      "flank pain",
      "kidney",
      "dysuria",
      "hematuria",
    ],
    Infectious: ["fever", "infection", "sepsis"],
    "Endocrine/Metabolic": [
      "diabetes",
      "thyroid",
      "weight loss",
      "fatigue",
    ],
  };

  for (const [system, keywords] of Object.entries(systemKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return system;
    }
  }
  return null;
}

function generateCaseId(filename: string, index: number): string {
  // Try to extract a meaningful ID from filename
  const base = path.basename(filename, path.extname(filename));
  const clean = base
    .replace(/[^a-zA-Z0-9]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 20);
  return `UVA-${clean}-${String(index + 1).padStart(2, "0")}`;
}

function main() {
  const casesDir = process.argv[2];

  if (!casesDir) {
    console.error("Usage: npx tsx scripts/import-uva-cases.ts <cases-directory>");
    console.error("Example: npx tsx scripts/import-uva-cases.ts ~/Downloads/SMD-26-Cases/");
    process.exit(1);
  }

  const resolvedDir = path.resolve(casesDir);
  if (!fs.existsSync(resolvedDir)) {
    console.error(`Directory not found: ${resolvedDir}`);
    process.exit(1);
  }

  // Read all files in directory
  const files = fs
    .readdirSync(resolvedDir)
    .filter((f) => /\.(txt|md|docx?)$/i.test(f))
    .sort();

  if (files.length === 0) {
    console.error("No .txt, .md, or .doc files found in directory.");
    console.error(
      "If cases are in .docx format, extract text first using a tool like textutil or pandoc."
    );
    process.exit(1);
  }

  console.log(`-- Found ${files.length} case files in ${resolvedDir}`);
  console.log(`-- Generated ${new Date().toISOString()}`);
  console.log(`-- Review carefully before running against Supabase\n`);

  const cases: ParsedCase[] = [];

  for (let i = 0; i < files.length; i++) {
    const filepath = path.join(resolvedDir, files[i]);
    const content = fs.readFileSync(filepath, "utf-8");

    const chiefComplaint = extractChiefComplaint(content);
    const age = parseAge(content);
    const gender = parseGender(content);
    const bodySystem = guessBodySystem(content);
    const caseId = generateCaseId(files[i], i);

    cases.push({
      filename: files[i],
      case_id: caseId,
      title: path
        .basename(files[i], path.extname(files[i]))
        .replace(/[_-]+/g, " "),
      chief_complaint: chiefComplaint,
      patient_age: age,
      patient_gender: gender,
      body_system: bodySystem,
      raw_content: content,
    });
  }

  // Output SQL
  console.log("-- ========== fcm_cases ==========\n");

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    const escapeSql = (s: string) => s.replace(/'/g, "''");
    console.log(`INSERT INTO fcm_cases (
  case_id, title, chief_complaint, patient_age, patient_gender,
  body_system, difficulty, differential_answer_key, is_active, sort_order
) VALUES (
  '${escapeSql(c.case_id)}',
  '${escapeSql(c.title)}',
  '${escapeSql(c.chief_complaint)}',
  ${c.patient_age ?? "NULL"},
  ${c.patient_gender ? `'${c.patient_gender}'` : "NULL"},
  ${c.body_system ? `'${escapeSql(c.body_system)}'` : "NULL"},
  'Moderate',
  '[]'::jsonb,
  true,
  ${i + 10}
);\n`);
  }

  console.log("\n-- ========== fcm_schedule (template — adjust dates) ==========\n");
  console.log("-- Uncomment and fill in dates for each case you want to schedule:\n");

  for (const c of cases) {
    const escapeSql = (s: string) => s.replace(/'/g, "''");
    console.log(`-- INSERT INTO fcm_schedule (
--   case_id, fcm_group, week_label, unlock_date, due_date, session_date, semester
-- ) VALUES (
--   (SELECT id FROM fcm_cases WHERE case_id = '${escapeSql(c.case_id)}'),
--   NULL, -- NULL = all groups, or 'A' / 'B'
--   'Week X',
--   '2026-03-01', -- unlock
--   '2026-03-07', -- due
--   '2026-03-08', -- session
--   '2026-Spring'
-- );\n`);
  }

  // Summary
  console.log(`\n-- ========== Summary ==========`);
  console.log(`-- Total cases: ${cases.length}`);
  for (const c of cases) {
    console.log(
      `-- ${c.case_id}: "${c.chief_complaint}" (${c.patient_age ?? "?"}yo ${c.patient_gender ?? "?"}, ${c.body_system ?? "Unknown system"}) [${c.filename}]`
    );
  }
}

main();
