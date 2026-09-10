/**
 * GET /api/voice-profiles/:id/sample/play — short-lived signed URL for the
 * Step 5 First Playback sample.
 *
 * The user's own preserved voice, speaking one neutral line. No Message object
 * exists for it, which is why this can't reuse /api/messages/:id/play — but it
 * follows that route's shape exactly: rate-limit, ownership-scoped read, sign,
 * then record usage only once a URL was actually issued.
 *
 * Rendering happens during processing (see ensureVoiceSample). This endpoint
 * NEVER renders — it will not spend money on a GET.
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { logEvent } from "@/lib/logger";
import { checkSignedUrlLimit, assertAllowed, recordUsageEvent } from "@/lib/rate-limit";
import { createPlaybackSignedUrl, PLAYBACK_URL_EXPIRY_SEC } from "@/lib/audio/playback";
import { AUDIO_BUCKET } from "@/lib/audio/storage-paths";
import { defineRoute } from "@/lib/api/defineRoute";

export const GET = defineRoute<true, { id: string }>(
  { auth: true },
  async ({ user, requestId, params }) => {
    const { id } = params;
    const supabase = await createSupabaseServerClient();

    const service = createSupabaseServiceClient();
    const limit = await checkSignedUrlLimit(service, user.id);
    assertAllowed(limit);

    const { data: profile, error } = await supabase
      .from("voice_profiles")
      .select(
        "id, sample_status, sample_audio_path, sample_duration_ms, sample_line, sample_word_offsets"
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.json({ error: "Voice profile not found" }, { status: 404 });
    }

    // `rendering` is a real, transient state — the sample is being made right
    // now. It is deliberately distinguished from `failed` so the client can tell
    // "wait" from "this broke", which is what the §4.7 failure state will need.
    if (profile.sample_status === "rendering") {
      return NextResponse.json(
        { error: "Your voice sample is still being prepared", status: "rendering" },
        { status: 409 },
      );
    }

    if (profile.sample_status !== "ready" || !profile.sample_audio_path) {
      return NextResponse.json(
        { error: "No voice sample is available yet", status: profile.sample_status },
        { status: 404 },
      );
    }

    const url = await createPlaybackSignedUrl(
      service,
      AUDIO_BUCKET,
      profile.sample_audio_path,
      { event: "voice_sample_sign_failed", requestId, userId: user.id, meta: { voiceProfileId: id } },
    );

    // Only once a URL is actually issued — a failed lookup or sign must not log
    // "success" or consume the signed-URL budget (FOLLOW_UPS #45).
    await recordUsageEvent(service, {
      userId: user.id,
      action: "signed_url_playback",
      requestId,
      outcome: "success",
      meta: { voiceProfileId: id, kind: "first_playback_sample" },
    });

    logEvent({
      event: "voice_sample_signed_url",
      requestId,
      userId: user.id,
      voiceProfileId: id,
      outcome: "success",
    });

    return NextResponse.json({
      url,
      expiresIn: PLAYBACK_URL_EXPIRY_SEC,
      durationMs: profile.sample_duration_ms,
      // What this sample actually SAYS. The screen typesets it while the audio
      // speaks it, so it must come from the row, not from the current constant
      // — otherwise a copy change would make old samples read one line and
      // speak another.
      line: profile.sample_line,
      // Word onsets for THIS audio. Null means the screen falls back to the
      // cadence table scaled to the audio's length.
      wordOffsetsMs: profile.sample_word_offsets,
    });
  },
);
