'use client';

import { PrimaryButton } from '@/components/ui';
import { StepShell, StoneSlot } from './chrome';

// ─── SCREEN 2 — Purpose / cinematic conveyor ──────────────────────
//
// Transient phrases pass across the conveyor before "Your voice." lands
// as the conclusion. Order matters. To add/remove: edit this list; the
// timing below re-derives automatically.
const CONVEYOR_PHRASES: readonly string[] = [
  'Love notes.',
  '\u201CI\u2019m proud of you.\u201D',
  'A goodbye, whenever it comes.',
];

// Conveyor rhythm — named beats, not magic numbers. Edit individual
// values to tune the tempo; finalLand and ctaLand recompute.
const INTRO_DELAY = 1000;     // ms before the first phrase fires
const PHRASE_DURATION = 1500; // ms between phrase entries (stagger)
const FINAL_BEAT = 1500;      // ms of silence before "Your voice." lands
const CTA_BEAT = 3000;        // ms of silence before the CTA fades in

const finalLandMs =
  INTRO_DELAY + CONVEYOR_PHRASES.length * PHRASE_DURATION + FINAL_BEAT;
const ctaLandMs = finalLandMs + CTA_BEAT;

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

      {/* Cinematic conveyor — transient phrases slide through, then
          "Your voice." lands as the quiet conclusion. --phrase-index
          drives per-phrase delay via CSS calc; the final phrase and
          CTA delays are set inline so they recompute with phrase count. */}
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
        <span
          className="onboarding-conveyor__phrase onboarding-conveyor__phrase--final"
          style={{ animationDelay: `${finalLandMs}ms` }}
        >
          Your voice.
        </span>
      </div>

      <div
        className="onboarding-ctas onboarding-ctas--delayed"
        style={{ animationDelay: `${ctaLandMs}ms` }}
      >
        <PrimaryButton onClick={onNext}>Continue</PrimaryButton>
      </div>
    </StepShell>
  );
}
