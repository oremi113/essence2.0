/**
 * GET  /api/me — Return current user info.
 * DELETE /api/me — Delete all data for the current user (internal testing only).
 *
 * DELETE is triple-gated:
 * 1. ENABLE_INTERNAL_DELETE=true in env
 * 2. NODE_ENV !== 'production'
 * 3. x-confirm-delete: DELETE_MY_DATA header
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { logEvent, generateRequestId, withRequestId } from "@/lib/logger";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email ?? undefined,
  });
}

// ---------------------------------------------------------------------------
// DELETE /api/me — Delete all user data (internal testing only)
// ---------------------------------------------------------------------------

export async function DELETE(request: Request) {
  const requestId = generateRequestId();

  try {
    // --- Triple gate ---
    // Gate 1: env var
    if (process.env.ENABLE_INTERNAL_DELETE !== "true") {
      return withRequestId(
        NextResponse.json({ error: "Delete endpoint is disabled." }, { status: 403 }),
        requestId
      );
    }

    // Gate 2: not production
    if (process.env.NODE_ENV === "production") {
      return withRequestId(
        NextResponse.json({ error: "Delete endpoint is not available in production." }, { status: 403 }),
        requestId
      );
    }

    // Gate 3: confirmation header
    const confirmHeader = request.headers.get("x-confirm-delete");
    if (confirmHeader !== "DELETE_MY_DATA") {
      return withRequestId(
        NextResponse.json({ error: "Missing confirmation header: x-confirm-delete: DELETE_MY_DATA" }, { status: 403 }),
        requestId
      );
    }

    // --- Auth ---
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return withRequestId(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        requestId
      );
    }

    logEvent({
      event: "delete_my_data_invoked",
      requestId,
      userId: user.id,
      outcome: "success",
    });

    const service = createSupabaseServiceClient();
    const counts = {
      storageObjects: 0,
      messages: 0,
      clips: 0,
      voiceProfiles: 0,
      usageEvents: 0,
    };

    // --- 1. Delete storage objects under users/{userId}/ ---
    const prefix = `users/${user.id}/`;
    const { data: objects } = await service.storage
      .from("essence-audio")
      .list(prefix, { limit: 1000 });

    if (objects && objects.length > 0) {
      // List recursively by listing subfolders
      // Supabase storage list is flat within a prefix, so we need to handle paths
      const allPaths = await listAllStorageObjects(service, "essence-audio", prefix);
      if (allPaths.length > 0) {
        const { data: removed } = await service.storage
          .from("essence-audio")
          .remove(allPaths);
        counts.storageObjects = removed?.length ?? 0;
      }
    }

    // --- 2. Delete usage_events ---
    const { count: ueCount } = await service
      .from("usage_events")
      .delete({ count: "exact" })
      .eq("user_id", user.id);
    counts.usageEvents = ueCount ?? 0;

    // --- 3. Delete messages (before voice_profiles due to FK RESTRICT) ---
    const { count: msgCount } = await service
      .from("messages")
      .delete({ count: "exact" })
      .eq("user_id", user.id);
    counts.messages = msgCount ?? 0;

    // --- 4. Delete training_clips ---
    const { count: clipCount } = await service
      .from("training_clips")
      .delete({ count: "exact" })
      .eq("user_id", user.id);
    counts.clips = clipCount ?? 0;

    // --- 5. Delete voice_profiles ---
    const { count: vpCount } = await service
      .from("voice_profiles")
      .delete({ count: "exact" })
      .eq("user_id", user.id);
    counts.voiceProfiles = vpCount ?? 0;

    // --- 6. Keep profiles row (needed for auth session) ---

    logEvent({
      event: "delete_my_data_complete",
      requestId,
      userId: user.id,
      outcome: "success",
      meta: counts,
    });

    return withRequestId(
      NextResponse.json({ deleted: counts }),
      requestId
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[delete-my-data]", message, err);
    return withRequestId(
      NextResponse.json({ error: "Delete failed. Check server logs." }, { status: 500 }),
      requestId
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: recursively list all storage objects under a prefix
// ---------------------------------------------------------------------------

async function listAllStorageObjects(
  service: ReturnType<typeof createSupabaseServiceClient>,
  bucket: string,
  prefix: string,
  limit = 1000
): Promise<string[]> {
  const paths: string[] = [];
  const { data } = await service.storage.from(bucket).list(prefix, { limit });
  if (!data) return paths;

  for (const item of data) {
    const fullPath = `${prefix}${item.name}`;
    if (item.id) {
      // It's a file
      paths.push(fullPath);
    } else {
      // It's a folder — recurse
      const subPaths = await listAllStorageObjects(service, bucket, `${fullPath}/`, limit);
      paths.push(...subPaths);
    }
  }
  return paths;
}
