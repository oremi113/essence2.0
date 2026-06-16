# Step 7 · Memory Shelf & Playback — Prototype Revision Brief

**For:** the design architect
**From:** engineering
**Date:** 2026-06-16
**Status:** Your V2 prototype landed and the bones are right — palette,
BreathStone, the ceremonial playback overlay. But it was built for a *growing
library*, and V1's vault is capped at **3 messages for life**. This brief is the
**revision pass**: trim the library-scale features, right-size the mock data, and
finish the one moment that's still missing (the full 3/3 shelf). Your deliverable
is the **revised prototype**.

---

## 0. The why (read once, then work from §1)

The prototype ships with 7 example messages and leans on features that only make
sense with a long list: a chronological/grouped **view toggle**, a
**group-by-person** view, a **"most replayed"** view (`playCount >= 5`), an
**"Often replayed"** badge, and a **tip card** teaching the grouping.

V1 doesn't have a long list. The vault holds a **lifetime maximum of 3**
(`STEP6_MAX_SAVED_MESSAGES = 3`). Three is the *full, complete* state — not a
"page 1 of many." **Decision (locked, 2026-06-16): the 3-cap stands for V1.** So
those library features are out of scope. Everything else you designed stays.

Nothing here is wasted — if a later phase lifts the cap, the grouping /
most-replayed designs become a Phase-2 path. But they don't ship in V1, so
they come out of this prototype.

---

## 1. The revision checklist (what to change in the prototype)

**Remove (out of scope at ≤3 messages):**
- [ ] The **view toggle** chrome (the `☰` / `⊞` controls, top-right of header).
- [ ] The entire **group-by-person view** (recipient sections, avatars/initials,
      compact cards).
- [ ] The **"most replayed" view** (the `playCount >= 5` filtered list).
- [ ] The **"Often replayed" badge** on cards (`playCount >= 5` — meaningless
      against 3 items).
- [ ] The **tip card** that teaches grouping (no grouping → no tip).
- [ ] The **welcome-back ceremony + "N messages safely preserved" footer** —
      these read as "you have a lot here." Default to cutting; keep only if you
      can make one feel right at 1–3 items.

**Right-size the mock data + dev rail:**
- [ ] Drop the mock set from 7 to **demonstrate 0, 1, 2, and 3 messages**. Make
      the dev rail switch between the §3 states (empty / 1 / 2 / 3 / playing /
      just-saved / loading / error) instead of the current
      "Simulate Return / Mark Unplayed / Tip Card" buttons.

**Add the one missing moment:**
- [ ] Design the **full (3/3) shelf** — the quietly complete "your three are
      kept" state. This is the emotional destination of the whole Step 6 arc
      (it pairs with **C1 "Three are kept"** and **C3 "Three messages, kept"**).
      The current generic footer is *not* this. Decide: does it celebrate
      completeness, gently point at the waitlist (C2), or stay silent?

