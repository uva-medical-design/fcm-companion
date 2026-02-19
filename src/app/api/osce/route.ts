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

Evaluate the response on three dimensions:
1. **Coverage** — How many of the key diagnoses did they recall?
2. **Organization** — Did they present in a logical order (most likely first, then can't-miss)?
3. **Clinical Reasoning** — Did they show any reasoning about why diagnoses are included?

Provide 3-4 sentences of supportive feedback. Note what they did well, what they could add, and whether they improved compared to their original submission (if available). Be encouraging and coach-like. Do NOT score or grade. End with one specific suggestion for improvement.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const evaluation =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Save the OSCE response
    const { data: osceResponse } = await supabase
      .from("fcm_osce_responses")
      .insert({
        user_id,
        case_id,
        response_type,
        response_content,
        evaluation: { text: evaluation },
      })
      .select()
      .single();

    return NextResponse.json({ evaluation, response: osceResponse });
  } catch (error) {
    console.error("OSCE evaluation error:", error);
    return NextResponse.json(
      { error: "Failed to evaluate response" },
      { status: 500 }
    );
  }
}
