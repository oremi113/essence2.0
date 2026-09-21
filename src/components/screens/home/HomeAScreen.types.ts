/**
 * Home A — shared props for the two design directions under review
 * (docs/session-home-a/design-directions.md). Both directions implement this
 * identical contract, so the page wiring is the same whichever one wins and the
 * loser can be deleted without touching `src/app/home/page.tsx`.
 *
 * Pure/props-driven per CLAUDE.md: no Supabase, no redirect, no server actions.
 * `clipsRecorded` comes from the count query the record page already runs
 * (src/app/app/record/page.tsx) — see the adoption note in the memo.
 */
import type { ReactNode } from 'react';

export interface HomeAScreenProps {
  /** True once all clips are in and the voice is being built (processing/queued);
   *  false while the user is still collecting. Drives the whole screen register. */
  isProcessing: boolean;
  /** Training clips committed so far (status='uploaded'), 0..TOTAL_PROMPT_COUNT.
   *  Ignored when `isProcessing` — by then every clip is in by definition. */
  clipsRecorded: number;
  /** Continue recording / Check progress. Both target ROUTES.record; the page
   *  owns the navigation. */
  onContinue: () => void;
  /** Settings gear, mirroring Home B's quiet top-right control. */
  onSettings: () => void;
  /** Sign-out control, supplied by the page (it owns the client action). */
  footer?: ReactNode;
  /** Test/dev override so /dev/home-a can preview the reduced-motion collapse
   *  without changing the OS setting. Mirrors HomeBScreen. */
  reducedMotionOverride?: boolean;
}

/** The three real stages of the 25-prompt script (src/lib/voice-training/script.ts):
 *  1-5 quick start, 6-17 build emotion, 18-25 final touch. Both directions encode
 *  these boundaries rather than inventing an even split — the seams are content. */
export const STAGE_BOUNDS = [
  { stage: 1, start: 0, end: 4 },
  { stage: 2, start: 5, end: 16 },
  { stage: 3, start: 17, end: 24 },
] as const;

/** Which stage a given clip count sits in (1-indexed). Clamped at 3. */
export function stageForCount(clipsRecorded: number): 1 | 2 | 3 {
  if (clipsRecorded <= 4) return 1;
  if (clipsRecorded <= 16) return 2;
  return 3;
}

/** Small-number words. The copy guide's warm register spells these out rather
 *  than printing digits — "You're twelve moments in" reads human, "12/25" reads
 *  like a scoreboard. Falls back to digits above the script's range. */
const WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
  'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen',
  'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one',
  'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five',
];

export function numberWord(n: number): string {
  return WORDS[n] ?? String(n);
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
