# Home A retrofit — review 01 (spec fidelity)

**Reviewing:** `Essence Home A Design Proposal 2 / Home A Retrofit.dc.html`
**Against:** `home-a-critique.md` (the brief), `design-directions.md`, the repo source.
**Verdict:** structure accepted. Do not sign off until §A is fixed.

**Scope of this review:** spec fidelity only — does the mockup match the source
it was told to match, and does it honour the recorded calls. **A separate UX /
refinement pass from the owner is coming.** Treat this document as the floor,
not the ceiling.

---

## What's right

Most of the deliverable. Calling it out so the fixes below read as corrections,
not a rejection.

- **One adaptive composition.** Correct call, cleanly executed — one shell,
  cards 3–5 swapped by register, not three compositions.
- **The fill motion is exactly the spec.** Completed segments return
  `scaleX(1)` with no dependence on the reveal flag; only the current segment
  animates. `transform` only, so it stays GPU-only for the throttle bar.
- **Band shows at 0 clips, labelled** — the "map, not scoreboard" call, honoured.
- **Band correctly hidden on `failed`.**
- **25 is deliberately absent** from the state switcher and `NUMWORD` stops at
  `twenty-four` — the redirect rule was understood, not skimmed.
- **Reduced motion collapses the band to destination** with no mid-flight pose.
- 44px minimum tap targets throughout.
- `registerLabel` reads *"Paused (internal name only)"* — the copy constraint
  was read.

---

## §A — must fix before sign-off

### A1. The stone is a forked CSS orb. It promises something production cannot build.

The mockup draws the stone as a hand-rolled radial-gradient div with
`@keyframes breathe`. Two rules forbid it, and the second is on the very file
being retrofitted:

- **FOLLOW_UPS #35**, verbatim: *"Do NOT fork bespoke CSS stones into individual
  screens — that re-splits the stone grammar."*
