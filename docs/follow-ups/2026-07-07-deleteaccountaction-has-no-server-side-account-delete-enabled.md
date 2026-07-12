---
id: 2026-07-07-deleteaccountaction-has-no-server-side-account-delete-enabled
legacy_id: 88
priority: P3
status: open
opened: 2026-07-07
resolved:
summary: "`deleteAccountAction` has no server-side `ACCOUNT_DELETE_ENABLED` gate — irreversible teardown reachable while \"dark\" *(triage 2026-07-07)*"
---

# `deleteAccountAction` has no server-side `ACCOUNT_DELETE_ENABLED` gate — the irreversible teardown is reachable while the feature "ships dark"

*(triage 2026-07-07)*
`src/app/app/settings/actions.ts:170` (whole action). The flag comment
(`src/lib/feature-flags.ts:9-13`) says delete "ships dark: OFF until the teardown … is signed
off." But `ACCOUNT_DELETE_ENABLED` is consulted only in `page.tsx:131` to *hide the button*;
the server action performs no flag check. Next.js server actions are addressable POST
endpoints, so the full irreversible teardown is invocable by an authenticated caller even
while the feature is supposedly disabled.
**Why it matters:** defense-in-depth on the single most destructive action in the app; the
"dark" safety posture the flag advertises isn't enforced server-side.
**Fix shape:** first line of `deleteAccountAction` →
`if (!isFeatureEnabled('ACCOUNT_DELETE_ENABLED')) return { ok: false, error: … }`. Gate the
destructive action, not just the button.
**Pick up when:** before `ACCOUNT_DELETE_ENABLED` is enabled; same batch as #85/#86.
