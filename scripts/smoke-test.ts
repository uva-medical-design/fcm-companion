#!/usr/bin/env npx tsx
/**
 * API Smoke Test — FCM Companion
 *
 * Tests every API endpoint to catch 500 errors (server crashes).
 * Skips endpoints that trigger expensive Claude API calls —
 * those are tested only for proper 400 validation on missing params.
 *
 * Usage:  npx tsx scripts/smoke-test.ts
 * Prereq: Dev server running at http://localhost:3000
 */

const BASE = "http://localhost:3000";

// Known case UUIDs from CLAUDE.md
const CHEST_PAIN_CASE_ID = "fd4f4dda-88e5-454d-84ef-4fc0186c03c9";
const GI_CASE_ID = "f016e9bd-32ac-4a8f-b597-2aadd49fbf5c";

// Fake but valid-format UUIDs for testing 404s (not 500s)
const FAKE_USER_ID = "00000000-0000-4000-8000-000000000001";
const FAKE_SESSION_ID = "00000000-0000-4000-8000-000000000099";

interface TestResult {
  name: string;
  method: string;
  path: string;
  status: number;
  pass: boolean;
  note: string;
  ms: number;
}

const results: TestResult[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function test(
  name: string,
  method: string,
  path: string,
  opts: {
    body?: Record<string, unknown>;
    /** Status codes that count as PASS. Default: anything except 500-599 */
    acceptStatus?: number[];
  } = {}
): Promise<void> {
  const { body, acceptStatus } = opts;
  const url = `${BASE}${path}`;
  const start = Date.now();

  try {
    const fetchOpts: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (body && method !== "GET") {
      fetchOpts.body = JSON.stringify(body);
    }

    const res = await fetch(url, fetchOpts);
    const ms = Date.now() - start;

    // Consume body so connection is freed
    await res.text();

    const pass = acceptStatus
      ? acceptStatus.includes(res.status)
      : res.status < 500;

    results.push({ name, method, path, status: res.status, pass, note: "", ms });
  } catch (err: unknown) {
    const ms = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    results.push({
      name,
      method,
      path,
      status: 0,
      pass: false,
      note: `FETCH ERROR: ${message}`,
      ms,
    });
  }
}

// ---------------------------------------------------------------------------
// Discover real IDs from the database via Supabase REST
// ---------------------------------------------------------------------------

async function discoverIds(): Promise<{
  userId: string | null;
  caseId: string | null;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.log(
      "  (No Supabase env vars — will use known case UUIDs + fake user UUID)\n"
    );
    return { userId: null, caseId: CHEST_PAIN_CASE_ID };
  }

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  // Fetch a real student user
  let userId: string | null = null;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/fcm_users?role=eq.student&limit=1`,
      { headers }
    );
    const rows = (await res.json()) as { id: string }[];
    if (rows.length > 0) userId = rows[0].id;
  } catch {
    /* ignore */
  }

  // Fetch a real case
  let caseId: string | null = null;
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/fcm_cases?limit=1`,
      { headers }
    );
    const rows = (await res.json()) as { id: string }[];
    if (rows.length > 0) caseId = rows[0].id;
  } catch {
    /* ignore */
  }

  console.log(`  Discovered user_id : ${userId ?? "(none — using fake)"}`);
  console.log(`  Discovered case_id : ${caseId ?? CHEST_PAIN_CASE_ID}\n`);

  return {
    userId,
    caseId: caseId ?? CHEST_PAIN_CASE_ID,
  };
}

// ---------------------------------------------------------------------------
// Load .env.local so Supabase vars are available
// ---------------------------------------------------------------------------

async function loadEnv(): Promise<void> {
  const { readFileSync } = await import("fs");
  const { resolve } = await import("path");
  try {
    const envPath = resolve(process.cwd(), ".env.local");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx);
      const val = trimmed.slice(eqIdx + 1);
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // .env.local may not exist
  }
}

// ---------------------------------------------------------------------------
// Test Suites
// ---------------------------------------------------------------------------

