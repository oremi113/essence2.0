---
id: 2026-09-10-two-stone-renderers-meet-at-the-playback-cut
priority: P2
status: resolved
opened: 2026-09-10
resolved: 2026-09-15
owner_paired: true
summary: "The First Breath ceremony has two different Breath Stone implementations — a canvas engine and the CSS dark-stage stone — and they meet at the `detail → playback` cut, where the stone visibly changes material in one frame *(found building Step 5 Chunk 3, 2026-09-10)*"
---

# Two stone renderers meet mid-ceremony

*(found while building the Step 5 `detail → playback` handoff)*

`src/components/breath-stone/breathStoneEngine.ts` · `src/components/screens/first-playback/FirstPlaybackScreen.css.ts` · `src/components/screens/FirstBreathSequence.tsx`

The ceremony's stone is a **canvas** engine. Step 5 First Playback's stone is
**CSS layers** driven by `--lum` / `--sus`, per `prototypes/ds/dark-stage.html`,
where every measured performance number belongs to the CSS implementation.

They now meet at the `detail → playback` boundary, and they do not look alike:

| | `detail` (canvas, `shimmer`) | `playback` (CSS) |
|---|---|---|
| Surface | pale, matte, cooler | warm, glossy |
| Lighting | diffuse, near-flat | directional — highlight upper-left, warm shadow lower-right |
| Ornament | animated shimmer band | none |

## What was tried

**A 700ms cross-dissolve.** Built and rejected on the evidence: for the length of
the fade both renderings are visible at once and the canvas stone's brighter core
reads as a hard-edged disc floating inside the CSS sphere. Objectively broken —
`.tmp` captures showed it clearly.

**A match cut** (what currently ships). The two stones are geometrically
identical at the tap, so the swap happens in one frame with the hero object in
the same place at the same size, and the CSS stone then travels to its own
position. This removes the disc artifact entirely and is the better of the two.

But a match cut cannot hide a *material* change. The stone still switches
surface and lighting model in one frame.

## Why it matters

`ds/dark-stage.html` states the rule for this boundary plainly: **the stone must
not re-enter.** It currently does not re-enter — but it does change substance,
which is arguably a worse violation of the same intent. This is the ceremony's
single hero object, at its most ceremonial moment.

## Fix shape

**Unify on the CSS stone.** Extract the seven-layer stone from
`FirstPlaybackScreen` into a shared component and render it for `detail` (and
plausibly `preserved`) too. The cut then becomes CSS→CSS and is genuinely
invisible; the atmosphere layers stay Step 5's alone.

Rejected alternative: port the CSS stone to canvas. That discards the measured
work the dark-stage card was promoted from, and the atmosphere layers read
`--lum` through `calc()` — they are CSS-native by design.

**This touches a shipped screen and its motion, so it is an owner call, not a
refactor to take unilaterally.** Needs a visual pass at 4× throttle on 390×844
across all four existing phases before and after.

## Owner review, 2026-09-15 — and a much cheaper fix path

The owner compared both stones on device. Verdict: the smooth (CSS) stone is
better looking, and the canvas stone "looks like it has seeds in it."

**The design system already agrees**, on two counts the canvas stone breaks:

- *"Don't add sparkle, particles, sheen-sweeps, or secondary ornament."* The
  engine paints 25 drifting specks across the rect (`breathStoneEngine.ts:668`).
- *"Don't give it a face, eyes, mouth, or limbs."* The "seeds" are the
  **Artisan veining** pass (`:888-903`) — 8 blurred pigment ellipses placed by
  noise. At 140px on a phone they read as two eyes and a mouth. On a product
  about a dying person's voice, that is not a small risk.

**This does NOT require porting to CSS.** That was over-scoped: 11 animated
states, 25 consumers, a 1034-line engine — weeks, with every screen's motion
needing re-verification.

All three objections are fixable **inside the canvas engine**, none of them
touching the state machine, the breath timing, or any consumer's API:

| objection | where | size |
|---|---|---|
| the box | the mask, `BreathStone.tsx` | 1 line — filed separately as `2026-09-15-breath-stone-canvas-mask-never-fades-at-the-edges` |
| the "seeds" / face | Artisan veining, `:888-903` | ~15 lines, state-independent |
| particles | ambient specks, `:668` | ~10 lines, ds violation regardless of taste |

Agreed sequencing:

1. **The box** — one line, standalone, improves 25 screens.
2. **Make the canvas stone smooth** — remove veining and particles, retune the
   surface to read like the Step 5 stone. Needs owner eyes mid-flight: produce
   before/after captures at 140px and 200px on a dark ground rather than
   describing it. "Smooth" has a range.
