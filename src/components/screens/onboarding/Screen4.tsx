'use client';

import { PrimaryButton } from '@/components/ui';
import { ChevronRightIcon } from '@/components/icons';
import { ROUTES } from '@/lib/routes';
import { StepShell, StoneSlot } from './chrome';

// ─── SCREEN 4 — Safety & trust ────────────────────────────────────
// This is also the legal-assent beat: the user must affirmatively agree to the
// published documents before onboarding can continue (Compliance Pack Part 3 /
// the "explicit checkbox, not a browsewrap footer link" requirement). Placed
// here rather than on the ceremonial final screen by owner decision (2026-09-01).

function DocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}
    >
      {children}
    </a>
  );
}

export function Screen4({
  onNext,
  onReadPrivacy,
  termsAccepted,
  onToggleTerms,
}: {
  onNext: () => void;
  onReadPrivacy: () => void;
  termsAccepted: boolean;
  onToggleTerms: (value: boolean) => void;
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

      <label
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          textAlign: 'left',
          fontSize: 13,
          lineHeight: 1.5,
          color: 'var(--color-text-secondary)',
          maxWidth: 340,
          margin: '4px auto 0',
        }}
      >
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => onToggleTerms(e.target.checked)}
          style={{ marginTop: 2, flexShrink: 0 }}
          aria-label="Agree to the Terms, Privacy Policy, Acceptable Use Policy, and Beta Participation Terms"
        />
        <span>
          I have read and agree to the{' '}
          <DocLink href={ROUTES.terms}>Terms</DocLink>,{' '}
          <DocLink href={ROUTES.privacy}>Privacy Policy</DocLink>,{' '}
          <DocLink href={ROUTES.acceptableUse}>Acceptable Use Policy</DocLink>, and{' '}
          <DocLink href={ROUTES.betaTerms}>Beta Participation Terms</DocLink>.
        </span>
      </label>

      <div className="onboarding-ctas">
        <PrimaryButton onClick={onNext} disabled={!termsAccepted}>
          I understand
        </PrimaryButton>
      </div>
    </StepShell>
  );
}
