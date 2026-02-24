import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { user_id, case_id, response_content, response_type } =
      await request.json();

    if (!user_id || !case_id || !response_content) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get case data
    const { data: caseData, error: caseError } = await supabase
      .from("fcm_cases")
      .select("*")
      .eq("id", case_id)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    // Get original submission for comparison
    const { data: originalSub } = await supabase
      .from("fcm_submissions")
      .select("diagnoses, feedback")
      .eq("user_id", user_id)
      .eq("case_id", case_id)
      .single();

    const originalDiagnoses =
      originalSub?.diagnoses?.map(
        (d: { diagnosis: string }) => d.diagnosis
      ) || [];
    const answerKeyDiagnoses =
      caseData.differential_answer_key?.map(
        (d: { diagnosis: string }) => d.diagnosis
      ) || [];

    const prompt = `You are a supportive medical education AI evaluating an OSCE practice response.

The student was asked to present their differential diagnosis for the following case:
Chief Complaint: ${caseData.chief_complaint}

The student's ${response_type === "voice" ? "spoken" : "typed"} response:
"${response_content}"

For reference, the answer key includes these diagnoses: ${answerKeyDiagnoses.join(", ")}
${originalDiagnoses.length > 0 ? `\nThe student's original submission included: ${originalDiagnoses.join(", ")}` : ""}

Evaluate the response and return a JSON object with this exact structure:
{
  "rubric": [
    { "category": "History Gathering", "score": <1-5>, "comment": "<1 sentence>" },
    { "category": "Physical Exam", "score": <1-5>, "comment": "<1 sentence>" },
    { "category": "Clinical Reasoning", "score": <1-5>, "comment": "<1 sentence>" },
    { "category": "Communication", "score": <1-5>, "comment": "<1 sentence>" }
  ],
  "narrative": "<3-4 sentences of supportive coach-like feedback. Note what they did well, what they could add, and whether they improved compared to their original submission if available. Be encouraging. End with one specific suggestion for improvement. Do NOT score or grade in the narrative.>"
}

Scoring guide:
- History Gathering: Did they mention relevant history, risk factors, or associated symptoms?
- Physical Exam: Did they reference expected findings or exams they would perform?
- Clinical Reasoning: Did they organize diagnoses logically (most likely first, can't-miss considered)?
- Communication: Was the response clear, structured, and professionally presented?

Return ONLY the JSON object, no other text.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse structured response
    let rubric = [];
    let narrative = rawText;
    try {
      const parsed = JSON.parse(rawText);
      rubric = parsed.rubric || [];
      narrative = parsed.narrative || rawText;
    } catch {
      // If JSON parsing fails, fall back to plain text narrative
      rubric = [];
      narrative = rawText;
    }

    // Save the OSCE response with structured evaluation
    const { data: osceResponse } = await supabase
      .from("fcm_osce_responses")
      .insert({
        user_id,
        case_id,
        response_type,
        response_content,
        evaluation: { rubric, narrative },
      })
      .select()
      .single();

    return NextResponse.json({
      rubric,
      narrative,
      evaluation: narrative, // backward compat
      response: osceResponse,
    });
  } catch (error) {
    console.error("OSCE evaluation error:", error);
    return NextResponse.json(
      { error: "Failed to evaluate response" },
      { status: 500 }
    );
  }
}
