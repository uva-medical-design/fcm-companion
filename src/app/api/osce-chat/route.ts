import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase";
import { PRACTICE_CASES } from "@/data/practice-cases";
import type { OsceSession, PracticeCase } from "@/types";

const anthropic = new Anthropic();

type Phase = "door_prep" | "soap_note" | "feedback";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(
  phase: Phase,
  chiefComplaint: string,
  demographics: string,
  vitals: string,
  currentEntries: string,
  answerKey?: string
): string {
  const phaseLabel =
    phase === "door_prep"
      ? "Door Prep"
      : phase === "soap_note"
        ? "SOAP Note"
        : "Feedback Review";

  return `You are a kind, encouraging clinical teaching attending guiding an M1-M2 medical student through OSCE preparation. Use the Socratic method — ask guiding questions, never give direct answers.

RULES:
- Never name diagnoses, specific PE maneuvers, or plan items directly
- Ask ONE question at a time
- Keep responses to 1-3 sentences maximum
- Reference what the student has already entered to make guidance specific
- Use VINDICATE (Vascular, Infectious, Neoplastic, Degenerative, Iatrogenic, Congenital, Autoimmune/Allergic, Traumatic, Endocrine/Metabolic) as a scaffolding tool when appropriate
- Be warm and encouraging — reduce anxiety, build confidence
- If the student asks you to just tell them, gently redirect: "Let's work through this together — " followed by a narrower guiding question
- If the student asks an off-topic question, redirect: "Great question to look up after — for now, let's focus on your clinical reasoning. [narrower question]"

CURRENT PHASE: ${phaseLabel}
CASE: ${chiefComplaint}${demographics ? ` | ${demographics}` : ""}${vitals ? ` | Vitals: ${vitals}` : ""}
STUDENT'S CURRENT WORK: ${currentEntries || "Nothing entered yet."}${answerKey ? `\nANSWER KEY (for reflection guidance only): ${answerKey}` : ""}`;
}

export async function POST(request: NextRequest) {
  try {
    const { session_id, phase, message, conversation_history, current_entries } =
      (await request.json()) as {
        session_id: string;
        phase: Phase;
        message: string;
        conversation_history: ChatMessage[];
        current_entries?: string;
      };

    if (!session_id || !phase || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: session, error: sessError } = await supabase
      .from("fcm_osce_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (sessError || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sess = session as OsceSession;

    let chiefComplaint = "";
    let demographics = "";
    let vitals = "";
    let answerKey = "";

    if (sess.case_source === "practice" && sess.practice_case_id) {
      const pc = PRACTICE_CASES.find(
        (c: PracticeCase) => c.id === sess.practice_case_id
      );
      if (pc) {
        chiefComplaint = pc.chief_complaint;
        demographics = [
          pc.patient_age ? `${pc.patient_age}yo` : "",
          pc.patient_gender ?? "",
        ]
          .filter(Boolean)
          .join(" ");
        vitals = pc.vitals
          ? Object.entries(pc.vitals)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")
          : "";
        if (phase === "feedback") {
          answerKey = pc.correct_diagnosis;
        }
      }
    } else if (sess.case_id) {
      const { data: caseData } = await supabase
        .from("fcm_cases")
        .select(
          "chief_complaint, patient_age, patient_gender, vitals, differential_answer_key"
        )
        .eq("id", sess.case_id)
        .single();

      if (caseData) {
        chiefComplaint = caseData.chief_complaint;
        demographics = [
          caseData.patient_age ? `${caseData.patient_age}yo` : "",
          caseData.patient_gender ?? "",
        ]
          .filter(Boolean)
          .join(" ");
        vitals = caseData.vitals
          ? Object.entries(caseData.vitals as Record<string, string>)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")
          : "";
        if (phase === "feedback" && caseData.differential_answer_key) {
          answerKey = (
            caseData.differential_answer_key as { diagnosis: string }[]
          )
            .map((d) => d.diagnosis)
            .join(", ");
        }
      }
    }

    const systemPrompt = buildSystemPrompt(
      phase,
      chiefComplaint,
      demographics,
      vitals,
      current_entries ?? "",
      answerKey || undefined
    );

    const trimmedHistory = conversation_history.slice(-6);

    const claudeResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 150,
      system: systemPrompt,
      messages: [
        ...trimmedHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: message },
      ],
    });

    const responseText =
      claudeResponse.content[0].type === "text"
        ? claudeResponse.content[0].text
        : "";

    // Fire-and-forget: increment interaction count
    const currentCount = sess.chat_interactions_count ?? 0;
    void supabase
      .from("fcm_osce_sessions")
      .update({ chat_interactions_count: currentCount + 1 })
      .eq("id", session_id)
      .then(() => {});

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error("OSCE chat error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
