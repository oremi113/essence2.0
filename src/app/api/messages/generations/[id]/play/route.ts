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
import { handleRouteError } from "@/lib/errors";
import { logEvent, logError, generateRequestId, withRequestId } from "@/lib/logger";
import { checkSignedUrlLimit, assertAllowed, recordUsageEvent } from "@/lib/rate-limit";
import { AUDIO_BUCKET } from "@/lib/audio/storage-paths";

const DOWNLOAD_EXPIRY_SEC = 120; // 2 minutes

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();

  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return withRequestId(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        requestId
      );
    }

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
      return withRequestId(
        NextResponse.json({ error: "Generation not found" }, { status: 404 }),
        requestId
      );
    }

    // Already promoted — the pending object is gone; use the saved message route.
    if (gen.saved_message_id) {
      return withRequestId(
        NextResponse.json(
          { error: "This message is saved.", messageId: gen.saved_message_id },
          { status: 409 }
        ),
        requestId
      );
    }

    if (gen.audio_status !== "succeeded" || !gen.audio_path) {
      return withRequestId(
        NextResponse.json({ error: "Audio is not ready yet." }, { status: 400 }),
        requestId
      );
    }

    const { data: signed, error: signError } = await service.storage
      .from(AUDIO_BUCKET)
      .createSignedUrl(gen.audio_path, DOWNLOAD_EXPIRY_SEC);

    if (signError || !signed?.signedUrl) {
      logError({ event: "pending_play_sign_failed", requestId, userId: user.id, error: signError });
      return withRequestId(
        NextResponse.json({ error: "Could not generate playback URL" }, { status: 500 }),
        requestId
      );
    }

    logEvent({
      event: "pending_play_signed_url",
      requestId,
      userId: user.id,
      outcome: "success",
      meta: { generationId: id },
    });

    return withRequestId(
      NextResponse.json({ url: signed.signedUrl, expiresIn: DOWNLOAD_EXPIRY_SEC }),
      requestId
    );
  } catch (err) {
    const { body, status } = handleRouteError(err, requestId);
    return withRequestId(NextResponse.json(body, { status }), requestId);
  }
}
