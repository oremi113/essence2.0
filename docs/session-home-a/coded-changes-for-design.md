# What changed in code, for the design side

**From:** the coded retrofit, 2026-09-21. **Branch:** `feat/home-a-retrofit`.
**Why this exists:** the mockup is settled and four threads closed on it. Coding
it surfaced things no mockup could, and three of them change what the design
says. Rather than let the repo and the design record drift — which this arc
already paid for four times — here is the diff in design terms.

---

## 1. "Pick up where you left off" → **"Record the next one"**

The Copy Guide bans "Continue" where a specific verb exists, and this was the
same shape one step warmer: it describes what the *app* does, not what the
*user* does.

"Record the next one" parallels not-started's "Record the first one" — one verb
family across the screen — and names the cost as **one clip** rather than an
open-ended resume. For someone whose barrier is "I don't have the energy for
this today," that is the difference between a small ask and a large one, and
lowering that is the screen's entire job. It is also honest: `deriveInitialView`
resumes at the exact index.

It is shorter, which matters at zoom.

---

## 2. A new state: **failed + past-due drops "Try again" entirely**

The threads specified "Try again" as sub-state 1's primary. It would dead-end.

`VOICE_CREATION_ALLOWED_STATUSES` is `{trial, active}` — **`past_due` is not in
it** — but `/app/voice/processing` lets `past_due` through. So the user taps a
mineral primary, is routed to a different screen, and is only then met with a
402. That is a fourth instance of the rule this arc settled three times, and the
worst of them: the other three fail quietly in place.

So when a `failed` user is `past_due`, the card is the blocker and the retry is
downstream of it. The screen offers no retry and states the dependency, in the
same instruction-not-control shape sub-state 2 already uses:

> **We can try again once your card is updated.**
> Nothing is lost in the meantime.

The action lives in the banner, where it already was.

**This also resolves the two-mineral-buttons question** that came up when the
banner started rendering its real filled button. There is now one primary in
that state and it is the one that works — arbitration not required.

It takes precedence over the backoff message, deliberately: "try again in five
minutes" is false when the card blocks it regardless. `exhausted` keeps its
mailto, which is not entitlement-gated and works fine.

Filed as **FOLLOW_UPS #109**, gating the `VOICE_CREATION_REQUIRES_PAYMENT` flip.

---

## 3. The `failed` register centres vertically

Thread 2 re-composed `failed` and measured a 189px void. At real phone height it
was **542px — 64% of the screen** — because the mockup's harness chrome was
eating the frame. Two lines of text with two-thirds of nothing below them, on
the one screen where the user already suspects something is broken.

Content now centres in the scroll region. The void is ~293px above and ~225px
below: symmetric space reads as composition, where 542px hanging below read as a
failure to render.

Only the vertical anchor changed. Thread 3's two-axes call was about *horizontal*
alignment and is untouched.

---

## 4. Smaller, but worth knowing

- **Past-due copy is now the component's**, not the mockup's. v3's body in the
  mockup was still a paraphrase; the shipped string is the Copy Guide's own
  worked example (stakes in the header, soft consequence, reassurance last).
- **The offline CTA treatment now covers `failed` too.** "Try again" needs the
  network, so it goes quiet offline. Only `exhausted`'s mailto stays live — it
  works offline, which is exactly why its copy promises no speed.
- **A scroll cue was added.** Not in any thread: at 375x667 the region genuinely
  overflows and the content just stopped mid-sentence. A fade at the boundary,
  shown only when something is actually hidden.

---

## 5. One thing the design record should stop claiming

**The 130% large-text results were never real.** Thread 3's mockup used
em-relative sizing so a toggle could simulate dynamic type; that is a harness
technique and correctly did not port. The coded harness kept the toggle anyway,
and it did nothing — measured, the root went 16px to 20.8px while the CTA and
next-stop line both stayed at 18px, because every size is a px token.

The app does not respond to a text-size preference **anywhere** (FOLLOW_UPS
#106). Zoom is the only thing a user has, and it works: at 200% (a 195x422 CSS
viewport) 306px is hidden and the primary stays reachable.

The toggle is removed. A control that appears to test something and cannot is
worse than no control, because it manufactures passing results — and it had been
producing them.

---

## Unchanged, and still right

Equal thirds. Card 5 as the anchor, on the ground, upright. The pill not the
headline. The stone's air, and its absence in `failed`. No stone compensation
(#35 is scheduled after ship). No prompt text, no record button, no playback.
One banner slot with suppression. Pending as a label swap, no spinner. The
waiting sub-state's missing primary — the best call in the whole arc.
