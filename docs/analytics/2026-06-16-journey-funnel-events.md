---
title: Cross-journey validation funnel — event catalog
date: 2026-06-16
event: multiple
type: new-event
pr: TBD
impact: Adds 4 journey.* events that close the V1 validation funnel around the already-instrumented Step 6 middle — signup → pay → voice-ready → [create/save] → return. Makes "do people pay $12.99/mo and retain?" queryable end-to-end in usage_events.
---

## What changed

V1's whole job is to prove the bet: **people pay $12.99/mo and retain.** Until
now only the Step 6 (message-creation) middle of the funnel was instrumented
(`docs/analytics/2026-06-01-step6-events.md`); the entry, the conversion, the
voice-ready moment, and the return were dark.

This note defines 4 new events under a `journey.` namespace that bracket the
Step 6 events into one end-to-end funnel:

```
journey.onboarding_completed
  → journey.subscription_started        (the $12.99/mo conversion moment)
    → journey.voice_profile_ready
      → step6.message_saved             (already instrumented — Step 6 catalog)
        → journey.app_opened            (return / retention)
```

Naming convention mirrors the Step 6 catalog: `journey.<noun>_<verb>`, snake_case
props, **no PII or content** — only behavioral facts and non-secret identifiers
(`voice_profile_id`). Fired through the same transport (`track()` →
`POST /api/analytics` → `usage_events`); the route allowlist now accepts the
`journey.` prefix. Schema versioned via `schema_version` (starts at `1`).

`journey.*` events are emitted by `src/lib/analytics/journey.ts`
(`trackJourney()`), which attaches the same global-prop envelope as `trackStep6`
via the shared `src/lib/analytics/context.ts`.

## Root cause

