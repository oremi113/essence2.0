'use client';

/**
 * Step 6 message-creation flow orchestrator.
 *
 * Holds the staged form inputs (recipient, category) in React state and
 * routes between the A2 → A3 → A4 form screens. A5/A6/A7 live on a
 * different URL (/messages/new/g/[generationId]) per
 * Step6_OpenContracts.md Q7 — once A4 submit triggers /generate (via the
 * onGenerate handoff), the page hands off to that route.
 *
 * Pure and props-driven per CLAUDE.md: the orchestrator owns step state
 * and the staged inputs; data-fetching, /generate, and navigation belong
 * to the page (onExitFlow / onGenerate).
 *
 * Mints flow_id + fires step6.flow_started on mount per the analytics
 * doc. A fresh mount = a fresh flow.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { mintFlowId, trackStep6 } from '@/lib/analytics/step6';
import { getCategoryDefinition, type MessageCategory } from '@/lib/messageTemplates';
import { CategorySelectorScreen } from './CategorySelectorScreen';
import { PersonalNoteScreen } from './PersonalNoteScreen';
import { RecipientSetupScreen } from './RecipientSetupScreen';
import type {
  FlowStep,
  MessageCreationFlowProps,
  StagedFlowState,
} from './MessageCreationFlow.types';
import type { PersonalNoteSubmitResult } from './PersonalNoteScreen.types';
import type { RecipientSelection } from './RecipientSetupScreen.types';
import type { ExistingRecipient } from './RecipientSetupScreen.types';

/** Resolve the recipient's display name for the A3/A4 context crumb. */
function recipientDisplayName(
  selection: RecipientSelection,
  existing: ExistingRecipient[],
): string {
  if (selection.kind === 'new') return selection.name;
  return existing.find((r) => r.id === selection.recipientId)?.name ?? 'them';
}

export function MessageCreationFlow({
  existingRecipients,
  onExitFlow,
  onGenerate,
}: MessageCreationFlowProps) {
  const [step, setStep] = useState<FlowStep>('recipient');
  const [staged, setStaged] = useState<StagedFlowState>({
    recipient: null,
    category: null,
  });

  // Mint flow_id + fire flow_started on mount. A new mount of this
  // component (a fresh navigation to /messages/new) = a new flow.
  useEffect(() => {
    mintFlowId();
    trackStep6('flow_started', {
      entry_surface: 'home_b',
      saved_count_before: 0,
    });
    // Intentionally empty deps — fire exactly once per mount.
  }, []);

  const handleRecipientSubmit = useCallback((selection: RecipientSelection) => {
    setStaged((prev) => ({ ...prev, recipient: selection }));
    setStep('category');
  }, []);

  const handleCategorySubmit = useCallback((category: MessageCategory) => {
    setStaged((prev) => ({ ...prev, category }));
    setStep('note');
  }, []);

  const handleNoteSubmit = useCallback(
    async (note: string | null): Promise<PersonalNoteSubmitResult> => {
      if (!staged.recipient || !staged.category) return { ok: false };
      return onGenerate({
        recipient: staged.recipient,
        category: staged.category,
        note,
      });
    },
    [staged.recipient, staged.category, onGenerate],
  );

  const recipientName = useMemo(
    () =>
      staged.recipient
        ? recipientDisplayName(staged.recipient, existingRecipients)
        : '',
    [staged.recipient, existingRecipients],
  );

  if (step === 'recipient') {
    return (
      <RecipientSetupScreen
        existingRecipients={existingRecipients}
        onSubmit={handleRecipientSubmit}
        onBack={onExitFlow}
      />
    );
  }

  if (step === 'category') {
    return (
      <CategorySelectorScreen
        recipientName={recipientName}
        // isFinalOfThree derives from saved_count_before === 2; the saved-
        // count query is not wired yet (see /messages/new/page.tsx note +
        // the hardcoded saved_count_before above). False until it lands.
        isFinalOfThree={false}
        initialCategory={staged.category}
        onSubmit={handleCategorySubmit}
        onBack={() => setStep('recipient')}
      />
    );
  }

  // step === 'note' (A4, forward path)
  return (
    <PersonalNoteScreen
      recipientName={recipientName}
      categoryLabel={staged.category ? getCategoryDefinition(staged.category).label : ''}
      category={staged.category ?? 'encouragement'}
      onSubmit={handleNoteSubmit}
      onBack={() => setStep('category')}
    />
  );
}
