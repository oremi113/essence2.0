---
id: 2026-08-18-save-route-vault-quota-gate-fails-open-on-count-error
priority: P3
status: open
opened: 2026-08-18
resolved:
summary: The "race-safe security gate" for the Vault 3-message cap drops the count-query `error`, so a transient DB hiccup lets a user save past the plan limit *(triage 2026-08-18)*
---

# Saved-message quota gate fails open on a DB count error

**What:** In `src/app/api/messages/save/route.ts:105-112` the saved-message quota check
destructures only `{ count: savedCount }` from the Supabase count query and drops the
`error`. On a transient count-query failure `savedCount` is `undefined`, so
`(savedCount ?? 0) >= STEP6_LIMITS.maxSavedMessages` evaluates `0 >= 3` → `false` and the
save proceeds.

**Why it matters:** the docstring bills this as the "race-safe security gate" that enforces
the Vault plan's 3-saved-message cap at the authoritative moment. A DB blip turns that gate
into a pass-through, letting a user save a 4th (or Nth) message past the cap they're
entitled to — a quota-enforcement hole, not just a transient UX glitch. It's the classic
"fail-open on an unchecked error" on exactly the path that's supposed to be the security
backstop. (Contrast `countActivePending` nearby, which fails open *by explicit design* and
says so; this one fails open by accident.)

**Fix shape:** destructure `error` from the count query and, on error, return a retryable
500 instead of treating the count as 0 — a save that can't verify the cap should not
proceed. A unit test asserting "count error → does not save past cap" locks it in.

**Pick up when:** next time the Step 6 save/quota path is touched, or alongside the Vault
limit (C3) work if that gets revisited. Agent-fixable (server logic + a test; no product
decision).