**Keep (these are right — don't touch the behavior, just carry them through):**
- [ ] The **BreathStone** as empty-state object and **playback visualizer**
      (`idle / ready / playback / pause` is exactly the grammar — keep it).
- [ ] The **ceremonial playback overlay**: pre-play → playing → complete(replay),
      with the staggered stone → excerpt → controls fade-in. Tap-to-focus a
      single message; not inline.
- [ ] The **empty state** (stone + "Your voice messages will gather here…").
- [ ] **Card settle-in** stagger and the **unplayed glow** (works fine at ≤3).
- [ ] The **audio-unavailable + retry** treatment ("This message is safe…").
- [ ] The **first-message ceremony** ("Your first message is here…") for the
      first-visit / just-arrived-from-A7 moment.
- [ ] The **transcript view** ("View transcript") — optional polish, keep it.

**Still your call (open design decisions):**
- [ ] **Card content hierarchy** — at rest the card shows recipient + excerpt +
      "created N ago • duration". Confirm that order, and whether **category**
      (birthday / comfort / encouragement / …) earns a visible place.
- [ ] **Sorting** — newest-first chronological is the default and reads right at
      ≤3. Confirm or propose by-recipient if it reads better for a tiny set.

---

## 2. What the Memory Shelf is (the intent to protect)

It's where a user revisits the voice messages they've saved — the keepsakes.
They reach it after saving a message, and any time they want to hear one again.

**Emotional intent (MASTER_SPEC §4.2 Step 7):** *revisit messages as meaningful
keepsakes — stability, permanence, confidence.* The "it's safe, it's here, it's
yours" moment. Quiet pride, not utility.

**System rules (locked):** messages **persist** (a vault, not a session);
playback is **user-initiated** (nothing auto-plays); the shelf is an
**organizing surface, not a feed**; messages are **immutable** once saved (no
edit, no re-record, no delete in V1).

## 3. States the revised prototype should cover (and switch via the dev rail)

1. **Empty** (0 saved) — stone + "Your voice messages will gather here…" + the
   path into creating the first. *(You have this; keep.)*
2. **1 / 2 / 3 messages** — show how the column breathes from a single precious
   item up to the complete set. **3/3 is a feature, not a limit** — give it the
   moment from §1.
3. **Playing** — the ceremonial overlay: pre-play → playing → complete(replay),
   with play / pause / replay / close. *(You have this; keep.)*
4. **Just-arrived-from-save** — the message you just saved, freshly landed (you
   came from A7); the first-message ceremony covers the first-ever case.
5. **Loading** and **error / audio-can't-play + retry** — quiet, on-brand; the
   "This message is safe…" + retry copy maps onto behavior that already exists.

*(Dropped from the prototype per §1: grouped view, most-replayed view, tip card.)*

## 4. How users get here, and where they go next

**Entry:** from **A7 (Save Confirmation)** — "View on Memory Shelf" right after a
save (so "I just saved this one" is a common arrival — the first-message /
fresh-landed treatment fits here); from **C3 (Vault Limit)** — "Visit your
Memory Shelf"; later from Home B / Step 8.

**Exit:** **Create another message** → the creation flow. When the shelf is
**full (3/3)**, "create another" isn't available — that's C3 vault-limit / C2
waitlist territory, which is what the §1 full-shelf moment needs to acknowledge.

## 5. The visual language (you already nailed this)

Keep what the prototype has, sourced from the app's design language:
- **MINERAL & WARMTH palette + Spectral/Inter type** — your `:root` block is a
  faithful copy of `docs/design-tokens.md` / `src/app/globals.css` `@theme`.
  Keep it self-contained in the prototype; engineering wires it to `@theme`.
- **The BreathStone** (`prototypes/breath-stone-api.md`) as the signature object.
- **Tonal neighbors:** `prototypes/message creation/essence-step6-a7.html` and
  `…pass2-c-screens.html` (A7 + the C-screens) — the shelf lives next to these.

## 6. The data you can design around

Each saved message can surface: **recipient name** (the emotional anchor),
**category**, **created date**, **audio duration**, **play history**
(`played_count` / `last_played_at`), optional **title** and **text excerpt**.

Design for what *should* be there (recipient + date + duration at minimum, which
is what your card already uses). Engineering will make the data match — see §7.

## 7. Notes for engineering — *not your job, just so you know it's handled*

So you don't design around blockers that we own:
- The card's "created N ago • duration" line and the played/unplayed glow need
  fields the API doesn't return yet (it currently sends only id / title /
  excerpt / recipient / date). **We'll widen `GET /api/messages`** to add
  duration + play-history. Design as if it's there.
- The production component is misplaced and has no dev page; **we'll move it to
  `src/components/screens/` and add `/dev/shelf`** during the build. Route
  (`/app/shelf`) and the "create" link don't change.
- The prototype stays a **self-contained HTML file** (inline `<style>`, tokens
  in `:root`, a dev rail to switch §3 states) and remains the **design source of
  truth** — production mirrors its copy, timing, motion, layout. Keep the short
  **NOTE FOR CODE ARCHITECT** header current as you trim.

## 8. Copy candidates (carry these over; we'll do a clarity pass after)

Audience skews boomer / Gen X — **clarity beats cleverness.**
- **Title / tagline:** "Memory Shelf" / "Each message is a keepsake for someone
  you love"
- **Empty:** "Your Memory Shelf" / "Your voice messages will gather here. Each
  one a keepsake that carries your words forward." / "These messages are
  preserved and protected. They're not temporary—they're yours to keep." /
  CTA "Create your first message"
- **Audio unavailable:** "This message is safe. It just needs a moment before it
  can play." + "Try again"
- **First-message ceremony:** "Your first message is here. This is where your
  voice lives."
- **Still to write:** the **3/3 full-shelf** note (§1).

## 9. The motion bar

**Mobile-first**, 390×844 baseline; must hold up at a **4× CPU throttle** on a
simulated mid-range phone. The glows/pulses and the overlay blur are the things
to check at 4× — if they feel off there, they'll feel off on a real mid-range
Android at 1×.

---

### Reference index
- **Prototype to revise:** `essence-memory-shelf-step6-v2-final.html` (save the
  revised version into `prototypes/`, suggested
  `prototypes/essence-step7-memory-shelf.html`).
- **Spec:** `docs/MASTER_SPEC.md` §4.2 Step 7, §4 (design language), §5
  (BreathStone).
- **Tokens:** `docs/design-tokens.md`, `src/app/globals.css`.
- **Tonal neighbors:** `prototypes/message creation/essence-step6-a7.html`,
  `…pass2-c-screens.html`.
- **Stone API:** `prototypes/breath-stone-api.md`.
- **Cap constant (the 3):** `src/lib/messages/cost-controls.ts`
  (`STEP6_MAX_SAVED_MESSAGES`).