New-feature instrumentation, not a change to existing tracking. Defined as the
funnel ships, per CLAUDE.md ("telemetry decisions are cheap during design,
expensive after ship"), so V1 launches able to answer the conversion and
retention questions from day one rather than backfilling events later.

## When

Lands on `main` with the analytics-funnel branch (`feat/analytics-funnel`),
2026-06-16. Backfill the PR number above on merge.

---

## Global props (on every journey.* event)

Identical envelope to the Step 6 catalog — attached automatically by
`trackJourney()`; never pass these by hand. Per-event tables below list only
event-specific props.

| Prop | Type | Notes |
|---|---|---|
| `user_id` | uuid | Authenticated user ID, added server-side by `/api/analytics` |
| `session_id` | uuid \| string | Anonymous app-session ID, shared with `step6.*` within a tab session |
| `app_env` | enum: `development` \| `preview` \| `production` | Keeps test traffic out of prod metrics |
| `app_version` | string | Build/release identifier |
| `platform` | enum: `web` \| `ios` \| `android` | Mobile vs desktop completion diverges on a 45–70 audience |
| `device_type` | enum: `mobile` \| `tablet` \| `desktop` | Same reasoning as `platform` |
| `schema_version` | int | Starts at `1`. Independent of the Step 6 schema version. |
| `timestamp` | iso8601 | Event time, server-corrected |

> **`journey.*` `schema_version` is its own counter**, separate from `step6.*`.
> Bumping one does not bump the other.

---

## Event catalog — V1 (must-ship)

### 1. `journey.onboarding_completed`
**Fires:** Client-side in `OnboardingPageClient.handleComplete`, after the
`completeOnboarding` server action resolves and before the redirect to
`/app/record`. This is the funnel entry — the user is fully signed up and into
the app.
**Props:** none beyond the global envelope.

**Notes:**
- **Signup itself is not a client event.** Account creation happens via
  magic-link auth; read it from `profiles.created_at` server-side. This event
  marks the first instrumentable *in-app* completion.
- **Known over-count risk (FOLLOW_UPS #42):** `completeOnboarding` does not
  currently throw on a failed write, so a silently-failed save still resolves
  and fires this event. Until #42 lands, treat `onboarding_completed` counts as
  an upper bound; reconcile against `profiles.onboarding_completed_at` when a
  precise denominator matters.

---

### 2. `journey.subscription_started`
**Fires:** Client-side on the post-checkout landing (`/app/vault/sealed`, the
Stripe `success_url`), once per mount, **only on a real Stripe return**
(`session_id` present). Mock (`?mock=true`) and direct navigation render the
seal but fire nothing. Deliberately **not** fired inside the Stripe API routes
— webhook-side emission is out of scope here (that surface is owned separately);
this is the user-observed conversion moment.
**Props:**

| Prop | Type | Notes |
|---|---|---|
| `subscription_status` | enum: `trial` \| `active` \| `pending` | Resolved status read from `subscriptions` during the post-checkout poll. `pending` means the browser beat the Stripe webhook back and the row hadn't landed within the ~3s poll window — the conversion still happened. |

**Notes:** A non-trivial rate of `subscription_status: pending` is a
**webhook-lag signal**, not a lost conversion — the user paid; our row was just
late. Watch it as an infra-health metric, and reconcile final trial/active
state from the `subscriptions` table rather than from this prop alone.

---

### 3. `journey.voice_profile_ready`
**Fires:** Client-side in `VoiceCreationView` when its view state first reaches
`success`, once per mount. Covers all three success paths (already-ready on
load, `/start` returned ready, poll observed ready) via a single
state-watching effect.
**Props:**

| Prop | Type | Notes |
|---|---|---|
| `voice_profile_id` | uuid \| null | The preserved voice that became ready. `null` only if the page mounted without a `voiceProfileId` query param (it shouldn't reach `success` in that case). |

**Notes:** **Not DB-write-verified (FOLLOW_UPS #43).** The success view can be
shown while the `voice_profiles` row write lags, so this reflects what the
client observed, not a confirmed persisted `status = 'ready'`. For a
write-verified count, join against `voice_profiles.status` server-side.

---

### 4. `journey.app_opened`
**Fires:** On render of `/home` for an authenticated, onboarded user, once per
mount, via `<JourneyBeacon>`. New users are redirected to onboarding before
this renders, so reaching here is a genuine returning/continuing session — not
a first run.
**Props:** none beyond the global envelope.

**Notes:**
- Retention is computed from the **event existence × `user_id` × day**, not from
  a prop — see the funnel-read section.
- This fires on `/home` only. A user who deep-links straight to another
  authenticated surface won't emit it that session; `/home` is the V1 returning
  anchor, not an exhaustive "any app open" beacon. Widen later if retention
  reads look low (see blind spots).

---

## How to read the funnel

All events land in `usage_events` with `action`, `user_id`, `meta` (jsonb), and
`timestamp`. Filter test traffic with `meta->>'app_env' = 'production'`.

**Did they pay? (conversion)**
```sql
-- Onboarded → subscribed, by cohort day.
with onboarded as (
  select distinct user_id, min(timestamp)::date as day
  from usage_events
  where action = 'journey.onboarding_completed'
    and meta->>'app_env' = 'production'
  group by user_id
),
paid as (
  select distinct user_id
  from usage_events
  where action = 'journey.subscription_started'
    and meta->>'app_env' = 'production'
)
select o.day,
       count(*)                                            as onboarded,
       count(*) filter (where p.user_id is not null)       as subscribed,
       round(100.0 * count(*) filter (where p.user_id is not null)
             / nullif(count(*), 0), 1)                     as pct
from onboarded o
left join paid p using (user_id)
group by o.day
order by o.day;
```

**Full spine survival (signup → pay → voice → save):**
```sql
-- One row per stage; each count is distinct users who reached that stage.
select 'onboarded'  as stage, count(distinct user_id) from usage_events where action = 'journey.onboarding_completed'
union all
select 'subscribed',          count(distinct user_id) from usage_events where action = 'journey.subscription_started'
union all
select 'voice_ready',         count(distinct user_id) from usage_events where action = 'journey.voice_profile_ready'
union all
select 'message_saved',       count(distinct user_id) from usage_events where action = 'step6.message_saved';
```

**Did they come back? (retention)**
```sql
-- D1+ return: users who fired app_opened on a day strictly after their signup day.
with signup as (
  select user_id, min(timestamp)::date as signup_day
  from usage_events
  where action = 'journey.onboarding_completed'
  group by user_id
),
returns as (
  select distinct user_id, timestamp::date as day
  from usage_events
  where action = 'journey.app_opened'
)
select count(distinct r.user_id) filter (where r.day > s.signup_day) as returned_users,
       count(distinct s.user_id)                                     as signed_up,
       round(100.0 * count(distinct r.user_id) filter (where r.day > s.signup_day)
             / nullif(count(distinct s.user_id), 0), 1)              as retention_pct
from signup s
left join returns r using (user_id);
```
Swap `r.day > s.signup_day` for `r.day = s.signup_day + 7` (etc.) to read a
specific Dn window.

**Webhook health:** rate of `subscription_started` with
`meta->>'subscription_status' = 'pending'` — should trend toward zero as the
webhook keeps up.

## V1 blind spots — known and accepted

- **Onboarding over-count** until FOLLOW_UPS #42 (failed-save guard) lands.
- **Voice-ready not write-verified** (FOLLOW_UPS #43) — client-observed, not a
  confirmed persisted row.
- **`app_opened` is `/home`-only**, not every authenticated entry point — a
  user who never lands on `/home` in a session won't register as returning that
  session. Acceptable for V1; widen the anchor if retention reads implausibly
  low.
- **No explicit signup event** — derived from `profiles`/`onboarding_completed`,
  not a client `journey.*` event.

## What to watch

- **`onboarding_completed → subscription_started` rate** — the core "do people
  pay?" read. The headline V1 number.
- **`subscription_started.subscription_status` split** — `trial` vs `active`
  tells you trial-led vs immediate-pay conversion; `pending` is webhook-lag
  noise, not a lost sale.
- **`voice_profile_ready` vs `subscription_started`** — paid users whose voice
  never came out are a churn risk concentrated at the ElevenLabs step.
- **`app_opened` distinct-users-per-day trend** — the retention curve. The
  second half of the bet.

### Benchmarks (calibration-pending)

As with the Step 6 catalog: treat any conversion or retention threshold as
**calibration-pending until two weeks of real cohorts.** Instrument, ship, watch
the first cohorts, then set thresholds from what real users do — not from
pre-launch hopes.

## What is NOT logged

By design, consistent with the Step 6 catalog: no names, no message or note
content, no audio or URLs, no Stripe customer/subscription IDs, no email. Only
behavioral facts (completion, conversion, return) and the non-secret
`voice_profile_id`. The `subscriptions` table — not analytics — remains the
source of truth for billing identifiers and final subscription state.
