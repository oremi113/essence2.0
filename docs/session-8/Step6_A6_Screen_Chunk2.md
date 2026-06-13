# Step 6 · A6 (Preview & Refine, Deferred-Audio) — Live wiring, Chunk 2

**Date:** 2026-06-11 · **Status:** built; verification notes at the bottom.

Chunk 1 built the screen + dev sandbox against a mock backend
(`Step6_A6_Screen_Chunk1.md`). Chunk 2 wires it to the proven Deferred-Audio
backend: the server route, the client fetch/nav wrapper, and the V1 client
telemetry.

## What shipped (Chunk 2)

| File | Role |
|---|---|
| `src/app/messages/new/g/[generationId]/page.tsx` | Server page — auth, `DEFERRED_AUDIO_ENABLED` gate, fetches the `pending_generations` row, derives every screen prop, renders the wrapper |
| `…/PreviewRefinePageClient.tsx` | Client wrapper — maps the 8 screen callbacks to their endpoints, normalizes response shapes, owns navigation + telemetry |
| `…/a6-prefs.ts` | Cookie-backed per-user latches (`playHintLearned`, `isFirstArrival`) — interim until a profiles column (FOLLOW_UPS #36) |
| `src/lib/messages/speech-duration.ts` | ~150 wpm duration estimate (no real duration exists anywhere — FOLLOW_UPS #37) |
| `src/lib/analytics/step6.ts` | + flow-start timestamp beside the flow_id, for `time_from_flow_start_ms` |
| `docs/analytics/2026-06-11-step6-a6-client-wiring.md` | Telemetry note — which V1 events now fire, deferred-audio caveats |

### Prop derivation (page.tsx)

- `recordingsRemaining` = `STEP6_LIMITS.maxAudioRenders − audio_render_count`;
  `rerollsRemaining` = `maxTextRerolls − text_reroll_count` (clamped ≥ 0).
- `reshapeExhausted` = `edit_note_depth ≥ maxEditNoteDepth`.
- `initialCandidateText` = `candidate_text` (the mid-candidate-refresh /
  return-from-reshape rehydrate).
- `committed.durationSec` = word-count estimate of `generated_text`.
- Guards: bad UUID / flag off / row missing → 404; already saved → Home
  (A7 pending); superseded → flow start; text/audio not `succeeded` → flow
  start (A5's territory once A5 exists).

### Response normalization (wrapper)

| Callback | Endpoint | Normalization |
|---|---|---|
| `onFreeDraft` | `POST /regenerate` `mode:variant` | `textRerollCount` → remaining; 429 → cap telemetry + non-retryable fail |
| `onCommit` | `POST /commit` | `audioRenderCount` → remaining; duration estimated from the draft text (screen adopts real duration on `loadedmetadata`); 502 → retryable fail (§5.6 beat) |
| `onKeepCurrent` | `POST /regenerate` `mode:keep` | fire-and-settle |
| `onSave` | `POST /save` | `vault_limit_reached` → Home (C3 pending), `subscription_lapsed` → `/app/vault/restore`, else retryable |
| `onDiscard` | `POST /discard` | always lets the screen exit (idempotent + 24h sweep) |
| `onRequestPlayback` | `GET /generations/:id/play` | signed URL; first success fires `preview_played` |
| `onReshape` / `onBack` | — | flow start (A4 pending — FOLLOW_UPS #38) |

### Screen fixes that became real with live audio

Chunk 1's screen treated the visual scrubber as source of truth with a mock
clip; three gaps only bite once a real `<audio>` clip exists, so they land in
this chunk (component + reducer + unit tests):

1. **Visual-clock end now pauses/rewinds the element** — previously real
   audio could keep playing past the (estimated) visual end.
2. **Commit success drops the prior take's clip and resolves a fresh URL**
   before the slide-into-playback — previously the element would have
   resumed the *old* take's audio mid-position under the new words.
3. **`loadedmetadata` adopts the real clip duration** (new `AUDIO_DURATION`
   reducer action) so the estimate self-corrects on load.

## Manual test plan (live route)

Setup: `DEFERRED_AUDIO_ENABLED=true` in `.env.local`, dev server, dev login,
seeded active `pending_generations` row (text+audio `succeeded`, fake audio
object — smoke-fixture style) for the logged-in user. Open
`/messages/new/g/<generationId>` at 390×844.

- **Arrival (first listen):** education line on first-ever visit only
  (cookie-latched); play resolves a signed URL, scrubber runs, transcript
  resolves from dim.
- **See another way:** candidate card with the server's draft text;
  re-roll budget decrements against the DB row; refresh mid-candidate
  rehydrates into candidate mode (`candidate_text`).
- **Back to the take you heard:** returns to committed; refresh does NOT
  resurface the candidate (server-side keep).
- **Hear this in your voice:** dot dims in flight → stone works → slides
  into playback with the new take (no real ElevenLabs render in dev unless
  keys are live — the route's failure beat covers the no-key case: "nothing
  was spent", dot refills, draft preserved).
- **Save:** row promoted, lands on Home (interim), `message_saved` in the
  analytics log with `saved_ordinal`/`relationship`/`category`.
- **Discard:** sheet → confirm → Home; row deleted; `message_discarded`
  with `had_played`.
- **Guards:** wrong user / random UUID → 404; flag off → 404; saved row's
  URL → Home.
- **Telemetry:** `/api/analytics` beacons for `preview_played`,
  `cost_limit_blocked` (drive a 429 by exhausting re-rolls), the save/discard
  events.

## Verification (this chunk)

- `tsc --noEmit`, `eslint`, full unit suite green (169, incl. new
  `AUDIO_DURATION` reducer cases).
- **Live browser pass (2026-06-11, 390×844, real server + DB, seeded row
  via `.tmp/seed-a6.mjs` with a real 18s silent mp3):**
  - First listen: education line + tap hint on first arrival; play resolved
    a signed URL via `/generations/:id/play` (200) and fired the
    `preview_played` beacon (204); the scrubber's 0:19 word-count estimate
    snapped to the clip's real 0:18 on `loadedmetadata`.
  - Free draft: real `/regenerate` (variant) → LLM candidate rendered in
    candidate mode; mid-candidate refresh rehydrated into candidate mode
    from `candidate_text`.
  - Keep: `/regenerate` (keep) → refresh did NOT resurface the candidate;
    education line + tap hint stayed latched (cookies).
  - Commit failure (§5.6), live: the seeded fake vendor voice made
    ElevenLabs reject → real 502 → "Your draft is safe, and nothing was
    spent", draft preserved, dots back to three; DB confirmed
    `audio_render_count: 0` after the failure.
  - Save: row promoted (`saved_message_id` set, `messages` row `saved`,
    `text_reroll_count: 2` from the two drafts), `message_saved` beacon
    delivered, landed on Home (interim A7).
  - Discard: sheet → confirm → row deleted server-side, landed on Home.
  - Guards: saved row's URL → Home; random UUID → 404; valid row with the
    flag OFF → 404.
  - Screenshots: `.tmp/a6-live-candidate.png`, `.tmp/a6-live-commit-fail.png`.
- **Not verifiable without vendor spend:** the commit *success* beat
  (slide-into-playback with a fresh clip) needs a real ElevenLabs render —
  covered in the sandbox with mocks; the real-voice render check below
  remains owed.

## Smoke pass 2 — edge states (2026-06-11, same live setup)

Scenario rows seeded per state via `.tmp/seed-a6-scenarios.mjs`; all cleaned
up after (test user back to 0 messages / 0 pending rows, sub restored,
temp user deleted).

- **Recording cap** (`audio_render_count: 3`): commit retired, "Make a
  change" gone, recordings-keyed cap note; Save + Discard intact.
- **Text-cap ladder**: at `text_reroll_count: 9` the change sheet shows
  "One more after this."; spending the 10th (live LLM) lands a candidate
  whose footer swaps "See another way" for the text-cap note; at 10 the
  change sheet folds the re-roll card entirely. Direct `POST /regenerate`
  at cap → real `429 { code: cost_limit_blocked, limit_kind:
  text_reroll_cap }` (the exact shape the wrapper's telemetry branch
  parses — unreachable from clean UI because the screen guards first).
- **Reshape exhausted** (`edit_note_depth: 2`): "What it says" folded out,
  replaced by the depth note.
- **Audio-load failure + recovery**: missing storage object → play → real
  500 from `/play` → "Couldn't load it." → object healed → Try again →
  playback, real duration adopted (0:11 estimate → 0:18 clip).
- **Save keeps the heard take (decision #3)**: row seeded with a planted
  `candidate_text` → rehydrated into candidate mode → Back to the take you
  heard → Save → DB `body_text` = the committed take; the draft never
  leaked.
- **Vault limit**: 3 saved messages → Save → real 403 → Home (interim C3),
  `message_save_failed` ledger row with `failure_phase: quota_check`,
  pending row left unsaved.
- **Lapsed subscription**: sub flipped to `lapsed` → Save → routed to
  `/app/vault/restore` ("Your vault is paused.").
- **Cross-user guard**: another user's active row → 404.
- **Ledger payloads** (`usage_events`) verified for pass 1's events:
  `preview_played` (with `time_from_a6_arrival_ms`), `message_saved`
  (`saved_ordinal: 1`, `relationship: daughter`, `had_note: true`),
  `message_discarded` (`had_played: false` — that row was never played).
  `flow_id: null` on deep-link arrivals, as documented.

**Found during cleanup — FOLLOW_UPS #39:** the saved-message immutability
trigger still references the dropped `kind` column, so every UPDATE to a
saved `messages` row (including the `source_generation_id` SET NULL cascade
from pending-row cleanup) raises `record "new" has no field "kind"`.
Corrective migration written
(`supabase/migrations/20260611233000_fix_messages_immutability_trigger.sql`)
and applied in the bundle pass below.

## Bundle pass — 2026-06-11 Dashboard bundle + #36/#37 wiring (2026-06-12)

Three migrations applied directly to the remote (per #30's bundle path, via
a one-off `pg` connection — same effect as the Dashboard SQL Editor), with
full-timestamp history rows recorded, mirroring the 2026-06-10 bundle:

1. `20260611233000` — **immutability trigger fix** (#39). Probed live
   post-apply: mutable updates on saved rows pass, immutable mutations raise
   the intended error, the promoted-pending-row delete cascade works.
2. `20260611234000` — **`profiles.ui_flags jsonb`** (#36). A6 page now reads
   the latches from the profile; a page-owned server action
   (`markA6UiFlag`, allowlisted keys) persists them; the interim cookies and
   `a6-prefs.ts` are gone. Verified live: education line + hint render from
   profile state (stale cookies in the browser are ignored), both flags
   latch server-side after mount + first play, reload suppresses both.
3. `20260611235000` — **`pending_generations.audio_duration_ms`** (#37).
   ElevenLabs returns CBR mp3, so `src/lib/audio/mp3-duration.ts` derives
   duration from byte length (unit-tested); `generateAndStoreAudio` and
   `/commit` store it, `/commit` returns `audioDurationMs` (wrapper prefers
   it), `/save` copies it onto `messages.audio_duration_ms`. Verified live:
   scrubber paints the stored 0:18 immediately (no estimate flash), saved
   message carries `audio_duration_ms: 18000`. The wpm estimate survives
   only as the pre-migration-row fallback; `loadedmetadata` adoption stays.

Generated DB types refreshed (`supabase gen types`). The commit-success
measurement (real TTS bytes → duration) remains exercised only by unit math
until the owed real-voice render check — the response/storage plumbing
around it is typed end-to-end.

## Deferred

- FOLLOW_UPS #36 (cookie latches → profiles column), #37 (measured audio
  duration), #38 (A7 / C3 / reshape-to-A4 exit paths).
- Manual real-voice `/commit` render check still owed (needs a cloned voice
  + live ElevenLabs key) — unchanged from the status doc.
