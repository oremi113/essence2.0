# Step 6 — Open Contracts

**Purpose:** Lock the five technical decisions that span multiple Step 6 screens and can't be cheaply unstuck later. Everything else is already locked in MASTER_SPEC Chapter 8, DECISIONS.md, or API_CONTRACTS.md — do not duplicate it here.

**Status:** Revised draft (round 2). Each section ends with a **DECISION** line that becomes binding once the user signs off.

**Relationship to other docs:**
- Inventory (`prototypes/message creation/ESSENCE_Step6_Message_Creation_Screen_Inventory.md`) — the *what* (screens).
- MASTER_SPEC Ch. 8 — the *generation contract* (templates, hybrid LLM, regenerate semantics, logging).
- System States doc (Step 8 prototype, referenced in MASTER_SPEC V1.6) — owns *UI presentation* of loading, delayed, partial, and error states.
- This doc — the *flow contract* (backend lifecycle, retries, save, tier and cost enforcement, telemetry). Supersedes the never-written `ESSENCE_Step5_Architecture_LOCKED.md` originally referenced by the inventory.

**Boundary statement:** This doc owns backend truth — generation lifecycle, pending state, retry semantics, save semantics, tier and cost enforcement, telemetry contracts. It does **not** own loading/delayed/error UI copy or presentation; those belong to the System States doc.

---

## Q1. In-flight flow state — where does it live between A2 and A7?

**Constraints in play:**
- Messages are immutable (DECISIONS.md). A draft `messages` row contradicts that.
- Audio is "ready on Preview arrival" (MASTER_SPEC 8.7.2) — must be generated and reachable before the user clicks Save.
- Audio is never stored in DB (DECISIONS.md) — storage paths only.
- Server-authoritative (DECISIONS.md).
- Personal note may carry emotionally sensitive content — must not leak via URL history, screenshots, or logs.

**Proposal: server-owned `pending_generations` row holds all in-flight state. URL exposes nothing but `generationId` (after generation begins). Recipients do not become permanent until Save.**

| State | Lives where | Lifetime |
|---|---|---|
| **Pre-generation** form state (recipient choice, category, draft note) | Client React state only | Until A4 submit |
| `generationId` | URL param on A5/A6 | Until flow exits |
| All generation inputs and outputs (recipient_id OR pending recipient name+rel, category, note, generated_text, template_variant) | `pending_generations` row | Until Save (then promoted) or expiry |
| `regenerate_count`, `edit_note_depth`, status flags | `pending_generations` row | Same |
| Generated audio | Supabase Storage at `messages/{userId}/pending/{generationId}.mp3` | Until Save (then copied to permanent path) or 24h TTL |
| Saved message | `messages` row + audio at `messages/{userId}/{messageId}.mp3` | Permanent |

**Recipient handling:**
- *Existing recipient selected at A2* → store `recipient_id` in `pending_generations`. No new row.
- *New recipient typed at A2* → store `pending_recipient_name` + `pending_recipient_relationship` in `pending_generations`. **Do not** create a `recipients` row yet.
- *On Save* → if `pending_recipient_name` present, create or look up `recipients` row, then create `messages` row pointing at it.

This avoids the "abandoned Sarah" problem where every aborted flow leaves a permanent contact in Settings.

**`pending_generations` schema (V1):**

```sql
create table public.pending_generations (
  generation_id        uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  voice_profile_id     uuid not null references public.voice_profiles(id) on delete cascade,

  -- Recipient (one of these branches is populated)
  recipient_id                  uuid references public.recipients(id) on delete set null,
  pending_recipient_name        text,
  pending_recipient_relationship text,

  -- Content
  category             public.message_category not null,
  note                 text,                       -- nullable; ≤ 200 chars
  template_variant     text not null,              -- e.g. "birthday.v2"
  generated_text       text,                       -- nullable until text gen succeeds
  audio_path           text,                       -- nullable until audio gen succeeds

  -- Lifecycle
  text_status          text not null default 'pending', -- 'pending' | 'succeeded' | 'failed'
  audio_status         text not null default 'pending', -- 'pending' | 'succeeded' | 'failed'
  regenerate_count     int  not null default 0,    -- capped at MAX_REGENERATES (3)
  edit_note_depth      int  not null default 0,    -- capped at MAX_EDIT_NOTE_DEPTH (2)
  source_generation_id uuid references public.pending_generations(generation_id),
  superseded_at        timestamptz,                -- set when this lineage member is replaced
  saved_message_id     uuid references public.messages(id), -- set when promoted to a message

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  expires_at           timestamptz not null default (now() + interval '24 hours')
);

create index idx_pending_generations_user_active
  on public.pending_generations (user_id)
  where saved_message_id is null and superseded_at is null;

create index idx_pending_generations_expires_at
  on public.pending_generations (expires_at)
  where saved_message_id is null;
```

