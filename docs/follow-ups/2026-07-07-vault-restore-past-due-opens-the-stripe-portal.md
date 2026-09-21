---
id: 2026-07-07-vault-restore-past-due-opens-the-stripe-portal
legacy_id: 87
priority: P2
status: resolved
opened: 2026-07-07
resolved: 2026-09-21
summary: "RESOLVED 2026-09-21 — Vault restore (past_due) opened the Stripe Portal via `window.open`-after-`await`, blocked on iOS Safari as a silent dead-end; now a top-level navigation like the restart branch *(triage 2026-07-07)*"
---

# Vault restore (past_due) opens the Stripe Portal via `window.open` *after* an `await` → blocked on iOS Safari, silent dead-end

**✅ RESOLVED 2026-09-21 (refactor/fu-87-restore-portal-navigation).** The `update_card`
branch now hands off with `window.location.href = data.portalUrl` — a top-level
navigation — instead of `window.open(portalUrl, '_blank')`. A top-level navigation is
never gesture-gated by any browser, so iOS/Safari can no longer block it, and there is no
returned handle left to silently discard: the silent dead-end is structurally gone rather
than papered over. This mirrors the sibling `restart` branch, which already navigated the
current tab to Stripe Checkout; Stripe's Customer Portal `return_url` brings the user back
to the app afterward, so the old "new tab, keep the paused context behind" nicety is not
lost in substance. Regression-guarded by `tests/unit/vault-restore-actions.test.tsx`
(asserts the current-tab navigation and forbids any `window.open` on both branches; the
failure path still surfaces `restoreFailed`). Checks: typecheck ✅ · lint ✅ · test:unit
473/473 ✅. *Original entry below.*

*(triage 2026-07-07)*
`src/app/app/vault/restore/actions.tsx:29,44` — the `update_card` branch (the recovery path
for a past_due user whose card is failing) awaits the portal-session fetch, then calls
`window.open(data.portalUrl, '_blank', …)`. Browsers that require a live user-gesture for
`window.open` (notably iOS/Safari) treat an open that runs *after* an `await` as
non-user-initiated and block it; the returned handle is ignored and line 45 just re-enables
the button — `restoreFailed` is never set, so **no error is shown.**
**Why it matters:** a past_due user on an iPhone taps "Update my card," the tab is blocked, and
nothing happens and nothing explains why — the exact silent dead-end Step 10 Ch2 exists to
eliminate, on the money-recovery path. This one is **live** (the restore screen is shipped).
The `restart`/lapsed branch is fine — it uses `window.location.href`.
**Fix shape:** open a placeholder tab synchronously in the click handler and set its `location`
after the fetch, **or** navigate the current tab with `window.location.href`; and surface
`restoreFailed` when the opened handle is `null`. Client-side fix.
**Pick up when:** next Step 10 / vault-recovery touch, or before real past_due users appear.