async function runTests(): Promise<void> {
  console.log("========================================");
  console.log("  FCM Companion — API Smoke Tests");
  console.log("========================================\n");

  // Check dev server is reachable
  try {
    const probe = await fetch(BASE, { method: "HEAD" });
    if (!probe.ok && probe.status !== 308 && probe.status !== 307) {
      console.log(`WARNING: Dev server returned ${probe.status}. Tests may fail.\n`);
    }
  } catch {
    console.error(`ERROR: Cannot reach dev server at ${BASE}`);
    console.error("Start it with: npm run dev\n");
    process.exit(1);
  }

  await loadEnv();
  const { userId, caseId } = await discoverIds();
  const realUserId = userId ?? FAKE_USER_ID;
  const realCaseId = caseId ?? CHEST_PAIN_CASE_ID;

  // --------------------------------------------------------
  // 1. /api/submissions — POST (DB write)
  // --------------------------------------------------------
  await test("submissions POST (valid)", "POST", "/api/submissions", {
    body: {
      user_id: realUserId,
      case_id: realCaseId,
      diagnoses: [
        { diagnosis: "Smoke Test Diagnosis", sort_order: 0, confidence: 3 },
      ],
      status: "draft",
    },
  });

  await test("submissions POST (missing params)", "POST", "/api/submissions", {
    body: {},
    acceptStatus: [400],
  });

  // --------------------------------------------------------
  // 2. /api/notes — POST (DB write)
  // --------------------------------------------------------
  await test("notes POST (valid)", "POST", "/api/notes", {
    body: {
      user_id: realUserId,
      case_id: realCaseId,
      content: "Smoke test note",
    },
  });

  await test("notes POST (missing params)", "POST", "/api/notes", {
    body: {},
    acceptStatus: [400],
  });

  // --------------------------------------------------------
  // 3. /api/dashboard — GET
  // --------------------------------------------------------
  await test("dashboard GET (valid case_id)", "GET", `/api/dashboard?case_id=${realCaseId}`);

  await test("dashboard GET (missing case_id)", "GET", "/api/dashboard", {
    acceptStatus: [400],
  });

  await test("dashboard GET (invalid UUID)", "GET", "/api/dashboard?case_id=not-a-uuid", {
    acceptStatus: [400],
  });

  // --------------------------------------------------------
  // 4. /api/sentiments — POST + GET
  // --------------------------------------------------------
  await test("sentiments POST (valid)", "POST", "/api/sentiments", {
    body: {
      user_id: realUserId,
      case_id: realCaseId,
      sentiment: "confident",
    },
  });

  await test("sentiments POST (missing params)", "POST", "/api/sentiments", {
    body: {},
    acceptStatus: [400],
  });

  await test("sentiments POST (invalid sentiment)", "POST", "/api/sentiments", {
    body: {
      user_id: realUserId,
      case_id: realCaseId,
      sentiment: "meh",
    },
    acceptStatus: [400],
  });

  await test(
    "sentiments GET (valid)",
    "GET",
    `/api/sentiments?user_id=${realUserId}&case_id=${realCaseId}`
  );

  await test("sentiments GET (missing params)", "GET", "/api/sentiments", {
    acceptStatus: [400],
  });

  // --------------------------------------------------------
  // 5. /api/session-captures — POST + GET
  // --------------------------------------------------------
  await test("session-captures POST (valid)", "POST", "/api/session-captures", {
    body: {
      user_id: realUserId,
      case_id: realCaseId,
      takeaway: "Smoke test takeaway",
    },
  });

  await test("session-captures POST (missing params)", "POST", "/api/session-captures", {
    body: {},
    acceptStatus: [400],
  });

  await test(
    "session-captures GET (valid)",
    "GET",
    `/api/session-captures?user_id=${realUserId}&case_id=${realCaseId}`
  );

  await test("session-captures GET (missing params)", "GET", "/api/session-captures", {
    acceptStatus: [400],
  });

  // --------------------------------------------------------
  // 6. /api/themes — GET + POST + DELETE
  // --------------------------------------------------------
  await test("themes GET (no user_id)", "GET", "/api/themes");

  await test("themes GET (with user_id)", "GET", `/api/themes?user_id=${realUserId}`);

  await test("themes POST (valid)", "POST", "/api/themes", {
    body: {
      user_id: realUserId,
      name: "Smoke Test Theme",
      tokens: {
        primary: "#ff0000",
        background: "#ffffff",
        foreground: "#000000",
        card: "#f5f5f5",
        card_foreground: "#000000",
        border: "#cccccc",
        muted: "#eeeeee",
        muted_foreground: "#666666",
        sidebar: "#f0f0f0",
        radius: "0.5rem",
        font_body: "Inter",
        font_mono: "JetBrains Mono",
        shadow: "sm",
        border_width: "1",
        density: "default",
        button_style: "default",
        card_style: "default",
      },
      source_type: "preset",
      mood: "smoky",
    },
  });

  await test("themes POST (missing params)", "POST", "/api/themes", {
    body: {},
    acceptStatus: [400],
  });

  await test("themes DELETE (missing params)", "DELETE", "/api/themes", {
    body: {},
    acceptStatus: [400],
  });

  await test("themes DELETE (fake id)", "DELETE", "/api/themes", {
    body: {
      id: FAKE_SESSION_ID,
      user_id: FAKE_USER_ID,
    },
    // Should succeed (delete 0 rows is not an error) or 400
    acceptStatus: [200, 400],
  });

  // --------------------------------------------------------
  // 7. /api/osce-session — POST + GET
  // --------------------------------------------------------
  await test("osce-session POST (valid)", "POST", "/api/osce-session", {
    body: {
      user_id: realUserId,
      case_source: "practice",
      practice_case_id: "chest_pain_001",
    },
  });

  await test("osce-session POST (missing params)", "POST", "/api/osce-session", {
    body: {},
    acceptStatus: [400],
  });

  await test(
    "osce-session GET (valid user_id)",
    "GET",
    `/api/osce-session?user_id=${realUserId}`
  );

  await test("osce-session GET (missing user_id)", "GET", "/api/osce-session", {
    acceptStatus: [400],
  });

  // --------------------------------------------------------
  // 8. /api/osce-session/[id] — GET + PATCH
  // --------------------------------------------------------
  await test(
    "osce-session/[id] GET (fake id)",
    "GET",
    `/api/osce-session/${FAKE_SESSION_ID}`,
    { acceptStatus: [404] }
  );

  await test(
    "osce-session/[id] PATCH (fake id)",
    "PATCH",
    `/api/osce-session/${FAKE_SESSION_ID}`,
    {
      body: { status: "soap_note" },
      // 404 or 500 from Supabase returning no rows — both are acceptable
      // as long as the server doesn't crash unhandled
    }
  );

  // --------------------------------------------------------
  // 9. /api/extract-theme — POST (SKIPPED: Claude Vision call)
  //    Only test validation (missing image/url/preset returns 400)
  // --------------------------------------------------------
  await test(
    "extract-theme POST (missing all params — skip AI)",
    "POST",
    "/api/extract-theme",
    {
      body: {},
      acceptStatus: [400],
    }
  );

  await test(
    "extract-theme POST (unknown preset — skip AI)",
    "POST",
    "/api/extract-theme",
    {
      body: { preset: "nonexistent-preset" },
      acceptStatus: [400],
    }
  );

  await test(
    "extract-theme POST (valid preset — no AI call)",
    "POST",
    "/api/extract-theme",
    {
      body: { preset: "clinical-sharp" },
      acceptStatus: [200],
    }
  );

  // --------------------------------------------------------
  // 10. /api/feedback — POST (SKIPPED: Claude API call)
  //     Only test validation
  // --------------------------------------------------------
  await test(
    "feedback POST (missing params — skip AI)",
    "POST",
    "/api/feedback",
    {
      body: {},
      acceptStatus: [400],
    }
  );

  // --------------------------------------------------------
  // 11. /api/practice-feedback — POST (SKIPPED: Claude API call)
  //     Only test validation
  // --------------------------------------------------------
  await test(
    "practice-feedback POST (missing params — skip AI)",
    "POST",
    "/api/practice-feedback",
    {
      body: {},
      acceptStatus: [400],
    }
  );

  // --------------------------------------------------------
  // 12. /api/match-elements — POST (SKIPPED: Claude API call)
  //     With no API key it falls back to static matching, but
  //     this env has an API key. Send empty arrays to keep it cheap
  //     — actually this will call Claude. Send empty to test fallback.
  //     The fallback code path runs when ANTHROPIC_API_KEY is absent.
  //     Since we have the key, just test that empty arrays don't crash.
  // --------------------------------------------------------
  await test(
    "match-elements POST (empty arrays — skip AI, test no crash)",
    "POST",
    "/api/match-elements",
    {
      body: {
        studentHistoryEntries: [],
        studentExamEntries: [],
        historyElements: [],
        examElements: [],
      },
      // With API key this will call Claude with empty data — could be 200 or 500
      // Without API key it returns fallback. Either way, no 500 crash is the goal.
    }
  );

  // --------------------------------------------------------
  // 13. /api/osce-feedback — POST (SKIPPED: Claude API call)
  //     Only test validation
  // --------------------------------------------------------
  await test(
    "osce-feedback POST (missing params — skip AI)",
    "POST",
    "/api/osce-feedback",
    {
      body: {},
      acceptStatus: [400],
    }
  );

  await test(
    "osce-feedback POST (fake session_id — skip AI)",
    "POST",
    "/api/osce-feedback",
    {
      body: { session_id: FAKE_SESSION_ID },
      acceptStatus: [404],
    }
  );

  // --------------------------------------------------------
  // 14. /api/osce-chat — POST (SKIPPED: Claude API call)
  //     Only test validation
  // --------------------------------------------------------
  await test(
    "osce-chat POST (missing params — skip AI)",
    "POST",
    "/api/osce-chat",
    {
      body: {},
      acceptStatus: [400],
    }
  );

  // --------------------------------------------------------
  // 15. /api/osce-soap-context — POST (SKIPPED: Claude API call)
  //     Only test validation
  // --------------------------------------------------------
  await test(
    "osce-soap-context POST (missing params — skip AI)",
    "POST",
    "/api/osce-soap-context",
    {
      body: {},
      acceptStatus: [400],
    }
  );

  await test(
    "osce-soap-context POST (fake session — skip AI)",
    "POST",
    "/api/osce-soap-context",
    {
      body: { session_id: FAKE_SESSION_ID },
      acceptStatus: [404],
    }
  );

  // --------------------------------------------------------
  // 16. /api/plan-questions — POST (SKIPPED: Claude Haiku call)
  //     Only test validation
  // --------------------------------------------------------
  await test(
    "plan-questions POST (missing params — skip AI)",
    "POST",
    "/api/plan-questions",
    {
      body: {},
      acceptStatus: [400],
    }
  );

  // --------------------------------------------------------
  // Print results
  // --------------------------------------------------------
  printResults();
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function printResults(): void {
  console.log("\n========================================");
  console.log("  RESULTS");
  console.log("========================================\n");

  const nameWidth = 52;
  const methodWidth = 7;
  const statusWidth = 6;
  const msWidth = 7;
  const resultWidth = 6;

  const header = [
    "Test".padEnd(nameWidth),
    "Method".padEnd(methodWidth),
    "Status".padEnd(statusWidth),
    "Time".padEnd(msWidth),
    "Result".padEnd(resultWidth),
  ].join(" | ");

  const separator = "-".repeat(header.length);

  console.log(header);
  console.log(separator);

  for (const r of results) {
    const name = r.name.length > nameWidth ? r.name.slice(0, nameWidth - 1) + "~" : r.name.padEnd(nameWidth);
    const method = r.method.padEnd(methodWidth);
    const status = String(r.status || "ERR").padEnd(statusWidth);
    const ms = `${r.ms}ms`.padEnd(msWidth);
    const result = r.pass ? "PASS" : "FAIL";
    const resultPadded = result.padEnd(resultWidth);
    const line = `${name} | ${method} | ${status} | ${ms} | ${resultPadded}`;

    if (!r.pass) {
      // Red for failures
      console.log(`\x1b[31m${line}\x1b[0m`);
      if (r.note) {
        console.log(`\x1b[31m  -> ${r.note}\x1b[0m`);
      }
    } else {
      // Green for passes
      console.log(`\x1b[32m${line}\x1b[0m`);
    }
  }

  console.log(separator);

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  const total = results.length;

  console.log(`\nTotal: ${total} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    console.log("\n\x1b[31mFailed tests:\x1b[0m");
    for (const r of results.filter((r) => !r.pass)) {
      console.log(`  - ${r.name} (${r.method} ${r.path}) -> ${r.status}${r.note ? ` ${r.note}` : ""}`);
    }
    console.log("");
    process.exit(1);
  } else {
    console.log("\n\x1b[32mAll tests passed!\x1b[0m\n");
    process.exit(0);
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

runTests().catch((err) => {
  console.error("Unhandled error in smoke test runner:", err);
  process.exit(1);
});