Cleanup is a periodic job post-MVP; manual prune in V1.

**DECISION:** Recipients are not promoted to `recipients` rows until Save. Message is ephemeral until Save. URL exposes only `generationId` after A4 submit; note text never appears in URL params. `pending_generations` table holds in-flight state with the schema above.

---

## Q2. Failure-retry boundary inside generation

**Constraint:** Text and audio are two swappable services (MASTER_SPEC 8.7.4). Full inputs/outputs are logged (8.7.5).

**Proposal: per-service retry semantics. System retries reuse what succeeded; user-initiated regenerate re-rolls content per MASTER_SPEC 8.7.3.**

Three cases on A5:

| Failure mode | Retry behavior | regenerate_count |
|---|---|---|
| Text gen failed | Retry both (no text to reuse). Same template variant. | unchanged |
| Audio gen failed, text succeeded | Retry audio only. Cached text, same `generation_id`. | unchanged |
| User taps Regenerate on A6 | Pick a *different* template variant, re-run LLM, re-run audio. | `++` (capped at 3) |

**Why this shape:**
- Protects the first-listen moment: a user who waited through "Shaping your message" shouldn't see new text appear because audio glitched.
- Keeps `regenerate_count` semantically clean: it counts *user decisions to re-roll content*, not infra retries.

**API shape:**

```
POST /api/messages/generate     # fresh generation (from A4 → A5 path)
POST /api/messages/regenerate   # re-roll within a generation_id
POST /api/messages/save         # promote pending → messages
```

System retry-after-audio-failure is handled by `POST /api/messages/regenerate` with `mode: 'retry_audio'`. Reasoning: a separate `/retry-audio` route is cleaner conceptually but adds MVP surface area (auth, validation, tests, telemetry plumbing × another route). Start as a mode flag on `/regenerate`; split into its own route only if the handler logic gets tangled.

```
POST /api/messages/regenerate
{
  "generationId": "...",
  "mode": "variant" | "retry_audio"   // default "variant"
}
```

`mode: 'variant'` is the user-Regenerate path (increments `regenerate_count`, picks new variant). `mode: 'retry_audio'` is the system-retry path (no count change, reuses cached text).

**DECISION:** Per-service retry. Implement retry-audio as `mode: 'retry_audio'` on `/regenerate`. Promote to its own route only if implementation grows messy.

---

## Q3. Edit-note mechanics across the wire

**Inventory rule:** A6 → A4 via "Reshape your note" routes back with note pre-filled. Counts as a *fresh generation*, not a regeneration. `regenerate_count` does not increment.

**Proposal: edit-note creates a new `pending_generations` row linked via `source_generation_id`. Prior generation is preserved until the new one succeeds.**

Sequence:
1. User on A6 taps "Reshape your note" → client routes to A4 with `?generationId=<prior>` in URL. Note text is fetched from the server, not carried in the URL.
2. User edits note, submits A4 → client calls `POST /api/messages/generate` with `fromGenerationId: <prior>`.
3. Server:
   - Issues a **new** `generation_id` (clean `regenerate_count` = 0).
   - Sets `source_generation_id = <prior>` and `edit_note_depth = prior.edit_note_depth + 1`.
   - **Picks the same template variant as the prior generation** (user changed *content*, not *style*). If the user re-enters A3 and picks a different category, treat as a fresh cold-start (no `fromGenerationId`).
   - Runs LLM with new note, runs audio generation.
   - **Does not delete or supersede the prior row yet.**
