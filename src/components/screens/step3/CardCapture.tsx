'use client';

import { useEffect } from 'react';
import type { BillingPlan, Step3Props } from './types';
import { Step3Frame, Step3Backbar } from './Step3Frame';
import { VaultObject } from './VaultObject';
import { SealStage } from './SealStage';
import { useSealTimeline } from './useSealTimeline';

export interface CardCaptureProps extends Step3Props {
  // Sandbox tuning aid only (handoff §4 `loss-frame-isolated`): isolates the
  // loss-frame turn by hiding Beat 2, so the line can be tuned alone. Not a
  // runtime state the user reaches — it mirrors the prototype's dev-rail toggle.
  isolate?: 'loss-frame';

  // Actions bubble out to the page (CLAUDE.md: screens own no side effects).
  // Optional so dev sandboxes can pass loggers or omit them.
  onBack?: () => void;
  onPlaySample?: () => void;
  onSelectPlan?: (plan: BillingPlan) => void;
  onKeep?: () => void;
  onNotNow?: () => void;
  onCheckAgain?: () => void;
  onResume?: () => void;
}

type CardCaptureView =
  | { kind: 'paywall'; showAfterCopy: boolean; plan: BillingPlan; busy: boolean; declined: boolean }
  | { kind: 'hold'; timedOut: boolean }
  | { kind: 'sealed' }
  | { kind: 'park' };

// Pure derivation of the rendered region from the §3 prop shape. This is where
// the two structural guardrails live:
//   §SEAL-INTEGRITY — the 'sealed' region is reachable ONLY when checkout is
//     'confirmed'. Every other branch renders the cool, unsealed vault.
//   §RETRY-BY-KNOWLEDGE — handled in the hold branch: 'timeout' offers
//     "Check again" (re-poll), never a re-pay control. "Try again" exists only
//     in the paywall's declined branch (a known no-charge decline).
function cardCaptureView(p: Step3Props): CardCaptureView {
  if (p.park.active) return { kind: 'park' };
  if (p.checkout.status === 'confirmed') return { kind: 'sealed' };
  if (p.vault.phase === 'confirm-hold') {
    return { kind: 'hold', timedOut: p.checkout.status === 'timeout' };
  }
  return {
    kind: 'paywall',
    showAfterCopy: p.sample.status === 'played',
    plan: p.pricing.plan,
    busy: p.checkout.status === 'submitting',
    declined: p.checkout.status === 'error',
  };
}

// CardCapture (handoff §SEAM): owns Beat 1, Beat 2, confirm-hold, confirm-timeout,
// checkout-error, the not-now park, and the seal as its hero exit. Single-entry,
// forward-only. Pure and props-driven — no Supabase, no fetch, tokens only.
export function CardCapture(props: CardCaptureProps) {
  const view = cardCaptureView(props);

  // The seal is CardCapture's hero exit. It owns the whole ceremonial surface
  // (its ground shimmer is driven by the phase machine, not a static prop), and
  // a committed seal has no "back" — so it renders the SealStage directly, not
  // inside the paywall chrome.
  if (view.kind === 'sealed') {
    return <CardCaptureSeal reducedMotion={props.a11y.reducedMotion} />;
  }

  return (
    <Step3Frame shimmer={0}>
      <Step3Backbar onBack={props.onBack} />
      <div className="step3-body">
        {view.kind === 'paywall' && <PaywallRegion {...props} view={view} />}
        {view.kind === 'hold' && <HoldRegion timedOut={view.timedOut} onCheckAgain={props.onCheckAgain} />}
        {view.kind === 'park' && <ParkRegion recordingId={props.park.recordingId} onResume={props.onResume} />}
      </div>
    </Step3Frame>
  );
}

// post-commit-confirmation (3b) + the reduced-motion settled frame. Plays the
// seal hero once on entry; reduced motion renders the settled frame directly.
// Reachable only when checkout is 'confirmed' (enforced in cardCaptureView) —
// the motion-side half of §SEAL-INTEGRITY.
function CardCaptureSeal({ reducedMotion }: { reducedMotion: boolean }) {
  const seal = useSealTimeline(reducedMotion);
  // Play exactly once on entry. reducedMotion is fixed for this mounted seal
  // (a sealed screen never un-seals), so a mount-only effect is correct.
  const { play } = seal;
  useEffect(() => {
    play();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- play once on mount
  }, []);

  return (
    <SealStage
      phase={seal.phase}
      preseal={seal.preseal}
      rm={seal.rm}
      presealCaption={seal.presealCaption}
      activeCopy={seal.activeCopy}
    />
  );
}

