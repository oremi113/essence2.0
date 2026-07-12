/**
 * Centralized timing constants for the voice-training / recording flow.
 *
 * Every value here was previously a magic number scattered across
 * RecordScreen, RecordingUpload, and the voice-creation flow. Pulling them
 * into one place makes the choreography legible at a glance and lets
 * us tune tempo without hunting through several files. The VOICE_PROFILE_*
 * poll/give-up values are now consumed by the Processing wrapper
 * (src/app/app/voice/processing) after the spine reorder.
 *
 * Convention: all values in milliseconds unless suffixed otherwise.
 * Names describe intent (POLL_INTERVAL, AUTO_ADVANCE_DELAY) rather
 * than the call site, so they read naturally where they're used.
 */
export const TIMING = {
  /** Voice-profile readiness polling cadence on the working screen. */
  WORKING_REFRESH_INTERVAL_MS: 3000,
  /** Fallback: if the backend doesn't flip to ready in this window, advance anyway. */
  WORKING_FALLBACK_ADVANCE_MS: 8000,

  /** Per-item reveal delay in the pre-recording checklist. */
  CHECKLIST_ITEM_STAGGER_MS: 400,
  /** Initial delay before the first checklist item appears. */
  CHECKLIST_INITIAL_DELAY_MS: 300,
  /** Extra beat after the last item before the CTA fades in. */
  CHECKLIST_CTA_AFTER_ITEMS_MS: 600,

  /** Environment-prep screen auto-continues after this beat. */
  ENVIRONMENT_AUTO_READY_MS: 2500,

  /** Recording timer tick (mm:ss display refresh). */
  RECORDING_TIMER_TICK_MS: 1000,
  /** MediaRecorder data-available chunk size. */
  MEDIA_RECORDER_TIMESLICE_MS: 100,

  /** Pause between user-stop and auto-advance to the next prompt. */
  PROMPT_AUTO_ADVANCE_MS: 2000,

  /** Paused screen auto-navigates home after this. */
  PAUSED_RETURN_HOME_MS: 4000,

  /** New-message generation: switch UI to "taking a moment" after this. */
  MESSAGE_GENERATION_DELAYED_MS: 15_000,

  /** Voice-profile creation polling cadence. */
  VOICE_PROFILE_POLL_INTERVAL_MS: 2500,
  /** Switch UI to "taking longer than usual" after this. */
  VOICE_PROFILE_TAKING_LONGER_MS: 90_000,
  /** Final timeout — show "timed out" + retry. */
  VOICE_PROFILE_GIVE_UP_MS: 4 * 60 * 1000,
} as const;
