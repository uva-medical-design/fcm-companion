import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

interface QuestionItem {
  category: string;
  question: string;
}

const FALLBACK_QUESTIONS: QuestionItem[] = [
  { category: "Onset", question: "When did this first begin, and was the onset sudden or gradual?" },
  { category: "Location", question: "Where exactly do you feel the symptom, and does it radiate anywhere?" },
  { category: "Duration", question: "How long does each episode last, and how often does it occur?" },
  { category: "Character", question: "How would you describe the quality of the symptom (sharp, dull, burning, pressure)?" },
  { category: "Aggravating", question: "What activities or positions make it worse?" },
  { category: "Relieving", question: "What have you tried that makes it better (rest, medications, position changes)?" },
  { category: "Associated", question: "Have you noticed any other symptoms occurring at the same time?" },
  { category: "Severity", question: "On a scale of 1 to 10, how severe is it at its worst and at its best?" },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chief_complaint, body_system, patient_age, patient_gender } = body as {
      chief_complaint: string;
      body_system?: string;
      patient_age?: number;
      patient_gender?: string;
    };

    if (!chief_complaint) {
      return NextResponse.json(
        { error: "Missing chief_complaint" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Return fallback questions if no API key
      return NextResponse.json({ questions: FALLBACK_QUESTIONS });
    }

    const anthropic = new Anthropic({ apiKey });

    const patientContext = [
      patient_age ? `${patient_age}-year-old` : "",
      patient_gender || "",
      `presenting with ${chief_complaint}`,
      body_system ? `(${body_system} system)` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `You are a clinical skills instructor helping a medical student prepare targeted history questions for a patient encounter.

Patient: ${patientContext}

Generate exactly 8 focused history questions the student should plan to ask. Each question should target a specific clinical category relevant to this presentation.

Return ONLY a JSON array with objects containing "category" (short label like "Onset", "Character", "PMH", "Medications", "Social", "Family", "Review of Systems", "Red Flags") and "question" (the actual question to ask the patient).

Format: [{"category":"...","question":"..."},...]

Return ONLY valid JSON, no other text.`,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    const jsonStr = responseText
      .replace(/```json?\s*/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(jsonStr) as QuestionItem[];

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ questions: FALLBACK_QUESTIONS });
    }

    return NextResponse.json({ questions: parsed.slice(0, 8) });
  } catch (error) {
    console.error("Plan questions error:", error);
    // Return fallback on any error
    return NextResponse.json({ questions: FALLBACK_QUESTIONS });
  }
}
