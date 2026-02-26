import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { user_id, case_source, case_id, practice_case_id } = await request.json();

    if (!user_id || !case_source) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: session, error } = await supabase
      .from("fcm_osce_sessions")
      .insert({
        user_id,
        case_source,
        case_id: case_id || null,
        practice_case_id: practice_case_id || null,
        status: "door_prep",
      })
      .select()
      .single();

    if (error) {
      console.error("Create OSCE session error:", error);
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("OSCE session POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");
    if (!userId) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    const supabase = createServerClient();

    const { data: sessions, error } = await supabase
      .from("fcm_osce_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("List OSCE sessions error:", error);
      return NextResponse.json({ error: "Failed to list sessions" }, { status: 500 });
    }

    return NextResponse.json({ sessions: sessions || [] });
  } catch (error) {
    console.error("OSCE session GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
