import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase";
import { compareDifferential, buildFeedbackPrompt } from "@/lib/feedback";
import type { DiagnosisEntry, AnswerKeyEntry, FeedbackResult } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("ANTHROPIC_API_KEY is not set");
      return NextResponse.json(
        { error: "AI feedback is not configured. Please contact your instructor." },
        { status: 503 }
      );
    }

    const anthropic = new Anthropic({ apiKey });

    const { user_id, case_id } = await request.json();

    if (!user_id || !case_id) {
      return NextResponse.json(
        { error: "Missing user_id or case_id" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch submission and case data in parallel
    const [submissionResult, caseResult, settingsResult] = await Promise.all([
      supabase
        .from("fcm_submissions")
        .select("*")
        .eq("user_id", user_id)
        .eq("case_id", case_id)
        .single(),
      supabase.from("fcm_cases").select("*").eq("id", case_id).single(),
      supabase
        .from("fcm_settings")
        .select("value")
        .eq("key", "feedback_mode")
        .single(),
    ]);

    if (submissionResult.error || !submissionResult.data) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    if (caseResult.error || !caseResult.data) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const submission = submissionResult.data;
    const caseData = caseResult.data;
    const feedbackMode =
      (settingsResult.data?.value as string) || "combined";

    const studentDiagnoses: DiagnosisEntry[] = submission.diagnoses || [];
    const answerKey: AnswerKeyEntry[] = caseData.differential_answer_key || [];

    // Step 1: Deterministic comparison
    const comparison = compareDifferential(studentDiagnoses, answerKey);
    comparison.feedback_mode = feedbackMode;

    // Step 2: AI narrative
    const prompt = buildFeedbackPrompt(
      comparison,
      caseData.chief_complaint,
      feedbackMode
    );

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const aiNarrative =
      message.content[0].type === "text" ? message.content[0].text : "";

    const feedback: FeedbackResult = {
      ...comparison,
      ai_narrative: aiNarrative,
    };

    // Save feedback to submission
    await supabase
      .from("fcm_submissions")
      .update({
        feedback,
        feedback_generated_at: new Date().toISOString(),
      })
      .eq("user_id", user_id)
      .eq("case_id", case_id);

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Feedback generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate feedback" },
      { status: 500 }
    );
  }
}
