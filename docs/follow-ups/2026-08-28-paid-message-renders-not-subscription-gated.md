---
id: 2026-08-28-paid-message-renders-not-subscription-gated
priority: P3
status: open
opened: 2026-08-28
resolved:
owner_paired: true
summary: Only `/api/messages/save` checks subscription status; the routes that actually spend ElevenLabs money (generate / regenerate / commit) do not → a lapsed user with a ready voice can burn paid renders they can never save *(triage 2026-08-28)*
---

# Paid message renders are entitlement-checked at save, after the money is spent

*(triage 2026-08-28)*
The subscription gate sits *after* the vendor cost, not before it:

- `src/app/api/messages/save/route.ts:96-102` enforces `SAVE_ALLOWED_STATUSES = {trial, active}` — a lapsed/cancelled user is blocked from **saving**.
- But the three routes that actually invoke paid ElevenLabs renders do **not** read subscription status:
  - `src/app/api/messages/generate/route.ts:65` → `assertCanGenerateMessage`, whose only plan gate is `assertPlanAllows` — a permanent stub (`src/lib/guards.ts:26-30`, "MVP: no plan enforcement. Always allowed.").
  - `src/app/api/messages/regenerate/route.ts` — same stub, no subscription read.
  - `src/app/api/messages/commit/route.ts` — the on-demand paid render; only `isActivePending` + `loadReadyVoiceProfile`, no subscription check.

**Why it matters:** a user whose subscription has lapsed or cancelled but who still holds a `ready` voice profile can call generate/regenerate/commit and drive real ElevenLabs spend (bounded only by the 20/hr hourly cap) on messages they will then be blocked from saving. The lapse gate protects the *outcome* but not the *cost*. This is the same cost-exposure family as FU-22 (voice-creation gate) and [[2026-07-10-retry-audio-renders-paid-elevenlabs-audio-with-no]], but on a distinct set of routes and a distinct axis (subscription *entitlement*, not rate-limiting).

**Fix shape:** hoist the `SAVE_ALLOWED_STATUSES` subscription check into a shared guard called *before* any paid TTS render in generate/regenerate/commit — the entitlement gate belongs in front of the spend, not only in front of the save. **Owner-paired:** whether a lapsed user may generate-but-not-save is a product decision (FU-22 answered "gate voice creation on paid status"; the analogous call for message generation should be confirmed before wiring), so this needs an owner choice, not an unattended fix.

**Pick up when:** before launch, or the next Step 6 cost-control / entitlement pass — decide alongside FU-22's gate rollout so the whole paid surface is gated consistently.
