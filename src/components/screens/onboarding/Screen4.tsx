'use client';

import { PrimaryButton } from '@/components/ui';
import { ChevronRightIcon } from '@/components/icons';
import { StepShell, StoneSlot } from './chrome';

// ─── SCREEN 4 — Safety & trust ────────────────────────────────────

export function Screen4({
  onNext,
  onReadPrivacy,
}: {
  onNext: () => void;
  onReadPrivacy: () => void;
}) {
  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">Your voice stays private. Always.</h1>

      <div className="onboarding-body">
        <p>
          We <span className="onboarding-body__never">never</span> sell your
          recordings.
        </p>
        <p>
          We <span className="onboarding-body__never">never</span> use them to
          train other products.
        </p>
        <p>
          We <span className="onboarding-body__never">never</span> share them
          without your permission.
        </p>
        {/* Copy trimmed 2026-07-12 to match implementation (no client-side/E2E
            encryption exists) — pending counsel sign-off. See
            docs/follow-ups/2026-07-12-privacy-copy-claims-e2e-encryption-but-audio-is-plaintext.md */}
        <p className="onboarding-body__muted">
          Encrypted in transit and at rest.
        </p>
      </div>

      <button
        type="button"
        className="onboarding-secondary-link"
        onClick={onReadPrivacy}
      >
        Read our privacy promise
        <ChevronRightIcon size={14} />
      </button>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onNext}>I understand</PrimaryButton>
      </div>
    </StepShell>
  );
}
