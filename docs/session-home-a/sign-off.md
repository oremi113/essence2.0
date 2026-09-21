# Home A retrofit — sign-off

**Date:** 2026-09-21
**Ships at:** **A-**, by decision.
**Amended 2026-09-21:** the ceiling that grade was set against turned out not to
exist — see below.

---

## Owner pass — passed

Walked on a real iPhone against the live harness at 390px and on device. All
three registers, the clip stops, the failed sub-states, the banner variants,
offline, pending and reduced motion. No changes requested.

The two calls specifically put to the owner both held up in the hand:

- **Equal thirds.** At five clips one of three segments reads as complete, which
  is the reward the split was chosen for.
- **The waiting sub-state's missing button.** It reads as patient, not broken —
  which was the risk of removing a control rather than disabling it.

## The ceiling — amended, and it was measured against the wrong thing

**The stone was never dull.** FOLLOW_UPS #35 is resolved: the body gradient was
re-cut on 2026-09-15, three months after that entry was written, and sampling
the canvas on 2026-09-21 shows a warm honey-gold sphere on all three screens the
entry names (red-minus-blue positive in every zone; full table in #35).

The reviews graded this screen against the mockup's flat `#C9C4BC` **placeholder**
and never saw the canvas. The "grey disc above an apology" line — repeated in
this document's original text and throughout the review arc — describes
scaffolding, not the product.

So the A- was set against a ceiling that had already been removed. Whether the
screen is now an A is a fresh judgement, not a reinstatement, and it should be
made by looking at it rather than by arithmetic on a superseded grade.

The prohibition still stands and is unaffected: **Home A must not compensate
locally.** The body-gradient lock in `prototypes/breath-stone-api.md` also
stands — state colour comes from overlay layers, never from re-cutting the ramp.

<details><summary>Original text, kept because the reasoning was sound on the facts available</summary>

### The ceiling, stated rather than absorbed

The design review graded this **A-** and attributed the entire gap to A to
**FOLLOW_UPS #35** — the canvas `BreathStone` renders cool on light grounds, and
it is the screen's only atmospheric element.

**That is scheduled after this ships, by owner decision (2026-09-18), not
deferred.** Shipping at the ceiling is the choice; the alternative was holding a
finished screen for a cross-cutting engine pass that touches VaultSeal,
FirstBreath, RecordScreen, A6 and A7.

Recording it here because the review asked that it be said out loud, so a later
reader does not mistake a decision for an oversight. **Home A must not
compensate locally** — no halo, no bespoke gradient. That debt #35 would have to
unpick.

</details>

## Retry policy — reviewed and left alone

The three-attempt cap with 5-minute and 30-minute backoffs was questioned during
the owner pass and **deliberately kept**. It predates this work
(`src/lib/voice-training/backoff.ts`); the screen only reports which window is
in force. The argument that held: a user gets three attempts, and an instant
retry burns them against the same broken conditions.

Noted as reviewed so it is not re-raised as an oversight. The open question, if
it ever matters, is the **cap** rather than the wait — hitting it sends a paying
customer to email.

## Verified

```
390x844 @2x · Pixel 5 · 4x CPU throttle · 714 frames
p50 8.3ms   p95 9.3ms  PASS   worst 16.8ms  (0.3% over budget)
zoom 130% (300x649): CTA reachable, 7px hidden
zoom 200% (195x422): CTA reachable, 306px hidden
focus order: Update card -> Settings -> primary
19/19 states, no console errors
503 tests, tsc and lint clean
```

## Not verified, and why

**The signed-in wiring walk.** The local Supabase stack could not authenticate
on this machine — its GoTrue build rejects HS256 while `.env.local` carries
HS256 keys, which predates this work. What the walk would have proven is now
covered by `tests/unit/derive-home-a-state.test.ts`: 12 cases over the state
table, including the two hardest states to reach by hand. That coverage is what
caught the ordering bug that had made the entire `failed` register unreachable.

What remains unproven is wiring only — that the page reads the right columns and
that `app_opened` writes its row. Worth confirming on the first production visit
rather than blocking on.

## Open, tracked

#106 px type scale · #107 tertiary as text in 19 rules ·
#108. **#35 and #109 are both closed** (2026-09-21).
