'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { MessageCreationFlow } from '@/components/screens/messages/MessageCreationFlow';
import { clearFlowId } from '@/lib/analytics/step6';
import { supportMailto } from '@/lib/config/support';
import type { GenerateRequest } from '@/components/screens/messages/MessageCreationFlow.types';
import type { PersonalNoteSubmitResult } from '@/components/screens/messages/PersonalNoteScreen.types';
import type { ExistingRecipient } from '@/components/screens/messages/RecipientSetupScreen.types';
import { ROUTES, messageGenerationRoute } from '@/lib/routes';

/**
 * Client wrapper for /messages/new. Owns the two page-layer concerns the
 * orchestrator bubbles out (CLAUDE.md three-layer rule — screens never
 * fetch or redirect):
 *
 *  • onExitFlow — clears the active flow_id, routes to /home.
 *  • onGenerate — the A4-submit cold-start handoff. POSTs /generate
 *    (synchronous: LLM text + ElevenLabs render run inline) and, on
 *    success, pushes to the new generation's A6 (/messages/new/g/[id]).
 *    A5 ("shaping your message") is the orchestrator's in-flight wait;
 *    success unmounts it via this navigation, failure resolves not-ok and
 *    the orchestrator flips A5 to its retry state.
 *
 * Note: the A6 generation route renders only under DEFERRED_AUDIO_ENABLED
 * (the control-arm A6 isn't built). With the flag off, a successful
 * generate lands on a 404 — expected until the control-arm A6 exists.
 */

interface MessagesNewPageClientProps {
  existingRecipients: ExistingRecipient[];
  /** The user's ready, cloned voice profile (page guarantees one exists). */
  voiceProfileId: string;
  /** Saved-message count — drives A3's "last of three" + flow_started. */
  savedCountBefore: number;
}

export function MessagesNewPageClient({
  existingRecipients,
  voiceProfileId,
  savedCountBefore,
}: MessagesNewPageClientProps) {
  const router = useRouter();

  const handleExit = useCallback(() => {
    clearFlowId();
    router.push(ROUTES.home);
  }, [router]);

  // A5 contact-as-care (after the 3-attempt generation ceiling). The page owns
  // the side effect per the three-layer rule; the flow/screen only decide when
  // to offer it. mailto so a stuck user reaches a human without leaving the app
  // context behind.
  const handleContactSupport = useCallback(() => {
    window.location.href = supportMailto('Help with my message');
  }, []);

  const handleGenerate = useCallback(
    async ({ recipient, category, note }: GenerateRequest): Promise<PersonalNoteSubmitResult> => {
      const body: Record<string, unknown> = {
        voiceProfileId,
        category,
        ...(note ? { note } : {}),
        ...(recipient.kind === 'existing'
          ? { recipientId: recipient.recipientId }
          : {
              pendingRecipientName: recipient.name,
              pendingRecipientRelationship: recipient.relationship,
              ...(recipient.descriptor
                ? { pendingRecipientDescriptor: recipient.descriptor }
                : {}),
            }),
      };

      try {
        const res = await fetch('/api/messages/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => ({}))) as {
          generationId?: string;
        };
        if (res.status === 200 && data.generationId) {
          router.push(messageGenerationRoute(data.generationId));
          return { ok: true };
        }
      } catch {
        // network/parse failure → not-ok (A5 shows the retry)
      }
      return { ok: false };
    },
    [voiceProfileId, router],
  );

  return (
    <MessageCreationFlow
      existingRecipients={existingRecipients}
      savedCountBefore={savedCountBefore}
      onExitFlow={handleExit}
      onGenerate={handleGenerate}
      onContactSupport={handleContactSupport}
    />
  );
}