3. **Re-look at the cut** — only if still needed. If both stones read as the
   same material, the `detail → playback` swap stops being a material change and
   full unification may never earn its cost.

## Pick up when

Before Step 5 ships to users. The beat works and performs without it — this is a
craft defect at the seam, not a functional one.

## Step 2 done, 2026-09-15 — the canvas stone is smooth

Steps 1 and 2 of the agreed sequencing are in. Step 3 (re-look at the cut) is
still open and still the owner's call.

**Step 1 — the box.** Resolved separately, see
`2026-09-15-breath-stone-canvas-mask-never-fades-at-the-edges`.

**Step 2 — smooth.** Three passes changed in `breathStoneEngine.ts`. The first
two are the agreed removals; the third was not in the plan and is the reason
the removals alone were not enough.

1. **Artisan veining removed** (`:888-903`). The "seeds". Worth recording *why*
   it read as a face rather than as pigment: the eight ellipses were placed
   from a **fixed** noise field with no per-instance seed, so it was not a
   random scatter that occasionally looked like a face — every stone on every
   screen for every user got the *same* eight blotches in the same arrangement.
   One arrangement, and it happened to be two above and one below.

2. **Ambient specks removed** (`:668`). 25 drifting motes across the whole
   canvas rect. A `ds` violation regardless of taste, and they were also part
   of why the rect needed masking at all.

3. **The micro-roughness pass was a second source of blotching** — not
   anticipated, found by capturing the removals and seeing a grey smudge still
   sitting beside the highlight. Two independent bugs in one loop:

   - `d = Math.random() * radius` is **not** a uniform sample of a disc. Area
     grows with r, so density falls off as 1/r and all 500 specks per frame
     pile into the middle. Now `sqrt(Math.random())`, which is uniform per
     unit area.
   - The warm/cool choice read Perlin at `x * 0.04` — a 25px cell against a
     stone of radius ~40-60px, so only ~4 cells spanned the whole body and the
     "texture" was quadrant-sized two-tone patches. Now `x * 0.8`, which
     varies at roughly pixel scale.

   This pass is what separates ceramic from plastic, so it was worth fixing
   rather than deleting — the deletion variant was captured too and reads
   noticeably more CGI.

### Owner review

Four variants captured at 140px and 200px on a dark ground, per the ask —
`.tmp/stone/smooth-140-*.png`, `.tmp/stone/smooth-200-*.png`:

| | |
|---|---|
| **A** | now — veining + ambient specks |
| **B** | veining + specks removed *(the agreed scope; still shows the smudge)* |
| **E** | B + grain distributed evenly **← shipped** |
| **C** | B + micro-grain deleted entirely *(glass; reads plastic)* |

Real ceremony, not just the harness: `.tmp/stone/sheet-ceremony.png`, captured
on `/dev/record-complete` at 4× throttle on 390×844.

### Verified

- 4× CPU throttle, 390×844: per-frame main-thread cost **5.7 / 5.2 / 5.9 /
  4.5ms** (shimmer / recording / infused / priming) against a 16.7ms budget,
  versus 5.9 / 5.6 / 6.3 / 4.7ms on baseline. Slightly cheaper — a
  `shadowBlur` pass and 25 rect fills went away.
- All 11 states at 140px and 200px: box still 0–1, stone rim unchanged.
- `npm run test:unit` 454 passed; typecheck and lint clean.

### Bearing on step 3 — superseded, see below

*(Written before the owner authorised the gradient change. Kept for the
reasoning; the decision it asks for was given the same day.)*

The body gradient is untouched — `prototypes/breath-stone-api.md` locks it
(*"Warm ceramic body is locked… must not be modified"*) and nothing here
needed to cross that. So the canvas stone is now smooth and unmarked, but it
is still **paler and flatter** than the Step 5 CSS stone…

## Step 3 — the two stones are now one material, 2026-09-15

**Owner authorised crossing the body-gradient lock.** Done, and the lock is
re-stated on the new values in `prototypes/breath-stone-api.md`.

Deepening the stops turned out to be necessary but not sufficient, for a
geometric reason worth writing down.

### The last two stops were dead

The body gradient is a two-circle radial — focus at `(-0.28r, -0.28r)`, outer
circle at the origin with radius `1.35r`. Solving that geometry, the visible
stone only ever reaches gradient position **s ≈ 0.80**. The `0.90` and `1.00`
stops (`#938A7D`, `#7D827E`) were painted **nowhere**. The rim anyone has ever
seen is the `0.78` stop. So "the ramp stops at `#7D827E`" was true on paper and
misleading in practice — it stopped at `#AEA090`.

### A symmetric gradient cannot carry the form

