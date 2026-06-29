'use client';

import { memo, useId } from 'react';
import type { EmberState, VaultPhase } from './types';

interface VaultObjectProps {
  phase: VaultPhase;
  emberState: EmberState;
  // When stacked as an opacity-gated seal layer, the vault is decorative (the
  // aria-live copy + readouts carry state) — suppress role/label so AT does not
  // announce three overlapping "Your Vault" images.
  decorative?: boolean;
}

// The single signature Vault object (handoff NOTE FOR CODE ARCHITECT #1):
// ONE prop-driven component reused by CardCapture's sealed region, Processing,
// and later the relocated Reveal + restore. Pass 1 is a deliberately throwaway
// CSS/SVG approximation; the canvas swap lands in Pass 2 — build it once, feed
// it props, never fork per screen.
//
// Color: gradient stops use @theme vault tokens (set inline as CSS custom-prop
// refs); stroke alphas are prototype-local effect values living on the `.step3`
// CSS classes, NOT raw hex in this JSX (handoff §0.3, no raw hex in screens).
//
// §SEAL-INTEGRITY (structural half): the sealed frame and the ignited ember are
// rendered ONLY for phase 'sealed'. 'establish' and 'confirm-hold' render the
// cool, unsealed vessel with a cool ember socket. There is no code path that
// lights an ember on a pre-seal phase.
// Memoized: the seal stacks three VaultObjects with constant props. Without
// memo, every phase flip on the parent re-reconciles all three full SVGs
// (~15 nodes each, with gradients) — that reconcile, not layer promotion, is
// the hitch that straddled the 50ms gate at the iris-close onset.
function VaultObjectImpl({ phase, emberState, decorative = false }: VaultObjectProps) {
  // Unique gradient ids per instance so multiple vaults never collide.
  const uid = useId().replace(/[:]/g, '');
  const id = (name: string) => `${name}-${uid}`;

  const sealed = phase === 'sealed';
  // Within a sealed case the pilot can still read cool (the close, before the
  // catch) — that is the third seal layer. Ignited adds the halo + lit core.
  const ignited = sealed && emberState === 'ignited';
  const label = sealed ? 'Your Vault, sealed' : 'Your Vault, unsealed';
  const a11y = decorative
    ? ({ 'aria-hidden': true } as const)
    : ({ role: 'img', 'aria-label': label } as const);

  return (
    <svg
      className="step3-vault"
      viewBox="0 0 196 196"
      {...a11y}
      data-phase={phase}
      data-ember={emberState}
    >
      <defs>
        <radialGradient id={id('caseCool')} cx="42%" cy="34%" r="72%">
          <stop offset="0%" style={{ stopColor: 'var(--vault-case-cool-0)' }} />
          <stop offset="52%" style={{ stopColor: 'var(--vault-case-cool-1)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--vault-case-cool-2)' }} />
        </radialGradient>
        <radialGradient id={id('caseWarm')} cx="42%" cy="34%" r="72%">
          <stop offset="0%" style={{ stopColor: 'var(--vault-case-warm-0)' }} />
          <stop offset="52%" style={{ stopColor: 'var(--vault-case-warm-1)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--vault-case-warm-2)' }} />
        </radialGradient>
        <radialGradient id={id('interior')} cx="50%" cy="46%" r="60%">
          <stop offset="0%" style={{ stopColor: 'var(--vault-interior-0)' }} />
          <stop offset="70%" style={{ stopColor: 'var(--vault-interior-1)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--vault-interior-2)' }} />
        </radialGradient>
        <radialGradient id={id('emberCool')} cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ stopColor: 'var(--vault-ember-cool-0)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--vault-ember-cool-1)' }} />
        </radialGradient>
        <radialGradient id={id('emberIgnited')} cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ stopColor: 'var(--vault-ember-halo-0)' }} />
          <stop offset="38%" style={{ stopColor: 'var(--vault-ember-halo-1)' }} />
          <stop offset="70%" style={{ stopColor: 'var(--vault-ember-halo-2)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--vault-ember-halo-3)' }} />
        </radialGradient>
      </defs>

      {sealed ? (
        <>
          {/* ignited ember halo behind the sealed iris (static, no pulse, no brightness()).
              Present only once the ember has caught — the cool/closing layer omits it. */}
          {ignited && <circle cx="98" cy="98" r="40" fill={`url(#${id('emberIgnited')})`} />}
          <circle cx="98" cy="98" r="92" fill={`url(#${id('caseWarm')})`} />
          <circle className="step3-vault__rim--warm" cx="98" cy="98" r="92" fill="none" strokeWidth="1.5" />
          <circle className="step3-vault__ring--soft" cx="98" cy="98" r="74" fill="none" strokeWidth="2" />
          {/* closed iris: filled aperture + soft seams to center */}
          <circle cx="98" cy="98" r="50" fill={`url(#${id('caseWarm')})`} />
          <g className="step3-vault__seam" strokeWidth="1.5" strokeLinecap="round">
            <line x1="98" y1="48" x2="98" y2="98" />
            <line x1="141" y1="73" x2="98" y2="98" />
            <line x1="141" y1="123" x2="98" y2="98" />
            <line x1="98" y1="148" x2="98" y2="98" />
            <line x1="55" y1="123" x2="98" y2="98" />
            <line x1="55" y1="73" x2="98" y2="98" />
          </g>
          <circle className="step3-vault__ring--soft" cx="98" cy="98" r="50" fill="none" strokeWidth="1.5" />
          {/* center boss */}
          <circle cx="98" cy="98" r="13" fill={`url(#${id('caseWarm')})`} />
          <circle className="step3-vault__boss-edge" cx="98" cy="98" r="13" fill="none" strokeWidth="1.5" />
          {ignited ? (
            // lit ember core — the caught pilot light
            <circle cx="98" cy="98" r="6" style={{ fill: 'var(--vault-lit-core)' }} />
          ) : (
            // cool pilot still in its socket: case shut, ember not yet caught
            <>
              <circle cx="98" cy="98" r="11" fill={`url(#${id('emberCool')})`} />
              <circle className="step3-vault__ember-edge" cx="98" cy="98" r="11" fill="none" strokeWidth="1.5" />
            </>
          )}
        </>
      ) : (
        <>
          <circle cx="98" cy="98" r="92" fill={`url(#${id('caseCool')})`} />
          <circle className="step3-vault__rim" cx="98" cy="98" r="92" fill="none" strokeWidth="1.5" />
          <circle className="step3-vault__ring" cx="98" cy="98" r="74" fill="none" strokeWidth="2" />
          <circle cx="98" cy="98" r="50" fill={`url(#${id('interior')})`} />
          <circle className="step3-vault__interior-edge" cx="98" cy="98" r="50" fill="none" strokeWidth="1.5" />
          {/* retracted blade hints around the rim — only on the open 'establish' vessel */}
          {phase === 'establish' && (
            <g className="step3-vault__blade" strokeWidth="2" strokeLinecap="round">
              <line x1="98" y1="50" x2="98" y2="60" />
              <line x1="139" y1="74" x2="131" y2="80" />
              <line x1="139" y1="122" x2="131" y2="116" />
              <line x1="98" y1="146" x2="98" y2="136" />
              <line x1="57" y1="122" x2="65" y2="116" />
              <line x1="57" y1="74" x2="65" y2="80" />
            </g>
          )}
          {/* cool ember socket (dormant — never lit on a pre-seal phase) */}
          <circle cx="98" cy="98" r="11" fill={`url(#${id('emberCool')})`} />
          <circle className="step3-vault__ember-edge" cx="98" cy="98" r="11" fill="none" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}

export const VaultObject = memo(VaultObjectImpl);
