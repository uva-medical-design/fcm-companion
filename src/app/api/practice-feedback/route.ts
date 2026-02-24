import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: NextRequest) {
  try {
    const {
      diagnoses,
      correct_diagnosis,
      chief_complaint,
      patient_age,
      patient_gender,
      mode,
    } = await request.json();

    if (!diagnoses || !correct_diagnosis) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if student included the correct diagnosis (case-insensitive)
    const studentDiagLower = (diagnoses as string[]).map((d: string) =>
      d.toLowerCase().trim()
    );
    const correctLower = correct_diagnosis.toLowerCase().trim();
    const student_got_it =
      studentDiagLower.includes(correctLower) ||
      studentDiagLower.some(
        (d: string) => correctLower.includes(d) || d.includes(correctLower)
      );

    const demographics = [
      patient_age && `${patient_age}-year-old`,
      patient_gender,
    ]
      .filter(Boolean)
      .join(" ");

    // Try AI feedback, fall back to static
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const isSimulation = mode === "simulation";

    if (!apiKey) {
      const base = {
        narrative: student_got_it
          ? `You correctly identified ${correct_diagnosis}. Review the other diagnoses in your differential to understand what else could present similarly.`
          : `The correct diagnosis was ${correct_diagnosis}. Consider what clinical features would point toward this diagnosis and how it differs from your top choices.`,
        correct_diagnosis,
        student_got_it,
      };
      if (isSimulation) {
        return NextResponse.json({
          ...base,
          expert_reasoning: "",
          key_takeaways: [],
          common_pitfalls: [],
        });
      }
      return NextResponse.json(base);
    }

    const anthropic = new Anthropic({ apiKey });

    const basePrompt = `You are a supportive medical education AI assistant. A medical student just practiced building a differential diagnosis.

Case: ${demographics ? `${demographics} presenting with` : ""} ${chief_complaint}
Correct diagnosis: ${correct_diagnosis}
Student's differential: ${(diagnoses as string[]).join(", ")}
Student included correct answer: ${student_got_it ? "Yes" : "No"}`;

    if (isSimulation) {
      // Enriched simulation debrief
      const simPrompt = `${basePrompt}

Generate a comprehensive debrief in the following JSON format:
{
  "narrative": "3-5 categorized bullet points (each starting with 'Strength:', 'Consider:', or 'Can\\'t-miss:') as a single string with newlines",
  "expert_reasoning": "2-3 sentences explaining why the correct diagnosis fits this presentation, what key features point to it, and how to distinguish it from close alternatives",
  "key_takeaways": ["3-4 concise learning points about this case"],
  "common_pitfalls": ["2-3 common mistakes students make with this type of presentation"]
}

Rules for the narrative bullets:
- Start with a "Strength:" acknowledging what they did well
- Use "Consider:" for areas to explore
- If they missed the correct diagnosis, explain briefly why it fits
- Keep each bullet to 1-2 sentences
- Be warm and encouraging — like a supportive attending
- Do NOT mention scores or grades

Return ONLY valid JSON, no other text.`;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 800,
        messages: [{ role: "user", content: simPrompt }],
      });

      const responseText =
        message.content[0].type === "text" ? message.content[0].text : "";

      try {
        const jsonStr = responseText.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(jsonStr);
        return NextResponse.json({
          narrative: parsed.narrative || "",
          correct_diagnosis,
          student_got_it,
          expert_reasoning: parsed.expert_reasoning || "",
          key_takeaways: parsed.key_takeaways || [],
          common_pitfalls: parsed.common_pitfalls || [],
        });
      } catch {
        // If JSON parsing fails, use the raw text as narrative
        return NextResponse.json({
          narrative: responseText,
          correct_diagnosis,
          student_got_it,
          expert_reasoning: "",
          key_takeaways: [],
          common_pitfalls: [],
        });
      }
    }

    // Standard (non-simulation) feedback
    const prompt = `${basePrompt}

Generate 3-5 categorized bullet points of supportive feedback. Rules:
- Each bullet starts with "Strength:", "Consider:", or "Can't-miss:"
- Start with a "Strength:" acknowledging what they did well
- Use "Consider:" for areas to explore
- If they missed the correct diagnosis, explain briefly why it fits this presentation
- Keep each bullet to 1-2 sentences
- Be warm and encouraging — like a supportive attending
- Do NOT mention scores or grades
- Format: "- Category: Feedback sentence."`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    });

    const narrative =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({
      narrative,
      correct_diagnosis,
      student_got_it,
    });
  } catch (error) {
    console.error("Practice feedback error:", error);
    return NextResponse.json(
      { error: "Failed to generate feedback" },
      { status: 500 }
    );
  }
}
