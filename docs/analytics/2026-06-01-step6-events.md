---
title: Step 6 message creation — event catalog
date: 2026-06-01
event: multiple
type: new-event
impact: Introduces 15 telemetry events instrumenting the Step 6 message creation flow. Events 1–8 ship with V1 (reliability, spine funnel, abuse signals); events 9–15 ship in Phase 1.1 (intermediate funnel depth).
---

## What changed

Defines the full event catalog for the Step 6 message creation flow before any production code lands. Authoritative source for event names, trigger points, and property schemas. The flow contract these events instrument lives in `docs/session-8/Step6_OpenContracts.md`.

Naming convention: `step6.<noun>_<verb>`, snake_case props. No PII or content (no note text, no audio, no recipient name) is logged — only identifiers and behavioral facts. Schema versioned via the `schema_version` global prop; bump and document in a new analytics note on any breaking change.

## Root cause

New feature instrumentation. Not a change to existing tracking. Events are being defined during design, per CLAUDE.md ("telemetry decisions are cheap during design, expensive after ship"), so that V1 ships with a complete reliability story and Phase 1.1 has the funnel surface area ready when it ships.

## When

| Phase | Events | Trigger to ship |
|---|---|---|
| V1 (MVP) | 1–8 (reliability + spine funnel + abuse signals) | Lands with first production message-creation flow on `main` |
| Phase 1.1 | 9–15 (intermediate funnel) | Lands after V1 stable, before any conversion-optimization work |

Dates TBD — backfill this section when each phase ships.

---

## Global props (on every Step 6 event)

These appear on every event in this catalog. Per-event tables below list only the event-specific props.

| Prop | Type | Notes |
|---|---|---|
| `user_id` | uuid | Authenticated user ID (Supabase `auth.users.id`) |
| `session_id` | uuid \| string | Anonymous session/app-session ID |
| `flow_id` | uuid | Minted on `flow_started`; carried across every event in one message-creation attempt — including across edit-note generation changes. See ID semantics below. |
| `app_env` | enum: `development` \| `preview` \| `production` | Prevents test traffic from polluting prod metrics |
| `app_version` | string | Build/release identifier |
| `platform` | enum: `web` \| `ios` \| `android` | Day-one cut; mobile vs desktop completion will diverge sharply on a 45–70 audience |
| `device_type` | enum: `mobile` \| `tablet` \| `desktop` | Same reasoning as `platform` |
| `schema_version` | int | Starts at `1`. Bump on any breaking change to event names, prop names, or enum values. |
| `timestamp` | iso8601 | Event time, server-corrected |

## ID semantics

| ID | Lifecycle |
|---|---|
| `flow_id` | Minted client-side at `flow_started`. Stable across A2 → A7. Does **not** re-fire on resume within `pending_generations` TTL (24h). On TTL expiry or context loss (cleared storage, different device with no recoverable flow_id), a new `flow_id` is minted and treated as a new flow. |
| `generation_id` | Server-issued on `POST /api/messages/generate`. Identifies one lineage member. |
| `regenerate_count` (within `generation_id`) | Increments on user-Regenerate (`mode: 'variant'`). Capped at `MAX_REGENERATES = 3`. Unchanged by system retry-audio. |
| `parent_generation_id` | Set on edit-note children; null on initial generations and regenerates. Use this to reconstruct an edit-note lineage in V1 before event #13 (`edit_note_taken`) ships in Phase 1.1. |
| `edit_note_depth` (lineage-level) | Increments on each edit-note. Capped at `MAX_EDIT_NOTE_DEPTH = 2`. |
| `message_id` | Server-issued on first successful `/save`. Permanent, immutable. |

---

## Event catalog — V1 (must-ship)

### 1. `step6.flow_started`
**Fires:** On arrival at A2 (Recipient Setup), after the server-side cap check has passed. Does **not** re-fire on resume of a still-active `pending_generations` row — `flow_id` carries the continuity.
**Props:**

| Prop | Type | Notes |
|---|---|---|
| `entry_surface` | enum: `home_b` \| `shelf_empty` \| `create_another` | Where the user clicked in from |
| `saved_count_before` | int (0–2) | Saved messages this user already has |

