import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient();

    const { data: session, error } = await supabase
      .from("fcm_osce_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("OSCE session GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createServerClient();

    // Only allow updating specific fields
    const allowedFields: Record<string, unknown> = {};
    const allowed = [
      "door_prep",
      "door_prep_submitted_at",
      "soap_note",
      "soap_submitted_at",
      "feedback",
      "feedback_generated_at",
      "status",
      "completed_at",
    ];

    for (const key of allowed) {
      if (key in body) {
        allowedFields[key] = body[key];
      }
    }

    allowedFields.updated_at = new Date().toISOString();

    const { data: session, error } = await supabase
      .from("fcm_osce_sessions")
      .update(allowedFields)
      .eq("id", id)
      .select()
      .single();

    if (error || !session) {
      if (error?.code === "PGRST116" || !session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
      console.error("Update OSCE session error:", error);
      return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("OSCE session PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
