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
        <p>You&apos;ll need about 10–13 minutes in a quiet space.</p>
        <p>We&apos;ll guide you through 25 short prompts.</p>
        <p>Your microphone will need to be enabled.</p>
      </div>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onBegin} isLoading={isSubmitting}>
          Begin recording
        </PrimaryButton>
        <LinkButton onClick={() => { /* no-op — user stays on screen */ }}>
          I need more time
        </LinkButton>
      </div>
    </StepShell>
  );
}
