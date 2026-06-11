/**
 * GET /api/training-clips/list — last 10 training clips for a voice profile.
 * Requires auth and profile ownership. Returns only
 * id, prompt_index, status, bytes, created_at (no storage paths).
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";
import { AppError, ErrorCode } from "@/lib/errors";
import { defineRoute } from "@/lib/api/defineRoute";
import { assertOwnsVoiceProfile } from "@/lib/guards";

export const GET = defineRoute(
  { auth: true },
  async ({ request, user, requestId }) => {
    const supabase = await createSupabaseServerClient();

    const { searchParams } = new URL(request.url);
    const voiceProfileId = searchParams.get("voiceProfileId");
    if (!voiceProfileId) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, "voiceProfileId required", 400, false);
    }

    // Ownership — throws VOICE_NOT_FOUND (404) if the profile isn't the user's.
    await assertOwnsVoiceProfile(supabase, user.id, voiceProfileId);

    const { data: clips, error } = await supabase
      .from("training_clips")
      .select("id, prompt_index, status, bytes, created_at")
      .eq("voice_profile_id", voiceProfileId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      logError({
        event: "training_clips_list_db_error",
        requestId,
        route: "/api/training-clips/list",
        userId: user.id,
        error,
      });
      throw new AppError(ErrorCode.INTERNAL_ERROR, "Failed to list clips", 500, true);
    }

    return NextResponse.json(clips ?? []);
  },
);