The same geometry puts the **lit rim at s≈0.633 and the shadow rim at
s≈0.799**. Measured on the CSS stone, those two positions differ by ~80
levels. One stop cannot be both. Fitting the stops to the lit profile leaves
the terminator flat; fitting them to the shadow profile puts a dark ring right
around the silhouette. Neither is a match.

The CSS stone gets its form the same way real ceramic does — directionally,
from `inset -20px -30px 60px rgba(50,38,20,.4)` and its light counterpart, not
from its gradient. So the canvas needs a directional layer too.

### What shipped

1. **Body gradient re-cut** to the diffuse/lit profile, `#FDFAF0 → #C8B589`.
2. **Terminator added** — a linear gradient on the light axis (upper-left to
   lower-right), `rgba(52, 38, 8)` ramping 0 → 0.59, clipped to the
   silhouette. Painted after the body and the infused tint, before the sheens
   and specular so highlights still sit on top.
3. **Inner shadow removed.** It described itself as *"depth, opposite corner
   from highlight"*, but its two-circle geometry evaluates to fully
   transparent at **both** rims and peaks near the middle — a centre-darkener,
   not a directional shadow, and neutral-cool (`28,26,24`) so it desaturated
   the warm mid-tones. With a real terminator it was double-darkening: it put
   the centre ~27 levels dark and cut the warm R-B spread from 31 to 16.

The shadow-side warmth lives in the terminator colour, not the body stops:
s≈0.42 needs blue ≈226 on the lit side and ≈195 on the shadow side, and that
is a single stop.

### Verified

Both stones rendered at the same sphere diameter and sampled along the light
axis. Worst channel per sample point:

| | before | after |
|---|---|---|
| lit rim | 40 | 8 |
| centre | 28 | 10 |
| shadow mid | 26 | 13 |
| **shadow rim** | **61** | **2** |
| **worst, anywhere** | **61** | **13** |

- All 10 states at 200px on a dark ground — `.tmp/stone/grid-before-200.png`
  vs `grid-after-200.png`. `infused` still reads amber, not muddy; the warm
  tint was the one thing tuned against the old pale ramp and it holds.
- Box still 0–1 and stone rim unchanged in all states at 140px and 200px —
  the mask stops were fitted to geometry, not colour, so the re-cut does not
  disturb them.
- 4× CPU throttle, 390×844: **5.8 / 5.3 / 6.2 / 4.5ms** per frame
  (shimmer / recording / infused / priming) against a 16.7ms budget. One extra
  gradient fill in, one removed — net flat.
- `npm run test:unit` 454 passed; typecheck and lint clean.

Owner captures: `.tmp/stone/smooth-140-shimmer.png` and siblings (original →
smooth → deepened), `.tmp/stone/match.png` (canvas beside the CSS stone at
matched diameter), `.tmp/stone/sheet-ceremony.png` (the real ceremony at 4×).

### So: is the cut still a problem?

On the measurement, the material change at `detail → playback` is **largely
gone** — worst disagreement anywhere on the sphere is 13 levels, against 61
before. That was the entire argument for unifying the renderers, and it no
longer holds the same weight.

What this does **not** prove is that the swap frame itself is invisible: these
are two stones measured side by side at rest, not the cut captured frame by
frame. The remaining differences are also not uniform — the canvas mid-shadow
band runs ~13 levels cool, and the CSS stone carries `--lum`-driven layers
(subsurface, rim bounce) that the canvas has no equivalent for and that are
non-zero even at rest.

**Recommend closing this out by capturing the actual cut** at 4× on 390×844,
a few frames either side, rather than by further tuning. If that reads clean,
full unification never earns its cost and this item can be resolved outright.

## The cut, captured — 2026-09-15

Captured on `/dev/record-complete` at **4× CPU throttle, 390×844**, via CDP
`Page.startScreencast` rather than polled screenshots, so the swap frame is
actually in the capture instead of being stepped over. 232 frames, median gap
8.7ms, worst 17.7ms. The swap lands **218ms after the tap** (at 4×; that is
mount cost, not animation).

Artifacts: `.tmp/stone/filmstrip-after.png` (three frames either side, same
crop), `.tmp/stone/cut-context.png` (full frames), `.tmp/stone/cut-after/`
(every frame + `meta.json`).

### The material question this item was opened on: answered, and it is not the problem

Sampling each stone along its own light axis, normalised to its own radius,
across the swap frame:

| | ceremony | playback | worst channel |
|---|---|---|---|
| lit rim | `#EAE0C6` | `#F0EAD9` | 19 |
| lit mid | `#F4EBDE` | `#FBF6EA` | 12 |
| centre | `#EBE1CE` | `#E7DBC4` | 10 |
| shadow mid | `#D2C8AF` | `#BEAD8A` | 37 |
| shadow rim | `#AE9F81` | `#877656` | 43 |

