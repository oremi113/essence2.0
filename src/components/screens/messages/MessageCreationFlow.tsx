'use client';

/**
 * Step 6 message-creation flow orchestrator.
 *
 * Holds the staged form inputs (recipient, category, note) in React state
 * and routes between A2 → A3 → A4 → A5. A6/A7 live on a different URL
 * (/messages/new/g/[generationId]) per Step6_OpenContracts.md Q7 — A4
 * submit fires onGenerate (the page owns /generate + the router push to
 * A6), and A5 is the in-flight wait shown until that resolves.
 *
 * The honoring → A5 seam (note path): A4's "We'll bring this into your
 * voice" beat plays for its ~2.4s min-hold while /generate is already in
 * flight (fired at submit), then the orchestrator swaps to A5 so the
 * honoring beat overlaps the call rather than stacking before it. The
 * skip path has no honoring moment and goes straight to A5.
 *
 * A5 is status-driven (its contract): the orchestrator owns the /generate
 * round-trip and flips genStatus 'working' → 'failed' on not-ok; success
 * is modelled by unmount (the page navigates to A6). Retry re-runs
 * /generate; "Adjust your note" returns to A4 with the note pre-filled.
 *
 * Pure and props-driven per CLAUDE.md: the orchestrator owns step state
 * and the staged inputs; data-fetching, /generate, and navigation belong
 * to the page (onExitFlow / onGenerate).
 *
 * Mints flow_id + fires step6.flow_started on mount per the analytics
 * doc. A fresh mount = a fresh flow.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mintFlowId, trackStep6 } from '@/lib/analytics/step6';
import { getCategoryDefinition, type MessageCategory } from '@/lib/messageTemplates';
import { CategorySelectorScreen } from './CategorySelectorScreen';
import { GenerationScreen } from './GenerationScreen';
import { PersonalNoteScreen } from './PersonalNoteScreen';
import { RecipientSetupScreen } from './RecipientSetupScreen';
import type { GenerationStatus } from './GenerationScreen.types';
import type {
  FlowStep,
  GenerateRequest,
  MessageCreationFlowProps,
  StagedFlowState,
} from './MessageCreationFlow.types';
import type { PersonalNoteSubmitResult } from './PersonalNoteScreen.types';
import type {
  ExistingRecipient,
  RecipientSelection,
} from './RecipientSetupScreen.types';

/** A4's honoring beat plays this long before handing off to A5 (note path). */
const HONORING_HANDOFF_MS = 2400;

/** Resolve the recipient's display name for the A3/A4/A5 context crumb. */
function recipientDisplayName(
  selection: RecipientSelection,
  existing: ExistingRecipient[],
): string {
  if (selection.kind === 'new') return selection.name;
  return existing.find((r) => r.id === selection.recipientId)?.name ?? 'them';
}

export function MessageCreationFlow({
  existingRecipients,
  savedCountBefore = 0,
  onExitFlow,
  onGenerate,
}: MessageCreationFlowProps) {
  const [step, setStep] = useState<FlowStep>('recipient');
  const [staged, setStaged] = useState<StagedFlowState>({
    recipient: null,
    category: null,
    note: null,
  });
  const [genStatus, setGenStatus] = useState<GenerationStatus>('working');

  // The request in flight — kept for A5's "Try again" so retry re-sends
  // exactly what failed without re-deriving it from staged state.
  const lastRequest = useRef<GenerateRequest | null>(null);

  // Mint flow_id + fire flow_started on mount. A new mount of this
  // component (a fresh navigation to /messages/new) = a new flow.
  useEffect(() => {
    mintFlowId();
    trackStep6('flow_started', {
      entry_surface: 'home_b',
      saved_count_before: savedCountBefore,
    });
    // Fire exactly once per mount — savedCountBefore is fixed at flow start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRecipientSubmit = useCallback((selection: RecipientSelection) => {
    setStaged((prev) => ({ ...prev, recipient: selection }));
    setStep('category');
  }, []);

  const handleCategorySubmit = useCallback((category: MessageCategory) => {
    setStaged((prev) => ({ ...prev, category }));
    setStep('note');
  }, []);

  /** Fire /generate; on not-ok flip A5 to failed (success → page navigates). */
  const runGenerate = useCallback(
    (request: GenerateRequest) => {
      lastRequest.current = request;
      setGenStatus('working');
      void onGenerate(request).then((result) => {
        if (!result.ok) setGenStatus('failed');
      });
    },
    [onGenerate],
  );

  const handleNoteSubmit = useCallback(
    async (note: string | null): Promise<PersonalNoteSubmitResult> => {
      if (!staged.recipient || !staged.category) return { ok: false };
      setStaged((prev) => ({ ...prev, note }));

      // Fire /generate at submit so it overlaps the honoring beat.
      runGenerate({ recipient: staged.recipient, category: staged.category, note });

      // Note path: let A4's honoring beat play, then hand to A5. Skip path:
      // no honoring — straight to A5.
      if (note) {
        await new Promise((r) => setTimeout(r, HONORING_HANDOFF_MS));
      }
      setStep('generating');
      // Resolve ok so A4's honoring holds (it unmounts via the step change);
      // generation success/failure is owned by A5, not A4's return value.
      return { ok: true };
    },
    [staged.recipient, staged.category, runGenerate],
  );

  const handleRetry = useCallback(() => {
    if (lastRequest.current) runGenerate(lastRequest.current);
  }, [runGenerate]);

  const recipientName = useMemo(
    () =>
      staged.recipient
        ? recipientDisplayName(staged.recipient, existingRecipients)
        : '',
    [staged.recipient, existingRecipients],
  );

  const categoryLabel = staged.category
    ? getCategoryDefinition(staged.category).label
    : '';

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
        isFinalOfThree={savedCountBefore === 2}
        initialCategory={staged.category}
        onSubmit={handleCategorySubmit}
        onBack={() => setStep('recipient')}
      />
    );
  }

  if (step === 'note') {
    return (
      <PersonalNoteScreen
        recipientName={recipientName}
        categoryLabel={categoryLabel}
        category={staged.category ?? 'encouragement'}
        initialNote={staged.note ?? ''}
        onSubmit={handleNoteSubmit}
        onBack={() => setStep('category')}
      />
    );
  }

  // step === 'generating' (A5)
  return (
    <GenerationScreen
      recipientName={recipientName}
      categoryLabel={categoryLabel}
      status={genStatus}
      hasNote={Boolean(staged.note)}
      onRetry={handleRetry}
      onAdjustNote={() => setStep('note')}
    />
  );
}
