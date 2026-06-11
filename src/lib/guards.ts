/**
 * Centralized pre-condition checks for ESSENCE.
 *
 * Each guard throws AppError if the condition is not met.
 * Route handlers call guards at the top, before expensive operations.
 */
import { SupabaseClient } from "@supabase/supabase-js";
import { AppError, ErrorCode } from "@/lib/errors";
import {
  checkMessageGenerationLimit,
  checkVoiceCreationLimit,
  checkClipUploadLimit,
  assertAllowed,
} from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Plan gate stub — single place to wire billing later
// ---------------------------------------------------------------------------

/**
 * Stub: always returns true for MVP.
 * When billing is added, this is the ONE place to check plan allowance.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function assertPlanAllows(_userId: string, _action: string): Promise<void> {
  // MVP: no plan enforcement. Always allowed.
  // Future: query user's plan tier and check if action is within limits.
  return;
}

// ---------------------------------------------------------------------------
// Guard: can generate a message?
// ---------------------------------------------------------------------------

/**
 * Pre-conditions for message generation:
 * 1. Voice profile exists, is owned by user, and is ready
 * 2. vendor_voice_id is set
 * 3. Daily message cap not exceeded (via usage_events)
 * 4. Plan allows (stub)
 *
 * Returns the voice profile row on success (caller needs vendor_voice_id).
 */
export async function assertCanGenerateMessage(
  supabase: SupabaseClient,
  serviceClient: SupabaseClient,
  userId: string,
  voiceProfileId: string
): Promise<{ id: string; vendor_voice_id: string }> {
  // Plan gate
  await assertPlanAllows(userId, "message_generate");

  // Rate limit
  const limit = await checkMessageGenerationLimit(serviceClient, userId);
  assertAllowed(limit);

  // Voice profile check
  const { data: profile, error } = await supabase
    .from("voice_profiles")
    .select("id, user_id, status, vendor_voice_id")
    .eq("id", voiceProfileId)
    .eq("user_id", userId)
    .single();

  if (error || !profile) {
    throw new AppError(
      ErrorCode.VOICE_NOT_FOUND,
      "Voice profile not found.",
      404,
      false
    );
  }

  if (profile.status !== "ready") {
    throw new AppError(
      ErrorCode.VOICE_NOT_READY,
      "Voice profile is not ready. Complete voice creation first.",
      400,
      false
    );
  }

  if (!profile.vendor_voice_id) {
    throw new AppError(
      ErrorCode.VOICE_NOT_READY,
      "Voice profile is missing its voice ID. Try creating the voice again.",
      400,
      false
    );
  }

  return { id: profile.id, vendor_voice_id: profile.vendor_voice_id };
}

// ---------------------------------------------------------------------------
// Guard: can start voice creation?
// ---------------------------------------------------------------------------

/**
 * Pre-conditions for voice creation:
 * 1. Daily voice creation cap not exceeded
 * 2. Plan allows (stub)
 *
 * Note: clip count and status checks remain in the start route since they
 * have complex retry/backoff logic that doesn't fit a simple guard.
 */
export async function assertCanStartVoiceCreation(
  serviceClient: SupabaseClient,
  userId: string
): Promise<void> {
  await assertPlanAllows(userId, "voice_create");

  const limit = await checkVoiceCreationLimit(serviceClient, userId);
  assertAllowed(limit);
}

// ---------------------------------------------------------------------------
// Guard: can upload a clip?
// ---------------------------------------------------------------------------

/**
 * Assert a voice profile exists and is owned by `userId`. Throws
 * VOICE_NOT_FOUND (404) otherwise. Selects only `id`; callers that also need
 * profile columns should query separately. Shared by the clip-upload guard and
 * the training-clips list route, which previously duplicated this check inline.
 */
export async function assertOwnsVoiceProfile(
  supabase: SupabaseClient,
  userId: string,
  voiceProfileId: string
): Promise<void> {
  const { data: profile, error } = await supabase
    .from("voice_profiles")
    .select("id")
    .eq("id", voiceProfileId)
    .eq("user_id", userId)
    .single();

  if (error || !profile) {
    throw new AppError(
      ErrorCode.VOICE_NOT_FOUND,
      "Voice profile not found.",
      404,
      false
    );
  }
}

/**
 * Pre-conditions for clip upload:
 * 1. Voice profile exists and is owned by user
 * 2. Clips-per-profile cap not exceeded
 * 3. Plan allows (stub)
 */
export async function assertCanUploadClip(
  supabase: SupabaseClient,
  userId: string,
  voiceProfileId: string
): Promise<void> {
  await assertPlanAllows(userId, "clip_upload");

  await assertOwnsVoiceProfile(supabase, userId, voiceProfileId);

  // Clip cap (uses training_clips table directly)
  const limit = await checkClipUploadLimit(supabase, voiceProfileId);
  assertAllowed(limit);
}
