/**
 * GET /api/voice-profiles/:id/sample/play — short-lived signed URL for the
 * Step 5 First Playback sample.
 *
 * The user's own preserved voice, speaking one neutral line. No Message object
 * exists for it, which is why this can't reuse /api/messages/:id/play — but it
 * follows that route's shape exactly: rate-limit, ownership-scoped read, sign,
 * then record usage only once a URL was actually issued.
 *
 * Rendering normally happens during processing, the moment `vendor_voice_id`
 * lands (§4.3) — that is still the path that matters, because it costs the user
 * no perceived time.
 *
 * **This route renders too, when there is nothing to play.** That is a
 * deliberate reversal of the original "never spends money on a GET" rule, and
 * the reason is that the rule left a hole nothing else covered: the processing
 * hook fires only in the branch where a *brand-new* voice was just created, so
 * every profile that already existed when Step 5 shipped could never get a
 * sample at all. Not a degraded beat — a permanently silent one, for exactly
 * the people already using the product.
 *
 * Safe to do here because the spend is fenced three ways: the claim inside
 * `ensureVoiceSample` is single-flight (concurrent callers match zero rows),
 * `VOICE_SAMPLE_MAX_RENDERS` caps what one profile can ever be billed, and the
 * voice-creation daily cap gates the caller. The ceremony prefetches this on
 * mount, ~10s and two taps before audio is needed, so the render lands inside
 * the runway rather than as a spinner at the peak moment.
 */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { logEvent, durationSince } from "@/lib/logger";
import {
  checkSignedUrlLimit,
  checkVoiceCreationLimit,
  assertAllowed,
  recordUsageEvent,
} from "@/lib/rate-limit";
import { ensureVoiceSample } from "@/lib/voice-sample/ensureVoiceSample";
import { createPlaybackSignedUrl, PLAYBACK_URL_EXPIRY_SEC } from "@/lib/audio/playback";
import { AUDIO_BUCKET } from "@/lib/audio/storage-paths";
import { defineRoute } from "@/lib/api/defineRoute";

export const GET = defineRoute<true, { id: string }>(
  { auth: true },
  async ({ user, requestId, params }) => {
    const { id } = params;
    const startMs = Date.now();
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

    // Nothing to play yet. Render it now rather than 404-ing into a silent
    // ceremony — see the note at the top of this file for why a GET is allowed
    // to spend here.
    let audioPath = profile.sample_audio_path;
    let durationMs = profile.sample_duration_ms;
    let line = profile.sample_line;
    let wordOffsetsMs = profile.sample_word_offsets;

    if (profile.sample_status !== "ready" || !audioPath) {
      const spend = await checkVoiceCreationLimit(service, user.id);
      if (!spend.allowed) {
        logEvent({
          event: "voice_sample_render_rate_limited",
          requestId,
          userId: user.id,
          voiceProfileId: id,
          outcome: "rejected",
        });
        return NextResponse.json({ error: spend.reason, status: "rate_limited" }, { status: 429 });
      }

      const sample = await ensureVoiceSample({
        supabase,
        service,
        userId: user.id,
        voiceProfileId: id,
        requestId,
        startMs,
      });

      if (!sample.ok) {
        // `in_flight` is 409 (transient — another caller is rendering right
        // now), everything else is 404. The client treats both as "play the
        // beat silently", but the status is what the §4.7 failure state and the
        // logs need in order to tell "wait" from "this will never arrive".
        const status = sample.reason === "in_flight" ? 409 : 404;
        return NextResponse.json(
          { error: "No voice sample is available yet", status: sample.reason },
          { status },
        );
      }

      audioPath = sample.audioPath;
      durationMs = sample.durationMs;
      line = sample.line;
      wordOffsetsMs = sample.wordOffsetsMs;

      logEvent({
        event: "voice_sample_rendered_on_demand",
        requestId,
        userId: user.id,
        voiceProfileId: id,
        outcome: "success",
        durationMs: durationSince(startMs),
        // `rendered: false` means a concurrent caller had already finished it.
        meta: { rendered: sample.rendered },
      });
    }

    const url = await createPlaybackSignedUrl(
      service,
      AUDIO_BUCKET,
      audioPath,
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
      durationMs,
      // What this sample actually SAYS. The screen typesets it while the audio
      // speaks it, so it must come from the row, not from the current constant
      // — otherwise a copy change would make old samples read one line and
      // speak another.
      line,
      // Word onsets for THIS audio. Null means the screen falls back to the
      // cadence table scaled to the audio's length.
      wordOffsetsMs,
    });
  },
);
