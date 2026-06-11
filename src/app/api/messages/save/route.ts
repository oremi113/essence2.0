/**
 * POST /api/messages/save — promote a pending_generations row to a permanent,
 * immutable messages row. Idempotent by generation_id (Open Contracts Q5).
 *
 * Order is deliberate and every prefix is recoverable:
 *   1. Copy pending audio → permanent path
 *   2. Insert messages row (unique source_generation_id makes this idempotent)
 *   3. Mark pending_generations.saved_message_id
 *   4. Best-effort delete the pending audio object
 *
 * Quota (saved-message cap) and subscription-lapse are enforced HERE as the
 * race-safe security gate, AFTER the idempotency short-circuit so a double-tap
 * on an already-saved message returns it even at the cap.
 */
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { ErrorCode } from "@/lib/errors";
import { logEvent, logError } from "@/lib/logger";
import { defineRoute } from "@/lib/api/defineRoute";
import { messageGenerationRefSchema } from "@/lib/api/schemas";
import { AUDIO_BUCKET, messageAudioObjectPath } from "@/lib/audio/storage-paths";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";
import { STEP6_LIMITS } from "@/lib/messages/cost-controls";

export const maxDuration = 60;

// Subscription statuses under which creation/saving is allowed (Vault trial + active).
const SAVE_ALLOWED_STATUSES = new Set(["trial", "active"]);

