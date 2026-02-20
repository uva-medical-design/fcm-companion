import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { DiagnosisEntry } from "@/types";

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

    const supabase = createServerClient();

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

    // Separate topic votes from regular questions
    const topicVoteCounts: Record<string, number> = {};
    const regularQuestions: typeof flaggedNotes = [];

    for (const note of flaggedNotes || []) {
      if (note.content?.startsWith("[TOPIC VOTE]")) {
        // Parse: "[TOPIC VOTE] Topic1, Topic2 | Free text: "...""
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
    // Track distinct students per VINDICATE category (prevents >100%)
    const vindicateStudents: Record<string, Set<string>> = {};
    let cantMissHitCount = 0;
    let cantMissTotalChecked = 0;

    for (const sub of submissions || []) {
      const userId: string = sub.user_id;
      const diagnoses: DiagnosisEntry[] = sub.diagnoses || [];
      for (const d of diagnoses) {
        const key = d.diagnosis.toLowerCase().trim();
        diagnosisFrequency[key] = (diagnosisFrequency[key] || 0) + 1;
        // Support new array field and legacy single-string field
        const cats = d.vindicate_categories ?? (d.vindicate_category ? [d.vindicate_category] : []);
        for (const cat of cats) {
          if (!vindicateStudents[cat]) vindicateStudents[cat] = new Set();
          vindicateStudents[cat].add(userId);
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

    return NextResponse.json({
      submission_count: submissions?.length || 0,
      total_students: totalStudents || 0,
      diagnosis_frequency: sortedDiagnoses,
      vindicate_coverage: vindicateCoverage,
      cant_miss_rate:
        cantMissTotalChecked > 0
          ? Math.round((cantMissHitCount / cantMissTotalChecked) * 100)
          : null,
      flagged_questions:
        regularQuestions?.map((n) => ({
          content: n.content,
          student: "Anonymous",
        })) || [],
      topic_votes: topicVoteCounts,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