**Notes:** Capped users (`saved_count_before == 3`) never reach A2 — they get C3 instead, which fires event #14. So this event implies the flow actually opened.

---

### 2. `step6.generation_succeeded`
**Fires:** When A5 transitions to A6 — both text and audio are ready.
**Props:**

| Prop | Type | Notes |
|---|---|---|
| `generation_id` | uuid | Joins this event to the `pending_generations` row |
| `voice_profile_id` | uuid | Which preserved voice was used |
| `parent_generation_id` | uuid \| null | Set on edit-note children; null otherwise. Enables lineage reconstruction in V1. |
| `generation_source` | enum: `initial` \| `regenerate` \| `edit_note` \| `retry_audio` | Why this generation occurred — explicit instead of inferred from counts |
| `template_variant` | string | e.g. `birthday.v2` |
| `regenerate_count` | int (0–3) | 0 on first success, increments on user-Regenerate |
| `edit_note_depth` | int (0–2) | Position in any edit-note lineage |
| `text_duration_ms` | int | Wall-clock for the text-gen call |
| `audio_duration_ms` | int | Wall-clock for the audio-gen call |
| `text_retry_count` | int | System retries before text success (0 = clean first attempt) |
| `audio_retry_count` | int | System retries before audio success |

---

### 3. `step6.generation_failed`
**Fires:** When A5 surfaces a failure to the user (after any system retries are exhausted).
**Props:**

| Prop | Type | Notes |
|---|---|---|
| `generation_id` | uuid | |
| `voice_profile_id` | uuid | |
| `generation_source` | enum: `initial` \| `regenerate` \| `edit_note` \| `retry_audio` | Which kind of generation was attempting |
| `failure_phase` | enum: `text` \| `audio` | Which service failed |
| `error_code` | string | Stable code from the failing service (e.g. `elevenlabs_5xx`, `claude_timeout`) |
| `duration_ms` | int | Wall-clock from `/generate` call start to failure surfaced. Slow failures are worse than fast ones — log them differently. |
| `text_retry_count` | int | Final text retry count when failed |
| `audio_retry_count` | int | Final audio retry count when failed |

---

### 4. `step6.message_saved`
**Fires:** When `/save` returns success and the user lands on A7. Idempotent — a replay of `/save` does **not** re-fire this event (use `generation_id` for dedup).
**Props:**

| Prop | Type | Notes |
|---|---|---|
| `message_id` | uuid | Permanent ID of the new `messages` row |
| `voice_profile_id` | uuid | |
| `category` | enum (from `message_category`) | **Denormalized onto save** so V1 can answer "which categories are people actually saving?" without waiting for event #10 |
| `relationship` | enum | Recipient relationship category — **denormalized** for the same reason. Recipient name is **not** logged. |
| `regenerate_count` | int (0–3) | Final count at save |
| `edit_note_depth` | int (0–2) | Final depth at save |
| `had_note` | bool | Whether the user provided a personal note (any depth in the lineage) |
| `saved_ordinal` | int (1–3) | Which of the user's three lifetime saves this is |
| `time_from_flow_start_ms` | int | Wall-clock from `flow_started` to save |

---

### 5. `step6.message_save_failed`
**Fires:** When `/save` returns a non-retryable error.
**Props:**

| Prop | Type | Notes |
|---|---|---|
| `generation_id` | uuid | |
| `voice_profile_id` | uuid | |
| `failure_phase` | enum: `audio_copy` \| `db_insert` \| `quota_check` \| `unknown` | Where in the save sequence it broke |
| `error_code` | string | Service-specific code, complements `failure_phase` |

**Notes:** `failure_phase: quota_check` is the race case — A2 entry let them in (count was 2), but a concurrent flow saved first. Client routes to C3 and event #14 also fires with `surfaced_from: save_race`.

---

### 6. `step6.message_discarded`
**Fires:** When user confirms the A6.d discard modal.
**Props:**

| Prop | Type | Notes |
|---|---|---|
| `generation_id` | uuid | |
| `voice_profile_id` | uuid | |
| `had_played` | bool | Did the user actually listen to the preview before discarding? |