- `src/components/screens/home/HomeAScreen.strata.tsx:12` — *"The stone is the
  shared canvas BreathStone (FOLLOW_UPS #35: never fork a bespoke CSS stone)."*

This is not a purity objection. `BreathStone` is a **canvas** engine
(`src/components/breath-stone/breathStoneEngine.ts`), and #35 exists precisely
because it renders **pale-taupe on light grounds** — the owner has already
agreed on record that it reads "quite dull." The gold orb in this mockup is the
*prototype* stone that production deliberately does not have.

So signing off on this mockup signs off on a stone the retrofit cannot deliver,
unless the stone-warmth pass (#35) is pulled into scope — and that touches
VaultSeal, FirstBreath, RecordScreen, A6 and A7. It is its own chunk.

**Fix:** render the stone at the canvas engine's actual idle appearance, or
place a flat neutral placeholder with a note that the real stone is
`<BreathStone state="idle">`. Do not ship a prettier stone than production has.

### A2. Stone size is wrong

Mockup: **160px**. Strata pins **140px** (`HomeAScreen.strata.tsx:30`,
`const STONE_SIZE = 140`). The brief's "match exactly" list includes stone size.

### A3. The CTA fails WCAG AA

```
background: var(--color-mineral)   /* #7A8088 */  + white text = 3.98:1
```

Strata uses `--color-mineral-dark` and says why inline
(`HomeAScreen.strata.css.ts:140`): `/* AA: white on -dark = 5.38:1 */`.
`src/app/globals.css:37` carries the same note.

Audience is 45–70. This is the wrong corner to cut, and it is a direct
consequence of not reading the source value. Applies to both the failed-register
CTA and the main CTA.

### A4. It re-applies the SaaS-card kit that was explicitly removed

Card 5 is wrapped in:

```
background: var(--color-surface-card); box-shadow: var(--shadow-sm);
border-radius: 16px;
```

`design-directions.md` §2 records that exact combination as a rejected reflex —
the band was taken *off* the card so that **the CTA is the only weighted
element on the screen**. Card 5 is now a second weighted element competing with
it, which undoes the call rather than applying it somewhere new.

The radius is also a raw `16px` rather than a `--radius-*` token.

**Fix:** card 5 sits on the ground, like the band. No surface, no shadow.

---

## §B — discuss before changing

### B1. Proportional segment widths defeat the reason for chunking

```js
segCols: '5fr 12fr 8fr'
```

Sizing the segments to prompt count turns the three chunks back into **one
25-unit progress bar with two gaps in it** — the reading chunking was chosen to
escape.

Concretely: a user who finishes stage 1 has completed a whole named stage, and
the band reads **20% full**. The brief's argument was the opposite —
*"stage 1 (5 prompts) completes fast, so a user who did 5 sees one whole segment
filled, not '20 to go'"* (`home-a-critique.md` §2.5).

**Recommendation: equal thirds.** Finishing Everyday then reads as *one of
three, done*. The honest count stays in the status line and the stage labels.

**The trade is real and worth stating:** equal thirds under-represent how long
Emotional actually is (12 prompts vs 5). A user will sit in the middle segment
for roughly half the journey. That is precisely why card 5 exists — it narrates
the middle so the band doesn't have to. If equal thirds still feels dishonest
after seeing it, say so and we'll look at a third option, but proportional
widths are not it.

---

## §C — copy corrections

### C1. Card 7 is false on the not-started screen

> "Everything you've recorded is kept."

…renders at 0 clips, where nothing has been recorded. This is the same class of
error the Copy Guide names in §5's **empty-vault tense** rule: never imply
something exists that doesn't yet.

This was a gap in the supplied copy, not an invention by the architect. Fix:

| register | line |
|---|---|
| not started | Everything you record is kept. There's no rush. |
| paused | Everything you've recorded is kept. There's no rush. |

### C2. Card 5 must not be italic

Copy Guide §6: italic is reserved for human asides and coaching notes —
*"functional microcopy like '11 to 14 minutes' stays upright, never italic."*
A count down to the next beat is functional microcopy. Set it upright.

### C3. The past-due banner is invented; use the real one

Mockup: *"Your payment needs updating."* with an "Update" link.

The shipped component (`src/components/vault/VaultPastDueBanner.tsx:16-25`) is
**three escalating variants keyed to attempt count**:

1. "Your card didn't go through this time." — *"Stripe will try again in a few
   days. You don't need to do anything yet…"*
2. "Your card didn't go through again." — *"Updating your card now is the
   easiest fix."*
3. *"If this last try doesn't go through, your vault pauses until you update
   your card. Your messages are safe either way."*

CTA is **"Update card."** The house word is **card**, never "payment."

Redrawing it as one flat line drops the Copy Guide §8 pacing-of-consequence
entirely. The brief said reuse `RecordPageBannerWrapper`; the mockup should show
at least variant 1 with the real copy, and note that the other two exist.

---

## §D — harness fidelity

### D1. The reduced-motion toggle doesn't affect the stone

The band respects the flag correctly. The stone's `@keyframes breathe` is only
killed by the CSS `@media (prefers-reduced-motion)` query, so toggling the
control in the harness leaves the stone breathing.

That defeats the control's purpose — `reducedMotionOverride` exists specifically
to preview the collapse **without** changing the OS setting
(`HomeAScreen.types.ts`). The harness must gate every animation on the flag, not
just the band.

---

## §E — minor

- `700ms` and `150ms` are hardcoded. `--duration-page` **is** 700ms — use the
  token so a future timing change lands here too.
- Raw `#8A5A1E` and several `rgba(...)` literals in the banner. Tokens exist;
  `/dev/tokens` renders them all.
- Sign-out sits at `margin-top: 6px` beneath the reassurance line — cramped, and
  the two now compete for one slot. Needs separation, or sign-out moves.
- The `failed` and `not-failed` branches duplicate the entire CTA + sign-out
  block. Harmless in a mockup; in TSX it becomes real duplication. Worth
  restructuring now so the retrofit inherits one block.

---

## Unchanged from the brief

Still binding, and none of it is reopened by this review:

- The six calls in `design-directions.md` §"What the frontend-design skill
  changed."
- Register is **Calm** throughout. Never Elevated.
- "Paused" is an internal register name only — never user-facing copy.
- Out of scope: `/app/record`, the 25-prompt script, the processing screen,
  training-clip playback.
- Verification: 390×844 at 4× CPU throttle, GPU-only animation, reduced motion
  collapses with no mid-flight pose.
