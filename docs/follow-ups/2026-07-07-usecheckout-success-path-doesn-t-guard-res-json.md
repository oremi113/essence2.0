---
id: 2026-07-07-usecheckout-success-path-doesn-t-guard-res-json
legacy_id: 89
priority: P3
status: open
opened: 2026-07-07
resolved:
summary: "`useCheckout` success path doesn't guard `res.json()`/missing `checkoutUrl` → CTA can stick; `push(undefined)` returns `true` *(triage 2026-07-07)*"
---

# `useCheckout` success path doesn't guard `res.json()` / a missing `checkoutUrl` → the CTA can stick disabled, and `push(undefined)` reports success

*(triage 2026-07-07)*
`src/lib/stripe/useCheckout.ts:54-63` — the error path defensively parses JSON
(`.catch(() => ({}))`, l.45), but the success path does `const { checkoutUrl } = (await
res.json())` unguarded. Callers await it with no try/catch (e.g. `vault/protect/actions.tsx:26`,
`seal/actions.tsx`), so a throw leaves `setIsProcessing(false)` unreached → the CTA stays
`disabled` forever with no error. And if the body is valid JSON but missing the field,
`checkoutUrl` is `undefined` → the `^https?` test is false → `router.push(undefined)` no-ops →
the function still `return true`, so the caller thinks navigation is underway and also stays stuck.
**Why it matters:** both cases defeat the hook's own "no dead spinner" mandate. Requires a
contract-breaking 200 (proxy interstitial, truncated body, field-name change), so it's
robustness debt — but the `push(undefined)`-returns-`true` logic hole is real regardless.
**Fix shape:** wrap the success parse in the same try/catch and validate
`typeof checkoutUrl === 'string' && checkoutUrl` before navigating; return `false` on parse
failure or missing URL. *Note:* the restore restart branch (`vault/restore/actions.tsx:52-71`)
inlines this same fetch instead of reusing `useCheckout`, so the guard must be applied there
too (or the duplication collapsed).
**Pick up when:** next checkout/Step 10 touch. Agent-fixable.
