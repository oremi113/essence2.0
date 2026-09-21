import { DevHomeAFrame } from './DevHomeAFrame';

/**
 * /dev/home-a/frame — the screen alone, for the harness to load in an iframe.
 *
 * It exists because a `div` sized 390x844 is not a viewport. Media queries,
 * `dvh` and anything else viewport-relative resolve against the BROWSER
 * window, so a review at a desktop width was seeing `@media (min-width:768px)`
 * layouts inside a phone-shaped box — the past-due banner rendered its row
 * variant with a 181px text column, which read as a typesetting failure and
 * was really a harness failure. An iframe is a real viewport; this route is
 * what goes in it.
 */
export default function DevHomeAFramePage() {
  return <DevHomeAFrame />;
}
