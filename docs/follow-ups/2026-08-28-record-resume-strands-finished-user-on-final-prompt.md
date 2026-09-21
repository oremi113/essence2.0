---
id: 2026-08-28-record-resume-strands-finished-user-on-final-prompt
priority: P3
status: open
opened: 2026-08-28
resolved:
owner_paired: false
summary: "`deriveInitialView` has no terminal case for all-clips-recorded-but-not-yet-processing → a user who finished all 25 prompts is dropped back onto the final prompt to re-record it on refresh *(triage 2026-08-28)*"
---

# Record-flow resume strands a finished user back on the final prompt

*(triage 2026-08-28)*
`src/components/screens/RecordScreen.reducer.ts:41` — `deriveInitialView` derives the resume screen from server state, but its final fallback has no case for "all prompts recorded":

```ts
return { type: 'prompt', promptIndex: Math.min(data.clipsRecorded, TOTAL_PROMPT_COUNT - 1) };
```

When a user has recorded all 25 clips (`clipsRecorded === TOTAL_PROMPT_COUNT === 25`) but the voice profile status is still `collecting`/`created` — the real window *between finishing the last clip and paying*, because processing only starts post-paywall via `/api/voice-profiles/[id]/start` — this returns `promptIndex: min(25, 24) = 24`, i.e. the **final prompt again**. The completion state (`working` / `ready`) that the client reached in-session is client-only and lost on reload. `src/app/app/record/page.tsx` only redirects away when status is `ready`, so a refresh or a return to `/app/record` in that window lands the finished user back on prompt 25.

**Why it matters:** someone who just completed the entire 25-prompt recording session is bounced back to re-record the last prompt if they refresh or navigate back before paying — a demoralizing "did my work not save?" moment on the highest-investment flow in the app. Recoverable (re-recording the final prompt re-triggers its celebration → `working`, per `script.ts:460-468`), so P3 rather than a hard wedge.

**Fix shape:** add a terminal branch before the final `return`, e.g. `if (data.clipsRecorded >= TOTAL_PROMPT_COUNT) return { type: 'working' }`, so a fully-recorded profile resumes at completion rather than the last prompt.

**Pick up when:** next record-flow touch, or alongside coverage for the reducer ([[2026-07-10-no-unit-tests-on-recordscreen-reducer-or-usesequencetimeline]] — this is exactly the latent bug those tests would catch). Agent-fixable.
