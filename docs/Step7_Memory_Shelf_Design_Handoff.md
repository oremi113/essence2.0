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

---

# Appendix A · Design-token & consistency audit (revised prototype)

**Audited:** `essence-step7-memory-shelf.html` (the revised prototype) against
`docs/design-tokens.md` / `src/app/globals.css` `@theme` (canonical) and the
Step 6 prototypes (`prototypes/message creation/*`).
**Date:** 2026-06-16 · **Result:** findings only — no files changed.

## A.0 TL;DR — why it reads as "disjointed"

Color and copy are on-brand, so the eye can't locate the problem there. The
disjoint is in **motion and surface treatment**:

1. The signature **BreathStone breathes on the wrong easing curve** — the app's
   hero object animates unlike it does everywhere else.
2. **Cards enter slower and on a different rhythm** than the rest of the app
   (800ms vs 400ms, wrong curve, tighter stagger), and the screen skips the
   app's signature page-arrival entirely.
3. **CTAs are missing the warm shadow** the app deliberately puts under its cool
   mineral buttons — so buttons sit flatter and cooler than in Step 6.
4. **Cards are gradient + glow** where every other card in the app is flat.

Individually subtle; together they read as "a different hand drew this."

## A.1 Motion — the primary offender

**A.1a — `--ease-breath` is the wrong value and used for everything.**
- Prototype (line 137): `--ease-breath: cubic-bezier(0.4,0,0.2,1)` — identical
  to its own `--ease-essence` (line 136). That duplication is the tell.
- Canonical: `--ease-breath: cubic-bezier(0.37,0,0.63,1)` — a symmetric
  pendulum, reserved **only** for the BreathStone rhythm. The universal
  transition curve is `--ease-essence` (`0.4,0,0.2,1`).
- Effect: the stone's `stone-breathe`/`stone-pulse` (lines 751, 758) ride the
  wrong curve, so the hero object doesn't breathe like it does elsewhere; every
  other transition is mislabelled `--ease-breath` and will silently break if the
  token is ever corrected.
- **Fix:** set `--ease-breath: cubic-bezier(0.37,0,0.63,1)`, apply it *only* to
  the stone, switch all other transitions to `--ease-essence`.

**A.1b — Card entrance doesn't match the app's reveal.**
- Prototype: `card-settle-in` = `--duration-medium` (800ms) on `--ease-breath`,
  stagger 0/100/200ms (lines 281, 286–288).
- Step 6: stage reveals are **400ms** (`--duration-small`) on `--ease-essence`,
  staggered **200–300ms** apart — same `translateY(8px)` shape, quicker and more
  separated.
- **Fix:** card settle-in → `--duration-small`, `--ease-essence`, ~200ms stagger.

**A.1c — Missing the app's signature page-arrival.**
- Canonical defines `--ease-page: cubic-bezier(0.22,1,0.36,1)` @
  `--duration-page: 700ms` for "every page + staggered child." The prototype
  omits both and never does a page-level entrance.
- **Fix:** add the two tokens; consider a page-enter on the container.

## A.2 Color & shadow

**A.2a — CTAs missing the warm shadow (real disjoint, easy fix).**
- The app keys its primary-button shadow *warm*:
  `--shadow-mineral: 0 4px 14px rgba(110,80,40,0.20)` (re-keyed 2026-06-12) —
  warmth under the cool mineral button so it sits on cream. Step 6 uses it on all
  primary buttons.
- Prototype defines `--shadow-mineral` with the **old cool value**
  `rgba(122,128,136,0.3)` (line 102) **and never uses it.** `.btn-primary` has no
  shadow (239–253); `.btn-play` hover uses neutral `rgba(0,0,0,0.12)` (381).
- **Fix:** correct `--shadow-mineral` to the warm value; apply to
  `.btn-primary` / `.btn-play` / `.btn-modal-primary`.

**A.2b — The cool mineral accent is CORRECT.** `--color-mineral #7A8088` is the
real house CTA color (confirmed in canonical + Step 6). No change — flagged
because it's the obvious suspect and is *not* the problem.

