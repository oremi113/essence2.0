---
id: 2026-07-24-app-env-mislabels-preview-deploys-as-production
priority: P3
status: open
opened: 2026-07-24
resolved:
owner_paired: false
summary: `app_env` stamps every deployed non-production build as `production` — `NEXT_PUBLIC_APP_ENV` is set nowhere, so `getAppEnv()` falls back to `NODE_ENV` (which is `production` on preview deploys too), defeating every funnel query's `app_env = 'production'` test-traffic filter; the `preview` enum value is never emitted *(triage 2026-07-24)*
---

# `app_env` mislabels preview / staging traffic as `production`, defeating the funnel's test-traffic filter

*(triage 2026-07-24 — discovery, analytics context.)*

`src/lib/analytics/context.ts:22-24` — `getAppEnv()` is
`process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? 'unknown'`. `NEXT_PUBLIC_APP_ENV` is
referenced only here and is absent from `.env.example` (set nowhere), so the override never fires and the
value falls through to `NODE_ENV` — which Next/Vercel set to `production` for **both** preview and
production deployments. Both analytics catalogs declare the enum as `development | preview | production`
(`docs/analytics/2026-06-16-journey-funnel-events.md`, `docs/analytics/2026-06-01-step6-events.md`) and
rely on `meta->>'app_env' = 'production'` to filter test traffic — yet this code can only ever emit
`development`, `production`, or `test`, **never `preview`**.

**Why it matters:** every funnel query keeps staging / QA traffic out of the real metrics by filtering on
`app_env = 'production'`. Because preview builds also stamp `production`, their traffic silently inflates
the launch numbers everyone reads — the opposite of what the filter is for. This bites hardest right at
launch, when preview/QA activity is highest and the numbers matter most.

**Fix shape:** set `NEXT_PUBLIC_APP_ENV` explicitly per deploy target (add it to `.env.example` and the
preview/prod env config) so previews emit `preview`; optionally map any non-`development` /
non-`production` `NODE_ENV` value to a known enum member rather than passing raw `NODE_ENV` through.
Setting an env var is owner/infra-side, so pair the code note with an env-config change.

**Pick up when:** before public launch (so the go-live funnel is clean), or whenever the deploy-env
config is next touched.
