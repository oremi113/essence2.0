/**
 * POST /api/messages — Create a message using a preserved voice.
 *
 * Synchronous flow (MVP):
 *   1. Validate input + auth + voice profile ownership
 *   2. Insert message row (status = generating)
 *   3. Call ElevenLabs TTS
 *   4. Upload audio to Supabase Storage
 *   5. Update message row (status = saving → saved)
 *
 * On failure at any step the row is set to status = failed with a safe message.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { generateSpeech } from "@/lib/elevenlabs";
import { AUDIO_BUCKET, messageAudioObjectPath } from "@/lib/audio/storage-paths";
import { NextResponse } from "next/server";

export const maxDuration = 120; // 2 min — TTS + upload

const MAX_PROMPT_LENGTH = 2000;

function sanitize(msg: string, max = 500): string {
  return String(msg).replace(/\s+/g, " ").trim().slice(0, max);
}

export async function POST(request: Request) {
  try {
    // --- Auth ---
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Parse + validate input ---
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const {
      voiceProfileId,
      promptText,
      title,
      recipientId,
    } = body as {
      voiceProfileId?: string;
      promptText?: string;
      title?: string;
      recipientId?: string;
    };

    if (!voiceProfileId?.trim()) {
      return NextResponse.json(
        { error: "voiceProfileId is required" },
        { status: 400 }
      );
    }
    if (!promptText?.trim()) {
      return NextResponse.json(
        { error: "promptText is required" },
        { status: 400 }
      );
    }
    if (promptText.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `promptText must be ${MAX_PROMPT_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

    // --- Load voice profile, ensure ready + owned ---
    const { data: profile, error: profileError } = await supabase
      .from("voice_profiles")
      .select("id, user_id, status, vendor_voice_id")
      .eq("id", voiceProfileId)
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Voice profile not found" },
        { status: 404 }
      );
    }
    if (profile.status !== "ready") {
      return NextResponse.json(
        { error: "Voice profile is not ready. Complete voice creation first." },
        { status: 400 }
      );
    }
    if (!profile.vendor_voice_id) {
      return NextResponse.json(
        { error: "Voice profile is missing its voice ID. Try creating the voice again." },
        { status: 400 }
      );
    }

    // --- Create message row (status = generating) ---
    const now = new Date().toISOString();
    const { data: message, error: insertError } = await supabase
      .from("messages")
      .insert({
        user_id: user.id,
        voice_profile_id: voiceProfileId,
        recipient_id: recipientId || null,
        title: title?.trim() || null,
        body_text: promptText.trim(),
        status: "generating",
        storage_bucket: AUDIO_BUCKET,
        generation_started_at: now,
      })
      .select("id")
      .single();

    if (insertError || !message) {
      console.error("[messages] insert failed:", insertError?.message);
      return NextResponse.json(
        { error: "Could not create message" },
        { status: 500 }
      );
    }

    const messageId = message.id;
    console.log("[messages] created", messageId, "status: generating");

    // --- Generate speech via ElevenLabs ---
    const ttsResult = await generateSpeech({
      voiceId: profile.vendor_voice_id,
      text: promptText.trim(),
    });

    if (!ttsResult.ok) {
      console.error("[messages] TTS failed:", ttsResult.status, ttsResult.message);
      await supabase
        .from("messages")
        .update({
          status: "failed",
          last_error_code: ttsResult.code ?? String(ttsResult.status),
          last_error_message: sanitize(ttsResult.message),
        })
        .eq("id", messageId)
        .eq("user_id", user.id);
      return NextResponse.json(
        { messageId, status: "failed", error: "Could not generate audio. Please try again." },
        { status: 502 }
      );
    }

    // --- Upload audio to Supabase Storage ---
    const objectPath = messageAudioObjectPath(user.id, voiceProfileId, messageId);
    const service = createSupabaseServiceClient();

    // Transition to saving
    await supabase
      .from("messages")
      .update({ status: "saving" })
      .eq("id", messageId)
      .eq("user_id", user.id);

    const { error: uploadError } = await service.storage
      .from(AUDIO_BUCKET)
      .upload(objectPath, ttsResult.audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("[messages] storage upload failed:", uploadError.message);
      await supabase
        .from("messages")
        .update({
          status: "failed",
          last_error_code: "STORAGE_UPLOAD_FAILED",
          last_error_message: sanitize(uploadError.message),
        })
        .eq("id", messageId)
        .eq("user_id", user.id);
      return NextResponse.json(
        { messageId, status: "failed", error: "Could not save audio. Please try again." },
        { status: 502 }
      );
    }

    // --- Finalize: status = saved ---
    const completedAt = new Date().toISOString();
    const { error: finalizeError } = await supabase
      .from("messages")
      .update({
        status: "saved",
        storage_path: objectPath,
        audio_bytes: ttsResult.audioBuffer.length,
        generation_completed_at: completedAt,
      })
      .eq("id", messageId)
      .eq("user_id", user.id);

    if (finalizeError) {
      console.error("[messages] finalize failed:", finalizeError.message);
      // Audio is stored but row not finalized — not ideal but audio exists
      return NextResponse.json(
        { messageId, status: "saving", error: "Message created but finalization failed." },
        { status: 500 }
      );
    }

    console.log("[messages]", messageId, "status: saved");
    return NextResponse.json({ messageId, status: "saved" });
  } catch (err) {
    console.error("[messages POST]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
