import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { user_id, practice_case_id, case_source } = await request.json();

    if (!user_id || !practice_case_id) {
      return NextResponse.json(
        { error: "Missing required fields: user_id, practice_case_id" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: session, error } = await supabase
      .from("fcm_osce_sessions")
      .insert({
        user_id,
        practice_case_id,
        case_source: case_source || "practice",
        status: "door_prep",
      })
      .select()
      .single();

    if (error) {
      console.error("OSCE session create error:", error);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("OSCE session POST error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required query: user_id" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: sessions, error } = await supabase
      .from("fcm_osce_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("OSCE sessions fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions: sessions || [] });
  } catch (error) {
    console.error("OSCE sessions GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
