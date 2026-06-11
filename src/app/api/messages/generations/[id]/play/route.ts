/**
 * GET /api/messages/generations/:id/play — short-lived signed URL for a
 * PENDING generation's audio (Step 6 A6 preview). Lets the user hear an
 * in-flight take before /save. Only works for an active pending_generations
 * row owned by the authenticated user whose audio has finished rendering.
 *
 * Mirrors /api/messages/:id/play (saved messages); this one serves the
 * pre-save audio at the pending path, keyed by generation_id. Once /save
 * promotes the generation, the pending object is removed — use the saved
 * message's play route instead.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { logEvent } from "@/lib/logger";
import { checkSignedUrlLimit, assertAllowed, recordUsageEvent } from "@/lib/rate-limit";
import { AUDIO_BUCKET } from "@/lib/audio/storage-paths";
import { createPlaybackSignedUrl, PLAYBACK_URL_EXPIRY_SEC } from "@/lib/audio/playback";
import { defineRoute } from "@/lib/api/defineRoute";

export const GET = defineRoute<true, { id: string }>(
  { auth: true },
  async ({ user, requestId, params }) => {
    const { id } = params;
    const supabase = await createSupabaseServerClient();

    // --- DB-backed signed-URL rate limit ---
    const service = createSupabaseServiceClient();
    const limit = await checkSignedUrlLimit(service, user.id);
    assertAllowed(limit);

    await recordUsageEvent(service, {
      userId: user.id,
      action: "signed_url_playback",
      requestId,
      outcome: "success",
      meta: { generationId: id },
    });

    const { data: gen, error } = await supabase
      .from("pending_generations")
      .select("generation_id, audio_status, audio_path, saved_message_id")
      .eq("generation_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !gen) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    // Already promoted — the pending object is gone; use the saved message route.
    if (gen.saved_message_id) {
      return NextResponse.json(
        { error: "This message is saved.", messageId: gen.saved_message_id },
        { status: 409 },
      );
    }

    if (gen.audio_status !== "succeeded" || !gen.audio_path) {
      return NextResponse.json({ error: "Audio is not ready yet." }, { status: 400 });
    }

    const url = await createPlaybackSignedUrl(
      service,
      AUDIO_BUCKET,
      gen.audio_path,
      { event: "pending_play_sign_failed", requestId, userId: user.id, meta: { generationId: id } },
    );

    logEvent({
      event: "pending_play_signed_url",
      requestId,
      userId: user.id,
      outcome: "success",
      meta: { generationId: id },
    });

    return NextResponse.json({ url, expiresIn: PLAYBACK_URL_EXPIRY_SEC });
  },
);
