---
id: 2026-08-07-recordscreen-deriveinitialview-strands-finished-user-on-final-prompt
priority: P2
status: open
opened: 2026-08-07
resolved:
owner_paired: false
summary: `deriveInitialView` has no branch for "all clips recorded but not yet processing" → after the deferred-creation reorder, reloading `/app/record` drops a finished user back onto the final goodbye prompt to re-record it *(triage 2026-08-07)*
---

# Reloading `/app/record` after finishing all clips (but before payment) dumps the user back on the final goodbye prompt

*(triage 2026-08-07)*
`src/components/screens/RecordScreen.reducer.ts:30-42` (`deriveInitialView`).

`deriveInitialView` handles `voiceProfileStatus` `processing`/`queued`/`ready`, then `clipsRecorded === 0`, then the two stage-intro boundaries, and otherwise falls through to `{ type: 'prompt', promptIndex: Math.min(clipsRecorded, TOTAL_PROMPT_COUNT - 1) }`. There is **no terminal branch for `clipsRecorded >= TOTAL_PROMPT_COUNT` when the status isn't yet `ready`/`processing`/`queued`.**

The spine reorder (S2b) moved voice creation to **after payment** — `/app/voice/processing` runs it only post-checkout. So a user who records all clips sits at status `collecting`/`created` (not `processing`) until they pay. If they reload or navigate back to `/app/record` in that window, `clipsRecorded` (all of them) matches none of the boundary cases and falls through to `prompt` at `min(all, TOTAL_PROMPT_COUNT - 1)` = the **last prompt** — the already-recorded goodbye.

**Why it matters:** a user who completed the most emotionally loaded part of onboarding lands back on the final goodbye prompt and is pushed to re-record it (the only in-reducer path out of the last index is `PROMPT_ADVANCED` → celebration). A real, user-visible bug on the core recording flow, introduced as a side effect of the creation-after-payment reorder.

**Fix shape:** add a terminal branch before the final `return`: when `clipsRecorded >= TOTAL_PROMPT_COUNT`, return `{ type: 'working' }` (or `'ready'` when the status warrants) so the reconstructed initial view recognizes "recording complete, awaiting creation/payment" instead of re-opening the last prompt.

**Pick up when:** near-term — the finished-but-unpaid window is common (recording 25 prompts is long; mobile reloads are frequent). Add the missing unit case alongside FU-96 (`RecordScreen.reducer` has no unit coverage — which is why this boundary slipped through).