function PaywallRegion(
  props: CardCaptureProps & {
    view: Extract<CardCaptureView, { kind: 'paywall' }>;
  },
) {
  const { pricing, sample, view, isolate } = props;
  const showBeat2 = isolate !== 'loss-frame';
  const annual = view.plan === 'annual';

  return (
    <div className="step3-region step3-stack step3-gap-xl">
      {/* decline banner — checkout-error only (no charge made, safe to retry) */}
      {view.declined && (
        <div className="step3-notice" role="alert">
          <div className="step3-notice__title">Your card didn&apos;t go through this time.</div>
          <div className="step3-notice__safe">Your messages are safe either way.</div>
        </div>
      )}

      {/* Beat 1 · recognition */}
      <div className="step3-stack step3-gap-sm">
        <div className="step3-eyebrow">Your voice</div>
        <h1 className="step3-headline">That&apos;s your voice.</h1>
        <p className="step3-subhead">Twenty-five prompts, in your own words. The hard part&apos;s done.</p>
      </div>

      {/* Beat 1 · sample (an example, labeled) */}
      <div className="step3-sample">
        <div className="step3-sample__row">
          <button type="button" className="step3-sample__play" aria-label="Play example" onClick={props.onPlaySample}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <span className="step3-sample__label">{sample.label}</span>
        </div>
        {view.showAfterCopy && (
          <span className="step3-sample__aftercopy">
            That warmth and presence is what gets preserved. Yours, next.
          </span>
        )}
      </div>

      {/* the vault — establish, ember cool (never sealed in the paywall) */}
      <div className="step3-vault-stage">
        <VaultObject phase="establish" emberState="cool" />
      </div>

      {/* the turn · loss frame (Elevated) */}
      <p className="step3-turn">Right now, it&apos;s only a recording. A beginning, not something kept.</p>

      {/* Beat 2 · commit (hidden in the loss-frame isolation sandbox view) */}
      {showBeat2 && (
        <div className="step3-stack step3-gap-lg">
          <p className="step3-value">
            Sealing it keeps your voice safe and ready, so the people you love can hear you whenever they need to.
          </p>

          <div className="step3-plan-toggle" role="group" aria-label="Choose a plan">
            <button
              type="button"
              className={`step3-plan${annual ? ' is-active' : ''}`}
              aria-pressed={annual}
              onClick={() => props.onSelectPlan?.('annual')}
            >
              <div className="step3-plan__name">Annual</div>
              <div className="step3-plan__price">
                {pricing.annualPrice} yearly · about {pricing.monthlyEquivalent} a month
              </div>
            </button>
            <button
              type="button"
              className={`step3-plan${annual ? '' : ' is-active'}`}
              aria-pressed={!annual}
              onClick={() => props.onSelectPlan?.('monthly')}
            >
              <div className="step3-plan__name">Monthly</div>
              <div className="step3-plan__price">{pricing.monthlyPrice} monthly</div>
            </button>
          </div>

          <p className="step3-price-line">
            {annual ? (
              <>
                About <strong>{pricing.monthlyEquivalent} a month</strong> to keep your voice safe, billed yearly.
              </>
            ) : (
              <>
                <strong>{pricing.monthlyPrice} a month</strong> to keep your voice safe.
              </>
            )}
          </p>

          {/* proof: present, zero-height, so layout does not shift when populated later */}
          <div className="step3-proof-slot" aria-hidden="true" />

          <button
            type="button"
            className={`step3-cta${view.busy ? ' is-busy' : ''}`}
            disabled={view.busy}
            aria-busy={view.busy}
            onClick={props.onKeep}
          >
            {view.busy && <span className="step3-cta__spinner" aria-hidden="true" />}
            <span className={`step3-cta__label${view.busy ? ' is-dim' : ''}`}>
              {view.declined ? 'Try again' : 'Keep my voice'}
            </span>
          </button>
          <p className="step3-risk">
            {pricing.trialDays} days free. Nothing today. Cancel anytime.
          </p>
          <button type="button" className="step3-optout" onClick={props.onNotNow}>
            Not now
          </button>
        </div>
      )}
    </div>
  );
}

// confirm-hold (3a) and confirm-timeout (3c). Both stay in the unsealed,
// modest, listening appearance — the only change at timeout is added copy and
// the "Check again" re-poll. §RETRY-BY-KNOWLEDGE: no re-pay control here, ever.
function HoldRegion({ timedOut, onCheckAgain }: { timedOut: boolean; onCheckAgain?: () => void }) {
  return (
    <div className="step3-region">
      <div className="step3-ceremony">
        <VaultObject phase="confirm-hold" emberState="cool" />
        <div className="step3-stack step3-stack--center step3-gap-md">
          <p className="step3-ceremony__copy">Still confirming your payment.</p>
          <p className="step3-ceremony__sub">
            There&apos;s no need to pay again. We&apos;ll seal your Vault the moment it comes through.
          </p>
          {timedOut && (
            <>
              <p className="step3-ceremony__sub">
                Taking longer than usual. You can keep this open, or we&apos;ll email you the moment your voice is
                sealed.
              </p>
              <button type="button" className="step3-link-quiet" onClick={onCheckAgain}>
                Check again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// not-now park: voice held, unsealed, place kept, gentle reminder promised.
function ParkRegion({ recordingId, onResume }: { recordingId: string; onResume?: () => void }) {
  return (
    <div className="step3-region" data-recording-id={recordingId}>
      <div className="step3-ceremony">
        <VaultObject phase="establish" emberState="cool" />
        <p className="step3-ceremony__copy">Your voice is safe.</p>
        <p className="step3-ceremony__sub">
          It&apos;s kept just as you recorded it. When you&apos;re ready to seal it, your place is here, and we&apos;ll
          email you a gentle reminder.
        </p>
        <button type="button" className="step3-link-quiet" onClick={onResume}>
          Keep my voice
        </button>
      </div>
    </div>
  );
}
