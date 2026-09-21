---
title: app_opened now fires on Home A, not only Home B
date: 2026-09-21
event: journey.app_opened
type: coverage-fix
pr: TBD
impact: Closes a retention blind spot. app_opened was wired only to the Home B branch of /home, so a returning user still in voice training never counted as a return — the exact cohort Home A exists to bring back. Expect app_opened volume to rise, and the rise is recovered signal, not new behaviour.
---

## What changed

`src/app/home/page.tsx` renders `<JourneyBeacon event={JOURNEY_EVENTS.appOpened} />`
on **both** branches of `/home`. It previously rendered it only on Home B.

## Why — the spec and the code disagreed

`docs/analytics/2026-06-16-journey-funnel-events.md` §4 defines the event as:

> **Fires:** On render of `/home` for an authenticated, onboarded user, once per
> mount, via `<JourneyBeacon>`. New users are redirected to onboarding before
> this renders, so reaching here is a genuine returning/continuing session.

Nothing in that says "Home B". The implementation narrowed it, almost certainly
because Home A was a stub at the time and nobody revisited it when the real
screen was specified.

## Why it matters more than a missing event usually would

The funnel's stated purpose is *"did they get in, did they pay, did their voice
come out, and did they come back?"* Under the old wiring, **only users who had
already completed the voice could register as coming back.** Everyone who
returned mid-training — which is Home A's entire reason to exist, and the
hardest return in the journey to earn — was silently excluded.

That biases the metric in the worst direction: it made retention look like a
property of finished users, and made the 25-prompt middle look like a cliff
people never came back from, when the data simply could not see them.

## Effect on existing data

- **`app_opened` volume will rise.** The increase is recovered signal, not a
  behaviour change and not double-counting.
- **Comparisons across 2026-09-21 are not like-for-like.** Any retention series
  spanning that date has a discontinuity. Segment by `voice_profile.status`, or
  treat pre- and post- windows separately.
- No schema change. Props are the global envelope only, unchanged, so nothing
  downstream needs to parse anything new.

## What was considered and rejected

**A separate `home_a_opened` event.** It would have avoided the discontinuity,
but it forks one question ("did they come back?") into two events that every
future query has to remember to union. The spec already describes one event at
one route; the code was the thing that was wrong.

## Follow-up

If mid-training returns turn out to be worth measuring on their own, the clean
way is a prop on this event (e.g. `clips_recorded` bucketed), not a second
event. Not added now — no PII or content, and a bucketed count is a behavioural
fact, but it needs its own decision rather than riding along with a fix.
