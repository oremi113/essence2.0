---
id: 2026-07-14-onboarding-completion-and-avatar-writes-ignore-zero-row-updates
priority: P3
status: open
opened: 2026-07-14
resolved:
summary: Onboarding completion (and the sibling avatar-pointer write) check only for an error, not for zero rows updated — so if the profile row is missing the save is a silent no-op and the user's details/photo are lost, the exact gap FU-42's fix left open *(triage 2026-07-14)*
---

# Onboarding completion + avatar writes treat a zero-row UPDATE as success

*(triage 2026-07-14)*
`src/lib/onboarding/completeOnboarding.ts:48-58` performs the final profile save as
`.update({...}).eq("user_id", userId)` and only throws on `error`. PostgREST returns `error: null` when
the `WHERE` clause matches **zero rows**, so if the user's `profiles` row doesn't exist yet, the update
writes nothing and resolves as success. The wizard then clears the draft and sends the user into the app
with every field gone and `onboarding_completed_at` still null (so they're treated as not-onboarded next
visit). This is the *sibling* gap FU-42 left open: FU-42 correctly made the write **throw on error**, but
the zero-rows branch is a different failure mode — precisely what the repo's own `checkedWrite({ expectRows })`
primitive (and the FU-63 note) was built to catch. The same unchecked pattern is in the avatar-pointer
write (`src/app/onboarding/page.tsx`, the `uploadAvatar` action, ~l.182-189): on a missing row the photo
pointer silently isn't persisted, so the photo shows this session but is lost on the next visit.

**Why it matters:** the profile row is normally created by the `on_auth_user_created` DB trigger, so this
is a **landmine, not a live everyday bug** — it only bites where that trigger hasn't fired/been applied
(the exact environments `ensureProfile` exists to paper over). But the blast radius is the worst kind:
the new user finishes onboarding, sees no error, and silently loses everything they just entered. Cheap
to close now, expensive to diagnose later from a "my details vanished" report.

**Fix shape:** route both writes through `checkedWrite` with `.select("user_id")` + `expectRows: true`
(so a zero-row update raises like an error would), or `ensureProfile`/upsert on `user_id` before writing.
The completion helper is already unit-testable in isolation, so a zero-rows test slots straight in.

**Pick up when:** next onboarding reliability pass, or whenever the FU-42 area is next touched (same
lineage). Agent-fixable.
