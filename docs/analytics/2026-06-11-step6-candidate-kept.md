---
title: New server event step6_candidate_kept (Deferred-Audio "Keep the current one")
date: 2026-06-11
event: step6_candidate_kept
type: new-event
impact: Adds a server-side structured-log event when a user dismisses an un-heard Deferred-Audio candidate via /regenerate mode=keep. Server log layer only — not (yet) a product-analytics catalog event.
---

## What changed

`POST /api/messages/regenerate` gained a third `mode`, `keep`, that nulls the
`pending_generations.candidate_text` / `candidate_template_variant` columns —
the Deferred-Audio "Keep the current one" action (discard the un-heard
candidate, return to the committed take). On success it emits a new server
structured-log event:

- **`step6_candidate_kept`** — `outcome: "success"`, `meta: { generationId }`,
  plus the standard `requestId` / `userId` / `durationMs`.

This sits alongside the existing Deferred-Audio server log events
(`step6_variant_previewed` on `mode=variant`, `step6_commit_complete` /
`step6_commit_failed` on `/commit`). Like those, it is a **server log**, not a
member of the product event catalog in `2026-06-01-step6-events.md`. The
Deferred-Audio (A1) actions are not yet represented in that product catalog;
when they are specified, a "candidate kept / rejected" funnel signal should be
defined there to complement this operational log.

## Root cause

New feature wiring. Closes FOLLOW_UPS #31: the "Keep the current one" action
was previously client-only, so a refresh after dismissing a candidate could
resurface it from a server-side rehydrate. The clear is now durable, and the
action is logged.

## When

Landed on `main` 2026-06-11 (branch `refactor/follow-ups-safe-batch`).

## What to watch

- **`step6_candidate_kept` volume vs `step6_variant_previewed`** — ratio of
  candidates dismissed ("keep") to candidates previewed (`variant`) is the
  Deferred-Audio "Try another → changed my mind" rate. A high keep rate means
  users re-roll text, look at it, and prefer the prior take.
- The event is idempotent at the data layer (keep on a row with no candidate is
  a no-op) but still fires on every `mode=keep` call — so a client that sends
  redundant keeps will inflate the count. Dedup on `generationId` if precision
  matters.
