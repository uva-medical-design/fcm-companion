import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

interface Element {
  id: string;
  text: string;
  importance: "key" | "supporting" | "minor";
}

interface MatchOutput {
  elementId: string;
  elementText: string;
  importance: "key" | "supporting" | "minor";
  status: "matched" | "partial" | "missed";
  matchedText?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { studentHistoryEntries, studentExamEntries, historyElements, examElements } =
      await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Fallback: simple substring matching if no API key
    if (!apiKey) {
      return NextResponse.json({
        historyMatches: fallbackMatch(studentHistoryEntries || [], historyElements || []),
        examMatches: fallbackMatch(studentExamEntries || [], examElements || []),
      });
    }

    const anthropic = new Anthropic({ apiKey });

    const prompt = `You are a medical education assessment tool. A student was asked to identify relevant history questions and exam findings for a clinical case.

STUDENT'S HISTORY ENTRIES:
${(studentHistoryEntries || []).map((e: string, i: number) => `${i + 1}. ${e}`).join("\n") || "(none)"}

STUDENT'S EXAM ENTRIES:
${(studentExamEntries || []).map((e: string, i: number) => `${i + 1}. ${e}`).join("\n") || "(none)"}

CANONICAL HISTORY ELEMENTS:
${(historyElements || []).map((e: Element) => `- [${e.id}] (${e.importance}): ${e.text}`).join("\n") || "(none)"}

CANONICAL EXAM ELEMENTS:
${(examElements || []).map((e: Element) => `- [${e.id}] (${e.importance}): ${e.text}`).join("\n") || "(none)"}

For each canonical element, determine if the student identified it:
- "matched": Student clearly identified this element (even with different wording)
- "partial": Student partially addressed this but missed key details
- "missed": Student did not identify this element

Return a JSON object with two arrays:
{
  "historyMatches": [
    { "elementId": "...", "status": "matched|partial|missed", "matchedText": "student entry that matched (if any)" }
  ],
  "examMatches": [
    { "elementId": "...", "status": "matched|partial|missed", "matchedText": "student entry that matched (if any)" }
  ]
}

Be generous in matching — if the student's intent aligns with the canonical element, mark it as matched. Only mark "missed" if there's no corresponding student entry. Return ONLY valid JSON, no other text.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    // Parse JSON from response (handle markdown code blocks)
    const jsonStr = responseText.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    // Enrich with element text and importance
    const historyMatchesRaw = parsed.historyMatches || [];
    const examMatchesRaw = parsed.examMatches || [];

    const historyMatches: MatchOutput[] = (historyElements || []).map((el: Element) => {
      const match = historyMatchesRaw.find((m: { elementId: string }) => m.elementId === el.id);
      return {
        elementId: el.id,
        elementText: el.text,
        importance: el.importance,
        status: match?.status || "missed",
        matchedText: match?.matchedText,
      };
    });

    const examMatches: MatchOutput[] = (examElements || []).map((el: Element) => {
      const match = examMatchesRaw.find((m: { elementId: string }) => m.elementId === el.id);
      return {
        elementId: el.id,
        elementText: el.text,
        importance: el.importance,
        status: match?.status || "missed",
        matchedText: match?.matchedText,
      };
    });

    return NextResponse.json({ historyMatches, examMatches });
  } catch (error) {
    console.error("Match elements error:", error);
    return NextResponse.json(
      { error: "Failed to match elements" },
      { status: 500 }
    );
  }
}

function fallbackMatch(studentEntries: string[], canonicalElements: Element[]): MatchOutput[] {
  return canonicalElements.map((el) => {
    const elTextLower = el.text.toLowerCase();
    const matched = studentEntries.find((entry) => {
      const entryLower = entry.toLowerCase();
      return (
        elTextLower.includes(entryLower) ||
        entryLower.includes(elTextLower.split(":").pop()?.trim() || "")
      );
    });
    return {
      elementId: el.id,
      elementText: el.text,
      importance: el.importance,
      status: matched ? "matched" as const : "missed" as const,
      matchedText: matched,
    };
  });
}
