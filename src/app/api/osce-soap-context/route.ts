import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase";
import { buildSoapContextPrompt } from "@/lib/osce-soap";
import SOAP_CONTEXTS from "@/data/osce-soap-contexts.json";
import type { SoapContext } from "@/types";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { session_id } = await request.json();

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
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

    // Practice cases: instant static lookup — no API call needed
    if (session.case_source === "practice" && session.practice_case_id) {
      const ctx = (SOAP_CONTEXTS as Record<string, SoapContext>)[session.practice_case_id];
      if (ctx) return NextResponse.json(ctx);
    }

    // Scheduled/custom cases: fall back to Claude generation
    let chiefComplaint = "";
    let correctDiagnosis = "";
    let fullCaseData: Record<string, unknown> = {};

    if (session.case_id) {
      const { data: caseData } = await supabase
        .from("fcm_cases")
        .select("*")
        .eq("id", session.case_id)
        .single();

      if (caseData) {
        chiefComplaint = caseData.chief_complaint;
        correctDiagnosis = caseData.differential_answer_key?.[0]?.diagnosis || "";
        fullCaseData = caseData.full_case_data || {};
      }
    }

    const prompt = buildSoapContextPrompt(chiefComplaint, correctDiagnosis, fullCaseData);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    try {
      const jsonText = responseText.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
      const parsed = JSON.parse(jsonText);
      const toStr = (v: unknown) => {
        if (Array.isArray(v)) return v.map((s) => `• ${String(s).replace(/^[•\-]\s*/, "")}`).join("\n");
        if (typeof v === "string") return v;
        return "• No data available";
      };
      return NextResponse.json({
        subjective: toStr(parsed.subjective),
        objective: toStr(parsed.objective),
      });
    } catch {
      return NextResponse.json(
        { error: "Failed to generate SOAP context" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("OSCE SOAP context error:", error);
    return NextResponse.json(
      { error: "Failed to generate SOAP context" },
      { status: 500 }
    );
  }
}
