import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase";
import { compareOscePerformance, buildOsceFeedbackPrompt } from "@/lib/osce-feedback";
import { PRACTICE_CASES } from "@/data/practice-cases";
import type {
  OsceSession,
  DoorPrepData,
  SoapNoteData,
  AnswerKeyEntry,
  OSCEFeedbackResult,
  PracticeCase,
} from "@/types";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json();

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Fetch session
    const { data: session, error: sessError } = await supabase
      .from("fcm_osce_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Return cached feedback if already generated
    if (session.feedback) {
      return NextResponse.json({ feedback: session.feedback });
    }

    const sess = session as OsceSession;
    const doorPrep = (sess.door_prep || { diagnoses: [] }) as DoorPrepData;
    const soapNote = (sess.soap_note || {
      subjective_review: "",
      objective_review: "",
      diagnoses: [],
    }) as SoapNoteData;

    // Resolve case data for answer key
    let chiefComplaint = "";
    let correctDiagnosis = "";
    let answerKey: AnswerKeyEntry[] = [];

    if (sess.case_source === "practice" && sess.practice_case_id) {
      const pc = PRACTICE_CASES.find((c: PracticeCase) => c.id === sess.practice_case_id);
      if (pc) {
        chiefComplaint = pc.chief_complaint;
        correctDiagnosis = pc.correct_diagnosis;
        // Practice cases don't have a structured answer key, so we create a minimal one
        answerKey = [
          {
            diagnosis: pc.correct_diagnosis,
            tier: "most_likely" as const,
            vindicate_category: "E",
            is_common: true,
            is_cant_miss: true,
            aliases: [],
          },
        ];
      }
    } else if (sess.case_id) {
      const { data: caseData } = await supabase
        .from("fcm_cases")
        .select("*")
        .eq("id", sess.case_id)
        .single();

      if (caseData) {
        chiefComplaint = caseData.chief_complaint;
        answerKey = caseData.differential_answer_key || [];
        correctDiagnosis = answerKey[0]?.diagnosis || "";
      }
    }

    // Deterministic comparison
    const comparison = compareOscePerformance(
      doorPrep,
      soapNote,
      answerKey,
      correctDiagnosis
    );

    // Build prompt and call Claude
    const prompt = buildOsceFeedbackPrompt(
      comparison,
      doorPrep,
      soapNote,
      chiefComplaint,
      correctDiagnosis
    );

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let feedback: OSCEFeedbackResult;

    try {
      // Strip markdown fences if Claude wraps the JSON
      const jsonText = responseText.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
      const parsed = JSON.parse(jsonText);
      feedback = {
        rubric_scores: parsed.rubric_scores || [],
        ai_narrative: "",
        strengths: parsed.strengths || [],
        improvements: parsed.improvements || [],
        cant_miss: parsed.cant_miss || [],
        recommended_resources: [],
      };
    } catch {
      // Fallback: surface a safe generic message
      feedback = {
        rubric_scores: [],
        ai_narrative: "",
        strengths: ["You completed the full OSCE workflow — good practice!"],
        improvements: ["Try another case to build your differential skills."],
        cant_miss: [],
        recommended_resources: [],
      };
    }

    // Cache feedback in session
    await supabase
      .from("fcm_osce_sessions")
      .update({
        feedback,
        feedback_generated_at: new Date().toISOString(),
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", session_id);

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("OSCE feedback error:", error);
    return NextResponse.json(
      { error: "Failed to generate feedback" },
      { status: 500 }
    );
  }
}