**A.2c — Warm-ramp values drifted, but so did Step 6's.** Prototype's
`--color-bg-warm-2 #F6F0E5`, `--color-bg-gold #F2E8D6`, `--color-bg-rich #EDE3D0`
(lines 78–80) **match the Step 6 prototypes**, but all differ from canonical
(`#F2E8D2` / `#E8D8B3` / `#D9C28E`). For consistency *with recent prototypes* the
shelf is fine — this is a **fleet-vs-`@theme` reconciliation** item, not a shelf
defect. Barely visible (only the loading skeleton uses `bg-rich`).

## A.3 Typography & labels

**A.3a — Off-scale type sizes** (Step 6 stays on the scale: 14/15/16/18/20/28):
`empty-title` 24px (212), `shelf-complete-title` 22px (453), `empty-body` 17px
(221), `unavailable-message` 13px (397), `btn-retry` 13px (412). The two **13px**
values are below the `--text-small` (14px) floor and too small for the 45–70
audience. **Fix:** snap to scale tokens; raise 13px → 14px minimum.

**A.3b — Eyebrows off-spec.** House eyebrow: Inter, **12px**, weight **600**,
uppercase, letter-spacing **0.12–0.16em**.
- `.modal-recipient` (605): 14px, weight 400, tracking 0.04em — too big, too
  light, under-tracked.
- `.transcript-label` (710): weight **700** (Step 6 caps at 600; the file loads
  Inter 700 at line 9, which Step 6 doesn't), tracking 0.08em.
- **Fix:** both → 12px / 600 / 0.12–0.16em; drop the 700 weight.

## A.4 Iconography

The app uses **SVG icons**. The prototype uses unicode glyphs, internally
inconsistent: card play is outline `▷` (`\25B7`, 380) while modal play is filled
`▶` (`&#9658;`, 911), plus `⏸`/`↻`/`○`. **Fix:** unify to one play glyph (ideally
the app's SVG set); at minimum make card and modal match.

## A.5 Surfaces

Step 6 cards are **flat `--color-surface-card`** + hairline border +
`--shadow-sm`. Shelf cards add a top-to-bottom gradient (`surface-card → #F1EBE0`,
257), an inner honey glow, and no border — a self-invented surface language.
**Fix:** flatten to match, or keep the gradient as an intentional "keepsake"
treatment and document it as a deliberate exception.

## A.6 Copy — on-brand, two tiny notes ✅

Sentence case, plain language, zero scarcity, italic Spectral for tenderness —
all correct; "Three, kept." echoes C1/C3. Minor: card meta says "**Kept** Apr 23,
2026" while A7 uses "**Kept on** …" (add "on"); A7's kept-date is italic Spectral
vs the shelf's sans Inter (optional alignment).

## A.7 Done right (keep)

Canonical token *names* throughout; correct mineral, text, status, spacing,
radius, `--shadow-sm/md/lg`, `--ease-press`, base durations; reduced-motion pins
to mid-frame (matches Step 6); 44px touch targets; locked BreathStone gradient;
the 3/3 "Three, kept." restraint.

## A.8 Prioritized fix list

- **P1 (the disjoint):** fix `--ease-breath` value + scope to the stone, move
  other transitions to `--ease-essence` (A.1a); retime card entrance to
  400ms/essence/200ms-stagger and add `--ease-page`/`--duration-page` (A.1b/c);
  correct `--shadow-mineral` to warm and apply to CTAs (A.2a).
- **P2 (polish):** snap off-scale type sizes, raise 13px→14px (A.3a); fix eyebrow
  size/weight/tracking, drop 700 (A.3b); unify play glyph (A.4).
- **P3 (decide & document):** flat vs gradient cards (A.5); "Kept on" + optional
  italic date (A.6); fleet-wide warm-ramp vs `@theme` reconciliation (A.2c).

> Line numbers reference `essence-step7-memory-shelf.html` as delivered
> 2026-06-16. Canonical values are from `docs/design-tokens.md` /
> `src/app/globals.css` `@theme`.
