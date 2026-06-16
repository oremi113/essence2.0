import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { MessagesNewPageClient } from './MessagesNewPageClient';
import type { ExistingRecipient } from '@/components/screens/messages/RecipientSetupScreen.types';
import type { RelationshipKey } from '@/lib/messageTemplates';
import { ROUTES, signInWithNext } from '@/lib/routes';
import { STEP6_LIMITS } from '@/lib/messages/cost-controls';

/**
 * /messages/new — entry point for Step 6 (message creation) per
 * Step6_OpenContracts.md Q7. Hosts A2 → A4 via the orchestrator's
 * internal step state. A5/A6 live at /messages/new/g/[generationId]
 * once /generate has fired; A7 lives at /messages/saved/[messageId].
 *
 * This page is a thin data-shuttle per CLAUDE.md three-layer rules:
 * auth check, fetch existing recipients, render the client orchestrator.
 *
 * Lifetime-cap (3 saved messages on Vault) UX gate per
 * Step6_OpenContracts.md Q4: capped users are redirected to C3
 * (/messages/limit) before the flow starts. The server gate in
 * /api/messages/save remains the race-safe block; this gate just spares
 * a capped user the whole flow only to hit the 403 at the end.
 */

const VALID_RELATIONSHIPS: ReadonlySet<string> = new Set([
  'daughter',
  'son',
  'partner',
  'parent',
  'grandchild',
  'friend',
  'other',
]);

function normalizeRelationship(value: unknown): RelationshipKey {
  if (typeof value === 'string' && VALID_RELATIONSHIPS.has(value)) {
    return value as RelationshipKey;
  }
  return 'other';
}

export default async function MessagesNewPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(signInWithNext(ROUTES.messagesNew));
  }

  // The forward /generate handoff (A4→A5) needs a ready cloned voice. No
  // voice yet → send the user to make one first (you can't shape a message
  // in a voice that doesn't exist). Most-recent ready profile wins.
  const { data: readyVoice } = await supabase
    .from('voice_profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!readyVoice?.id) {
    redirect(ROUTES.voiceCreate);
  }

  const { data: rawRecipients } = await supabase
    .from('recipients')
    .select('id, name, relationship')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  // Saved-message count drives A3's "last of three" variant (saved === 2),
  // the flow_started telemetry, and the Q4 vault-cap gate below.
  const { count: savedCount } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'saved');

  // Q4 cap gate — already at 3/3 → C3 (Vault Limit), not the flow. The
  // /save server gate still enforces race-safe; this just spares a capped
  // user the round-trip. `from=a2_entry` splits surfaced_from on the C3 event.
  if ((savedCount ?? 0) >= STEP6_LIMITS.maxSavedMessages) {
    redirect(`${ROUTES.messagesLimit}?from=a2_entry`);
  }

  // V1: skip the duplicate-name disambiguator join. If the user has
  // two recipients with the same name + relationship, both cards
  // render without a disambiguator (acceptable for early launch).
  // Layer the last-message-category lookup in when duplicate-name
  // cases appear in real data.
  const existingRecipients: ExistingRecipient[] = (rawRecipients ?? []).map(
    (r) => ({
      id: r.id as string,
      name: r.name as string,
      relationship: normalizeRelationship(r.relationship),
      lastMessageCategory: null,
    })
  );

  return (
    <MessagesNewPageClient
      existingRecipients={existingRecipients}
      voiceProfileId={readyVoice.id}
      savedCountBefore={savedCount ?? 0}
    />
  );
}
