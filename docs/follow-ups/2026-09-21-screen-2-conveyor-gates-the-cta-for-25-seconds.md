---
id: 2026-09-21-screen-2-conveyor-gates-the-cta-for-25-seconds
priority: P2
status: resolved
opened: 2026-09-21
resolved: 2026-09-21
summary: "RESOLVED 2026-09-21 — Onboarding screen 2 holds the Continue button for ~25s while the 12-phrase conveyor plays, and the people who skip the ceremony (reduced motion) are the only ones who get the button immediately *(owner, physical pass 2026-09-21)*"
---

# Screen 2 makes a tester wait 25 seconds, and rewards turning the ceremony off

*(surfaced when the owner noticed the conveyor "missing" on their iPhone during
the physical-feel pass)*

`src/components/screens/onboarding/Screen2.tsx` ·
`src/lib/config/onboarding-timing.ts`

The CTA delay is derived from the phrase count:

| beat | ms |
|---|---|
| `CONVEYOR_INTRO_DELAY_MS` | 1000 |
| 12 phrases x `CONVEYOR_PHRASE_DURATION_MS` (1500) | 18000 |
| `CONVEYOR_FINAL_BEAT_MS` - "Your voice." lands | 1500 |
| `CONVEYOR_TAIL_BEAT_MS` - "Their timeline." lands | 1400 |
| `CONVEYOR_CTA_BEAT_MS` - CTA fades in | 3000 |
| **total** | **~24.9s** |

**Screen 2 of 12.** A tester cannot advance for nearly half a minute, on the
screen that is meant to explain what the product does. The phrase list is the
gate: the timing re-derives from its length, so "twelve phrases" and
"twenty-five seconds" are the same decision.

## The part that is backwards

The conveyor is suppressed only by `@media (prefers-reduced-motion: reduce)`
(`globals.css`) - there is no width query, despite a stale comment in
`Screen2.tsx` that claimed the conveyor was `display:none` on mobile. That
comment is corrected in the same commit as this entry.

The reduced-motion branch also zeroes the CTA delay, which it must - a
multi-second `animation-delay` makes no sense when the animation it waits for
does not play. The consequence, though, is that **the only people who get the
Continue button immediately are the ones who opted out of the ceremony**.
Everyone who would enjoy it waits 25 seconds for it; everyone who would not
is let straight through. That is the incentive exactly inverted.

It also explains the original report: the owner's phone very likely has Reduce
Motion on, which hides the conveyor and un-delays the CTA together - so the
screen reads as though the flourish had been deleted.

**Why it matters:** a 25-second gate on an early onboarding screen is a place
testers quietly drop, and they will not report it as a bug - they will report
that onboarding "felt long", if they say anything at all. It is also the kind
of thing that only shows up when someone walks the flow on a real device
without skipping ahead.

**Fix shape (owner call - this is a ceremony decision, not a bug fix):**

- Trim the list. Timing re-derives, so 6 phrases lands the CTA at ~15.9s and 5
  at ~14.4s. The owner's own words were that twelve was "excessive w the number
  of phrases but it was nice".
- And/or shorten `CONVEYOR_PHRASE_DURATION_MS` (1500 -> ~1200).
- And/or **decouple the CTA from the tail**: let Continue appear once "Your
  voice." lands, so "Their timeline." is a reward for staying rather than a
  toll for leaving. This alone removes 4.4s and fixes the inverted incentive
  without touching the ceremony's content.

**Pick up when:** before the beta invites - it is on the onboarding path every
tester walks, and it is cheap.


---

## Resolved — 2026-09-21 (owner call)

Owner asked for three or four phrases, the anchoring intro and conclusion kept,
and the CTA decoupled.

**Four phrases, ordered as an escalation rather than a catalogue.** It opens
somewhere ordinary and warm so nobody is asked to think about death on screen
2, moves into something said rather than sent, then into a nightly ritual that
implies a child and an absence without naming either, and only then lands on
the reason the product exists:

    Birthday wishes.
    "I'm proud of you."
    Bedtime stories.
    A goodbye, whenever it comes.

Twelve was a list, and a list is browsed rather than felt. The anchors are
untouched: the 1s intro beat, "Your voice.", and the stacked "Their timeline."

**CTA decoupled.** `CONVEYOR_CTA_BEAT_MS` now measures from the CONCLUSION
rather than from the tail, and drops 3000 -> 800.

| | before (12 phrases) | after (4) |
|---|---|---|
| "Your voice." lands | 20.5s | **8.5s** |
| Continue appears | 24.9s | **9.3s** |
| "Their timeline." lands | 21.9s | 9.9s |

Continue now arrives *before* the tail settles, so the stacked conclusion is a
reward for staying rather than a toll for leaving. The inverted incentive is
not fully gone — reduced motion still gets the button at 0s — but the gap it
buys has fallen from ~25s to ~9s.

**Verified** at 390x844 under 4x CPU throttle: phrases land at 2.5 / 4.0 / 5.5
/ 7.0s, "Your voice." at 8.5s, the tail fades in across 9.5-10.5s. One phrase
on screen at a time, no pile-up during the hold.

**Not verified end-to-end:** the CTA's own fade-in was not measured in the
browser. `/dev/onboarding` starts its sequence on a screen whose CTA reads
"That sounds like me", so driving it to screen 2 reliably proved fiddly and I
stopped rather than ship a measurement I did not trust. The change is
arithmetic on an existing, already-proven mechanism — `.onboarding-ctas--delayed`
carries `animation: onb-fade-up ... both`, and `both` holds opacity 0 through
the inline `animation-delay`, now 9300ms. Worth a glance during the owner's
full walkthrough.


---

## Re-tuned — 2026-09-21 (second owner call)

The first pass measured the CTA from the CONCLUSION, which put it at 9.3s. The
owner watched it and said it still appeared at the end of the phrases - which
was true, and was what the first call had asked for. Restated as a choice
between four timings, the owner picked **with the last phrase**.

`CONVEYOR_CTA_BEAT_MS` now measures from the last TRANSIENT phrase and is 0.

| | 12 phrases (original) | first pass | now |
|---|---|---|---|
| Continue appears | 24.9s | 9.3s | **7.0s** |
| "Your voice." lands | 20.5s | 8.5s | 8.5s |
| "Their timeline." lands | 21.9s | 9.9s | 9.9s |

So the entire conclusion now plays to someone who is already free to leave.
That is the whole point of the change: the stacked ending is a reward for
staying, and nothing about it is a toll.

`lastPhraseLandMs` is named rather than inlined, because the CTA and the
conclusion are both derived from it and a single source stops the two drifting.

**Pinned by a test this time.** `tests/unit/onboarding-screen2-cta-timing.test.tsx`
asserts the rendered `animation-delay` on `.onboarding-ctas--delayed` equals
`intro + phraseCount * stagger + ctaBeat`, that the CTA precedes both the
conclusion and the tail, and that the hold stays under 8s. Verified values:
CTA 7000ms, conclusion 8500ms, tail 9900ms.

The earlier note said this path had no test because `/dev/onboarding` proved
awkward to drive to screen 2. Asserting the delay directly is better than the
browser measurement would have been - it fails in CI the moment someone
lengthens the phrase list, rather than on a device weeks later.
