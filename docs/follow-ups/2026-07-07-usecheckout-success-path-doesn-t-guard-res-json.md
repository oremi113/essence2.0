---
id: 2026-07-07-usecheckout-success-path-doesn-t-guard-res-json
legacy_id: 89
priority: P3
status: resolved
opened: 2026-07-07
resolved: 2026-07-20
summary: "`useCheckout` success path doesn't guard `res.json()`/missing `checkoutUrl` → CTA can stick; `push(undefined)` returns `true` *(triage 2026-07-07)*"
---

# `useCheckout` success path doesn't guard `res.json()` / a missing `checkoutUrl` → the CTA can stick disabled, and `push(undefined)` reports success

**✅ RESOLVED 2026-07-20** (`refactor/fu-89-checkout-url-guard`) — the success branch of
`useCheckout.ts` now parses defensively (`await res.json().catch(() => ({}))`, mirroring the error
path) and validates `typeof checkoutUrl === 'string' && checkoutUrl` before navigating; a broken 200
(non-JSON body, or valid JSON missing/renaming the field) is logged with the label tag and returns
`false`, so the caller (`CardCaptureActions.handleKeep`) reaches its recoverable-error branch instead
of stranding the CTA on a dead spinner or falsely reporting navigation. Root-cause fix, not a
band-aid: the failure now flows through the hook's *documented* "return false so the caller recovers"
contract rather than swallowing the error. 3 unit tests added (`tests/unit/useCheckout.test.tsx`):
non-JSON ok-body → `false` + no throw + no nav; ok-body missing `checkoutUrl` → `false` (no silent
`push(undefined)`); empty-string `checkoutUrl` → `false`. typecheck ✅ · lint ✅ · unit 389/389 ✅.
*The restore restart branch (`vault/restore/actions.tsx:52-71`) named in the note below was inspected
and already carries the guard (`.catch(() => ({}))` + `!data.checkoutUrl` inside a `try/catch`), so it
was not vulnerable and needed no change; collapsing the duplication was left out of scope as a larger
refactor with different navigation semantics.*

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
