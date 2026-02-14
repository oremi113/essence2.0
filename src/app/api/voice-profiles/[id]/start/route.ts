/**
 * POST: Start voice creation (ElevenLabs). Idempotent; enforces min clips and retry backoff.
 * Long-running: downloads clips then calls ElevenLabs (can take 1–2 min).
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createVoiceFromClips } from "@/lib/elevenlabs";
import { NextResponse } from "next/server";

export const maxDuration = 300; // 5 min (allow ElevenLabs + download time)

const MIN_CLIP_COUNT = 10;
/** Minimum total audio size (~1 min at low bitrate). ElevenLabs recommends at least 1 minute of audio for voice cloning. */
const MIN_TOTAL_BYTES = 100 * 1024; // 100 KB
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [0, 5 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000] as const;
/** If still "processing" after this, treat as timed out so user can retry. */
const STALE_PROCESSING_MS = 3 * 60 * 1000; // 3 min

function isRetryAllowed(
  attemptCount: number,
  lastAttemptAt: string | null
): boolean {
  if (attemptCount >= MAX_ATTEMPTS) return false;
  if (!lastAttemptAt) return true;
  const wait = BACKOFF_MS[Math.min(attemptCount, BACKOFF_MS.length - 1)];
  return Date.now() - new Date(lastAttemptAt).getTime() >= wait;
}

