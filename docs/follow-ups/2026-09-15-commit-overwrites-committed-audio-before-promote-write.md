---
id: 2026-09-15-commit-overwrites-committed-audio-before-promote-write
priority: P3
status: open
opened: 2026-09-15
resolved:
summary: `/commit` overwrites the shared audio object (upsert) BEFORE the promote DB write, so an upload-success/promote-fail leaves new audio under old text — and `/save` then persists it as a permanent, immutable message whose voice doesn't match its words. Believed tracked as "#62" but that number was reassigned; actually untracked *(triage 2026-09-15)*
---

# `/commit` clobbers the committed audio before the promote write → `/save` can seal a message whose audio doesn't match its text

*(triage 2026-09-15 — Step 6 spend-path review)*

`src/app/api/messages/commit/route.ts:100-103` uploads the freshly-rendered
candidate to `pendingGenerationAudioPath(user.id, generationId)` with
`upsert: true` — the **same deterministic path the already-committed take
occupies** — and does so **before** the promote DB write at
`commit/route.ts:116-130`. If the upload succeeds but the promote write fails
(`commitError`, :132), storage now holds the NEW candidate audio while the DB row
still carries the OLD `generated_text` and its `audio_status` is still
`'succeeded'` (from the prior commit). The header comment (`commit/route.ts:8-14`)
claims the committed object "survives either way" — that is true only for an
upload *failure*; on upload-success/promote-fail the committed object has already
been overwritten.

The residual the in-code note misses: `/save` is not blocked afterwards. Its
preconditions (`save/route.ts:88`: `audio_status === 'succeeded' && audio_path &&
generated_text`) all still pass, so `/save` copies the (new) audio and inserts a
`messages` row with `body_text = gen.generated_text` = the OLD text
(`save/route.ts:135-137, 154`). The result is a **permanent, immutable** vault
message whose spoken audio doesn't match its written words — and message
immutability is a `DECISIONS.md` lock, so there is no edit path to repair it.

**Tracking gap:** the code comment at `commit/route.ts:136` says this divergence
is "(FOLLOW_UPS #62)", but #62 was reassigned during the 2026-07-12 ledger
reconciliation and now names an unrelated, resolved item ("Home B settings
affordance"). Nothing in `docs/follow-ups/` or `FOLLOW_UPS.md` actually tracks the
commit divergence — the author believed it was logged; it wasn't. This file is
that entry.

**Why it matters:** low probability (needs a DB write to fail in the window
between a successful re-render upload and the promote), but when it fires the
damage is permanent and user-facing — a keepsake message that speaks the wrong
words, unfixable by design. It only reaches `/save` after at least one prior
successful commit on the same generation (so the row already has
`generated_text` + `audio_status='succeeded'`); a first-commit promote failure
leaves `generated_text` null and `/save` correctly refuses.

**Fix shape:** make the promotion atomic-ish against the shared object — e.g. write
the promote row **before** overwriting the committed audio, or upload the new
candidate to a distinct candidate path and only swap it into `audio_path` as part
of the promote write, so a failed promote can never leave new audio addressable
under an old-text row. At minimum, on promote-failure reset `audio_status` off
`'succeeded'` (or clear `audio_path`) so `/save`'s precondition fails until a
clean retry lands. Correct the stale "#62" cross-reference in the code comment to
this id.

**Pick up when:** next Step 6 reliability pass; alongside the commit cost-control
fix (`2026-09-15-commit-paid-render-bypasses-hourly-cap-and-ledger`) since both
live in `commit/route.ts`.
