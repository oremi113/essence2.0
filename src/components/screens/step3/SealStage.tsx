'use client';

import { SealVaultCanvas } from './SealVaultCanvas';
import type { ActiveCopy, SealPhase } from './useSealTimeline';

interface SealStageProps {
  // Root id — the seal.spec DOM contract addresses the stage as `#stage`.
  id?: string;
  phase: SealPhase;
  preseal: boolean;
  rm: boolean;
  presealCaption: string | null;
  activeCopy: ActiveCopy;
}

// Presentational seal surface (the DOM contract from prototypes/
// essence-step3-seal-pass2.html + seal.spec.ts). All timing lives in
// useSealTimeline; this only renders the stage and lets the phase-machine CSS
// (globals.css `.step3-seal`) gate the three opacity-stacked vault layers and
// the copy crossfade off [data-phase] / [data-preseal] / [data-rm].
//
// THE SEAM: CardCapture's settled frame and Processing's mount frame both
// render VaultObject(phase="sealed", emberState="ignited") inside the same
// `.step3-ceremony` geometry, so the vault does not move by a pixel across the
// handoff — only the copy crossfades.
export function SealStage({ id = 'stage', phase, preseal, rm, presealCaption, activeCopy }: SealStageProps) {
  return (
    <div
      className="step3 step3-seal"
      id={id}
      data-phase={phase}
      data-preseal={preseal ? '' : undefined}
      data-rm={rm ? '' : undefined}
    >
      <div className="step3__ground-shimmer" aria-hidden="true" />
      <div className="step3__vignette" aria-hidden="true" />

      <div className="step3-body">
        <div className="step3-ceremony">
          {/* ONE canvas plays the iris-close and ember-catch internally off the
              phase clock (SealVaultCanvas). The micro-settle scale still rides
              the stack off [data-phase]. Decorative — the aria-live copy carries
              state. */}
          <div className="seal-vault">
            <div className="seal-vault-stack">
              <SealVaultCanvas phase={phase} preseal={preseal} rm={rm} />
            </div>
          </div>

          {/* Copy deck: crossfade only across the seam. Only the active line is
              exposed to AT; the seal line announces once via aria-live. */}
          <div className="copy-deck">
            <div className="copy-line seal-copy" aria-live="polite" aria-hidden={activeCopy !== 'seal'}>
              <p className="step3-ceremony__copy">Sealed. Your voice is on its way.</p>
            </div>
            <div className="copy-line proc-copy" aria-hidden={activeCopy !== 'proc'}>
              <p className="step3-ceremony__copy">Preparing your voice.</p>
            </div>
            <div className="copy-line preseal-cap" aria-hidden={activeCopy !== 'pre'}>
              <p className="step3-ceremony__sub">{presealCaption ?? ''}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
