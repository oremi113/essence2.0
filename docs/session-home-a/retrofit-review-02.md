# Home A retrofit — review 02

**Reviewing:** `Essence Home A Design Proposal 3 / Home A Retrofit.dc.html`
**Against:** `retrofit-review-01.md`, `home-a-critique.md` (the brief), repo source.
**Verdict:** review 01 fully applied. One motion call to make (§A), then codeable.

---

## Review 01 items — all closed

| # | item | status |
|---|---|---|
| A1 | forked CSS stone | **fixed** — flat 140px placeholder + caption naming `<BreathStone state="idle">` |
| A2 | stone 160px → 140px | **fixed** |
| A3 | CTA contrast (`--color-mineral`, 3.98:1) | **fixed** — now `--color-mineral-dark` |
| A4 | SaaS-card kit on card 5 | **fixed** — back on the ground, no surface, no shadow |
| B1 | proportional `5fr 12fr 8fr` widths | **fixed** — equal thirds; at 5 clips one segment reads visibly complete |
| C1 | card 7 false at 0 clips | **fixed** — `reassuranceLine` branches to future tense |
| C2 | card 5 italic | **fixed** — upright |
| C3 | invented past-due copy | **fixed** — real variant-1 header/body, "Update card", 3-variant note |
| D1 | reduced-motion toggle missed the stone | **moot** — stone is now static; see §B5 |
| E | raw `#8A5A1E`, `700ms`, cramped sign-out, duplicated CTA block | **fixed** — `--color-status-warning`, `--duration-page`, 20px, single CTA block |

Every token the mockup now references exists in `src/app/globals.css`
(`--color-status-warning`, `--color-text-tertiary`, `--radius-lg`,
`--color-surface-warm`, `--color-bg-warm-2`, `--duration-page`,
`--color-mineral-darker`). Segment fill math verified: 5 clips → one full third;
17 → two full thirds; 24 → 0.875 of the third.

---

## §A — the one call to make: arrival motion

The mockup specifies the band's fill and **nothing else**. Strata currently
carries two further motion beats, both built and already verified at 4× throttle:

| | beat | source |
|---|---|---|
| 1 | **Ground settle** — warm → neutral, 1500ms, once on mount | `HomeAScreen.strata.css.ts:26-28`; `strata.tsx:69-77` |
| 2 | **Arrival stagger** — `hast-arrive 620ms`, children at 80 / 160 / 240ms | `HomeAScreen.strata.css.ts:173-177` (`.arr1/.arr2/.arr3`) |

**The ground settle is not the cross-visit progress ramp that was rejected.**
That one stepped oat→honey as clips accumulated, across visits. This is a
one-shot entrance — the same device Home B uses on first arrival. Different
mechanism, and it survives the critique.

Coded as the mockup stands, Home A arrives dead: everything pops in at once,
then one bar fills.

**Decision (owner, 2026-09-16): keep both.** The band's fill lands as the final
beat — its existing 150ms delay wants nudging to sequence after the 240ms
stagger rather than racing it.

---

## §B — resolve during implementation

Spec-level, not design-level. These do not need another mockup round; they get
fixed against source while coding.

### B1. The band has no accessible value

Strata marks its band `aria-hidden="true"` with a comment explaining that the
headline already states the count (`strata.tsx:131-135`). The retrofit adds
**real visible labels**, so a screen reader now announces *"Everyday Emotional
Personal"* with no values and no context — worse than the deliberate silence it
replaced.

**Fix:** `role="group"` with a computed `aria-label`, e.g. *"Everyday: complete.
Emotional: four of twelve. Personal: not started."* One string, derived from the
same fractions that drive the fills.

### B2. Digits and words are mixed on one screen

> "You're four moments in."  … "1 more and Everyday is behind you."

The status line uses `numberWord()`; the next-stop line prints a digit. The copy
spec wrote `{n}` without saying which. Use the word form throughout —
*"One more and Everyday is behind you."*

### B3. The past-due banner is modelled as an overlay; production stacks it

`/app/record` renders `{banner}` then the screen, in normal document flow. The
mockup absolutely-positions it at `top: 44px` with `contentTop: 112px`.
Estimated banner height ~95px, so it overlaps the settings gear by roughly 25px
— and variants 2 and 3 carry longer bodies. Put it in flow; showing it at all is
only useful if the resulting layout is real.

Production also gets `role="status" aria-live="polite"` and a `<button>` free by
reusing `VaultPastDueBanner` — the mockup's `<a href>` is a mockup artifact.

### B4. Residual value drift from Strata

| | mockup | Strata |
|---|---|---|
| CTA height | `min-height: 52px` | `height: 56px` |
| CTA radius | raw `10px` | `var(--radius-lg)` (which *is* 10px) |
| CTA hover | `filter: brightness(0.92)` | `var(--color-mineral-darker)` |
| band delay | raw `150ms` | — (new) |

The `filter` approach also dims `--shadow-mineral` along with the fill, which the
token swap doesn't.

### B5. Focus-visible states are absent

Strata has explicit outlines on the gear, CTA, and link
(`.strata.css.ts:45, 152, 166`). The mockup has none. Restore from source —
this audience skews keyboard- and zoom-heavy.

### B6. The stone caption is an annotation

*"Placeholder — production renders the canvas BreathStone (state: idle) here."*
Does not get coded. Stating it so it can't be pattern-matched into the TSX.

---

## Still binding

Unchanged, and not reopened by this review:

- The six calls in `design-directions.md` §"What the frontend-design skill changed."
- Register is **Calm** throughout; "paused" stays an internal name.
- **FOLLOW_UPS #105 is still the page-layer prerequisite** (`home-a-critique.md`
  §2.2) — `getOrCreateVoiceProfile` selects an arbitrary, possibly-archived row.
  Screen work can proceed against the Task B props contract; the page wiring waits.
- Out of scope: `/app/record`, the 25-prompt script, the processing screen,
  training-clip playback.
- Verification: 390×844 at 4× CPU throttle, GPU-only animation, reduced motion
  collapses to destination with no mid-flight pose.

---

## State at hand-off

Owner is refining §A and any remaining polish directly with the design
architect, then returning with a final version to be coded. §B items are carried
by this document and do not need to survive the conversation.
