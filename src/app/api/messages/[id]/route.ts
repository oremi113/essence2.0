/**
 * GET /api/messages/:id — Poll message status.
 * Returns status and safe error info. Never exposes storage paths or vendor IDs.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { defineRoute } from "@/lib/api/defineRoute";

export const GET = defineRoute<true, { id: string }>(
  { auth: true },
  async ({ user, params }) => {
    const { id } = params;
    const supabase = await createSupabaseServerClient();

    const { data: message, error } = await supabase
      .from("messages")
      .select(
        "id, status, title, body_text, audio_bytes, audio_duration_ms, last_error_code, last_error_message, created_at, generation_completed_at"
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: message.id,
      status: message.status,
      title: message.title,
      bodyText: message.body_text,
      audioBytes: message.audio_bytes,
      audioDurationMs: message.audio_duration_ms,
      lastErrorCode: message.last_error_code ?? undefined,
      lastErrorMessage: message.last_error_message ?? undefined,
      createdAt: message.created_at,
      completedAt: message.generation_completed_at ?? undefined,
    });
  },
);
