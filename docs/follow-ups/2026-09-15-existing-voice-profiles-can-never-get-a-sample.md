---
id: 2026-09-15-existing-voice-profiles-can-never-get-a-sample
priority: P1
status: resolved
opened: 2026-09-15
resolved: 2026-09-15
summary: "RESOLVED 2026-09-15 — Step 5's sample rendered only in the branch where a BRAND-NEW voice was just created, so every profile that already existed could never get one: a permanently silent First Playback for exactly the people already in the beta *(found preparing the row 41 device test)*"
---

# Every existing voice profile was locked out of Step 5

*(found while setting up the row 41 iPhone autoplay test — the account meant to
run the test could not have produced audio to test with)*

`src/app/api/voice-profiles/[id]/start/route.ts` · `src/lib/voice-sample/ensureVoiceSample.ts`

`ensureVoiceSample` had exactly one caller: `start/route.ts:356`, inside the
`if (result.ok)` branch that runs only when a brand-new ElevenLabs voice has
just been created and billed.

But the same route returns early, 282 lines above it:

```ts
// Idempotent: already ready
if (profile.status === "ready") {
  return NextResponse.json({ status: "ready", next: "continue" });
}
```

Nothing else called it — no other route, no script, no migration backfill. The
migration even names the population it was about to strand ("All nullable /
defaulted: every existing profile predates this beat") and leaves them at
`sample_status: 'none'` forever.

So for every profile created before Step 5 shipped: `GET /sample/play` 404s,
`FirstBreathSequence` swallows the 404 by design, and the beat plays silently.
Permanently, with no path to recovery.

## Why it matters

**The PR framed silence as graceful degradation for a failed render.** For
existing users it was not degradation — the feature never rendered at all. The
population affected is exactly the people already using the product: every beta
tester, and the owner.

**It also made the row 41 device test unfalsifiable.** Autoplay was to be
verified on an existing account, where there was no sample to autoplay — and a
silent screen is precisely what blocked autoplay looks like. The test would have
produced a confident-looking result meaning nothing.

## How it hid

Every individual piece was correct and well-commented. `start` is genuinely
idempotent. The GET genuinely must not spend money carelessly. The silent
fallback is genuinely the agreed degraded path. The gap lived only in the
*composition* — one caller, behind a branch, guarded by an early return 282
lines away — and each piece's comment described its own behaviour accurately
without anyone owning the question "who renders this for a user who already has
a voice?"

## Fix (applied)

`GET /api/voice-profiles/[id]/sample/play` renders on demand when there is
nothing to play, reversing its own "never spends money on a GET" rule. That rule
was protecting the right thing and cost users the feature; the concern behind it
is now answered by three fences instead of by refusing to spend:

1. the voice-creation daily cap gates the caller, checked *before* any render;
2. the claim inside `ensureVoiceSample` is single-flight, so a refresh collapses
   to `in_flight` rather than a second charge;
3. `VOICE_SAMPLE_MAX_RENDERS` caps what one profile can ever be billed — see
   [[2026-09-10-voice-sample-retry-has-no-billing-cap]], closed in the same
   change because this fix is what made it reachable.

The ceremony's prefetch moved from the `detail` phase to mount, so the render
has the whole ceremony as runway (`preserved` at 7.5s plus two deliberate taps)
instead of racing the user's own tap.

Covered in `tests/unit/voice-sample-play-route.test.ts` — rewritten, since it
previously asserted the old rule as an explicit invariant ("row 25 — no state
reaches the vendor"). The replacement asserts the three fences instead, and
records why the rule changed so the next reader does not think it was loosened
carelessly.

## What is still owed

- **Nothing renders ahead of time for existing users.** They get their sample on
  first ceremony entry, which is correct but means the *first* such visit does a
  few seconds of vendor work inside the runway. If a cohort ever needs it warm in
  advance, a one-pass backfill script is the shape — deliberately not built,
  because it bills for users who may never reach the beat.
- **`start`'s early return is still the only render hook on the creation path.**
  That is now belt-and-braces rather than load-bearing, but the asymmetry that
  caused this is worth remembering when adding the next trigger.

## Pick up when

Resolved. Revisit only if a pre-warm backfill is wanted for a specific cohort.
