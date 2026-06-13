/**
 * /messages/new/g/[generationId]/reshape — A4 Personal Note, reshape path.
 *
 * The A6 "Make a change → What it says" door and the A6 back chevron land
 * here. Thin data-shuttle per CLAUDE.md: auth, fetch the prior
 * `pending_generations` row, derive A4's props (prior note pre-filled,
 * recipient name + category for the crumb, recipient branch + voice
 * profile for the /generate request the client makes), render the client
 * wrapper.
 *
 * Deferred-only, mirroring A6: the deferred /generate reshape writes a
 * candidate back onto THIS row and the client returns to this row's A6
 * (no new generation). Guards: bad UUID / flag off → 404; not the user's
 * row → 404; already saved → its A7; superseded → flow start; at the
 * edit-note depth cap → back to A6 (the reshape door is already folded
 * there, so this is an out-of-band entry).
 */
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ROUTES,
  messageGenerationRoute,
  messageSavedRoute,
  signInWithNext,
  messageReshapeRoute,
} from "@/lib/routes";
import { STEP6_LIMITS, isDeferredAudioEnabled } from "@/lib/messages/cost-controls";
import { getCategoryDefinition } from "@/lib/messageTemplates";
import type { MessageCategory } from "@/lib/messageTemplates";
import { ReshapeNotePageClient } from "./ReshapeNotePageClient";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReshapeNotePage({
  params,
}: {
  params: Promise<{ generationId: string }>;
}) {
  const { generationId } = await params;
  if (!UUID_RE.test(generationId)) notFound();

  // The deferred reshape (candidate-on-same-row) is the only A6 that
  // exists; with the flag off there's nothing to reshape into.
  if (!isDeferredAudioEnabled()) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(signInWithNext(messageReshapeRoute(generationId)));

  const { data: gen } = await supabase
    .from("pending_generations")
    .select(
      "generation_id, voice_profile_id, category, note, recipient_id, pending_recipient_name, pending_recipient_relationship, edit_note_depth, saved_message_id, superseded_at",
    )
    .eq("generation_id", generationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!gen) notFound();
  if (gen.saved_message_id) redirect(messageSavedRoute(gen.saved_message_id));
  if (gen.superseded_at) redirect(ROUTES.messagesNew);
  // Reshaped as far as it goes — the A6 door is folded; bounce back to it.
  if (gen.edit_note_depth >= STEP6_LIMITS.maxEditNoteDepth) {
    redirect(messageGenerationRoute(generationId));
  }

  // Crumb display name: existing recipient needs a lookup; pending rows
  // carry the name inline.
  let recipientName = gen.pending_recipient_name ?? "them";
  if (gen.recipient_id) {
    const { data: recipient } = await supabase
      .from("recipients")
      .select("name")
      .eq("id", gen.recipient_id)
      .maybeSingle();
    if (recipient?.name) recipientName = recipient.name;
  }

  const category = gen.category as MessageCategory;

  return (
    <ReshapeNotePageClient
      generationId={gen.generation_id}
      voiceProfileId={gen.voice_profile_id}
      category={category}
      categoryLabel={getCategoryDefinition(category).label}
      recipientName={recipientName}
      initialNote={gen.note ?? ""}
      recipientId={gen.recipient_id}
      pendingRecipientName={gen.pending_recipient_name}
      pendingRecipientRelationship={gen.pending_recipient_relationship}
    />
  );
}
