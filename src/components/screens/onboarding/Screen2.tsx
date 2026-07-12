'use client';

import { PrimaryButton } from '@/components/ui';
import { ONBOARDING_TIMING } from '@/lib/config/onboarding-timing';
import { StepShell, StoneSlot } from './chrome';

// ─── SCREEN 2 — Purpose / cinematic conveyor ──────────────────────
//
// Transient phrases pass across the conveyor before "Your voice." lands
// as the conclusion. Order matters. To add/remove: edit this list; the
// timing below re-derives automatically.
// The transient phrases that pass across the (desktop) conveyor before the
// stacked conclusion "Your voice." / "Their timeline." lands. Restored from the
// animation-polish tuning (main had trimmed to 3). Edit freely \u2014 the timing
// below re-derives from the count. NB: the conveyor is display:none on mobile
// (main's decision \u2014 the body copy above carries the meaning), so this list only
// affects the desktop flourish and the CTA delay there.
const CONVEYOR_PHRASES: readonly string[] = [
  'Birthday wishes.',
  'Holiday greetings.',
  'Just because moments.',
  '\u201CI\u2019m proud of you.\u201D',
  'Love notes.',
  'Daily affirmations.',
  'Words of comfort.',
  'Bedtime stories.',
  'Life advice.',
  'Letters for later.',
  'Graduation messages.',
  'A goodbye, whenever it comes.',
];

const finalLandMs =
  ONBOARDING_TIMING.CONVEYOR_INTRO_DELAY_MS +
  CONVEYOR_PHRASES.length * ONBOARDING_TIMING.CONVEYOR_PHRASE_DURATION_MS +
  ONBOARDING_TIMING.CONVEYOR_FINAL_BEAT_MS;
// "Their timeline." lands a widened beat after "Your voice."; the CTA then waits
// for that full conclusion.
const tailLandMs = finalLandMs + ONBOARDING_TIMING.CONVEYOR_TAIL_BEAT_MS;
const ctaLandMs = tailLandMs + ONBOARDING_TIMING.CONVEYOR_CTA_BEAT_MS;

export function Screen2({ onNext }: { onNext: () => void }) {
  return (
    <StepShell>
      <StoneSlot />

      <h1 className="onboarding-title">Here&rsquo;s what ESSENCE does.</h1>

      <div className="onboarding-body">
        <p>You record a few minutes of natural speech.</p>
        <p>We create a voice that sounds like you.</p>
        <p>Then you use it to leave messages for the future.</p>
      </div>

      {/* Cinematic conveyor — transient phrases slide through, then
          "Your voice." lands as the quiet conclusion. --phrase-index
          drives per-phrase delay via CSS calc; the final phrase and
          CTA delays are set inline so they recompute with phrase count. */}
      <div
        className="onboarding-conveyor"
        aria-hidden="true"
        style={{
          ['--conveyor-intro' as string]: `${ONBOARDING_TIMING.CONVEYOR_INTRO_DELAY_MS}ms`,
          ['--conveyor-stagger' as string]: `${ONBOARDING_TIMING.CONVEYOR_PHRASE_DURATION_MS}ms`,
        }}
      >
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

      {/* Stacked conclusion: "Their timeline." lands below "Your voice." a
          widened beat later. Sibling of the conveyor (not a child) so it can
          be positioned/suppressed on its own; hidden on mobile alongside it. */}
      <div
        className="onboarding-conveyor-tail"
        aria-hidden="true"
        style={{ animationDelay: `${tailLandMs}ms` }}
      >
        Their timeline.
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