**Notes:** `discard_reason` not collected — the A6.d modal is a single-button soft confirmation in V1. Add the prop only if/when the modal grows a reason picker.

---

### 7. `step6.preview_played`
**Fires:** First time the user starts playback on A6 for a given `generation_id`. Subsequent plays of the same generation do not re-fire.
**Props:**

| Prop | Type | Notes |
|---|---|---|
| `generation_id` | uuid | |
| `voice_profile_id` | uuid | |
| `regenerate_count` | int (0–3) | Current count when the play happened |
| `edit_note_depth` | int (0–2) | Current depth |
| `time_from_a6_arrival_ms` | int | Latency from A6 mount to first play. Captures both "audio autoplayed instantly" (close to 0) and "user had to tap to start" (browser-blocked autoplay) — operationally indistinguishable from the user, but the timing reveals which. |

**Notes:** This is V1 because "did users actually listen to the message in their own voice?" is the single most important emotional-payoff question the product needs to answer. Without it, the only signal is `message_discarded.had_played`, which only fires on explicit discards.

---

### 8. `step6.cost_limit_blocked`
**Fires:** Whenever `/generate` or `/regenerate` returns 429.
**Props:**

| Prop | Type | Notes |
|---|---|---|
| `limit_kind` | enum: `regenerate_cap` \| `edit_note_depth` \| `pending_max` \| `hourly_max` | Which guardrail tripped |

**Notes:** V1 because launching publicly with real per-generation cost on ElevenLabs + Claude and zero telemetry on limit-hits is a real cost/abuse exposure. Default limits are loose; any non-trivial rate of `cost_limit_blocked` in V1 means either an abuse vector or a client bug spinning generations.

---

## Event catalog — Phase 1.1 (intermediate funnel)

### 9. `step6.recipient_selected`
**Fires:** A2 submit. **Props:** `recipient_id` (uuid), `relationship` (enum), `is_new_recipient` (bool — true if A2 created a `pending_recipient_*` set rather than reusing an existing recipient).

### 10. `step6.category_selected`
**Fires:** A3 submit. **Props:** `category` (enum from `message_category`), `message_ordinal` (1/2/3 — the *intended* save slot, not yet committed).

### 11. `step6.note_submitted`
**Fires:** A4 submit (both Continue and Skip). **Props:** `had_note` (bool), `note_char_count` (int, present only if `had_note`), `is_edit_note_path` (bool — true if `fromGenerationId` was set).

### 12. `step6.message_regenerated`
**Fires:** A6 user-Regenerate succeeds (the new generation lands). **Props:** `generation_id` (uuid — the *same* id, since regenerate stays within a generation), `voice_profile_id` (uuid), `regenerate_count_after` (int 1–3), `variant_changed_from` (string), `variant_changed_to` (string).

