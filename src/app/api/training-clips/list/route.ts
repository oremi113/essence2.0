/**
 * List last 10 training clips for a voice profile. Requires auth and profile ownership.
 * Returns only id, prompt_index, status, bytes, created_at (no storage paths).
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateRequestId, logError } from "@/lib/logger";

export async function GET(request: Request) {
  const requestId = generateRequestId();
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const voiceProfileId = searchParams.get("voiceProfileId");
    if (!voiceProfileId) {
      return NextResponse.json(
        { error: "voiceProfileId required" },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("voice_profiles")
      .select("id")
      .eq("id", voiceProfileId)
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Voice profile not found" },
        { status: 404 }
      );
    }

    const { data: clips, error } = await supabase
      .from("training_clips")
      .select("id, prompt_index, status, bytes, created_at")
      .eq("voice_profile_id", voiceProfileId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      logError({ event: "training_clips_list_db_error", requestId, route: "/api/training-clips/list", userId: user.id, error });
      return NextResponse.json(
        { error: "Failed to list clips" },
        { status: 500 }
      );
    }

    return NextResponse.json(clips ?? []);
  } catch (err) {
    logError({ event: "training_clips_list_error", requestId, route: "/api/training-clips/list", error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
