'use client';

import { PrimaryButton } from '@/components/ui';
import { ONBOARDING_TIMING } from '@/lib/config/onboarding-timing';
import { StepShell, StoneSlot } from './chrome';

// ─── SCREEN 2 — Purpose / cinematic conveyor ──────────────────────
//
// Transient phrases pass across the conveyor before "Your voice." lands
// as the conclusion. Order matters. To add/remove: edit this list; the
// timing below re-derives automatically.
// The transient phrases that pass across the conveyor before the stacked
// conclusion "Your voice." / "Their timeline." lands. Restored from the
// animation-polish tuning (main had trimmed to 3). Edit freely - the timing
// below re-derives from the count.
//
// CORRECTION (2026-09-21): this comment used to claim the conveyor is
// display:none on mobile and so "only affects the desktop flourish". That is
// not true and has not been. The only suppression in globals.css sits inside
// `@media (prefers-reduced-motion: reduce)`; there is no width query. The
// conveyor plays on a phone, and this list drives the CTA delay there too.
//
// Which matters, because the count IS the gate: the timing below re-derives
// from it, so every phrase added costs a tester 1.5s before they can advance.
// At twelve phrases Continue did not appear for ~25s on screen 2 of 12. Now
// four phrases, with the CTA measured from the last of them, puts it at 7s. See
// docs/follow-ups/2026-09-21-screen-2-conveyor-gates-the-cta-for-25-seconds.md
const CONVEYOR_PHRASES: readonly string[] = [
  // Four, deliberately, and in this order. The list is the CTA gate (the
  // timing below re-derives from its length), so every phrase costs a tester
  // 1.5s of waiting and has to earn it.
  //
  // The order is an escalation, not a catalogue. It opens somewhere ordinary
  // and warm so nobody is asked to think about death on screen 2, moves into
  // something said rather than sent, then into a nightly ritual that implies
  // a child and an absence without naming either, and only then lands on the
  // reason the product exists. Trimmed from twelve on 2026-09-21: twelve was
  // a list, and a list is browsed rather than felt.
  'Birthday wishes.',
  '\u201CI\u2019m proud of you.\u201D',
  'Bedtime stories.',
  'A goodbye, whenever it comes.',
];

// When the LAST transient phrase fires. The CSS gives phrase i (1-based) a
// delay of `intro + i * stagger`, so the nth lands here. Named rather than
// inlined because the CTA and the conclusion are now both measured from it,
// and a single source stops those two drifting apart.
const lastPhraseLandMs =
  ONBOARDING_TIMING.CONVEYOR_INTRO_DELAY_MS +
  CONVEYOR_PHRASES.length * ONBOARDING_TIMING.CONVEYOR_PHRASE_DURATION_MS;

const finalLandMs = lastPhraseLandMs + ONBOARDING_TIMING.CONVEYOR_FINAL_BEAT_MS;
// "Their timeline." lands a widened beat after "Your voice.".
//
// The CTA is measured from the LAST TRANSIENT PHRASE, so Continue arrives with
// it rather than after the conclusion. The whole conclusion - "Your voice."
// then "Their timeline." - therefore plays to someone who has already been let
// go, which is the point: it is a reward for staying, not a toll for leaving.
//
// It used to be measured from the tail plus a further 3s, which made the
// phrase count a gate on advancing: twelve phrases held Continue for ~25s on
// screen 2 of 12, while anyone with reduced motion on (who sees no conveyor at
// all) got the button instantly. The incentive was exactly inverted.
const tailLandMs = finalLandMs + ONBOARDING_TIMING.CONVEYOR_TAIL_BEAT_MS;
const ctaLandMs = lastPhraseLandMs + ONBOARDING_TIMING.CONVEYOR_CTA_BEAT_MS;

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
