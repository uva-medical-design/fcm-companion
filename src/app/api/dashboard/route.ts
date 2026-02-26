import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { DiagnosisEntry, AnswerKeyEntry } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caseId = searchParams.get("case_id");

    if (!caseId) {
      return NextResponse.json(
        { error: "Missing case_id" },
        { status: 400 }
      );
    }

    // Validate UUID format to prevent Postgres errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(caseId)) {
      return NextResponse.json(
        { error: "Invalid case_id format" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get the case (for answer key)
    const { data: caseData } = await supabase
      .from("fcm_cases")
      .select("*")
      .eq("id", caseId)
      .single();

    // Get all submissions for this case
    const { data: submissions, error } = await supabase
      .from("fcm_submissions")
      .select("*, fcm_users(name, fcm_group)")
      .eq("case_id", caseId)
      .in("status", ["submitted", "resubmitted"]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get total students
    const { count: totalStudents } = await supabase
      .from("fcm_users")
      .select("*", { count: "exact", head: true })
      .eq("role", "student");

    // Get flagged notes for this case (includes both questions and topic votes)
    const { data: flaggedNotes } = await supabase
      .from("fcm_notes")
      .select("content, fcm_users(name)")
      .eq("case_id", caseId)
      .eq("is_sent_to_instructor", true);

    // Get sentiments for this case
    const { data: sentiments } = await supabase
      .from("fcm_sentiments")
      .select("sentiment")
      .eq("case_id", caseId);

    // Get session captures for this case
    const { data: captures } = await supabase
      .from("fcm_session_captures")
      .select("takeaway")
      .eq("case_id", caseId);

    // Separate topic votes from regular questions
    const topicVoteCounts: Record<string, number> = {};
    const regularQuestions: typeof flaggedNotes = [];

    for (const note of flaggedNotes || []) {
      if (note.content?.startsWith("[TOPIC VOTE]")) {
        const afterPrefix = note.content.slice("[TOPIC VOTE] ".length);
        const pipeIndex = afterPrefix.indexOf(" | Free text:");
        const topicsStr = pipeIndex >= 0 ? afterPrefix.slice(0, pipeIndex) : afterPrefix;
        const topics = topicsStr.split(",").map((t: string) => t.trim()).filter(Boolean);
        for (const topic of topics) {
          topicVoteCounts[topic] = (topicVoteCounts[topic] || 0) + 1;
        }
      } else {
        regularQuestions.push(note);
      }
    }

    // Compute diagnosis frequency
    const diagnosisFrequency: Record<string, number> = {};
    const vindicateStudents: Record<string, Set<string>> = {};
    let cantMissHitCount = 0;
    let cantMissTotalChecked = 0;

    // For can't-miss details: track per-diagnosis student hits
    const answerKey: AnswerKeyEntry[] = caseData?.differential_answer_key || [];
    const cantMissEntries = answerKey.filter((e) => e.is_cant_miss);
    const cantMissStudentHits: Record<string, Set<string>> = {};
    for (const entry of cantMissEntries) {
      cantMissStudentHits[entry.diagnosis] = new Set();
    }

    // For diagnosis_by_tier: track per-answer-key-diagnosis student hits
    const answerKeyStudentHits: Record<string, Set<string>> = {};
    for (const entry of answerKey) {
      answerKeyStudentHits[entry.diagnosis] = new Set();
    }

    // Collect confidence calibration data
    const calibrationPoints: { label: string; confidence: number; wasCorrect: boolean }[] = [];

    for (const sub of submissions || []) {
      const userId: string = sub.user_id;
      const diagnoses: DiagnosisEntry[] = sub.diagnoses || [];

      // Build a set of normalized student diagnoses for matching
      const studentDiagNorm = new Set(
        diagnoses.map((d) => d.diagnosis.toLowerCase().trim())
      );

      for (const d of diagnoses) {
        const key = d.diagnosis.toLowerCase().trim();
        diagnosisFrequency[key] = (diagnosisFrequency[key] || 0) + 1;
        const cats = d.vindicate_categories ?? (d.vindicate_category ? [d.vindicate_category] : []);
        for (const cat of cats) {
          if (!vindicateStudents[cat]) vindicateStudents[cat] = new Set();
          vindicateStudents[cat].add(userId);
        }
      }

      // Match student diagnoses against answer key entries
      for (const entry of answerKey) {
        const allNames = [entry.diagnosis, ...entry.aliases].map((n) => n.toLowerCase().trim());
        const matched = allNames.some((name) => studentDiagNorm.has(name));
        if (matched) {
          answerKeyStudentHits[entry.diagnosis]?.add(userId);
          if (entry.is_cant_miss) {
            cantMissStudentHits[entry.diagnosis]?.add(userId);
          }
        }
      }

      // Collect calibration data from diagnoses with confidence ratings
      for (const d of diagnoses) {
        if (d.confidence && d.confidence >= 1) {
          const dNorm = d.diagnosis.toLowerCase().trim();
          const matchedKey = answerKey.some((entry) =>
            [entry.diagnosis, ...entry.aliases]
              .map((n) => n.toLowerCase().trim())
              .includes(dNorm)
          );
          calibrationPoints.push({
            label: d.diagnosis,
            confidence: d.confidence,
            wasCorrect: matchedKey,
          });
        }
      }

      // Count can't-miss hits from feedback
      if (sub.feedback?.cant_miss_hit) {
        cantMissHitCount += sub.feedback.cant_miss_hit.length;
      }
      if (sub.feedback?.cant_miss_missed) {
        cantMissTotalChecked +=
          sub.feedback.cant_miss_hit.length +
          sub.feedback.cant_miss_missed.length;
      }
    }

    // Convert sets to counts for the response
    const vindicateCoverage: Record<string, number> = {};
    for (const [cat, students] of Object.entries(vindicateStudents)) {
      vindicateCoverage[cat] = students.size;
    }

    // Sort diagnosis frequency by count
    const sortedDiagnoses = Object.entries(diagnosisFrequency)
      .sort(([, a], [, b]) => b - a)
      .map(([diagnosis, count]) => ({ diagnosis, count }));

    // Can't-miss details
    const subCount = submissions?.length || 0;
    const cantMissDetails = cantMissEntries.map((entry) => ({
      diagnosis: entry.diagnosis,
      hit_count: cantMissStudentHits[entry.diagnosis]?.size || 0,
      total: subCount,
    }));

    // VINDICATE gaps — categories with 0% student coverage
    const allCategories = ["V", "I", "N", "D", "I2", "C", "A", "T", "E"];
    const vindicateGaps = allCategories.filter(
      (cat) => !vindicateStudents[cat] || vindicateStudents[cat].size === 0
    );

    // Diagnosis by tier
    const tiers = ["most_likely", "moderate", "less_likely", "unlikely_important"] as const;
    const diagnosisByTier: Record<string, { diagnosis: string; hit_count: number; total: number }[]> = {};
    for (const tier of tiers) {
      diagnosisByTier[tier] = answerKey
        .filter((e) => e.tier === tier)
        .map((e) => ({
          diagnosis: e.diagnosis,
          hit_count: answerKeyStudentHits[e.diagnosis]?.size || 0,
          total: subCount,
        }));
    }

    // Sentiment summary
    const sentimentSummary: Record<string, number> = { confident: 0, uncertain: 0, lost: 0 };
    for (const s of sentiments || []) {
      if (s.sentiment in sentimentSummary) {
        sentimentSummary[s.sentiment]++;
      }
    }

    // Suggested focus (heuristic)
    const suggestedFocus: string[] = [];
    for (const detail of cantMissDetails) {
      if (detail.total > 0 && detail.hit_count / detail.total < 0.5) {
        suggestedFocus.push(
          `Review ${detail.diagnosis} — missed by ${detail.total - detail.hit_count} of ${detail.total} students`
        );
      }
    }
    for (const gap of vindicateGaps) {
      const catLabel = { V: "Vascular", I: "Infectious", N: "Neoplastic", D: "Degenerative", I2: "Iatrogenic", C: "Congenital", A: "Autoimmune", T: "Traumatic", E: "Endocrine/Metabolic" }[gap] || gap;
      suggestedFocus.push(`No one considered ${catLabel} causes`);
    }
    const sortedTopics = Object.entries(topicVoteCounts).sort(([, a], [, b]) => b - a);
    if (sortedTopics.length > 0 && sortedTopics[0][1] >= 2) {
      suggestedFocus.push(`Students want to discuss ${sortedTopics[0][0]}`);
    }

    // Session captures (anonymized)
    const sessionCaptures = (captures || [])
      .map((c) => c.takeaway)
      .filter(Boolean);

    return NextResponse.json({
      submission_count: subCount,
      total_students: totalStudents || 0,
      diagnosis_frequency: sortedDiagnoses,
      vindicate_coverage: vindicateCoverage,
      cant_miss_rate:
        cantMissTotalChecked > 0
          ? Math.round((cantMissHitCount / cantMissTotalChecked) * 100)
          : null,
      cant_miss_details: cantMissDetails,
      vindicate_gaps: vindicateGaps,
      diagnosis_by_tier: diagnosisByTier,
      sentiment_summary: sentimentSummary,
      suggested_focus: suggestedFocus.slice(0, 3),
      session_captures: sessionCaptures,
      flagged_questions:
        regularQuestions?.map((n) => ({
          content: n.content,
          student: "Anonymous",
        })) || [],
      topic_votes: topicVoteCounts,
      confidence_calibration: calibrationPoints,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