export const POST = defineRoute(
  {
    auth: true,
    checkBodySize: true,
    bodySchema: messageGenerationRefSchema,
    dedup: { action: "step6_save", event: "step6_save_dedup" },
  },
  async ({ body, user, requestId }) => {
    const supabase = await createSupabaseServerClient();
    const service = createSupabaseServiceClient();
    const { generationId } = body;

    // --- Load the pending row -----------------------------------------------
    const { data: gen } = await supabase
      .from("pending_generations")
      .select(
        "generation_id, voice_profile_id, recipient_id, pending_recipient_name, pending_recipient_relationship, category, generated_text, audio_path, audio_status, regenerate_count, saved_message_id",
      )
      .eq("generation_id", generationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!gen) {
      return NextResponse.json(
        { error: "Generation not found", code: ErrorCode.VALIDATION_ERROR, retryable: false },
        { status: 404 },
      );
    }

    // --- Idempotency short-circuit (Q5) -------------------------------------
    if (gen.saved_message_id) {
      return NextResponse.json({ messageId: gen.saved_message_id, status: "saved", idempotent: true });
    }
    const { data: existingMessage } = await supabase
      .from("messages")
      .select("id, status")
      .eq("source_generation_id", generationId)
      .maybeSingle();
    if (existingMessage) {
      // A prior save inserted the row but didn't finish marking pending — heal it.
      await supabase
        .from("pending_generations")
        .update({ saved_message_id: existingMessage.id })
        .eq("generation_id", generationId)
        .eq("user_id", user.id);
      return NextResponse.json({ messageId: existingMessage.id, status: existingMessage.status, idempotent: true });
    }

    // --- Preconditions: audio must be ready ---------------------------------
    if (gen.audio_status !== "succeeded" || !gen.audio_path || !gen.generated_text) {
      return NextResponse.json(
        { error: "Message is not ready to save yet.", code: ErrorCode.VALIDATION_ERROR, retryable: false },
        { status: 409 },
      );
    }

    // --- Subscription gate (lapsed blocks creation) -------------------------
    const subscription = await getSubscriptionStatus(user.id);
    if (!SAVE_ALLOWED_STATUSES.has(subscription.status)) {
      return NextResponse.json(
        { error: "Your subscription is not active.", code: "subscription_lapsed", retryable: false },
        { status: 403 },
      );
    }

    // --- Saved-message quota (race-safe security gate) ----------------------
    const { count: savedCount } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "saved");
    if ((savedCount ?? 0) >= STEP6_LIMITS.maxSavedMessages) {
      return NextResponse.json({ code: "vault_limit_reached" }, { status: 403 });
    }

    // --- Promote the pending recipient, if any ------------------------------
    let recipientId = gen.recipient_id as string | null;
    if (!recipientId && gen.pending_recipient_name) {
      recipientId = await promoteRecipient(
        supabase,
        user.id,
        gen.pending_recipient_name,
        gen.pending_recipient_relationship,
      );
      if (!recipientId) {
        return NextResponse.json(
          { error: "Could not save recipient", code: ErrorCode.INTERNAL_ERROR, retryable: true },
          { status: 500 },
        );
      }
    }

    // --- Audio promotion: copy → insert → mark → delete (Q5) ----------------
    const messageId = randomUUID();
    const permanentPath = messageAudioObjectPath(user.id, gen.voice_profile_id, messageId);

    const { error: copyError } = await service.storage
      .from(AUDIO_BUCKET)
      .copy(gen.audio_path, permanentPath);
    if (copyError) {
      logError({ event: "step6_save_copy_failed", requestId, userId: user.id, error: copyError });
      return NextResponse.json(
        { error: "Could not finalize audio. Please try again.", code: ErrorCode.STORAGE_FAILED, retryable: true },
        { status: 502 },
      );
    }

    const { data: inserted, error: insertError } = await supabase
      .from("messages")
      .insert({
        id: messageId,
        user_id: user.id,
        voice_profile_id: gen.voice_profile_id,
        recipient_id: recipientId,
        category: gen.category,
        body_text: gen.generated_text,
        status: "saved",
        storage_bucket: AUDIO_BUCKET,
        storage_path: permanentPath,
        regenerate_count: gen.regenerate_count,
        source_generation_id: generationId,
        generation_completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      // Unique violation on source_generation_id → a concurrent save won.
      // Clean up our orphan copy and return the winner (idempotent).
      if (insertError?.code === "23505") {
        await service.storage.from(AUDIO_BUCKET).remove([permanentPath]).catch(() => {});
        const { data: winner } = await supabase
          .from("messages")
          .select("id, status")
          .eq("source_generation_id", generationId)
          .maybeSingle();
        if (winner) {
          return NextResponse.json({ messageId: winner.id, status: winner.status, idempotent: true });
        }
      }
      logError({ event: "step6_save_insert_failed", requestId, userId: user.id, error: insertError });
      return NextResponse.json(
        { error: "Could not save message", code: ErrorCode.INTERNAL_ERROR, retryable: true },
        { status: 500 },
      );
    }

    // Mark pending as promoted, then best-effort delete the pending object.
    await supabase
      .from("pending_generations")
      .update({ saved_message_id: messageId })
      .eq("generation_id", generationId)
      .eq("user_id", user.id);
    await service.storage.from(AUDIO_BUCKET).remove([gen.audio_path]).catch(() => {});

    logEvent({
      event: "step6_message_saved",
      requestId,
      userId: user.id,
      messageId,
      outcome: "success",
      meta: { generationId, savedOrdinal: (savedCount ?? 0) + 1, regenerateCount: gen.regenerate_count },
    });

    return NextResponse.json({ messageId, status: "saved" });
  },
);

/**
 * Create-or-look-up a recipients row for the pending-recipient branch. Matches
 * an existing active recipient on (user_id, name, relationship) to avoid
 * spawning duplicates across repeated saves; inserts otherwise. Returns the
 * recipient id, or null on insert failure.
 */
async function promoteRecipient(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  relationship: string | null,
): Promise<string | null> {
  const lookup = supabase
    .from("recipients")
    .select("id")
    .eq("user_id", userId)
    .eq("name", name)
    .eq("status", "active");
  const { data: existing } = relationship
    ? await lookup.eq("relationship", relationship).maybeSingle()
    : await lookup.is("relationship", null).maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("recipients")
    .insert({ user_id: userId, name, relationship: relationship ?? null })
    .select("id")
    .single();
  if (error || !created) {
    console.error("[step6] recipient promotion failed:", error?.message);
    return null;
  }
  return created.id;
}
