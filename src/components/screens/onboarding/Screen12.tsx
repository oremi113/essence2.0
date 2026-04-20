'use client';

import { PrimaryButton, LinkButton } from '@/components/ui';
import { StepShell, StoneSlot } from './chrome';

// ─── SCREEN 12 — Ready to begin ───────────────────────────────────

export function Screen12Ready({
  onBegin,
  isSubmitting,
}: {
  onBegin: () => void;
  isSubmitting: boolean;
}) {
  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">Ready to begin recording?</h1>

      <div className="onboarding-ready-list">
        <p>About 10 to 13 minutes in a quiet space.</p>
        <p>Twenty-five short prompts, in your own pace.</p>
        <p>Microphone enabled.</p>
      </div>

      <p
        className="onboarding-ready-closer"
        style={{
          fontStyle: 'italic',
          color: 'var(--color-text-primary)',
          textAlign: 'center',
        }}
      >
        What you record today will be kept for whenever it&rsquo;s needed.
      </p>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onBegin} isLoading={isSubmitting}>
          Begin recording
        </PrimaryButton>
        <LinkButton
          className="btn-link--soft"
          onClick={() => { /* no-op — user stays on screen */ }}
        >
          I need more time
        </LinkButton>
      </div>
    </StepShell>
  );
}
