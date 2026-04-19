'use client';

import { PrimaryButton } from '@/components/ui';
import { StepShell, StoneSlot } from './chrome';

// ─── SCREEN 2 — Purpose / cinematic conveyor ──────────────────────
//
// Transient phrases that pass across the conveyor before "Your voice."
// lands. Order matters — first phrase fires at 2500ms, then +1500ms each.
// To add/remove: edit this list. CSS picks up --phrase-index automatically.
const CONVEYOR_PHRASES: readonly string[] = [
  'Birthday wishes.',
  'Love notes.',
  '\u201CI\u2019m proud of you.\u201D',
  'Life advice.',
  'Letters for later.',
  'A goodbye, whenever it comes.',
];

// "Your voice." land delay, in ms. = 1000 + (N+1) * 1500
// where N = CONVEYOR_PHRASES.length. The +1 puts it one slot after
// the final transient phrase. Kept as a derived constant so adding
// phrases doesn't require manual delay math.
const CONVEYOR_FINAL_LAND_MS = 1000 + (CONVEYOR_PHRASES.length + 1) * 1500;
// "Their timeline." enters 1400ms after "Your voice." finishes landing.
const CONVEYOR_TAIL_LAND_MS = CONVEYOR_FINAL_LAND_MS + 1400;

export function Screen2({ onNext }: { onNext: () => void }) {
  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">Here&apos;s what ESSENCE does.</h1>

      <div className="onboarding-body">
        <p>You record a few minutes of natural speech.</p>
        <p>We create a voice that sounds like you.</p>
        <p>Then you use it to leave messages for the future.</p>
      </div>

      {/* Cinematic conveyor — transient phrases slide through, then the
          final pair ("Your voice." / "Their timeline.") lands stacked
          and stays as the quiet conclusion. Add/remove transient
          entries by editing CONVEYOR_PHRASES; --phrase-index drives
          per-phrase delay via CSS calc. */}
      <div className="onboarding-conveyor" aria-hidden="true">
        {CONVEYOR_PHRASES.map((phrase, i) => (
          <span
            key={phrase}
            className="onboarding-conveyor__phrase"
            style={{ ['--phrase-index' as string]: i + 1 }}
          >
            {phrase}
          </span>
        ))}
        <span className="onboarding-conveyor__phrase onboarding-conveyor__phrase--final">
          Your voice.
        </span>
      </div>
      <div
        className="onboarding-conveyor-tail"
        aria-hidden="true"
        style={{ animationDelay: `${CONVEYOR_TAIL_LAND_MS}ms` }}
      >
        Their timeline.
      </div>

      <div className="onboarding-ctas onboarding-ctas--delayed">
        <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
      </div>
    </StepShell>
  );
}
