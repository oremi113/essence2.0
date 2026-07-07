/**
 * Centralized timing constants for the onboarding flow.
 *
 * Mirrors src/lib/config/timing.ts (voice-recording choreography).
 * Values were previously scattered across Screen2, Screen6, Screen8,
 * Screen11, and usePhotoUpload; pulling them here lets the flow's
 * tempo be tuned from a single file.
 *
 * Convention: all values in milliseconds unless suffixed otherwise.
 */
export const ONBOARDING_TIMING = {
  /** Screen 2 — delay before the first conveyor phrase enters. */
  CONVEYOR_INTRO_DELAY_MS: 1000,
  /** Screen 2 — stagger between successive conveyor phrases. */
  CONVEYOR_PHRASE_DURATION_MS: 1500,
  /** Screen 2 — silence after the last transient phrase before "Your voice." lands. */
  CONVEYOR_FINAL_BEAT_MS: 1500,
  /** Screen 2 — widened beat after "Your voice." before "Their timeline." lands
   *  below it (the stacked conclusion). Salvaged from the animation-polish
   *  conveyor tuning (its tail landed ~1.4s after the final phrase). */
  CONVEYOR_TAIL_BEAT_MS: 1400,
  /** Screen 2 — silence after "Their timeline." before the CTA fades in. */
  CONVEYOR_CTA_BEAT_MS: 3000,

  /** Screen 6→7 — depress → release window on the advance button (DESIGN BRIEF 002). */
  SCREEN6_PRESS_RELEASE_MS: 80,
  /** Screen 6→7 — total beat from tap to onNext firing; exit runs in parallel. */
  SCREEN6_ADVANCE_MS: 250,

  /** Screen 8 — delay before auto-focusing the first empty field (lets slide settle). */
  SCREEN8_AUTOFOCUS_DELAY_MS: 400,

  /** Screen 11 — how long the CTA stays locked so the user breathes with the stone. */
  SCREEN11_BUTTON_UNLOCK_MS: 3500,

  /** Photo upload — minimum ring visibility; prevents flash on fast uploads. */
  PHOTO_MIN_RING_MS: 400,
  /** Photo upload — how long the stone holds 'ready' after a successful upload. */
  PHOTO_STONE_BEAT_MS: 1200,
} as const;
