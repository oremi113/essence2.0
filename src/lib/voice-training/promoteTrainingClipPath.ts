import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Promote a freshly-inserted training-clip row from its placeholder
 * `storage_path: "pending"` to the real object path (and record its mime).
 *
 * **Throws on a write error** (FOLLOW_UPS #46). If this write fails silently the
 * row keeps `storage_path: "pending"`, so the later `/api/audio/commit` can't
 * find the uploaded object and the clip is lost. The caller turns the throw into
 * a 500 so the client retries rather than uploading into a dead row.
 */
export async function promoteTrainingClipPath(
  supabase: SupabaseClient<Database>,
  clipId: string,
  fields: { objectPath: string; mime: string },
): Promise<void> {
  const { error } = await supabase
    .from("training_clips")
    .update({ storage_path: fields.objectPath, mime_type: fields.mime })
    .eq("id", clipId);

  if (error) {
    throw new Error(`Failed to set training clip path: ${error.message}`);
  }
}
