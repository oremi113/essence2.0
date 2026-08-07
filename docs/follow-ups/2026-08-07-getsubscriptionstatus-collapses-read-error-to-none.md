---
id: 2026-08-07-getsubscriptionstatus-collapses-read-error-to-none
priority: P3
status: open
opened: 2026-08-07
resolved:
owner_paired: false
summary: `getSubscriptionStatus` collapses a DB read *error* into `status: 'none'` → a transient blip downgrades a paying user to unpaid across every entitlement gate *(triage 2026-08-07)*
---

# A transient DB error makes the canonical entitlement reader report a paying user as unsubscribed

*(triage 2026-08-07)*
`src/lib/subscription/get-status.ts:27` — `if (error || !data) { return { status: 'none', ... } }`.

This is the single entitlement reader used across the app — vault reveal/protect/restore, `/app/record`, `/app/voice/processing`, `/api/messages/save`, `home`, `create-checkout-session`, and `voice-creation/entitlement` all call it. It cannot distinguish a genuine "user has no subscription" from a transient Supabase/network read failure: both collapse to `status: 'none'`.

**Why it matters:** on a momentary DB error, an active/trial subscriber reads as `none` and gets the unpaid experience everywhere at once — paywalled, vault-locked, bounced toward restart. Fail-open-to-unpaid is the wrong default for an entitlement gate: it locks a paying customer out of what they paid for on a blip they can't see. Harms no user in steady state (hence P3), but a latent landmine that grows more visible once S5 turns real billing on and these gates start denying access.

**Fix shape:** distinguish the two. On `error` (as opposed to genuinely-empty `data`), throw or return a distinct `unknown`/`error` state so callers can fail *safe* — retry, or preserve prior access — rather than render the unpaid experience. Keep the `'none'` return only for the empty-result case.

**Pick up when:** before S5, or the next subscription-gate pass. Cheap, self-contained code change; decide the fail-safe direction (retry vs. preserve-access) as part of it.
