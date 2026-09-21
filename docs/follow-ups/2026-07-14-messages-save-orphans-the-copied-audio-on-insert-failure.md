---
id: 2026-07-14-messages-save-orphans-the-copied-audio-on-insert-failure
priority: P4
status: open
opened: 2026-07-14
resolved:
summary: `/api/messages/save` copies the audio to its permanent path before the DB insert, but only the unique-violation branch cleans up on failure — any other insert error leaves the copied object orphaned in storage, and retries never reclaim it *(triage 2026-07-14)*
---

# `/api/messages/save` leaks the copied permanent audio object when the DB insert fails

*(triage 2026-07-14)*
`src/app/api/messages/save/route.ts:135-185` copies the pending audio to a freshly-randomized permanent
path (`:135-137`) **before** inserting the `messages` row. On a unique-violation insert error (`23505`,
the concurrent-save-won case) it correctly removes the orphan copy (`:170`). But on **any other** insert
error it returns 500 (`:180-184`) **without** removing `permanentPath`, so the copied object is left in
storage with no DB row pointing at it. Because `messageId` and `permanentPath` are randomized fresh on
every attempt, a retry writes a *new* path and never reclaims the previous orphan — so repeated failing
saves accumulate dead audio objects. The header's "every prefix is recoverable" claim (`:5`) doesn't hold
for this branch.

**Why it matters:** small, slow-growing storage cost leak, not user-visible — dead audio files that no
cleanup keyed off `messages` will ever find. Low urgency, but it's a concrete, one-branch omission that
mirrors a cleanup already present two lines up, so it's cheap to close and easy to reason about.

**Fix shape:** in the non-`23505` insert-error path, best-effort `remove([permanentPath])` before
returning (mirroring the `23505` cleanup at `:170`).

**Pick up when:** next Step 6 save-path pass, or whenever storage-orphan cleanup is next considered
(alongside the init-upload re-init orphan noted this run). Agent-fixable (a few lines, no migration).
