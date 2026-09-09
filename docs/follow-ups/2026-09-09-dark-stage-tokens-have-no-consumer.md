---
id: 2026-09-09-dark-stage-tokens-have-no-consumer
priority: P3
status: open
opened: 2026-09-09
resolved:
summary: "The promoted dark-ceremonial-stage tokens (`--color-ink`, `--on-dark-*`, `--stone-halo`, `--focus-dark`, …) landed in `@theme` with zero consumers, while `FirstBreathSequence.tsx` still holds the same values as screen-local literals *(design-system promotion pass, 2026-09-09)*"
---

# The dark-stage tokens are defined but nothing reads them

*(surfaced while landing the design system's `ds/dark-stage.html` card)*

`src/app/globals.css` (DARK CEREMONIAL STAGE block) · `src/components/screens/FirstBreathSequence.tsx:42` · `prototypes/ds/dark-stage.html`

The design system promoted the dark ceremonial stage's palette, type roles, and
Breath Stone geometry into `@theme`: `--color-ink` / `-lift` / `-deep`,
`--color-on-dark` + the four-step `--on-dark-*` opacity ramp, `--stone-halo`,
`--color-primary-dark` (+ hover / on-primary), `--shadow-honey`, `--focus-dark`,
`--stone-size-hero`, `--stone-clearance` / `-narrow`, and the ceremonial type
roles `--text-display` (34px) / `--text-ceremonial` (23px).

**Nothing in `src/` reads any of them.** The promotion was scoped to definitions
only, deliberately — but that leaves two live gaps:

1. `FirstBreathSequence.tsx:42` still carries these exact values as screen-local
   literals, under a comment that reads *"Warm-on-dark text colors — unique to
   this screen, not global tokens"*. That comment is now false, and the literals
   are free to drift from the tokens that were promoted **from them**.
2. Step 5 First Playback — the build these values were measured on — has never
   existed in code (see `2026-09-08-first-playback-beat-was-never-built`). When
   it is built, it must consume these tokens rather than re-derive the ramp.

## Why it matters

This is the exact drift the token system exists to prevent, and it is worse than
ordinary duplication because the duplicate is the *origin*: a future edit to the
ceremony's warm-on-dark ramp changes the screen and silently leaves `@theme`
stating the old truth, or vice versa. Any third dark surface then has two
disagreeing sources to copy from.

## Fix shape

Two commits, per the extract-then-test hygiene rule:

1. Replace the `FirstBreathSequence.tsx:42` literal block with the `@theme`
   tokens, delete the now-false comment, and re-verify the ceremony visually at
   4× CPU throttle on a 390px viewport — this touches a shipped screen, so a
   screenshot diff of every phase is the bar, not a passing build.
2. Add the ceremonial roles (`--text-display`, `--text-ceremonial`) and the
   dark-stage swatches to `src/app/dev/tokens/page.tsx` so the token viewer
   stops under-reporting the system.

## Pick up when

Whoever builds Step 5 First Playback — the tokens exist precisely so that screen
does not start from literals. Item 1 can also be taken independently, any time a
First Breath change is already open.
