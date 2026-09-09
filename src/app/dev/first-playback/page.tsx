import { DevFirstPlaybackHarness } from './DevFirstPlaybackHarness';

/**
 * /dev/first-playback — permanent scaffolding for Step 5 · First Playback.
 *
 * Per CLAUDE.md this page is never deleted, even if no QA flow uses it. It is
 * the canonical way to iterate on the screen in isolation, and the only place
 * the "layout must not belong to one sentence" gate can be re-checked cheaply.
 */
export default function DevFirstPlaybackPage() {
  return <DevFirstPlaybackHarness />;
}
