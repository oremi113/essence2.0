/**
 * POST /api/messages/discard — tear down an in-flight generation (A6.d confirm).
 *
 * Delete the pending audio object (best effort), then delete the
 * pending_generations row. The row delete runs with the service role because
 * pending_generations has no client delete RLS policy by design (Q1) — we
 * still scope by user_id as defence in depth. Replays are harmless, so no
 * idempotency machinery is needed (Q5).
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { ErrorCode } from "@/lib/errors";
import { logEvent } from "@/lib/logger";
import { defineRoute } from "@/lib/api/defineRoute";
import { messageGenerationRefSchema } from "@/lib/api/schemas";
import { AUDIO_BUCKET } from "@/lib/audio/storage-paths";

export const POST = defineRoute(
  {
    auth: true,
    checkBodySize: true,
    bodySchema: messageGenerationRefSchema,
  },
  async ({ body, user, requestId }) => {
    const supabase = await createSupabaseServerClient();
    const service = createSupabaseServiceClient();
    const { generationId } = body;

    // Confirm ownership (and grab the audio path) via the RLS-scoped client.
    const { data: gen } = await supabase
      .from("pending_generations")
      .select("generation_id, audio_path, saved_message_id")
      .eq("generation_id", generationId)
      .eq("user_id", user.id)
      .maybeSingle();

    // Already gone, or never existed for this user — replays are harmless.
    if (!gen) {
      return NextResponse.json({ status: "discarded" });
    }

    // Don't let discard destroy a row that was already promoted to a message.
    if (gen.saved_message_id) {
      return NextResponse.json(
        { error: "Message already saved; cannot discard.", code: ErrorCode.VALIDATION_ERROR },
        { status: 409 },
      );
    }

    if (gen.audio_path) {
      await service.storage.from(AUDIO_BUCKET).remove([gen.audio_path]).catch(() => {});
    }

    const { error: deleteError } = await service
      .from("pending_generations")
      .delete()
      .eq("generation_id", generationId)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Could not discard", code: ErrorCode.INTERNAL_ERROR, retryable: true },
        { status: 500 },
      );
    }

    logEvent({
      event: "step6_message_discarded",
      requestId,
      userId: user.id,
      outcome: "success",
      meta: { generationId },
    });

    return NextResponse.json({ status: "discarded" });
  },
);
