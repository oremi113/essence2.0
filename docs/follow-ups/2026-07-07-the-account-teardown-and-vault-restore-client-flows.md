---
id: 2026-07-07-the-account-teardown-and-vault-restore-client-flows
legacy_id: 90
priority: P3
status: open
opened: 2026-07-07
resolved:
summary: Account-teardown + vault-restore client flows have no test coverage *(triage 2026-07-07)*
---

# The account-teardown and vault-restore client flows — the app's highest-stakes money/destructive paths — have no test coverage

*(triage 2026-07-07)*
`src/app/app/settings/actions.ts` (`deleteAccountAction`) and
`src/app/app/vault/restore/actions.tsx` (`handleRestore`) have no `*.test.*`. Nothing asserts
that Stripe cancel precedes data deletion, that a failed subscriptions read aborts before
deletion (#85), that a partial failure reports `ok:false`, that the FK-safe delete order holds,
or — on restore — that portal-failure surfaces `restoreFailed`, that the 401→redirect fires,
and that restart-checkout success/failure behave. Findings #85 and #87 would both have been
caught by a basic failure-injection test here.
**Why it matters:** the two flows that can leak money or destroy data have the least safety net;
a future refactor can silently reintroduce #85/#87 with nothing red in CI.
**Fix shape:** add teardown tests (sub-read error → abort; Stripe-cancel failure → abort before
storage; row-delete failure → `ok:false`; happy-path ordering) and a `RestoreActions` test
(portal success / portal failure→`restoreFailed` / 401→redirect / restart success+failure).
**Pick up when:** with any fix to #85–#89 (land the test alongside the fix). Agent-fixable.
