'use client';

import type { CSSProperties, ReactNode, Ref } from 'react';

interface Step3FrameProps {
  // Static ground opacity for this state (Pass 1/2 register). The token lives
  // in @theme at 0. Pass 3's Processing drives the ground via the rAF loop
  // instead — it passes `groundRef`, and `useShimmerLoop` writes
  // --shimmer-intensity onto that element each frame, overriding this default.
  shimmer: number;
  children: ReactNode;
  // Pass 3: hand the ground-shimmer element to the shimmer loop.
  groundRef?: Ref<HTMLDivElement>;
  groundId?: string;
}

// Shared screen frame for both Step 3 screens: the `.step3` surface plus the
// two ground layers (shimmer + atmosphere vignette) that sit behind content.
export function Step3Frame({ shimmer, children, groundRef, groundId }: Step3FrameProps) {
  return (
    <div
      className="step3"
      style={{ '--shimmer-intensity': String(shimmer) } as CSSProperties}
    >
      <div ref={groundRef} id={groundId} className="step3__ground-shimmer" aria-hidden="true" />
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