4. On A5 success: server marks the prior row `superseded_at = now()`. The new row is the active one.
5. On A5 failure: client offers retry; the prior preview remains intact and reachable. (The system states UI may surface a "Restore previous" affordance — that's a UI question, not a contract question.)
6. Cleanup: `superseded_at` rows are deleted by expiry job, same path as abandoned rows.

**Why preserve the prior:** if the new generation fails, the user keeps the listenable preview they already had. Otherwise an audio failure on a refined attempt = total loss, which violates the "interrupted states prefer resumption" principle from the System States doc.

**Template variant on edit-note:** same variant when only the note changes (the V1 flow's only edit-note entry point). If a future change allows back-nav to A3 mid-flow with a category swap, treat as cold-start, not edit-note.

**Lineage cap:** see Q4 — `edit_note_depth` is capped to prevent edit-note loops from bypassing the regenerate cap.

**DECISION:** Single `/generate` endpoint with optional `fromGenerationId`. Same variant on edit-note. Prior generation marked `superseded_at` only after replacement succeeds — never deleted preemptively.

---

## Q4. Tier and cost enforcement

**Constraint:** Server enforces plan limits (API_CONTRACTS.md). Vault tier = 3 lifetime messages (MASTER_SPEC 9.4). Lapsed tier blocks creation. MVP must not be a cost loophole — ElevenLabs at ~$0.15 per gen, multiplied by abuse paths, hurts.

**Proposal: two enforcement axes — plan quota at A2/Save, cost controls at `/generate` and `/regenerate`.**

### Plan quota (saved-message cap)

| Checkpoint | Purpose | Behavior on fail |
|---|---|---|
| A2 entry (page.tsx server-side check) | UX gate — don't let a capped user start the flow | Route to C3 (Vault Limit Reached) |
| `POST /api/messages/save` | Security gate — race-safe enforcement | 403 `{ code: 'vault_limit_reached' }`; client routes to C3 |
| Lapsed-subscription check (same two surfaces) | Block when payment lapsed | Route to the existing payment-lapsed treatment |

Generation is **not** gated by saved-message quota. A user with 2/3 saved can complete a flow; the race at save resolves first-write-wins.

### Cost controls (apply to `/generate` and `/regenerate`)

Three caps, server-enforced, configurable via env:

1. **Per-generation regenerate cap:** `regenerate_count ≤ MAX_REGENERATES` (default 3). Already locked by MASTER_SPEC 8.7.2.
2. **Per-lineage edit-note cap:** `edit_note_depth ≤ MAX_EDIT_NOTE_DEPTH` (default 2). Without this, edit-note resets `regenerate_count` to 0 and a user could loop indefinitely. Worst case per flow with cap: `(3 + 1) × (2 + 1) = 12` audio gens ≈ $1.80 against $12.99 Vault revenue. Regenerate (3 per gen) covers "this output is wrong"; edit-note covers "my input was wrong" — a less common need, so 2 refinements is generous.
3. **Per-user rate limits:** `MAX_ACTIVE_PENDING_PER_USER` (default 1 — one in-flight flow at a time) and `MAX_GENERATIONS_PER_USER_PER_HOUR` (default 20). Exceeding either returns 429 with calm copy.

**Why the lineage cap matters:** my earlier draft had a hole. Edit-note resetting `regenerate_count` to 0 means a determined or buggy client can burn through ElevenLabs spend without ever consuming a saved-message slot. The `edit_note_depth` ceiling closes that.

**DECISION:** Plan quota enforced at A2 entry (UX) and `/save` (security). `/generate` and `/regenerate` enforce three cost controls: per-generation regen cap (3), per-lineage edit-note depth cap (2), per-user pending and hourly rate limits.

---

## Q5. Save semantics — idempotency and audio promotion

**Constraint:** Mobile networks retry. Double-taps happen. A saved message is immutable; creating two from one user intent is a real bug.

**Proposal: `/save` is idempotent by `generation_id`. Audio promotion is copy-then-create-row-then-delete, not move.**

### Idempotency

- `messages.source_generation_id uuid unique` — new column, with a unique constraint.
- `POST /api/messages/save { generationId }` — if a `messages` row already exists with that `source_generation_id`, return it. Do not insert again, do not re-copy audio.
- `pending_generations.saved_message_id` is set on first successful save and short-circuits subsequent calls.

### Audio promotion sequence

```
1. Copy pending audio
   FROM messages/{userId}/pending/{generationId}.mp3
   TO   messages/{userId}/{newMessageId}.mp3

2. Insert messages row with audio_path = permanent path,
   source_generation_id = generationId.

3. Update pending_generations: saved_message_id = newMessageId.

4. Delete pending storage object.
   (Failure here is non-fatal — orphan storage is cheaper than missing audio.)

5. Cleanup: pending_generations row deleted by expiry job.
```

The order is deliberate: if step 1 fails, no row exists yet (state is recoverable). If step 2 fails, pending audio is still intact (state is recoverable). The only way to "lose" data is if step 1 corrupts the copy *and* step 4 runs early — which the order prevents.

**Discard sequence:**
```
1. Delete pending storage object (best effort).
2. Delete pending_generations row.
```

Discard does not require idempotency — replays are harmless.

**DECISION:** `/save` is idempotent by `generation_id` (unique constraint on `messages.source_generation_id`). Audio promotion follows copy → insert row → mark pending → delete pending object. Discard is delete-object then delete-row.

---

## Q6. Step 6 telemetry events

Enumerated here per CLAUDE.md ("decide during design, not after ship"). Each event becomes a row in `docs/analytics/<date>-step6-events.md` once locked.

Naming convention: `step6.<noun>_<verb>`. Snake_case props.

**MVP must-ship (reliability + spine funnel):**

| # | Event | Fires on | Props |
|---|---|---|---|
| 1 | `step6.flow_started` | A2 entry | `entry_surface` (home_b \| shelf_empty \| create_another), `saved_count_before` (0/1/2) |
| 2 | `step6.generation_succeeded` | A5 success | `generation_id`, `duration_ms`, `template_variant`, `regenerate_count`, `edit_note_depth` |
| 3 | `step6.generation_failed` | A5 failure | `generation_id`, `failure_phase` (text \| audio), `error_code`, `retry_attempt` |
| 4 | `step6.message_saved` | A7 | `message_id`, `regenerate_count`, `edit_note_depth`, `had_note`, `saved_ordinal` (1/2/3), `time_from_flow_start_ms` |
| 5 | `step6.message_save_failed` | A7 save error | `generation_id`, `error_code` |
| 6 | `step6.message_discarded` | A6.d confirm | `generation_id`, `had_played` (bool) |

**Phase 1.1 (deeper funnel, ship after spine is live):**

| # | Event | Fires on | Props |
|---|---|---|---|
| 7 | `step6.recipient_selected` | A2 submit | `recipient_id`, `relationship`, `is_new_recipient` |
| 8 | `step6.category_selected` | A3 submit | `category`, `message_ordinal` (1/2/3) |
| 9 | `step6.note_submitted` | A4 submit | `had_note` (bool), `note_char_count` (if had), `is_edit_note_path` (bool) |
| 10 | `step6.message_regenerated` | A6 user-Regenerate | `generation_id`, `regenerate_count_after`, `variant_changed_from`, `variant_changed_to` |
| 11 | `step6.edit_note_taken` | A6 → A4 transition | `from_generation_id`, `edit_note_depth_after` |
| 12 | `step6.waitlist_joined` | C2 submit | `surfaced_from` (c1 \| c2_direct \| c3), `features_selected` (array) |
| 13 | `step6.vault_limit_blocked` | C3 surface | `surfaced_from` (a2_entry \| save_race) |
| 14 | `step6.cost_limit_blocked` | 429 from `/generate` or `/regenerate` | `limit_kind` (regenerate_cap \| edit_note_depth \| pending_max \| hourly_max) |

14 events total. Spine 6 ship in MVP and back the reliability story; the other 8 ship in Phase 1.1 for funnel work.

**DECISION:** Adopt this split. Write `docs/analytics/2026-06-01-step6-events.md` with schemas for all 14 (cheap to define now). Only events 1–6 are wired in V1 production code.

---

## Q7. URL routing

**Constraint:** Routes are locked at design — DECISIONS.md states URL paths never change during a redesign. Whatever ships is permanent.

**Constraint:** Pre-generation state is ephemeral (no DB row exists yet, per Q1). Post-generation state is anchored by `generation_id`, which is the durable identifier the user owns.

**Proposal: hybrid — single URL for the form steps, generation-id-keyed URL for the audio-bearing steps, separate routes for ceiling screens.**

| Route | Screens | Notes |
|---|---|---|
| `/messages/new` | A2, A3, A4 | Internal React step state. No URL changes between form steps — pre-generation state is ephemeral and not worth deep-linking. Back-button exits the flow (correct model for an unsaved in-progress form). |
| `/messages/new/g/[generationId]` | A5 (if `audio_status != 'succeeded'`), A6 (if ready) | Server-side `page.tsx` fetches `pending_generations` row by id. Screen choice derives from status. Refresh and back work naturally. Supports future deep links ("your message is ready" notifications). |
| `/messages/saved/[messageId]` | A7 | Permanent save URL — the saved message is an addressable artifact the user owns. Pass `?ceremony=three-shaped` to overlay the C1 ceremonial moment after the 3rd save (one-time per user lifetime). |
| `/messages/limit` | C3 (Vault Limit Reached) | Static. Routed from A2 entry when user is at 3/3 saved, and from `/save` race-case 403 (Q4). |
| `/messages/waitlist` | C2 (Waitlist) | Static. Routed from C1 "See what's coming" and from C3. |

**Why hybrid:**
- **Form steps (A2/A3/A4)** are pure input. No server state to anchor a URL on, no analytics value in URL-segmenting (per-step events ship in Phase 1.1 anyway). Single URL keeps back-button behavior predictable.
- **Audio-bearing steps (A5/A6)** need a stable identifier for refresh, resume, and eventual deep links. `generation_id` is that identifier.
- **A7** gets its own permanent URL because the saved message is durable, shareable-with-self, and worth bookmarking.
- **C-screens** are static destinations, not flow steps — they earn their own routes.

**DECISION:** Routes locked per the table above. Internal `/messages/new` flow uses React state for step transitions; no query params for step state. C1 is a query-param overlay on `/messages/saved/[messageId]`, not its own route.

---

## What to do once the DECISIONs are signed

1. ~~Update inventory line 4 reference~~ — done (points at this doc).
2. ~~Create `docs/analytics/2026-06-01-step6-events.md`~~ — done (15 events, V1 + Phase 1.1 split).
3. ~~Write migration for `pending_generations` table + `messages.source_generation_id unique` column~~ — done (`20260601181821_*.sql`, `20260601181822_*.sql`); not yet applied to remote.
4. ~~Lock URL routing~~ — done, see Q7.
5. A2 + A6 prototypes — design brief in `docs/session-8/Step6_A2_A6_Design_Brief.md`. Pending architect agent.
6. Update API_CONTRACTS.md stubs to reflect `/regenerate` `mode` flag, `/save` idempotency, cost-limit error codes.
7. Pass 1 production build (A2 + A3 + A5 + A7 — the spine), routes per Q7, telemetry wrapper around existing `track()` with the global props from the analytics doc.
8. A6 production after A6 prototype lands.

---

## Out of scope for this doc

- Anything already locked in MASTER_SPEC Ch. 8 (template structure, hybrid LLM, audio timing, regenerate cap value, logging fields).
- Anything already locked in DECISIONS.md (immutability, no ORM, synchronous MVP, server-only ElevenLabs).
- Loading/delayed/error UI copy and presentation (System States doc).
- Recipient management UX in Settings.
- Memory Shelf (Step 7).

---

# Amendment A1 — Deferred Audio Render: committed-vs-candidate state model

**Status:** Decisions resolved 2026-06-10. Drafted in response to `ESSENCE_Spec_Amendment_Deferred_Audio_Render.md` §5.6 ("Server state and the preservation rule"), whose closing trigger is "state model written into the contracts doc, including what is persisted vs ephemeral and when a `generationId` is minted." All six §6.2 open decisions are now closed (see A1.8); the deferred path is cleared to build behind `DEFERRED_AUDIO_ENABLED`. Q1–Q7 above (the control arm) are unchanged.

**Boundary with the control arm:** the endpoints shipped in commits `a280a80`/`928bd5e` are the audio-on-every-regen *control arm*. Everything below is additive behind `DEFERRED_AUDIO_ENABLED` (amendment §5.10) and must coexist with the control arm during the A/B — so the schema delta is **additive only** (no destructive renames).

## A1.1 The two states

A6 holds, per amendment §3.4:

- **The committed take** — the last text+audio version the user has heard. Persisted server-side. This is what Save persists and what "Keep the current one" returns to.
- **A candidate** — an uncommitted text variant, no audio yet.

| | Carried by | Persisted? | Becomes a `messages` row? |
|---|---|---|---|
| Committed take | `generated_text`, `template_variant`, `audio_path`, `audio_status='succeeded'` | Yes (server) | Yes, on Save |
| Candidate | `candidate_text`, `candidate_template_variant` | Yes (server) | Only after it is committed |

**On "ephemeral":** the amendment calls the candidate "ephemeral until committed." We persist it server-side anyway (same row, no new artifact). "Ephemeral" is satisfied in the sense that matters — a candidate **never becomes a `messages` row** unless committed. Persisting it server-side (rather than holding it only in client state) keeps the flow resumable across refresh, keeps render server-authoritative (DECISIONS lock — the client never hands raw text to ElevenLabs), and costs nothing extra.

## A1.2 `generationId` minting rule

- Minted **once**, at cold-start `/generate` — exactly as today.
- **Reshape (edit-note)** mints a NEW `generationId` (a new lineage member via `source_generation_id`), unchanged from Q3.
- **Text re-rolls ("Try another"), commits ("Hear this"), and "Keep the current one" do NOT mint a new `generationId`.** They mutate the existing row's candidate/committed fields. This is the §5.6 invariant "No `generationId` churn for uncommitted text variants."

## A1.3 Schema delta (additive migration)

Add to `pending_generations` (all nullable / default 0, so the control arm ignores them):

```sql
alter table public.pending_generations
  add column candidate_text             text,         -- current uncommitted variant text
  add column candidate_template_variant text,         -- its variant id
  add column text_reroll_count          int not null default 0,  -- cheap, soft-capped
  add column audio_render_count         int not null default 0;  -- paid, hard-capped
```

`regenerate_count` is **kept** and stays the control-arm counter (text+audio coupled). Under the flag it is dormant; `text_reroll_count` and `audio_render_count` are authoritative. This avoids a destructive rename while both models run.

**Rejected alternatives:**
- *Candidate as a separate `pending_generations` row* (extend the edit-note lineage to every re-roll) — rejected: violates §5.6 "no `generationId` churn" and spawns ephemeral rows per re-roll.
- *Candidate client-side only* — rejected: render must stay server-authoritative (DECISIONS lock); client-held text would have to be POSTed back to render, and the flow would not survive refresh.
- *Rename `regenerate_count` → `audio_render_count`* — rejected for now: a destructive rename breaks the control arm mid-A/B. Revisit when the flag becomes default.

## A1.4 Lifecycle transitions (flag ON)

| Transition | Action | Audio render? | Counters | Committed take |
|---|---|---|---|---|
| Cold-start `/generate` | text + audio (first listen) | **Yes** | `audio_render_count = 1` | set |
| "Try another" / Regenerate | new variant text into `candidate_*` | No | `text_reroll_count++` | untouched |
| "Hear this in your voice" (commit) | render `candidate_text` | **Yes** | `audio_render_count++` | **promoted from candidate on success** |
| "Keep the current one" | clear `candidate_*` | No | — | unchanged |
| Reshape (edit-note) | new lineage member, returns as candidate | No (deferred — decided #4) | new row | superseded on commit |
| Save | persist committed take | No | — | becomes `messages` row |
| Commit render **fails** | keep `candidate_text`, offer retry | attempted | **`audio_render_count` NOT incremented** | unchanged (prior take survives) |

**Commit = render-and-promote.** On success: `generated_text = candidate_text`, `template_variant = candidate_template_variant`, `audio_path =` new render, `audio_status = 'succeeded'`, `audio_render_count++`, then clear `candidate_*`. The committed audio is replaced **only on success** — a failed render leaves the prior committed take intact (amendment §5.5; mirrors the Q3 preservation rule).

## A1.5 Endpoint shape

- **`/regenerate`** forks on the flag. Flag OFF → today's text+audio variant re-roll (control arm). Flag ON → produce candidate text only, bump `text_reroll_count`, no render. The existing `mode: "retry_audio"` is unaffected (it already renders existing committed text without touching content counters).
- **New `POST /api/messages/commit { generationId }`** — renders `candidate_text` and promotes it to the committed take per A1.4. Reuses the `generateAndStoreAudio` lib step already factored out in `src/lib/messages/audio.ts`. A dedicated route (vs another `/regenerate` mode) keeps the `variant_committed` telemetry and the audio-render cap cleanly attached to one action.
- **`/save`** is unchanged in shape and already enforces invariant 3: it refuses unless the committed `audio_status === 'succeeded'`. Decision §5.4(a) (drop the candidate silently) needs only that Save reads committed fields and ignores `candidate_*` — which it already does.
- **`/generate` cold-start** is unchanged (first listen always renders — invariant 1).

## A1.6 Caps and `cost_limit_blocked` (amendment §5.2, §5.3, §6.2 #1/#6)

Two independent caps replace the single `MAX_REGENERATES`:

| Cap | Counter | Default (decided #1) | env var | `limit_kind` |
|---|---|---|---|---|
| Audio renders (paid, the cost driver) | `audio_render_count` | **3** (matches today's spend ceiling) | `STEP6_MAX_AUDIO_RENDERS` | `audio_render_cap` |
| Text re-rolls (cheap, abuse fence) | `text_reroll_count` | **10** (soft, "keep trying") | `STEP6_MAX_TEXT_REROLLS` | `text_reroll_cap` |

`cost_limit_blocked.limit_kind` re-keys from `regenerate_cap` → `audio_render_cap` for the paid action (decided #6); `text_reroll_cap` is added for the soft text ceiling. The regen indicator dots track `audio_render_count` remaining, not text re-rolls (decided #2); the text-reroll soft cap stays unsignalled until ~1 re-roll remains, then shows a quiet note. Both numbers are env-configurable in `src/lib/messages/cost-controls.ts` (the `STEP6_LIMITS` getters already follow this pattern).

## A1.7 Telemetry (amendment §5.9)

New events on the existing `flow_id`: `variant_previewed` (candidate text shown, no render), `variant_committed` (render spent) with `audio_renders_used`; `text_reroll_count` and `audio_render_count` as properties on `message_saved`; `cost_limit_blocked` re-pointed to the audio-render cap. These extend `docs/analytics/2026-06-01-step6-events.md` and would land in the same PR as the deferred-path build.

## A1.8 §6.2 decisions (resolved 2026-06-10)

All six amendment §6.2 open decisions are closed. The build is unblocked.

| # | Decision | Resolution |
|---|---|---|
| 1 | Audio-render cap + text-reroll soft cap | **audio = 3, text = 10**, both env-configurable (A1.6) |
| 2 | Regen dots semantics | **dots = audio renders remaining**; text-reroll cap unsignalled until ~1 left, then a quiet note |
| 3 | Save with an uncommitted candidate | **(a)** — Save persists the committed take, candidate silently dropped (A1.5) |
| 4 | Reshape: deferred or render-on-arrival | **deferred** — reshape returns text-first as a candidate, one model app-wide (A1.4) |
| 5 | First-commit reveal beat | **no beat** — commit reads as "choosing"; ceremony stays on the first listen only |
| 6 | `cost_limit_blocked` re-key | **`regenerate_cap` → `audio_render_cap`**, add `text_reroll_cap` (A1.6) |

**Not build-blocking, still owed (design/copy):** the "current take vs candidate" visual treatment (#3), and copy for the commit affordance, "Try another", the cap-note, and the commit-failure retry path (amendment §5.5).

**DECISION (resolved):** committed-vs-candidate both live on the single `pending_generations` row via additive columns; `generationId` mints only at cold-start and reshape; commit is a dedicated `/commit` route that renders the candidate and replaces the committed take on success; caps split into `audio_render_count` (hard, 3) and `text_reroll_count` (soft, 10); reshape is deferred (text-first); no reveal beat on commit; all of it gated behind `DEFERRED_AUDIO_ENABLED` and additive to the control arm.
