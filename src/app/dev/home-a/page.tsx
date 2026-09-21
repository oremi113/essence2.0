import { DevHomeAHarness } from './DevHomeAHarness';

/**
 * /dev/home-a — isolated harness for the pre-voice-ready home. Permanent
 * scaffolding per CLAUDE.md.
 *
 * While the Home A design decision is open (docs/session-home-a/design-directions.md)
 * this renders BOTH candidate directions across both screen states, with a clip
 * count you can scrub, so the two can be compared without a live voice profile.
 * Once a direction is chosen this collapses back to rendering the single winner.
 */
export default function DevHomeAPage() {
  return <DevHomeAHarness />;
}
