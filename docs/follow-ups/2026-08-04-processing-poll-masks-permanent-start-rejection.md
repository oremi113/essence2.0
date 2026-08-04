---
id: 2026-08-04-processing-poll-masks-permanent-start-rejection
priority: P3
status: open
opened: 2026-08-04
resolved:
owner_paired: false
summary: The post-payment Processing screen shows fake "we're creating your voice" progress for the full timeout when `/start` rejects permanently (not-enough-clips, daily cap, retry-not-allowed) — its response is thrown away, so an instantly-known error degrades only to the generic support tail *(triage 2026-08-04)*
---

# Processing poll can't tell "no attempt is running" from "still processing" → paid user watches a fake wait

*(triage 2026-08-04 — spine integration read; landmine for the S5 real-Stripe go-live)*

`src/app/app/voice/processing/ProcessingActions.tsx:48-52` (fire-and-forget `/start`), `:27-32`
(`mapGeneration`), `:55-97` (poll).

The client triggers voice creation with `fetch('/api/voice-profiles/${id}/start', {method:'POST'}).catch(() => {})`
— **its response is never read.** When `/start` rejects *permanently* the row is left in a
pre-render state and the poll paints a fake wait:

- **Not enough clips / too short** → `start/route.ts` flips `created`→`collecting` (`:131-146`)
  *before* the clip check (`:155`), then returns **400** leaving the row at `collecting`.
- **Daily voice-creation cap** → `assertCanStartVoiceCreation` throws (`:50`) before any status change
  → row stays `created`/`collecting`, request 500s.
- **Failed + retry-not-allowed** → **429**, row stays `failed`.

`mapGeneration` maps `created` / `collecting` / `queued` all to `'processing'` (`:27-31`), so on the
400/500 cases the surface shows "we're creating your voice…" for the **entire `GIVE_UP_MS` window**
and then degrades only to the generic `'unrecoverable'` SLA-support tail — it never surfaces the
actual cause, which was determinable in the first second.

**Why it matters:** this is a post-payment beat (creation now runs only *after* payment). A user who
has just paid can sit watching a fake progress screen for the whole timeout for an error we knew
immediately. Not live to real users yet (real Stripe path is dormant — flags OFF, §84 / S5), and it
degrades rather than dead-ends, so it's a latent landmine rather than a today-bug — but the worst
place to strand a user is right after they pay.

**Related (same file family, fold into the fix):** the First-Breath guard
`src/app/app/record/complete/page.tsx:32-37` enumerate-and-**admits** in-progress statuses
(`collecting`/`queued`/`processing`) into the "your voice is ready" ceremony, only bouncing
`created`/`failed`/`archived`. On the forward spine path the voice is always `ready` by then, but a
non-forward entry (browser Back, or a deep-link to `/app/vault/reveal` — which gates on subscription
only, never on voice status — then Continue) can run the completion ceremony over a voice that isn't
ready. Prefer a positive gate (`if (status !== 'ready') redirect(...)`).

**Fix shape:** read the `/start` response; on a non-retryable rejection
(`INSUFFICIENT_CLIPS`, `CLIPS_TOO_SHORT`, cap 500, `retry_available: false`) short-circuit the poll
into an explicit error/support state instead of `'processing'`, and/or have `mapGeneration`
distinguish "no attempt is actually running" (pre-render statuses) from a genuine in-flight
`processing`. Separately, positive-gate the First-Breath page on `status === 'ready'`.

**Pick up when:** before the S5 real-Stripe go-live (gate the flag flip on this, alongside §84), or
the next voice-creation-pipeline touch.
