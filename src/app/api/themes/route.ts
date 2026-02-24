import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const userId = request.nextUrl.searchParams.get("user_id");

    // Fetch all public themes + user's own themes, joined with author name
    const { data: themes, error } = await supabase
      .from("fcm_themes")
      .select("*, fcm_users(name)")
      .or(userId ? `is_public.eq.true,user_id.eq.${userId}` : "is_public.eq.true")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Themes fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch themes" },
        { status: 500 }
      );
    }

    // Flatten author name
    const formatted = (themes || []).map(
      (t: Record<string, unknown>) => ({
        id: t.id,
        user_id: t.user_id,
        name: t.name,
        tokens: t.tokens,
        source_type: t.source_type,
        source_label: t.source_label,
        mood: t.mood,
        is_public: t.is_public,
        created_at: t.created_at,
        author_name:
          (t.fcm_users as Record<string, unknown> | null)?.name || "Unknown",
      })
    );

    return NextResponse.json({ themes: formatted });
  } catch (error) {
    console.error("Themes GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch themes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { user_id, name, tokens, source_type, source_label, mood } =
      await request.json();

    if (!user_id || !name || !tokens) {
      return NextResponse.json(
        { error: "Missing required fields: user_id, name, tokens" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("fcm_themes")
      .insert({
        user_id,
        name,
        tokens,
        source_type: source_type || "preset",
        source_label: source_label || null,
        mood: mood || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Theme save error:", error);
      return NextResponse.json(
        { error: "Failed to save theme" },
        { status: 500 }
      );
    }

    return NextResponse.json({ theme: data });
  } catch (error) {
    console.error("Themes POST error:", error);
    return NextResponse.json(
      { error: "Failed to save theme" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { id, user_id } = await request.json();

    if (!id || !user_id) {
      return NextResponse.json(
        { error: "Missing required fields: id, user_id" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("fcm_themes")
      .delete()
      .eq("id", id)
      .eq("user_id", user_id);

    if (error) {
      console.error("Theme delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete theme" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Themes DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete theme" },
      { status: 500 }
    );
  }
}
