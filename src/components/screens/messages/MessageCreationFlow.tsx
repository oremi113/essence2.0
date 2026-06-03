'use client';

/**
 * Step 6 message-creation flow orchestrator (V1 stub).
 *
 * Holds the staged inputs (recipient, eventually category + note) in
 * React state and routes between the A2 → A4 form screens. A5/A6/A7
 * live on a different URL (/messages/new/g/[generationId]) per
 * Step6_OpenContracts.md Q7 — once A4 submit triggers /generate, the
 * flow hands off to that route.
 *
 * V1 stub: renders A2 (RecipientSetupScreen) only. After submit, shows
 * a small "next pass" placeholder so the orchestrator is wired end-to-
 * end. When A3 lands, swap the placeholder for CategorySelectorScreen
 * without rewiring this parent.
 *
 * Mints flow_id + fires step6.flow_started on mount per the analytics
 * doc. A fresh mount = a fresh flow.
 */

import { useCallback, useEffect, useState } from 'react';
import { mintFlowId, trackStep6 } from '@/lib/analytics/step6';
import { RecipientSetupScreen } from './RecipientSetupScreen';
import type {
  FlowStep,
  MessageCreationFlowProps,
  StagedFlowState,
} from './MessageCreationFlow.types';
import type { RecipientSelection } from './RecipientSetupScreen.types';

export function MessageCreationFlow({
  existingRecipients,
  onExitFlow,
}: MessageCreationFlowProps) {
  const [step, setStep] = useState<FlowStep>('recipient');
  const [staged, setStaged] = useState<StagedFlowState>({ recipient: null });

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

  if (step === 'recipient') {
    return (
      <RecipientSetupScreen
        existingRecipients={existingRecipients}
        onSubmit={handleRecipientSubmit}
        onBack={onExitFlow}
      />
    );
  }

  // A3 / A4 placeholders — wired so the orchestrator works end-to-end.
  // Swap these for the real screens in their respective build passes.
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg-warm-phase)] text-[var(--color-text-primary)] items-center justify-center px-6 text-center">
      <p className="font-[family-name:var(--font-display)] italic text-[24px] font-medium max-w-[320px] text-balance">
        Recipient captured. Next screen (Category) lands in the next pass.
      </p>
      <pre className="mt-6 text-sm text-[var(--color-text-secondary)] font-mono whitespace-pre-wrap text-left bg-[var(--color-surface-card)] p-4 rounded-2xl max-w-[420px] overflow-auto">
        {JSON.stringify(staged.recipient, null, 2)}
      </pre>
      <button
        type="button"
        onClick={() => setStep('recipient')}
        className="mt-6 underline text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
      >
        Back to recipient
      </button>
    </div>
  );
}
