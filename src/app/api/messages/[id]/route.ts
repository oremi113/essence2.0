/**
 * GET /api/messages/:id — Poll message status.
 * Returns status and safe error info. Never exposes storage paths or vendor IDs.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateRequestId, logError } from "@/lib/logger";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: message, error } = await supabase
      .from("messages")
      .select(
        "id, status, title, body_text, audio_bytes, audio_duration_ms, last_error_code, last_error_message, created_at, generation_completed_at"
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
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
  } catch (err) {
    logError({ event: "messages_get_error", requestId, route: "/api/messages/[id]", error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
