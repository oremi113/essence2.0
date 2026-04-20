# Onboarding Pass 3 — Implementation notes

**Source specs:** `ESSENCE_Onboarding_Pass3_Terminal.md` (main, 12 items), `ESSENCE_Onboarding_Pass3_BucketA_Terminal.md` (4 items deferred from main).

**Shipped to `main`:** PR #41 (commit 696272f), squashing `pass-3a` (998726a) + `pass-3b` (1d698fc).
**On branch `pass-3-bucket-a`:** uncommitted as of handoff — 5 files modified (Screen8.tsx, Screen11.tsx, globals.css, prototypes/onboarding-flow.html, this doc).

---

## Pass 3 main — shipped via PR #41

### Shipped as specified

All twelve items landed against their acceptance criteria. Copy items (1, 3, 4, 5, 6, 9) are verbatim. Structural items (2, 7, 8, 10, 11a, 11b, 12) match the required markup/CSS snippets. Hard rules (no new packages, no hex, no em dashes in copy, verb discipline on keep/kept, no "Voice Vault"/"voice insurance") all held.

### Mid-implementation adjustments

- **Screen 2 — dynamic conveyor timing.** Spec gave hardcoded phrase/final/CTA delays. Implementation introduced named constants (`INTRO_DELAY`, `PHRASE_DURATION`, `FINAL_BEAT`, `CTA_BEAT`) in `Screen2.tsx` and computed `finalLandMs` + `ctaLandMs` from the phrase-list length. Why: the rhythm self-adjusts if the phrase list is retuned later, and the intent (beats, not magic numbers) is legible in code.
- **Screen 6 — step 2 duration changed beyond the em-dash fix.** Spec item 1 only called for the em-dash → period fix. Implementation also changed the journey's step 2 "10–12 minutes" → "10 to 13 minutes" so it matches Screen 12's new "About 10 to 13 minutes" line. Why: internal contradiction between screens would have shipped otherwise. Surfaced in commit body; not silently authored copy (the number comes from S12's spec).
- **Screen 7 — `.onboarding-step--centered` needed `margin-top: 0` on CTAs to actually center.** `StepShell centered` prop toggles `justify-content: center` on the step, but `.onboarding-ctas { margin-top: auto }` was still bottom-anchoring the button. Added a one-line override: `.onboarding-step--centered .onboarding-ctas { margin-top: 0 }`. Why: without it, the centered layout silently failed on Screen 7 after the subtitle was removed.
- **Screen 8 — single `form.dob` retained; DOB split kept local to Screen8.** Spec allowed either split state or combined. Implementation kept `form.dob` as a single `YYYY-MM-DD` string at the parent level and mirrored it into local `dobMonth / dobDay / dobYear` state inside `Screen8.tsx`, seeded from `form.dob` on mount. Why: `state.ts`, `Screen9Review`, and `handleComplete` were all untouched — narrower blast radius, and the "Change" round-trip from Screen 9 rehydrates cleanly without shared-state contortions.
- **Screen 12 — `.btn-link--soft:hover` needs `:not(:disabled)`.** Spec gave `.btn-link--soft:hover { ... }` verbatim. Implementation wrote `.btn-link--soft:hover:not(:disabled)` because the base `.btn-link:hover:not(:disabled)` rule (same specificity) would otherwise win on source order for the hover color. Why: CSS specificity tie; the `:not(:disabled)` is load-bearing, not cosmetic.

---

## Pass 3 Bucket A — on branch `pass-3-bucket-a`

### Shipped as specified

- **Item 1 — Screen 8 errors.** Five error strings verbatim. Error styling pattern verbatim. Validation fires only on Continue press; typing clears the single field's error. DOB two-mode (any-empty vs. all-filled-but-invalid-combination) flags the right subset of the three selects. First failing field scrolls into view via `requestAnimationFrame` + `scrollIntoView({ block: 'center' })`. No shake/bounce/flash.
- **Item 2 — State preservation.** Verified only, no code change. `useOnboardingForm` already owns all six fields at the parent; Screen 9's "Change" calls `goTo(8)` which flips `currentScreen` without unmounting the parent. Round-trip preserves values including DOB parts.
- **Item 3 — Review-row overflow.** `.onboarding-review-row` → `flex-start` + `gap: var(--space-lg)`; label `min-width: 120px`; values `flex: 1 1 auto; min-width: 0; overflow-wrap: break-word`. Verified at 390×844 and 380×844 with a hyphenated long name and a diacritic-heavy city name.
- **Item 4 — Priming keyboard lock.** `aria-disabled` + `tabindex={-1}` (never native `disabled`, which hides the button from the accessibility tree) + `onClick` / `onKeyDown` guards.

### Mid-implementation adjustments

- **Continue button gate removed on Screen 8.** Spec simultaneously said "Continue should remain disabled until all fields filled" and "Pressing Continue with an empty first-name field renders the error." Both cannot hold. Removed the `disabled={!isValid}` gate entirely — button is always pressable; validation renders errors on press. The gate became redundant once real validation existed. Confirmed with founder before shipping.
- **DOB Year default seed `'1960'` → `''`.** Pass 3 main's spec item 7 called for `defaultValue="1960"`. Bucket A's spec treats any empty select as a validation failure under "Value selected." The two conflict: a pre-filled 1960 would never validate as empty, and the user would never be forced to actively pick a year. Changed the seed to `''` so Year shows the "Year" placeholder and must be chosen — consistent with Month and Day. Confirmed with founder.
- **Screen 11 bypasses `PrimaryButton`.** `PrimaryButton` applies the native `disabled` attribute when the `disabled` prop is truthy, which directly conflicts with the Bucket A rule "do not use `disabled`." Screen 11 now renders a plain `<button className="btn-primary btn--full">` so it owns its `aria-disabled` / `tabindex` state directly.
- **Removed `pointer-events: none` from `.onboarding-ctas--locked`.** With `pointer-events: none`, the spec-provided `cursor: not-allowed` would not render (pointer-events none suppresses hover feedback). The a11y guards (`onClick` + `onKeyDown` + `tabindex={-1}`) now fully gate activation, so `pointer-events: none` was no longer load-bearing.
- **Review-row layout changed, not just overflow-patched.** Spec's target CSS swung from right-aligned `space-between` to left-aligned fixed-label-column. That's a visual change to the card, not a minimal overflow fix. Confirmed intentional with founder before shipping.

---

## Unresolved craft observations (both passes)

- **Screen 8 State error cramp.** `"Please choose your state."` renders inside the 88px-fixed `onboarding-field--fixed` column, wrapping across 3–4 lines. Functional, per spec, but visually noisy. Candidate fix: hoist the State error below the City+State row (mirrors DOB treatment) or allow it to overflow its column.
- **DOB select proportions at 380px.** Month and Day lock at 88px while Year stretches to ~110px+. Year reads wider than four digits warrant. Candidate: cap Year near 100px and give the slack back to Month/Day.
- **Dead CSS in globals.css.** `.onboarding-body--screen5 { --body-base: 1500ms; }` still exists (globals.css:968) but no JSX sets that class after Pass 3 main removed the Screen 5 body-base shift. Safe to delete in a later cleanup pass.
- **Screen 8 label case.** `FIRST NAME` / `LAST NAME` at 13px, 600 weight, `0.04em` letter-spacing competes typographically with the form-card headline. Out of scope for Pass 3 / Bucket A; worth a dedicated form-type pass.
- **Error focus-border stacking.** With both Pass 3 base styles and Bucket A's error variant in play, `.onboarding-input--error:focus` now explicitly sets red border + red outline + red-tinted background because the base `.onboarding-input:focus` mineral border would otherwise leak through on same-specificity tie. Works, but a form-layer refactor could simplify.
- **`isValidCalendarDate` would benefit from a one-line code comment.** It relies on `Date` constructor round-trip to reject Feb 31 (JS normalizes `new Date(2000, 1, 31)` to Mar 3). Intent not obvious to a future reader.

---

## Current state of the flow as delivered

- **Typecheck, lint, em-dash check:** all clean on both main (post-#41) and on `pass-3-bucket-a`.
- **Playwright verification (mobile, 390×844 primary, 380×844 spot-check):** Bucket A items end-to-end — empty-submit errors, partial-DOB subset, Feb-31 invalid-combo error, typing-clears-single-error, Screen 9 long-name wrap, Screen 11 lock → 3500ms → unlock → Enter advances to Screen 12. No console warnings.
- **Prototype `prototypes/onboarding-flow.html`:** updated in this session to mirror current `main` + Bucket A. Smoke-tested in browser.
- **Branch `pass-3-bucket-a`:** uncommitted. Next steps: single commit bundling Bucket A + prototype sync + these notes, PR against `main`.

### Intentionally deferred (do not implement)

Screen 10 photo control rework · loading states between screens · reduced-motion fallbacks · microphone permission denial recovery · dark-mode token map · empty/skipped photo state downstream · re-entry state for already-onboarded users.
