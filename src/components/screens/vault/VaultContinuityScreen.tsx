'use client';

import { BreathStone } from '@/components/breath-stone';

interface VaultContinuityScreenProps {
  onAdvance: () => void;
}

// Prototype uses data-stone-state="loss-framing" but the current BreathStone
// engine does not define that state yet. 'guidance' (cool, still, reflective)
// is the closest match until the state is added. Swap when the engine lands.
export function VaultContinuityScreen({ onAdvance }: VaultContinuityScreenProps) {
  return (
    <section
      className="vault-screen vault-screen--continuity"
      onClick={onAdvance}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onAdvance();
      }}
    >
      <div className="vault-screen__vignette" aria-hidden="true" />
      <div className="vault-screen__inner">
        <div className="vault-continuity__object">
          <BreathStone state="guidance" size={280} />
        </div>
        <div className="vault-continuity__waveform" aria-hidden="true">
          <canvas width={560} height={112} />
        </div>
        <h1 className="vault-continuity__headline">
          Without protection, your preserved voice won&rsquo;t remain available.
        </h1>
        <p className="vault-continuity__body">
          Your trial lets you hear it. Protection keeps it available.
        </p>
      </div>
      <div className="vault-continuity__scroll-cue" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </section>
  );
}
