# Step 6 · A4 Personal Note — Copy Clarity Pass

**Date:** 2026-06-15
**Type:** Copy/UX decision memo (prototype-divergence amendment 3).

## Why
Owner feedback while clicking through the live screens: the A4 note step wasn't
intuitive. Two concrete problems:
1. **The empty-state button read as an opt-out.** You land with an empty box and
   the most prominent control says *"Use a generic message"* — which (a) reads
   like the main action is to skip, and (b) "generic" actively undersells the
   product. People tap it reflexively and miss the best part.
2. **The mechanic was invisible.** Nothing told the user that *a few words → a
   full, shaped message*. "What do you want them to know?" alone can read as
   "write the whole message yourself" (intimidating).

**Audience constraint (owner):** boomers / Gen X — **clarity beats cleverness.**
That argues against the brand-poetic abstractions ("Shape it from this") and
toward plain, action-first language plus a concrete example.

## How we chose
Built four copy variants behind a toggle on `/dev/messages-note` (A current /
B warm+clear / C plain+explicit / D warm+explicit) and compared them live at
phone width. Owner picked a combination.

## What shipped (locked copy)
| Slot | Copy |
|---|---|
| Question | *What do you want them to know?* (unchanged — the emotional anchor) |
| **Subtitle (new)** | *A memory, a few words, even just a feeling we'll turn it into a full message. Or leave it blank and we'll write a warm one for you.* |
| **Box placeholder** | *Example: Happy birthday, sweetheart. I'm so proud of the woman you've become.* |
| **Empty button** | *Skip and write it for me* |
| **Typed button** | *Write my message* |

The word "generic" is gone. The example is the biggest clarity lever — it *shows*
what a note looks like and that one sentence is enough, no instructions needed.

## Decisions / notes
- **Subtitle wording is owner-exact** (no comma after "feeling"). I flagged that
  it reads slightly run-on; owner kept it as written.
- **The morphing button stays** (one button, two labels) — but the labels now
  make the choice legible: empty = a clear skip, typed = "use what I wrote."
- **The example is birthday-flavoured while the copy is category-agnostic.** On a
  comfort/holiday/future message it's a mild mismatch. Logged as FOLLOW_UPS #56
  (per-category examples — the `QUESTION_BY_CATEGORY` structure already supports
  it).

## Implementation
- `PersonalNoteScreen.tsx` — copy baked as `SUBTITLE` / `NOTE_PLACEHOLDER` /
  `SKIP_LABEL` / `SUBMIT_LABEL` constants; new `.prompt-subtitle` element (recedes
  with the question while writing).
- The exploratory `copy?` prop + the `/dev/messages-note` variant toggle were
  removed once the winner was chosen (scaffolding, not permanent).
- Prototype `essence-step6-a4.html` updated to match (amendment 3 in its header).
- Live-verified on `/dev/messages-note`: new copy is the default; the button
  morphs `Skip and write it for me` ↔ `Write my message`.
