---
title: Monetization event relocates to Card Capture; voice_create fires post-payment
date: 2026-07-12
event: multiple
type: behavior-change
pr: 95
impact: The spine reorder (record → Card Capture → processing → Reveal → First Breath) moves the first paid ask from the old vault-seal beat to Card Capture, and moves where voice_create usage events fire — from the record/create flow to the post-payment Processing screen. Funnel position of these events shifts even though their schema is unchanged. Flags stay OFF in this PR, so the *volume* doesn't change yet; the *sequencing* does.
---

## What changed

PR #95 wires the monetization spine and relocates two telemetry landmarks:

1. **First paid ask → Card Capture.** The paywall now lives at
   `/app/vault/protect` (Card Capture), reached from the record flow. The old
   five-screen vault arc (continuity/seal/sealed) that previously carried the
   subscribe moment is retired (its routes are now stable redirects to Home).
   Any journey/funnel beacon that keyed "reached the subscribe moment" to the
   seal beat now corresponds to Card Capture.

2. **`voice_create` usage events fire *after* payment.** The `POST
   /api/voice-profiles/[id]/start` call — which emits the
   `voice_create` / `voice_create_start` / `voice_create_complete` structured
   log + `usage_events` rows — moved out of the record/create flow into the
   Processing screen (`/app/voice/processing`), which is only reachable after
   the Card Capture commit. So in the funnel, `voice_create` now sits *below*
   the paywall, not above it.

**No event names or payloads change.** This is a sequencing/position change,
not a schema change.

## Root cause

Intentional redesign — the immutable journey order (MASTER_SPEC §4.4) puts card
capture *before* voice processing, so voice creation (the billed ElevenLabs
call) must not run until payment. Moving where `/start` fires is what enforces
that; the telemetry moves with it.

## When

Landed on `main` with PR #95 (2026-07-12), spine chunks S1–S4. Monetization
flags (`VOICE_CREATION_REQUIRES_PAYMENT`, `VAULT_STRIPE_ENABLED`) remain **OFF**
— the mock checkout stands in for "paid," so no real charge fires yet. The
event *volume* shift arrives at S5 when the flags flip; the *position* shift is
live now.

## What to watch

- **A time-series discontinuity at 2026-07-12** for any "reached subscribe" /
  paywall funnel step keyed to the old seal beat — re-point it at Card Capture,
  don't read the seam as a drop.
- **`voice_create` now appears post-paywall** in the funnel. A pre-2026-07-12
  vs post- comparison of "voice_create per session" will shift because the event
  sits after a gate it used to precede — expected, not a regression.
- **Volume is unchanged until S5.** Because flags are OFF and the mock path
  bypasses the paid guard, `voice_create` still fires for effectively every user
  who reaches Processing. When S5 flips the flags, non-subscribers get 402'd at
  `/start` and `voice_create` volume drops to paid users only — that will be a
  second, larger discontinuity; it gets its own note.
