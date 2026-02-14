/**
 * Return a short-lived signed download URL for playback. Client uses <audio src={url} />.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

const DOWNLOAD_EXPIRY_SEC = 120; // 2 min

export async function POST(request: Request) {
  try {
    const supabaseAuth = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const kind = body?.kind;
    const id = body?.id;

    if (kind !== "training_clip") {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const { data: row, error: fetchError } = await supabaseAuth
      .from("training_clips")
      .select("id, user_id, status, storage_bucket, storage_path")
      .eq("id", id)
      .single();

    if (fetchError || !row) {
      return NextResponse.json({ error: "Clip not found" }, { status: 404 });
    }
    if (row.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (row.status !== "uploaded") {
      return NextResponse.json({ error: "Clip not ready for playback" }, { status: 400 });
    }

    if (!row.storage_bucket || !row.storage_path) {
      return NextResponse.json({ error: "Audio file not found" }, { status: 404 });
    }

    const service = createSupabaseServiceClient();
    const { data: signed, error: signError } = await service.storage
      .from(row.storage_bucket)
      .createSignedUrl(row.storage_path, DOWNLOAD_EXPIRY_SEC);

    if (signError) {
      console.error("[playback-url] sign failed:", signError.message);
      return NextResponse.json({ error: "Failed to create playback URL" }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl, expiresIn: DOWNLOAD_EXPIRY_SEC });
  } catch (err) {
    console.error("[playback-url]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
