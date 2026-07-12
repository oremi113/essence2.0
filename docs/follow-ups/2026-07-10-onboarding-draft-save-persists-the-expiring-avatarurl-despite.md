---
id: 2026-07-10-onboarding-draft-save-persists-the-expiring-avatarurl-despite
legacy_id: 98
priority: P4
status: open
opened: 2026-07-10
resolved:
summary: "Onboarding draft-save persists the expiring `avatarUrl` signed URL → violates the module's \"never persisted\" contract *(triage 2026-07-10)*"
---

# Onboarding draft-save persists the expiring `avatarUrl` despite the module's "never persisted" contract

*(triage 2026-07-10)*
`src/components/screens/onboarding/state.ts:153` — the draft-persist effect calls `saveDraft({
currentScreen, form })`, and `form` includes `avatarUrl` (a signed URL that expires after ~1 hour).
The module's own contract (l.13-15: "avatarUrl is NEVER persisted …") and the load side (l.144 skips
`avatarUrl` on hydration) both assume it is never written — but the write serializes the whole `form`,
so the expiring URL *is* stored in `localStorage` on every field change.
**Why it matters:** low impact (skipped on load, expires quickly, user's own avatar, that user's
browser only) — but a documented-contract violation that leaves a stale expiring credential as dead
data and will mislead the next reader who trusts the "never persisted" comment.
**Fix shape:** strip `avatarUrl` before persisting, e.g.
`saveDraft({ currentScreen, form: { ...form, avatarUrl: null } })`. One line.
**Pick up when:** next onboarding-state touch, or any draft-persistence hardening. Agent-fixable.