### 13. `step6.edit_note_taken`
**Fires:** When the new generation triggered by edit-note succeeds. (Not when the user taps "Reshape your note" — wait for the new gen to land so failed edit-notes don't pollute the count.) **Props:** `from_generation_id` (uuid — prior gen), `new_generation_id` (uuid), `voice_profile_id` (uuid), `edit_note_depth_after` (int 1–2).

### 14. `step6.vault_limit_blocked`
**Fires:** Whenever C3 is shown. **Props:** `surfaced_from` (enum: `a2_entry` \| `save_race`).

### 15. `step6.waitlist_joined`
**Fires:** C2 submit success. **Props:** `surfaced_from` (enum: `c1` \| `c2_direct` \| `c3`), `features_selected` (array of strings — multi-select on C2; empty array allowed).

---

## Funnel definition (V1)

The MVP spine funnel uses events 1, 2, 7, 4 and the failure outflows 3, 5, 6:

```
flow_started
  → generation_succeeded         (drop = generation_failed)
    → preview_played             (drop = generated but never listened = "silent ghost")
      → message_saved            (drop = message_save_failed | message_discarded)
```

`preview_played` is the new V1 intermediate step — it isolates the "user reached the emotional payoff" moment from "user committed to saving," which are different decisions.

Survival = `count(message_saved) / count(flow_started)` per cohort.

## V1 blind spots — known and accepted

V1 can see when a flow **started** and when it **saved**, plus the in-between signals (`generation_succeeded`, `preview_played`, explicit discard, explicit save failure). But the intermediate-screen events (`recipient_selected`, `category_selected`, `note_submitted`) ship in Phase 1.1, so V1 cannot tell you **where** a user dropped between A2 and A5.

Concretely, V1 can detect:
- Flows that never reach generation (drop at A2/A3/A4 — but not which one).
- Flows that generated but were never listened to (a "silent ghost," via no `preview_played` after `generation_succeeded`).
- Flows that listened and then bailed without explicit discard (via no `message_saved` / `message_discarded` / `message_save_failed` after `preview_played`).

What V1 **cannot** tell you:
- Whether A3 (category choice) or A4 (note) is where the upstream drop concentrates.
- Why users abandon silently after generation (no `flow_abandoned` event in V1 — would require server-side emission from the expiry cleanup job).

If V1 survival looks low, the response order is: (1) ship `recipient_selected` / `category_selected` / `note_submitted` early from Phase 1.1 to locate the drop, (2) consider adding `flow_abandoned` with `last_screen` as a cheap minimal hedge.

## What to watch

- **`saved_ordinal` × `category` × `relationship` cross-tab** on `message_saved` — the single most important V1 read. Tells you what people use the product *for*, on top of who it's for. This is the positioning answer the product needs from launch.
- **`preview_played` → `message_saved` ratio** — of the people who listened, how many kept it? Strong signal on whether the generated message actually felt good in their voice.
- **`generation_failed.failure_phase` split** — text failures point at Claude/prompt issues; audio failures at ElevenLabs/voice issues. Different on-call paths.
- **`generation_succeeded` with non-zero retry counts** — a "success" that took 2 retries and 30 seconds is still a reliability warning, even if the user got their message.
- **`message_discarded.had_played == false`** means users bailed without listening. Likely a tonal or wait-time problem on A5/A6.
- **`vault_limit_blocked.surfaced_from == save_race`** should be near-zero in practice (requires concurrent flows). A non-trivial rate means client state is leaking across tabs or the A2 gate is broken.
- **`cost_limit_blocked` of any `limit_kind`** is a red flag in V1 — defaults are loose enough that real users shouldn't hit them. Triage by `limit_kind` to find the abuse vector or the bug.

### Benchmarks (calibration-pending)

Treat any survival or success threshold as **calibration-pending until two weeks of real cohorts**. Pre-launch numbers (mine or anyone else's) anchor too hard if quoted in a meeting later. The right shape is:

- Instrument and ship.
- Watch the first two weeks of cohort data.
- Set thresholds based on what real users do — not what we hoped they would.

Sub-baseline survival or a spike in any failure event should still trigger review at any time, but "what's healthy" gets set with data, not assumed.

## What is NOT logged

By design, to keep telemetry behavior-only and protect emotional content:

- The user's note text. Only `note_char_count` and `had_note`.
- The generated message text. Only `template_variant` and `generation_id` (joinable to the server log per MASTER_SPEC 8.7.5 if needed for incident triage).
- Audio content or URLs.
- The recipient's name. Only `recipient_id` (uuid) and `relationship` (category).

## Privacy-safe quality proxies

Because generated text and audio are not logged in analytics, V1 uses behavioral proxies to read quality:
- User played preview (`preview_played`)
- User regenerated (inferred from `generation_succeeded` with `generation_source: regenerate`, surfaced explicitly via #12 in Phase 1.1)
- User edited note (inferred from `generation_source: edit_note`, explicitly via #13 in Phase 1.1)
- User discarded (`message_discarded`)
- User saved (`message_saved`)

These are sufficient for V1. The pressure to "log generated text to evaluate quality" will surface eventually — resist it. The behavioral proxies are the right tool, and the product's whole pitch is that the content stays with the user.

## Telemetry guardrails

Do not use Step 6 telemetry to:
- Infer recipient identity from relationship alone.
- Inspect or score emotional content.
- Rank or score user grief, attachment, or emotional state.
- Trigger upsells or manipulative messaging during the same message-creation session.

These are product-discipline rules, not legal exhaustive ones. They fit ESSENCE's trust-heavy positioning and should be reread before any feature that proposes to act on Step 6 event data.
