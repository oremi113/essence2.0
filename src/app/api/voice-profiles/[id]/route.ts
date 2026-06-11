/**
 * GET: Voice profile status for polling. Returns status, safe error info, retry_available.
 * Does not return vendor_voice_id (elevenlabs_voice_id).
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { isVoiceProfileRetryAllowed } from "@/lib/voice-training/backoff";
import { defineRoute } from "@/lib/api/defineRoute";

function isRetryAvailable(
  status: string,
  attemptCount: number,
  lastAttemptAt: string | null
): boolean {
  if (status !== "failed") return false;
  return isVoiceProfileRetryAllowed(attemptCount, lastAttemptAt);
}

export const GET = defineRoute<true, { id: string }>(
  { auth: true },
  async ({ user, params }) => {
    const { id } = params;
    const supabase = await createSupabaseServerClient();

    const { data: profile, error } = await supabase
      .from("voice_profiles")
      .select("id, status, last_error_code, last_error_message, attempt_count, last_attempt_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: "Voice profile not found" }, { status: 404 });
    }

    const retry_available = isRetryAvailable(
      profile.status,
      profile.attempt_count ?? 0,
      profile.last_attempt_at
    );

    return NextResponse.json({
      status: profile.status,
      last_error_code: profile.last_error_code ?? undefined,
      last_error_message: profile.last_error_message ?? undefined,
      retry_available: profile.status === "failed" ? retry_available : undefined,
    });
  },
);
