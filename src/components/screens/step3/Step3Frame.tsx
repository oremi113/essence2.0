'use client';

import type { CSSProperties, ReactNode } from 'react';

interface Step3FrameProps {
  // Pass 1 static ground opacity for this state. The token lives in @theme at 0;
  // the sine loop + onset are Pass 3. Here it is a fixed per-state peak.
  shimmer: number;
  children: ReactNode;
}

// Shared screen frame for both Step 3 screens: the `.step3` surface plus the
// two ground layers (shimmer + atmosphere vignette) that sit behind content.
// `--shimmer-intensity` is set as an inline custom property so the ground reads
// it via `opacity: var(--shimmer-intensity)` — same mechanism Pass 3 will drive,
// just static here.
export function Step3Frame({ shimmer, children }: Step3FrameProps) {
  return (
    <div
      className="step3"
      style={{ '--shimmer-intensity': String(shimmer) } as CSSProperties}
    >
      <div className="step3__ground-shimmer" aria-hidden="true" />
      <div className="step3__vignette" aria-hidden="true" />
      {children}
    </div>
  );
}

// Top bar for CardCapture: back affordance + 5-step progress (Step 3 current).
export function Step3Backbar({ onBack }: { onBack?: () => void }) {
  return (
    <div className="step3-backbar">
      <button type="button" className="step3-backbar__btn" aria-label="Back" onClick={onBack}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="step3-backbar__pips" aria-hidden="true">
        <span className="step3-backbar__pip is-done" />
        <span className="step3-backbar__pip is-done" />
        <span className="step3-backbar__pip is-current" />
        <span className="step3-backbar__pip" />
        <span className="step3-backbar__pip" />
      </div>
      <span className="step3-backbar__spacer" />
    </div>
  );
}
