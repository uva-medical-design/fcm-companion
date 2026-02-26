import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase";
import type { OsceSession, OsceFeedbackResult } from "@/types/osce";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json();

    if (!session_id) {
      return NextResponse.json(
        { error: "Missing required field: session_id" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Fetch the session
    const { data: session, error: sessionError } = await supabase
      .from("fcm_osce_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const typedSession = session as OsceSession;

    if (!typedSession.door_prep || !typedSession.soap_note) {
      return NextResponse.json(
        { error: "Session must have both door prep and SOAP note completed" },
        { status: 400 }
      );
    }

    // Build the door prep summary
    const doorPrepDiagnoses = typedSession.door_prep.diagnoses
      .map(
        (d, i) =>
          `${i + 1}. ${d.diagnosis} (confidence: ${d.confidence}/5)\n   History questions: ${d.historyQuestions.join("; ") || "none"}\n   PE maneuvers: ${d.peManeuvers.join("; ") || "none"}`
      )
      .join("\n");

    // Build the SOAP note summary
    const soapDiagnoses = typedSession.soap_note.diagnoses
      .map(
        (d, i) =>
          `${i + 1}. ${d.diagnosis} (confidence: ${d.confidence}/5)\n   Supporting evidence: ${d.supportingEvidence.join("; ") || "none"}\n   Diagnostic plan: ${d.diagnosticPlan.join("; ") || "none"}\n   Therapeutic plan: ${d.therapeuticPlan.join("; ") || "none"}`
      )
      .join("\n");

    const prompt = `You are a supportive attending physician evaluating a medical student's OSCE performance. You are reviewing their structured clinical reasoning through two phases: Door Prep (pre-encounter planning) and SOAP Note (post-encounter assessment).

## Case Context
Practice Case ID: ${typedSession.practice_case_id || "unknown"}

## Phase 1: Door Prep (Pre-Encounter Planning)
The student reviewed the door information and built an initial differential with planned history and physical exam approach:
${doorPrepDiagnoses}

## Phase 2: SOAP Note (Post-Encounter Assessment)
Subjective: ${typedSession.soap_note.subjective || "(not provided)"}
Objective: ${typedSession.soap_note.objective || "(not provided)"}

Revised differential with evidence mapping:
${soapDiagnoses}

## Instructions
Evaluate the student's clinical reasoning and return a JSON object with this exact structure:
{
  "rubric": [
    { "category": "Differential Diagnosis", "rating": "<excellent|good|developing|needs_work>", "comment": "<1-2 sentences evaluating breadth, organization, and appropriateness of their differential>" },
    { "category": "History Taking", "rating": "<excellent|good|developing|needs_work>", "comment": "<1-2 sentences on their planned history questions and how well they targeted key distinguishing features>" },
    { "category": "Physical Exam", "rating": "<excellent|good|developing|needs_work>", "comment": "<1-2 sentences on their planned PE maneuvers and clinical relevance>" },
    { "category": "Diagnostic Workup", "rating": "<excellent|good|developing|needs_work>", "comment": "<1-2 sentences on their diagnostic plans — labs, imaging, tests ordered>" },
    { "category": "Treatment Planning", "rating": "<excellent|good|developing|needs_work>", "comment": "<1-2 sentences on therapeutic plans — appropriateness, completeness>" }
  ],
  "strengths": ["<2-3 specific things the student did well>"],
  "improvements": ["<2-3 specific, actionable suggestions for improvement>"],
  "dont_miss": ["<1-2 critical diagnoses or findings they may have overlooked, or empty array if thorough>"],
  "overall_comment": "<3-4 sentences of supportive, attending-style feedback. Acknowledge effort, highlight growth from door prep to SOAP note, and give one key takeaway for next time.>"
}

Rating guide:
- excellent: Thorough, well-organized, demonstrates strong clinical reasoning
- good: Solid approach with minor gaps or areas for refinement
- developing: Shows understanding but missing important elements
- needs_work: Significant gaps in approach or reasoning

Be encouraging and educational. Focus on clinical reasoning process, not just correctness. Return ONLY the JSON object.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let feedback: OsceFeedbackResult;
    try {
      feedback = JSON.parse(rawText);
    } catch {
      // Fallback if JSON parsing fails
      feedback = {
        rubric: [],
        strengths: ["Completed the full OSCE workflow"],
        improvements: ["Unable to parse detailed feedback — please try again"],
        dont_miss: [],
        overall_comment: rawText,
      };
    }

    // Save feedback to session
    const now = new Date().toISOString();
    const { data: updatedSession, error: updateError } = await supabase
      .from("fcm_osce_sessions")
      .update({
        feedback,
        feedback_generated_at: now,
        status: "completed",
        completed_at: now,
        updated_at: now,
      })
      .eq("id", session_id)
      .select()
      .single();

    if (updateError) {
      console.error("Failed to save feedback:", updateError);
      // Still return the feedback even if save fails
      return NextResponse.json({ feedback });
    }

    return NextResponse.json({ feedback, session: updatedSession });
  } catch (error) {
    console.error("OSCE feedback error:", error);
    return NextResponse.json(
      { error: "Failed to generate feedback" },
      { status: 500 }
    );
  }
}
