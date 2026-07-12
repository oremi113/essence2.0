---
id: 2026-07-07-double-tap-guards-on-the-checkout-delete-actions
legacy_id: 91
priority: P4
status: open
opened: 2026-07-07
resolved:
summary: Double-tap guards on checkout/delete read render-state not a ref → stray duplicate checkout session *(triage 2026-07-07)*
---

# Double-tap guards on the checkout + delete actions read render-state, not a ref → a fast double-tap can fire two `create-checkout-session` POSTs

*(triage 2026-07-07)*
The `if (isProcessing) return` / `if (isRestoring) return` / `if (deletePending) return` guards
in `src/app/app/vault/protect/actions.tsx:23`, `seal/actions.tsx`, `restore/actions.tsx:21`, and
`SettingsScreen.tsx` (delete confirm) all read a `useState` value captured at render time, so
two handlers firing in the same tick both see the stale `false` and both proceed; the button's
`disabled` prop is the only guard that actually holds (and only after a re-render). Same class
as the email-sheet double-submit guard.
**Why it matters:** low and bounded — a mobile double-tap can create two Stripe Checkout sessions
(one abandoned) or two portal fetches; **not** a double-charge (only one checkout completes),
and delete is further protected server-side. Real, but mitigated.
**Fix shape:** flip a `useRef` latch synchronously at the top of each handler
(`if (inFlight.current) return; inFlight.current = true`) instead of relying on the state read;
do it alongside the email-sheet guard.
**Pick up when:** any input-hardening sweep. Agent-fixable.