Worse than the bench figure of 13, and the gap is worth naming rather than
splitting the difference: the ceremony screen screen-blends a **glimmer band**
over its stone which lifts the shadow side, and it is also the thing painting a
crescent outside the silhouette. Filed as
`2026-09-15-detail-glimmer-disc-is-sized-to-the-canvas-box`. Remove or resize
it and this table should come back toward the bench numbers.

### What the capture actually found

**The stone jumps 108px → 195px in a single frame.** The "match cut" matches
the canvas *rect*; the canvas is only 56% full of stone. Filed as
`2026-09-15-the-match-cut-scales-the-canvas-box-not-the-stone` — root cause,
measurements and fix shape are there.

That reframes this whole item. The premise on 2026-09-10 was that the cut's
defect is a **material** change. It is not, or at least not mainly: the
material is now within ~13 levels on the bench, while the geometry is out by
**79%**. A 1.8× scale pop on the hero object swamps any surface difference,
and no amount of further material tuning would have found it — it only shows
up by measuring pixels across the swap frame, because in the code both numbers
are "200".

### Status

Holding this item **open but blocked**: the `detail → playback` cut cannot be
judged until the size pop and the glimmer are fixed, since both dominate what
is left. Once they are, re-run the capture (`.tmp/stone/cut.mjs` +
`cutsize.mjs` + `cutanalyse.mjs`, recreate as needed) and the decision on
whether to unify the renderers should be easy — the expectation now is that it
will not be needed.

## Resolved, 2026-09-15 — and a correction to the numbers above

Both blockers are fixed
(`2026-09-15-the-match-cut-scales-the-canvas-box-not-the-stone`,
`2026-09-15-detail-glimmer-disc-is-sized-to-the-canvas-box`), and re-capturing
the cut turned up an error in this item's own measurements.

### The "within 13 levels" figure above was measured wrong

That bench comparison sampled the Step 5 stone **under reduced motion**. That
path is not a still frame: `FirstPlaybackScreen` drives `--lum` per word
through the speech sequence under reduced motion too (`:299`), so the sample
caught the stone **mid-lit** — about 23 levels bright at the shadow rim.

At the cut the stone is at `--lum: 0`, so that, not the reduced-motion render,
is the only correct target. Measured against it, the canvas stone was **38**
off, not 13, and visibly pale across its whole shadow half. The terminator
alphas have been re-fitted against `--lum: 0` (pinned with a stylesheet
override, which is the reliable way to get it):

| | vs mid-lit (wrong target) | vs `--lum: 0` (correct) |
|---|---|---|
| fitted to the wrong target | 13 | **38** |
| re-fitted | — | **13** |

`prototypes/breath-stone-api.md` and the comment on the terminator both carry
the warning now, because the trap is easy to fall into twice.

### The cut, measured

Captured at 4× throttle on 390×844 via `Page.startScreencast`, sampling each
stone along its own light axis on the frames either side of the swap:

| | at the start of this work | now |
|---|---|---|
| sphere width across the swap | 108 → 195px (**+81%**) | 111 → 110px (**−1px**) |
| lit rim | 19 | 19 |
| centre | 10 | 7 |
| shadow mid | 37 | 18 |
| shadow rim | 43 | 16 |
| **worst anywhere** | **43** | **19** |

The remaining 19 is at the lit rim, where the CSS stone carries a static
specular (`.fpb__spec`, top 15% / left 22%) that the canvas engine places
differently. That is a highlight position, not a material difference, and it is
the smallest of the discrepancies this item started with.

### The decision this item was opened to make

**Do not unify the renderers.** The premise was that the cut suffers a material
change that only one renderer could fix. That was wrong twice over: the
dominant defect was **geometric** (a 1.8× scale pop, invisible in the code
because both numbers were "200"), and the material gap was fixable inside the
canvas engine — a re-cut body ramp, a terminator layer, and deleting a
neutral centre-darkener that was pretending to be a directional shadow.

Porting the CSS stone to canvas, or the canvas engine to CSS, would have cost
weeks — 11 animated states, 25 consumers, a 1000-line engine — to close a gap
that is now 19 levels at one highlight.

Artifacts: `.tmp/stone/filmstrip-final2.png` (the cut, frame by frame),
`.tmp/stone/match.png` (both stones at matched diameter),
`.tmp/stone/sheet-ceremony.png` (original → mid-session → now),
`.tmp/stone/grid-final-200.png` (all 10 states).
