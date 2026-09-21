---
id: 2026-09-04-app-url-localhost-fallback-on-prod-redirects
priority: P3
status: open
opened: 2026-09-04
summary: Three user-facing redirect URLs (Stripe checkout success, Stripe portal return, email-change confirm link) fall back to `http://localhost:3100` when `NEXT_PUBLIC_APP_URL` is unset, and `env.ts` never validates it — so a single missing prod env var silently strands a just-paid user on localhost with no error anywhere
---

# `NEXT_PUBLIC_APP_URL` silently falls back to localhost on production redirects

**What happens:** three places build a user-facing absolute URL as
`process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100'`:

- `src/lib/stripe/create-checkout-session.ts:187` → Stripe Checkout `success_url`
  (`${origin}/app/voice/processing?session_id=...`).
- `src/app/api/stripe/portal-session/route.ts:60` → Customer Portal `return_url`.
- `src/app/app/settings/actions.ts:95` → the email-change confirmation link
  (`emailRedirectTo`).

`src/lib/env.ts` is a thin passthrough (empty-string fallbacks) and does **not**
list or validate `NEXT_PUBLIC_APP_URL`, so nothing fails fast when it's missing.

**Why it matters (plain language):** if this one environment variable isn't set
in production, the app keeps running and looks fine — but a customer who *just
paid* is redirected to `http://localhost:3100` after Stripe checkout (a dead
address on their phone), the "manage subscription" return button does the same,
and email-change confirmation links point at localhost too. It fails **silently**:
no error, no log, just paying users stranded at the worst possible moment. The
`.env.example` production checklist (PR #139) lists the var, but that's a human
checklist — the code doesn't enforce it, so one forgotten value on a deploy is a
money-flow break with no signal.

**Fix shape:** fail loud instead of falling back silently. Either (a) validate
required public URLs in `src/lib/env.ts` and throw at boot/build when
`NEXT_PUBLIC_APP_URL` is unset in production, or (b) derive the origin from the
incoming request headers on these server paths instead of a hardcoded localhost
default. Option (a) is the smaller, single-source change; do it once and let all
three call sites read the validated value.

**Pick up when:** before the first real (non-mock) Stripe transaction in
production, or with the next env/deploy-hardening pass. Agent-fixable (pure code,
no schema/migration).
