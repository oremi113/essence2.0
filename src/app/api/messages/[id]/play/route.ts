/**
 * GET /api/messages/:id/play — Short-lived signed URL for message audio playback.
 * Only works for saved messages owned by the authenticated user.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

const DOWNLOAD_EXPIRY_SEC = 120; // 2 minutes

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      .select("id, user_id, status, storage_bucket, storage_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    if (message.status !== "saved") {
      return NextResponse.json(
        { error: "Message audio is not available yet" },
        { status: 400 }
      );
    }

    if (!message.storage_bucket || !message.storage_path) {
      return NextResponse.json(
        { error: "Audio file not found for this message" },
        { status: 404 }
      );
    }

    const service = createSupabaseServiceClient();
    const { data: signed, error: signError } = await service.storage
      .from(message.storage_bucket)
      .createSignedUrl(message.storage_path, DOWNLOAD_EXPIRY_SEC);

    if (signError || !signed?.signedUrl) {
      console.error("[messages/play] signed URL failed:", signError?.message);
      return NextResponse.json(
        { error: "Could not generate playback URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url: signed.signedUrl,
      expiresIn: DOWNLOAD_EXPIRY_SEC,
    });
  } catch (err) {
    console.error("[messages/play]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
