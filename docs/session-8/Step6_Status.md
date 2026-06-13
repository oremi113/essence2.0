# Step 6 (Message Creation) — Status & What's Pending

**Living doc. Last updated: 2026-06-11.**

Plain-language map of where message-creation stands, written to be read without
diving into code. The sections that need *you* are **"Decisions"** and **"What's
next."**

## Status legend
| Symbol | Meaning |
|---|---|
| ✅ Proven | Built, committed, and verified running against the real server + database. |
| 🟡 Built, not proven | Code exists + passes its own checks, but hasn't run against the real app. |
| ⬜ Not started | Designed/prototyped, but no production code yet. |
| 🟣 Needs a decision | Waiting on a product/design/you call. |

---

## Where we are (the one paragraph)

**The entire Step 6 backend is built and proven** — both the baseline ("control
arm") and the cost-saving "Deferred Audio" upgrade, every endpoint smoke-tested
against the real server + database. The remaining work is the **screens** (the UI
a person taps) and wiring them to the backend. We're well ahead on the engine;
the outside is what's left.

**Test totals:** 131 unit · 24 control-arm smoke · 7 deferred smoke — all green.

## Two models (hold onto this)
1. **Control arm (baseline).** Every regenerate/reshape re-records audio. Built + proven.
2. **Deferred Audio (upgrade).** Text drafts are free; you only spend a recording
   when you tap "Hear this in your voice." Built + proven, behind
   `DEFERRED_AUDIO_ENABLED` (off). Ships flagged and A/B'd against the baseline.

---

## Recent progress (last 24h → 2026-06-11)

- **Deferred-Audio backend completed + proven** — migration (candidate columns)
  live on remote, split caps (3 recordings / 10 text re-rolls), the `/commit`
  endpoint (failure-safe per A1 §5.5), flag-forked `/regenerate` (free text
  candidate), the `keep` candidate-clear, and **deferred reshape** (text-first,
  same-row — Model A).
- **3 prototype↔backend reconciliations** (found reviewing the A6 deferred
  prototype, all committed + tested): #1 first listen is free → dots = 3 commits;
  #2 `/regenerate` returns the candidate text so the card can render it; #3
  reshape returns a candidate under the flag (no render).
- **Pending-audio playback endpoint** — `/api/messages/generations/:id/play`,
  so A6 can play an *unsaved* take. Proven (signed URL + gates).
- **Refactors** — shared route guards extracted (`src/lib/messages/route-helpers.ts`:
  `isActivePending`, `pendingNotFoundResponse`, `loadReadyVoiceProfile`);
  `retryable` made consistent across Step 6 error responses (#33); a safe
  FOLLOW_UPS batch via PR #44.
- **A6 prototypes** — control-arm + deferred both built by the architect. The
  deferred **candidate footer was scoped 6 → 3 elements** (the dense decision
  surface) and the corrected file is in the repo (`prototypes/message creation/
  essence-step6-a6-deferred.html`) + your Downloads. A **handoff doc** for the
  deferred variant is in `docs/session-8/`.
- **Earlier (2026-06-10)** — control-arm backend proven, migrations applied to
  remote, Anthropic key + Supabase CLI fixed, per-category voice settings +
  generated DB types wired.

---

## The screens (the visible work that's left)

| Screen | What it is | Status |
|---|---|---|
| **A2** Recipient | Who's this for? | 🟡 Built, not proven (only screen with code) |
| **A3** Category | Birthday / comfort / etc. | ⬜ prototyped, not built |
| **A4** Note | Optional personal note | ✅ **Built + reshape-wired (Chunk 4, 2026-06-12)** — screen + `/dev/messages-note`; reshape path live at `/messages/new/g/[id]/reshape`, A6→A4→A6 candidate loop browser-verified against the real backend. Forward-flow entry (A3→A4) waits on A3. See `Step6_A4_Screen_Chunk4.md`. |
| **A5** Generating | The "shaping your message" wait | ⬜ prototyped, not built — **next** |
| **A6** Preview & Refine | Hear / re-draft / commit / save | ✅ **Proven (deferred variant)** — screen (Chunk 1) + live route/wiring/telemetry (Chunk 2), browser-verified against the real server + DB. Only the commit-success voice render (vendor spend) remains unproven. Control-arm variant not built. |
| **A7** Saved | The saved message | ✅ **Built + wired (Chunk 3, 2026-06-12)** — screen + `/dev/messages-saved`; live route `/messages/saved/[messageId]`, A6 save-success + already-saved redirect repointed here, browser-verified. See `Step6_A7_Screen_Chunk3.md`. |
| **C1–C3** | Ceremony / Waitlist / Vault Limit | ⬜ not started (Save backend already routes to C3 at the cap) |

**Takeaway:** the screens are essentially all the remaining work. A6 is the big
one and is fully prototyped (control + deferred).

---

## The backend (done)

| Endpoint | Status |
|---|---|
| `generate` · `regenerate` · `save` · `discard` · `commit` | ✅ Proven (smoke) |
| `generations/:id/play` (pending-audio URL) | ✅ Proven (smoke) |

Also done + proven: deferred reshape (same-row candidate), the `keep`
candidate-clear, split caps, and the failure-safe commit (a failed render keeps
the prior take and burns no allowance).

**One manual check owed:** the full `/generate` and `/commit` → *real* ElevenLabs
voice render (needs an actual cloned voice; the render call itself is already
live via the older `/api/messages` route). Everything *around* the render is
proven with zero vendor spend.

---

## Decisions

### ✅ Settled
- The six Amendment A1 decisions (caps 3/10, dots = recordings, Save keeps the
  heard take, reshape deferred, no commit reveal beat, limit = recordings) — see
  `Step6_OpenContracts.md` Amendment A1.
- **Candidate footer = 3 elements** (Hear this / See another / Back to the take
  you heard) — scoped from 6.
- **Tap-to-play** on first listen (the deferred prototype's choice).
- **Candidate-vs-committed visual treatment** — resolved in the deferred
  prototype (warmth-withdrawn stone, "just the words" marker, text card).

### 🟣 Still open
- **Copy pass** — final wording for every user-facing slot (the escape "Back to
  the take you heard", "Hear this", cap notes, commit-failure message, etc.).
  Placeholders are in the prototype.
- **Formally accept the amendment** + update the master spec (8.7.2 / 8.7.3 /
  8.9). Soft — doesn't block the build.

---

## Open follow-ups (`docs/FOLLOW_UPS.md`)

| # | Item | State |
|---|---|---|
| 26 | Enum-drift / generated types | ✅ `MessageCategory` now from generated types; the CI-check half is still open |
| 27 | Per-category voice settings → TTS | ✅ resolved |
| 28 | Pending audio in `essence-audio` vs contract's `messages` bucket | 🟡 open — ratify the naming or repoint |
| 29 | Route-level endpoint tests | ✅ resolved (31 smoke total) |
| 30 | `db push` blocked by early migration-history collision | 🟡 open — use the Dashboard bundle for new migrations; fix before production |
| 31 | "Keep the current one" candidate-clear | ✅ resolved (`keep` mode) |
| 33 | `retryable` consistency across Step 6 errors | ✅ resolved |

---

## What's next (the remaining work)

1. ~~Wire up A6 (deferred)~~ ✅ **Done (Chunk 2, 2026-06-11)** — live route at
   `/messages/new/g/[generationId]`, client wrapper, V1 telemetry, browser-
   verified against the real backend. See
   `Step6_A6_Screen_Chunk2.md` + FOLLOW_UPS #36–#38 for the interim stop-gaps
   (cookie latches, estimated duration, A7/C3/A4 exit paths).
2. **The spine screens**, built per-screen (one screen → design pass →
   architect review → wiring → live verify → commit stack). Done: A7
   (Chunk 3), A4 (Chunk 4). **Next: A5 (Generation)**, then A3 (Category),
   then C1–C3. A6's exit paths (FOLLOW_UPS #38) repoint as each lands —
   reshape resolved (A4); still open: C3 vault-limit, C1 ceiling CTA.
   Before each chunk, run `node scripts/step6-token-sweep.mjs` and read
   `Step6_Prototype_Token_Reconciliation.md` (token mapping + footgun
   checklist — the prototypes' `:root` blocks drift from production).
3. **Manual real-voice render check** for `/generate` + `/commit` (needs a cloned voice).

---

## Reference docs
- **Flow contract + Deferred-Audio decisions:** `docs/session-8/Step6_OpenContracts.md` (Q1–Q7 baseline; Amendment A1 the upgrade).
- **A6 deferred design handoff:** `docs/session-8/Step6_A6_Deferred_Audio_Handoff.md`.
- **Spine chunk docs:** `Step6_A7_Screen_Chunk3.md`, `Step6_A4_Screen_Chunk4.md` (per-screen build records + design-architect amendments).
- **Prototype token reconciliation:** `docs/session-8/Step6_Prototype_Token_Reconciliation.md` (run before each remaining chunk).
- **API behavior:** `docs/API_CONTRACTS.md`.
- **Deferred items:** `docs/FOLLOW_UPS.md` (open: #28, #30, #26-CI; rest resolved).
