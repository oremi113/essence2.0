/**
 * POST: Create a VoiceProfile with status collecting.
 * Returns voiceProfileId and status only.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const displayName =
      typeof body?.display_name === "string" && body.display_name.trim()
        ? body.display_name.trim().slice(0, 200)
        : "My voice";

    const { data: row, error } = await supabase
      .from("voice_profiles")
      .insert({
        user_id: user.id,
        label: displayName,
        status: "collecting",
      })
      .select("id, status")
      .single();

    if (error) {
      console.error("[voice-profiles] create failed:", error.message);
      return NextResponse.json(
        { error: "Failed to create voice profile", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      voiceProfileId: row.id,
      status: row.status,
    });
  } catch (err) {
    console.error("[voice-profiles]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