function sanitizeErrorMessage(msg: string, maxLen = 500): string {
  const s = String(msg).replace(/\s+/g, " ").trim();
  return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: voiceProfileId } = await params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: fetchError } = await supabase
      .from("voice_profiles")
      .select("id, user_id, status, label, attempt_count, last_attempt_at")
      .eq("id", voiceProfileId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json({ error: "Voice profile not found" }, { status: 404 });
    }

    console.log("[voice-profiles/start] profile", voiceProfileId, "status:", profile.status);

    // Idempotent: already ready
    if (profile.status === "ready") {
      return NextResponse.json({ status: "ready", next: "continue" });
    }

    // Stuck "processing" (request timed out or crashed): allow recovery so user sees an error and can retry
    if (profile.status === "processing") {
      const lastAttempt = profile.last_attempt_at ? new Date(profile.last_attempt_at).getTime() : 0;
      const elapsed = lastAttempt ? Date.now() - lastAttempt : STALE_PROCESSING_MS + 1; // null/missing => treat as stale
      if (elapsed > STALE_PROCESSING_MS) {
        await supabase
          .from("voice_profiles")
          .update({
            status: "failed",
            last_error_code: "TIMEOUT",
            last_error_message: "Previous attempt timed out.",
            last_error_at: new Date().toISOString(),
          })
          .eq("id", voiceProfileId)
          .eq("user_id", user.id);
        return NextResponse.json({
          status: "failed",
          error: "Previous attempt timed out. You can try again.",
          retry_available: true,
        });
      }
    }

    // No duplicate start while in progress (and not stale)
    if (profile.status === "queued" || profile.status === "processing") {
      return NextResponse.json({ status: profile.status });
    }

    // Failed: enforce backoff and max attempts
    if (profile.status === "failed") {
      if (!isRetryAllowed(profile.attempt_count ?? 0, profile.last_attempt_at)) {
        return NextResponse.json(
          {
            error: "Retry not available yet",
            retry_available: false,
            status: "failed",
          },
          { status: 429 }
        );
      }
    }

    // Only collecting, created (legacy), or failed (retry allowed) from here
    const canStart =
      profile.status === "collecting" ||
      profile.status === "created" ||
      profile.status === "failed";
    if (!canStart) {
      return NextResponse.json({ status: profile.status });
    }

    // DB trigger allows created -> collecting and failed -> collecting.
    // Move to collecting first so the lock update (collecting -> processing) succeeds.
    if (profile.status === "created" || profile.status === "failed") {
      const { error: collectError } = await supabase
        .from("voice_profiles")
        .update({ status: "collecting" })
        .eq("id", voiceProfileId)
        .eq("user_id", user.id)
        .eq("status", profile.status);
      if (collectError) {
        console.error(`[voice-profiles/start] ${profile.status}->collecting failed:`, collectError.message);
        return NextResponse.json(
          { error: "Could not start voice creation.", detail: collectError.message, code: "LOCK_FAILED" },
          { status: 500 }
        );
      }
    }

    // Minimum clip validation (count and total audio length)
    const { data: clipRows, count: clipCount } = await supabase
      .from("training_clips")
      .select("id, bytes", { count: "exact" })
      .eq("voice_profile_id", voiceProfileId)
      .eq("status", "uploaded");

    if ((clipCount ?? 0) < MIN_CLIP_COUNT) {
      return NextResponse.json(
        {
          error: "Not enough clips",
          code: "INSUFFICIENT_CLIPS",
          required: MIN_CLIP_COUNT,
          actual: clipCount ?? 0,
        },
        { status: 400 }
      );
    }

    const totalBytesFromDb = clipRows?.reduce((sum, r) => sum + (r.bytes ?? 0), 0) ?? 0;
    if (totalBytesFromDb < MIN_TOTAL_BYTES) {
      return NextResponse.json(
        {
          error: "Clips are too short. Record at least about 1 minute of audio in total (longer clips work better).",
          code: "CLIPS_TOO_SHORT",
          required_bytes: MIN_TOTAL_BYTES,
          actual_bytes: totalBytesFromDb,
        },
        { status: 400 }
      );
    }

    // Lock: transition to processing in one step so UI never sees "queued" during the long download/call
    const { data: updated, error: updateError } = await supabase
      .from("voice_profiles")
      .update({
        status: "processing",
        attempt_count: (profile.attempt_count ?? 0) + 1,
        last_attempt_at: new Date().toISOString(),
        source_clip_count: clipCount ?? 0,
      })
      .eq("id", voiceProfileId)
      .eq("user_id", user.id)
      .in("status", ["collecting", "created", "failed"])
      .select("id")
      .single();

    if (updateError || !updated) {
      const dbMessage = updateError?.message ?? (updated ? "" : "no rows updated (status may not be collecting/created/failed)");
      console.error("[voice-profiles/start] lock update failed:", dbMessage, updateError?.code ?? "");
      const { data: current } = await supabase
        .from("voice_profiles")
        .select("status")
        .eq("id", voiceProfileId)
        .single();
      const status = current?.status ?? "collecting";
      if (status === "created" || status === "collecting") {
        return NextResponse.json(
          {
            error: "Could not start voice creation. Ensure database migrations are applied (attempt_count, last_attempt_at, source_clip_count on voice_profiles).",
            code: "LOCK_FAILED",
            status,
            detail: dbMessage ? String(dbMessage).slice(0, 200) : undefined,
          },
          { status: 500 }
        );
      }
      return NextResponse.json({ status });
    }

    console.log("[voice-profiles/start] lock taken, downloading clips…");
    // Load clips (storage paths)
    const { data: clips, error: clipsError } = await supabase
      .from("training_clips")
      .select("id, storage_bucket, storage_path")
      .eq("voice_profile_id", voiceProfileId)
      .eq("status", "uploaded")
      .order("created_at", { ascending: true });

    if (clipsError || !clips?.length) {
      await supabase
        .from("voice_profiles")
        .update({
          status: "failed",
          last_error_code: "NO_CLIPS",
          last_error_message: "No valid clips found",
          last_error_at: new Date().toISOString(),
        })
        .eq("id", voiceProfileId)
        .eq("user_id", user.id);
      return NextResponse.json(
        { status: "failed", error: "No valid clips found" },
        { status: 500 }
      );
    }

    const service = createSupabaseServiceClient();
    const audioBlobs: Blob[] = [];
    for (const clip of clips) {
      const { data: blob, error: dlError } = await service.storage
        .from(clip.storage_bucket)
        .download(clip.storage_path);
      if (dlError || !blob) {
        console.error("[start] clip download failed:", clip.id, dlError?.message);
        continue;
      }
      audioBlobs.push(blob);
    }

    if (audioBlobs.length < MIN_CLIP_COUNT) {
      await supabase
        .from("voice_profiles")
        .update({
          status: "failed",
          last_error_code: "DOWNLOAD_FAILED",
          last_error_message: "Could not load enough clips from storage",
          last_error_at: new Date().toISOString(),
        })
        .eq("id", voiceProfileId)
        .eq("user_id", user.id);
      return NextResponse.json(
        { status: "failed", error: "Could not load enough clips" },
        { status: 500 }
      );
    }

    const totalBytes = audioBlobs.reduce((sum, b) => sum + b.size, 0);
    if (totalBytes < MIN_TOTAL_BYTES) {
      await supabase
        .from("voice_profiles")
        .update({
          status: "failed",
          last_error_code: "CLIPS_TOO_SHORT",
          last_error_message: `Total audio is too short. Need at least ~1 minute of audio (${Math.round(MIN_TOTAL_BYTES / 1024)} KB total). Record longer clips.`,
          last_error_at: new Date().toISOString(),
        })
        .eq("id", voiceProfileId)
        .eq("user_id", user.id);
      return NextResponse.json(
        {
          status: "failed",
          error: "Clips are too short. Record at least about 1 minute of audio in total (longer clips work better).",
          code: "CLIPS_TOO_SHORT",
          required_bytes: MIN_TOTAL_BYTES,
          actual_bytes: totalBytes,
        },
        { status: 400 }
      );
    }

    console.log("[voice-profiles/start] calling ElevenLabs…");
    const result = await createVoiceFromClips({
      name: profile.label || "My voice",
      audioBlobs,
    });

    if (result.ok) {
      console.log("[voice-profiles/start] ElevenLabs success");
      const now = new Date().toISOString();
      await supabase
        .from("voice_profiles")
        .update({
          status: "ready",
          vendor_voice_id: result.voice_id,
          processing_completed_at: now,
          ready_at: now,
          last_error_code: null,
          last_error_message: null,
          last_error_at: null,
        })
        .eq("id", voiceProfileId)
        .eq("user_id", user.id);
      return NextResponse.json({ status: "ready", next: "continue" });
    }

    console.error("[voice-profiles/start] ElevenLabs failed:", result.status, result.message);
    const safeMessage = sanitizeErrorMessage(result.message);
    await supabase
      .from("voice_profiles")
      .update({
        status: "failed",
        last_error_code: result.code ?? String(result.status),
        last_error_message: safeMessage,
        last_error_at: new Date().toISOString(),
      })
      .eq("id", voiceProfileId)
      .eq("user_id", user.id);

    const retryAllowed = (profile.attempt_count ?? 0) + 1 < MAX_ATTEMPTS;
    return NextResponse.json(
      {
        status: "failed",
        error: safeMessage,
        retry_available: retryAllowed,
      },
      { status: result.status >= 500 ? 502 : 400 }
    );
  } catch (err) {
    console.error("[voice-profiles start]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
