'use client';

import type { ProcessingEntry, Step3Props } from './types';
import { Step3Frame } from './Step3Frame';
import { VaultObject } from './VaultObject';
import { useShimmerLoop, type ShimmerActivation } from './useShimmerLoop';

export interface ProcessingProps extends Step3Props {
  // How the screen was reached (handoff §4 "entry" column). 'notify-deeplink'
  // is the cold start from an email and is the only thing that distinguishes
  // notify-landing from processing-normal. Routing dimension, not §3 data.
  entry?: ProcessingEntry;

  // Actions bubble out to the page.
  onNotify?: () => void;
}

type CopyKey = 'normal' | 'extended' | 'handoff' | 'support';

interface ProcessingView {
  copyKey: CopyKey;
  showNotifyOffer: boolean;
  showLandingBadge: boolean;
  // Ground-shimmer register (Motion Spec §4). The rAF loop turns this into the
  // live --shimmer-intensity; reduced motion collapses it to the static rest.
  activation: ShimmerActivation;
  // The neutral handoff contract frame (§7) — gen complete, the Reveal builds
  // from here. A real, nameable boundary, not an end-of-animation accident.
  isNeutralHandoff: boolean;
}

// Pure derivation of the wait surface from generation status + elapsed time +
// entry. Generation failure is invisible to the user by design (handoff §4):
// the UI degrades by elapsed time, not error state, until the bounded-hold
// notify handoff. 'failed' is internal bookkeeping that surfaces as the handoff
// offer; 'unrecoverable' is the SLA support tail; 'ready' is gen-complete and
// eases the shimmer down to the neutral handoff frame.
function processingView(p: Step3Props, entry: ProcessingEntry): ProcessingView {
  if (p.generation.status === 'ready') {
    return { copyKey: 'normal', showNotifyOffer: false, showLandingBadge: false, activation: 'neutral', isNeutralHandoff: true };
  }
  if (p.generation.status === 'unrecoverable') {
    return { copyKey: 'support', showNotifyOffer: true, showLandingBadge: false, activation: 'faint', isNeutralHandoff: false };
  }
  if (p.generation.status === 'failed') {
    return { copyKey: 'handoff', showNotifyOffer: true, showLandingBadge: false, activation: 'active', isNeutralHandoff: false };
  }
  // status 'processing' / 'idle' — the happy-path wait. Reduced motion is
  // handled by the shimmer loop (static faint rest), not branched here.
  if (entry === 'notify-deeplink') {
    return { copyKey: 'normal', showNotifyOffer: false, showLandingBadge: true, activation: 'active', isNeutralHandoff: false };
  }
  if (p.generation.elapsedMs >= 60000) {
    return { copyKey: 'extended', showNotifyOffer: false, showLandingBadge: false, activation: 'active', isNeutralHandoff: false };
  }
  return { copyKey: 'normal', showNotifyOffer: false, showLandingBadge: false, activation: 'faint', isNeutralHandoff: false };
}

// Processing (handoff §SEAM): owns the post-seal wait, the silent retry loop,
// generation-failure degradation, and the exit to the neutral handoff frame.
// The vault and ember are dead-still through the entire wait (Motion Spec §5);
// the ONLY motion is the ground shimmer. No re-pay control ever.
export function Processing(props: ProcessingProps) {
  const view = processingView(props, props.entry ?? 'seal');
  // The single ground-shimmer primitive. Writes --shimmer-intensity onto the
  // ground element each frame (base × breath); the vault never reads it.
  const groundRef = useShimmerLoop(view.activation, props.a11y.reducedMotion);

  return (
    <Step3Frame shimmer={0} groundRef={groundRef} groundId="shimmer">
      <div className="step3-body">
        <div className="step3-ceremony" data-neutral-handoff={view.isNeutralHandoff ? '' : undefined}>
          <VaultObject phase="sealed" emberState="ignited" />

          {view.showLandingBadge && (
            <span className="step3-badge">Picking up where you left off</span>
          )}

          <ProcessingCopy copyKey={view.copyKey} />

          {view.showNotifyOffer && (
            <div className="step3-stack step3-stack--center step3-gap-sm">
              <p className="step3-ceremony__sub">
                You can keep this open, or we&apos;ll let you know the moment your voice is ready to hear.
              </p>
              <button type="button" className="step3-link-quiet" onClick={props.onNotify}>
                Email me when it&apos;s ready
              </button>
            </div>
          )}
        </div>
      </div>
    </Step3Frame>
  );
}

function ProcessingCopy({ copyKey }: { copyKey: CopyKey }) {
  switch (copyKey) {
    case 'extended':
      return (
        <div>
          <p className="step3-ceremony__copy">Preparing your voice.</p>
          <p className="step3-ceremony__sub" style={{ marginTop: 'var(--space-md)' }}>
            Taking a little longer than usual. It&apos;s safe and on its way.
          </p>
        </div>
      );
    case 'handoff':
      return (
        <div>
          <p className="step3-ceremony__copy">Your Vault is sealed and your voice is safe.</p>
          <p className="step3-ceremony__sub" style={{ marginTop: 'var(--space-md)' }}>
            It&apos;s taking a little longer to prepare than usual. We&apos;ll have it ready soon.
          </p>
        </div>
      );
    case 'support':
      return (
        <div>
          <p className="step3-ceremony__copy">Your Vault is sealed and your voice is safe.</p>
          <p className="step3-ceremony__sub" style={{ marginTop: 'var(--space-md)' }}>
            We&apos;re making sure it gets created, and we&apos;ll reach out within a day.
          </p>
        </div>
      );
    case 'normal':
    default:
      return (
        <div>
          <p className="step3-ceremony__copy">Preparing your voice.</p>
        </div>
      );
  }
}
