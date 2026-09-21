---
id: 2026-09-21-screen-2-conveyor-gates-the-cta-for-25-seconds
priority: P2
status: open
opened: 2026-09-21
resolved:
summary: "Onboarding screen 2 holds the Continue button for ~25s while the 12-phrase conveyor plays, and the people who skip the ceremony (reduced motion) are the only ones who get the button immediately *(owner, physical pass 2026-09-21)*"
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
