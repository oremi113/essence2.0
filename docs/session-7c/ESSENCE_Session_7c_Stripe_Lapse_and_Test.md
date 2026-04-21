# ESSENCE — Session 7c: Lapse Surfaces, Voice Processing Trigger, End-to-End Test Pass

**Scope.** Close out the deferred behavioral surfaces from 7b's open-questions list, then run a comprehensive end-to-end test pass before flipping `VAULT_STRIPE_ENABLED` on in production.

What ships in 7c:
1. `past_due` failure banner (3 variants) on `/app/record`, with `last_failed_attempt_count` driving which variant renders.
2. `/app/vault/restore` screen for the lapsed/cancelled/trial-ended state, with conditional body for users-with-recordings vs. users-without-recordings.
3. Customer Portal handoff for "update payment method" (cancellation deliberately disabled in Dashboard).
4. `voiceProfileStatus → processing` trigger wired at two sites with whichever-event-is-last-wins semantics.
5. `subscriptions.last_failed_attempt_count` schema addition + webhook population.
6. Webhook handler updates: populate `last_failed_attempt_count` on `invoice.payment_failed`, set `status` to `lapsed` (not `cancelled`) on retry-exhaustion deletes.
7. One unit test on the webhook event-type switch.
8. ~25-scenario manual test plan with Stripe test cards.

**Depends on:** Session 7b merged. Session 7b.1 (FK race patch) merged before 7c work begins.

**Shippable?** The new surfaces ship behind no separate flag — they're gated by data state (`status === 'past_due'` for banners, `status === 'lapsed'/'cancelled'` for the restore screen). They're invisible to users not in those states. The full vault-and-Stripe pipeline still gates on `VAULT_STRIPE_ENABLED`, which 7c flips on at the end of the test pass.

**Estimated session length:** Bigger than 7b. Plan for 4–6 focused hours, with the test plan section consuming ~40% of the time.

---

## CONTRACT WITH 7a / 7b / 7b.1 (do not break)

7a, 7b, and 7b.1 are merged. These behaviors must survive 7c unchanged:

1. **Auth redirect path:** `/auth/sign-in?next=/app/vault/<route>`. Not `/login`. Applies to the new `/app/vault/restore` page too.
2. **Screen callback signature:** screens call `onCheckoutInitiate(plan: BillingPlan)` where `BillingPlan = 'monthly' | 'annual'`. Single string argument.
3. **Mock checkout API shape:** `/api/stripe/create-checkout-session` accepts `{ plan }` and returns `{ checkoutUrl: string }`. Unchanged in 7c.
4. **Sealed page gate:** accepts `?mock=true` OR `?session_id=...`. Direct nav without either redirects to `/app/vault/reveal`. Unchanged.
5. **Stable backend, swappable UI:** screen components do not import Stripe, do not import Supabase, do not call `fetch`. Banner and Restore screen follow this pattern — page files fetch data, screens render.
6. **Service role client:** use the existing `supabaseServiceClient` from `src/lib/supabase/service.ts`. Do not create a second service file.
7. **Invoice → subscription field path:** use `invoice.parent?.subscription_details?.subscription` with `parent.type === 'subscription_details'` checked first. The 7b webhook already does this for `invoice.payment_failed`. Any new code that touches invoice → subscription must follow the same pattern.

---

## CONFIRMED REPO FACTS (carry forward)

These are the repo realities Terminal must treat as given. Do not re-derive:

- Next.js 16 with Turbopack, React 19, TypeScript, Tailwind CSS 4
- Supabase auth client: `createSupabaseServerClient()` from `src/lib/supabase/server.ts` — async, requires `await`
- Supabase service client: `supabaseServiceClient` from `src/lib/supabase/service.ts` — for webhook and other unauthenticated server contexts
- Profiles PK is `user_id`, not `id`
- Subscription state lives in `subscriptions` table; there is no `profile.subscription_status` column
- `subscription_status_enum` values: `'none' | 'trial' | 'active' | 'past_due' | 'lapsed' | 'cancelled'`
- `getSubscriptionStatus(userId)` returns `{ status, trialEndsAt, currentPeriodEnd, billingPeriod, cancelAtPeriodEnd }` and defaults to `status: 'none'` for users with no row
- Voice profile state machine (per migrations): `created → collecting → queued → processing → ready/failed`, plus `failed → archived` and `failed → collecting` loopback (migration 20260214). The `queued` value was synced into the TS type by 7b.1.
- `VoiceProfileStatus` TS type lives at `src/lib/profile/voice.ts` (confirmed by 7b.1)
- Localhost is port 3100
- Feature flag utility: `isFeatureEnabled('VAULT_STRIPE_ENABLED')` from `src/lib/feature-flags.ts`. Do not read `process.env.VAULT_STRIPE_ENABLED` directly anywhere else.
- Dev sandbox base path: `src/app/dev/{name}/` — never `src/app/app/dev/`
- Vault routes live under `src/app/app/vault/` (the doubled `app/app/` is correct — `/app` is the authed segment)
- Commit tag: `session-7c`. Branch off main as `session-7c-lapse-surfaces`.

---

## STRIPE DASHBOARD PREREQUISITES (OREMI — DO BEFORE TERMINAL STARTS)

These are manual Dashboard steps. Terminal cannot do them. Do them, confirm, then hand off.

### A. Lower Smart Retries to 4 attempts

Settings → Billing → Subscriptions and emails → Manage failed payments

The current Dashboard setting is **8 attempts over 2 weeks**. Lower it to **4 attempts**. This aligns with the 3-banner copy sequence (banners 1/2/3 cover attempts 1, 2, 3; restore screen fires after attempt 4 exhausts retries and Stripe deletes the subscription).

Confirm the schedule shows roughly: 3 days, 5 days, 7 days, 7 days (Stripe's default 4-attempt cadence). Exact intervals don't matter for the build — what matters is that exactly 4 attempts fire before subscription deletion.

### B. Configure Customer Portal — update payment only, no self-serve cancel

Settings → Billing → Customer portal

- **Functionality → Payment methods:** ON (allow customers to update payment method).
- **Functionality → Cancel subscriptions:** OFF. This is the explicit no-self-serve-cancel decision. Cancellation stays an unbuilt surface — designed later on purpose.
- **Functionality → Update plan:** OFF (no tier changes via portal in this build).
- **Functionality → Invoice history:** ON (low-cost reassurance for users who want to verify charges).
- **Business information → Privacy policy URL** and **Terms of service URL:** fill in if you have them. The Portal renders these as footer links. If you don't have them yet, leave blank — Stripe will not block.
- **Business information → Headline / Description:** leave default or write one short line. Don't over-write — the Portal is functional, not ceremonial.
- **Default redirect link:** `https://<your-production-domain>/app/vault/restore`. For local dev testing, you can use `http://localhost:3100/app/vault/restore` (note: Stripe accepts http for localhost only).

**Critical.** Save the Portal configuration. Without saving, the API call to create portal sessions will return a `Default configuration not found` error.

### C. Confirm webhook events list includes `invoice.payment_failed` and `customer.subscription.deleted`

The 7b webhook should already be subscribed to these. Verify in Developers → Webhooks → your endpoint → Events. If missing, add them. 7c relies on both firing.

### D. Decide on production webhook URL setup — DEFERRED to 7d

Do not configure the production webhook in 7c. That's a pre-flight session of its own (provisional name: 7d). 7c uses `stripe listen --forward-to localhost:3100/api/stripe/webhook` for all testing.

---

## WHAT SESSION 7c BUILDS

In execution order:

1. Schema migration: add `last_failed_attempt_count` column to `subscriptions`.
2. Update webhook handler: populate `last_failed_attempt_count` on `invoice.payment_failed`, distinguish retry-exhaustion deletes (`status: 'lapsed'`) from voluntary deletes (`status: 'cancelled'`).
3. Wire the `voiceProfileStatus → processing` trigger at two sites (webhook + voice recording transition site).
4. Build the `<VaultPastDueBanner />` screen component (in `src/components/vault/`).
5. Wire the banner into `/app/record/page.tsx` — fetches subscription state server-side, renders banner conditionally.
6. Build the `<VaultRestoreScreen />` screen component (in `src/components/screens/vault/`).
7. Build the `/app/vault/restore` page, with auth + status guards and recordings-count branching.
8. Build the Customer Portal handoff: `/api/stripe/portal-session` route + client-side handler.
9. Wire all four CTAs (Banner 1 CTA, Banner 2 CTA, Banner 3 CTA, Restore screen CTA) to the Portal handoff.
10. Add a dev sandbox at `src/app/dev/lapse/` for visual review of all 4 states without needing real Stripe events.
11. Refactor the four other vault page guards (`reveal`, `protect`, `continuity`, `seal`) to also redirect to `/app/vault/restore` when status is `lapsed` or `cancelled`. (Currently they only redirect to `/app/home` for `trial`/`active` and fall through for everything else.)
12. Unit test for the webhook event-type switch (one file, no other automated tests).
13. Manual test plan execution — 25 numbered scenarios.
14. Flip `VAULT_STRIPE_ENABLED` to `true` in local `.env.local` for the test pass. Production stays off until 7d (production webhook setup) ships.
15. Commit + PR.

**Out of scope (deferred):**
- Production webhook URL setup → 7d
- Self-serve cancellation UX → separate settings session, designed deliberately later
- Trial expiration cron / nightly reconciliation → not needed; webhook handles trial-end automatically via `customer.subscription.updated` (status flips to `past_due` if no payment method, then to `unpaid`/`canceled` per retry settings)
- Email notifications on payment events → not scoped
- Proration and tier upgrades → out of Session 7 entirely per Master Spec V3.0
- Multi-language copy → English only

---

## RAILS — read this before writing code

Five things that will trip Terminal up if not internalized first.

### 1. The banner lives at `/app/record`, not `/app/home`

`/app/home` doesn't exist yet. The banner component is built once and imported into `/app/record/page.tsx`. When `/app/home` ships in a future session, moving the banner is a one-import change. The banner component itself is route-agnostic — it takes `attemptCount` and `onUpdateCard` props and renders. Don't hardcode any route awareness into the component.

### 2. `lapsed` vs `cancelled` matters

Stripe's `customer.subscription.deleted` event fires for **both** voluntary cancellations and retry-exhaustion deletes. Currently the 7b webhook marks both as `'cancelled'`. That's wrong for 7c — the restore screen needs to know the difference for future analytics, and the metaphor differs (a lapse is involuntary; a cancellation is a choice).

Distinguish them via `subscription.cancellation_details.reason`:
- `'payment_failed'` → `status: 'lapsed'`
- anything else (`'cancellation_requested'`, `'customer_initiated'`, etc.) → `status: 'cancelled'`
- `null`/missing → fall back to `'cancelled'` (conservative — most likely a manual Dashboard delete)

The restore screen renders the same copy for both states (the user-facing language is "paused" either way). The schema distinction matters for future work, not this session's UI.

### 3. Whichever-event-is-last-wins for the voice processing trigger

Two sites can transition `voice_profile.status` from `collecting` to `processing`:

- **Site A — Webhook:** on `checkout.session.completed`, if the user's voice profile is in `collecting` state, transition it to `processing`.
- **Site B — Voice recording code:** when transitioning a profile from `created → collecting` (i.e., user records first clip), if the user is *already paid* (`subscriptions.status` in `('trial', 'active')`), also fire `collecting → processing` immediately.

Result: a paid user with recordings always lands in `processing` regardless of which event happened last. This handles both orderings:
- User records first, then pays → Site A triggers when the webhook fires.
- User pays first (during trial collection of a re-up flow), then records → Site B triggers when the recording transitions `created → collecting`.

**Terminal must grep before guessing the recording transition site.** Likely paths:
```bash
grep -rn "'collecting'\|status.*collecting\|created.*collecting" src/app/api/audio/ src/lib/profile/ src/lib/voice/ src/app/api/voice/
```
If grep finds zero matches in those paths, expand the search. Do not write speculative code into a file you guessed at — surface to Oremi if the transition site can't be located.

### 4. The unit test is the only automated test

One unit test on the webhook event-type switch. Confirms each handled event type routes to the correct internal handler function. No integration tests, no E2E tests, no Playwright. The 25-scenario manual test plan covers everything else. Don't over-engineer test infrastructure.

### 5. The dev sandbox is for visual review only

`src/app/dev/lapse/` renders the banner and restore screen with mock data so Oremi can review the visual states without needing to drive real Stripe events. It is not a route the user reaches and it is not in any production build path. Do not link to it from anywhere in the app.

---

## STEP 1 — Schema migration: `last_failed_attempt_count`

**File:** `supabase/migrations/YYYYMMDDHHMMSS_add_failed_attempt_count.sql` (use current timestamp)

```sql
-- Track Stripe's invoice.attempt_count at the most recent payment failure.
-- Drives which banner variant (1/2/3) renders on /app/record.
-- 0 = no failed attempts (default). 1+ = failed attempts.
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS last_failed_attempt_count INTEGER NOT NULL DEFAULT 0;
```

That's it. No index — the column is read alongside `status` in the same query that already exists, no separate lookup pattern.

**Smoke test:**
```bash
pnpm supabase db push
# Verify in Supabase Studio: subscriptions table now has last_failed_attempt_count column,
# default 0, NOT NULL.
```

---

## STEP 2 — Update `getSubscriptionStatus` to expose the attempt count

**File:** `src/lib/subscription/get-status.ts`

Add `lastFailedAttemptCount` to the return shape. The banner needs this value to pick which variant to render.

```ts
// EXISTING shape (from 7b):
export interface SubscriptionRecord {
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  billingPeriod: 'monthly' | 'annual' | null;
  cancelAtPeriodEnd: boolean;
}

// AFTER 7c:
export interface SubscriptionRecord {
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  billingPeriod: 'monthly' | 'annual' | null;
  cancelAtPeriodEnd: boolean;
  lastFailedAttemptCount: number;  // NEW
}
```

Update the `.select()` to include `last_failed_attempt_count` and the return mapping:

```ts
const { data, error } = await supabase
  .from('subscriptions')
  .select(
    'status, trial_ends_at, current_period_end, billing_period, cancel_at_period_end, last_failed_attempt_count'
  )
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (error || !data) {
  return {
    status: 'none',
    trialEndsAt: null,
    currentPeriodEnd: null,
    billingPeriod: null,
    cancelAtPeriodEnd: false,
    lastFailedAttemptCount: 0,  // NEW
  };
}

return {
  status: data.status as SubscriptionStatus,
  trialEndsAt: data.trial_ends_at,
  currentPeriodEnd: data.current_period_end,
  billingPeriod: data.billing_period as 'monthly' | 'annual' | null,
  cancelAtPeriodEnd: data.cancel_at_period_end,
  lastFailedAttemptCount: data.last_failed_attempt_count ?? 0,  // NEW
};
```

**Smoke test:** `pnpm tsc --noEmit`. No errors. Existing 7b consumers of `getSubscriptionStatus` continue to work — the new field is additive.

---

## STEP 3 — Webhook updates

**File:** `src/app/api/stripe/webhook/route.ts`

Three changes to the existing handlers, plus one new helper internal to this file.

### 3a. Update `handlePaymentFailed` to populate `last_failed_attempt_count`

Find the existing `handlePaymentFailed` function. The 7b version sets `status: 'past_due'`. Add `last_failed_attempt_count` to the same UPDATE.

Stripe's invoice object exposes `attempt_count` at the top level. It increments with each failed payment attempt for the same invoice.

```ts
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Use the parent.subscription_details.subscription path (Basil API, 2025-03-31).
  // 7b already does this. Match the existing pattern in this file.
  const subscriptionId =
    invoice.parent?.type === 'subscription_details'
      ? invoice.parent.subscription_details?.subscription
      : null;

  if (!subscriptionId) {
    console.warn('[stripe-webhook] invoice.payment_failed missing subscription id', invoice.id);
    return;
  }

  const subId = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id;
  const attemptCount = invoice.attempt_count ?? 0;

  const { error } = await supabaseServiceClient
    .from('subscriptions')
    .update({
      status: 'past_due',
      last_failed_attempt_count: attemptCount,
    })
    .eq('stripe_subscription_id', subId);

  if (error) {
    console.error('[stripe-webhook] Failed to mark past_due', error);
    throw error;
  }

  console.log(
    `[stripe-webhook] marked past_due, attempt ${attemptCount}, sub ${subId}`
  );
}
```

**Surgical edit guidance.** Do not rewrite this function from scratch. The grep target is the existing `async function handlePaymentFailed(invoice: Stripe.Invoice)` block. Confirm it currently matches the 7b shape (single UPDATE, sets only `status`) before editing. If it differs, surface to Oremi.

### 3b. Update `handleSubscriptionDeleted` to distinguish lapsed vs cancelled

Find the existing `handleSubscriptionDeleted` function. The 7b version always sets `status: 'cancelled'`. 7c branches on `cancellation_details.reason`.

```ts
async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  // Stripe's customer.subscription.deleted fires for BOTH retry-exhaustion lapses
  // and voluntary cancellations. Distinguish via cancellation_details.reason.
  const reason = sub.cancellation_details?.reason;
  const status = reason === 'payment_failed' ? 'lapsed' : 'cancelled';

  const { error } = await supabaseServiceClient
    .from('subscriptions')
    .update({
      status,
      cancelled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', sub.id);

  if (error) {
    console.error('[stripe-webhook] Failed to mark deleted', error);
    throw error;
  }

  console.log(
    `[stripe-webhook] subscription deleted, status=${status}, reason=${reason ?? 'unknown'}, sub ${sub.id}`
  );
}
```

Both `lapsed` and `cancelled` reuse the existing `cancelled_at` column for the timestamp — no schema change needed. The column is named `cancelled_at` for historical reasons; it really means "ended_at." Renaming is a future cleanup, not 7c.

### 3c. Wire the voice processing trigger on `checkout.session.completed`

This is Site A of the two-site trigger. The handler runs after `upsertSubscription` completes successfully. If the user has a voice profile in `'collecting'` state, transition it to `'processing'`.

Find the existing `handleCheckoutCompleted` function. After the `await upsertSubscription(...)` line, add:

```ts
// Site A of voice processing trigger (whichever-event-is-last-wins).
// If user already has a collecting profile, transition to processing now.
await maybeTriggerVoiceProcessing(session.metadata.user_id);
```

Then add the helper at the bottom of the file:

```ts
/**
 * Transition voice profile to 'processing' if currently in 'collecting'.
 * Idempotent — does nothing if no profile exists, or if profile is in any
 * other state. Called from checkout.session.completed (Site A) and from
 * the voice recording transition site (Site B). Whichever fires last wins.
 */
async function maybeTriggerVoiceProcessing(userId: string) {
  const { data: profile, error: readErr } = await supabaseServiceClient
    .from('voice_profiles')
    .select('id, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (readErr) {
    console.error('[stripe-webhook] voice_profile lookup failed', readErr);
    return; // do not throw — Stripe should not retry on this branch
  }

  if (!profile) {
    console.log(`[stripe-webhook] no voice profile for user ${userId}, skipping processing trigger`);
    return;
  }

  if (profile.status !== 'collecting') {
    console.log(
      `[stripe-webhook] voice profile status=${profile.status} (not collecting), skipping`
    );
    return;
  }

  const { error: updateErr } = await supabaseServiceClient
    .from('voice_profiles')
    .update({ status: 'processing' })
    .eq('id', profile.id)
    .eq('status', 'collecting'); // optimistic concurrency: only update if still collecting

  if (updateErr) {
    console.error('[stripe-webhook] voice_profile transition failed', updateErr);
    return;
  }

  console.log(`[stripe-webhook] transitioned voice_profile ${profile.id} to processing`);
}
```

**Notes:**
- The `.eq('status', 'collecting')` clause on the UPDATE is optimistic concurrency — if Site B already moved the profile to `processing` between our SELECT and our UPDATE, the UPDATE matches zero rows and silently succeeds. Correct.
- We use `maybeSingle()` rather than `single()` because users may complete checkout before recording (legitimate path — they pay first, then record). No profile yet is a normal state.
- We do not throw on lookup failure. The webhook still returns 200 and the subscription is correctly recorded. The voice trigger is a soft secondary effect.

**Verify the table name.** The grep target is `voice_profiles` (lowercase, plural). Confirm with:
```bash
grep -rn "from.*voice_profile\|from.*'voice_profiles'" src/lib/profile/ src/app/api/
```
If the table is named differently (`voiceprofiles`, `voice_profile` singular, etc.), use whatever the existing code uses. Do not create a parallel naming convention.

---

## STEP 4 — Wire Site B of the voice processing trigger

This is the harder of the two trigger sites because it lives in code Terminal hasn't seen yet.

**Goal:** when a user records their first clip and the voice profile transitions `created → collecting`, also fire `collecting → processing` if the user is already paid.

### 4a. Locate the existing transition site

```bash
# Primary search — look for explicit transition strings
grep -rn "'collecting'" src/app/ src/lib/

# Secondary — look for any voice_profiles UPDATE with a status field
grep -rn "voice_profiles" src/app/api/ src/lib/
```

The most likely site is in `src/app/api/audio/` (the upload route handler) or `src/lib/profile/voice.ts`. The transition probably happens inside whichever function handles the first successful clip upload.

If grep returns no obvious site, expand the search:
```bash
grep -rn "training_clip\|trainingClip\|first.*clip\|clip.*upload" src/
```

If still no match, **stop and surface to Oremi.** Do not write the trigger into a guessed file. The 7b.1 doc already established `voice_profiles` exists and the `'queued'` enum was synced — the table and transitions exist somewhere in this codebase.

### 4b. Add the trigger after the existing `created → collecting` transition

Once the site is located, add a follow-up check immediately after the successful transition. Pseudocode for what to add:

```ts
// EXISTING (do not modify):
//   await supabase.from('voice_profiles')
//     .update({ status: 'collecting' })
//     .eq('id', profileId)
//     .eq('status', 'created');
//
// NEW (add after the existing transition succeeds):

// Site B of voice processing trigger (whichever-event-is-last-wins).
// If the user is already paid, also transition collecting → processing.
const { data: sub } = await supabase
  .from('subscriptions')
  .select('status')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (sub?.status === 'trial' || sub?.status === 'active') {
  const { error: processingErr } = await supabase
    .from('voice_profiles')
    .update({ status: 'processing' })
    .eq('id', profileId)
    .eq('status', 'collecting'); // optimistic concurrency

  if (processingErr) {
    console.error('[voice-recording] processing trigger failed', processingErr);
    // Do not throw — the recording itself succeeded. Trigger is best-effort.
  } else {
    console.log(`[voice-recording] transitioned voice_profile ${profileId} to processing`);
  }
}
```

**Use whichever Supabase client the existing code uses.** If the existing transition code uses `createSupabaseServerClient()`, this block uses the same. If it uses some other client (e.g., a route handler client), match that. Do not introduce `supabaseServiceClient` into a non-webhook code path — it bypasses RLS and is the wrong tool here.

**Optimistic concurrency note (same as Site A).** The `.eq('status', 'collecting')` clause means if Site A already transitioned the profile during a parallel checkout completion, this UPDATE matches zero rows. That's correct — both sites converge on the same end state without locking.

### 4c. What if the existing transition is conditional or wrapped in business logic?

Some recording flows transition `created → collecting` only after N clips are recorded (training threshold). If the existing site has that conditional, place the new trigger inside the same conditional, after the transition. The trigger should fire *every time* the profile actually moves to `collecting`, never speculatively before.

If the recording code doesn't currently have the `created → collecting` transition at all (e.g., profiles are created already in `collecting` state), the trigger logic shifts: instead, add it to whatever site moves a profile out of its initial state. Surface to Oremi if this is the case — it changes the spec.

**Smoke test (manual).**
1. Reset a test user: delete their `voice_profiles` row, delete their `subscriptions` row.
2. Sign in as them. Record one clip. Confirm in Supabase Studio: `voice_profiles.status = 'collecting'`. The trigger did not fire because the user is unpaid — correct.
3. Run a test checkout to completion. Webhook fires. Confirm Site A triggered: `voice_profiles.status = 'processing'`.
4. Reset again. This time, run checkout first (so subscription is `'trial'` before any recording). Then record one clip. Confirm Site B triggered: `voice_profiles.status = 'processing'` immediately after the recording UPDATE.

---

## STEP 5 — Build the `<VaultPastDueBanner />` component

**File:** `src/components/vault/VaultPastDueBanner.tsx` (new file, new directory)

Create the directory if needed: `src/components/vault/`. This is the home for vault-related UI surfaces that aren't full screens (banner is one example; future microcopy components could land here too).

### 5a. Component contract

```ts
export interface VaultPastDueBannerProps {
  /**
   * Number of failed payment attempts. Drives variant selection:
   *   1 → Banner Variant 1 ("Your card didn't go through this time.")
   *   2 → Banner Variant 2 ("Your card didn't go through again.")
   *   3 or more → Banner Variant 3 ("One more attempt before your vault pauses.")
   *
   * Note: with Smart Retries set to 4 attempts, the highest value seen here is 3.
   * Banner 3 covers attempt 3; the restore screen takes over after attempt 4.
   * Defensive cap at 3+ in case Smart Retries is ever raised.
   */
  attemptCount: number;

  /**
   * Called when user taps the "Update card" CTA. Opens Customer Portal in a new tab.
   * Implementation lives in the page; the screen component does not call fetch.
   */
  onUpdateCard: () => void;
}
```

### 5b. Visual specification

The banner uses the MINERAL & WARMTH design tokens. Key constraints from the design system:
- Cream/oat background tones for surfaces, mineral blue-gray for accents
- Spectral serif for headlines, Inter for body
- `@theme` tokens only — **no hex values** anywhere in component code
- No bounce animations, no startup-y rendering theater
- The banner is a *quiet* alert. Not red. Not pulsing. Not capslock.

**Layout:**
- Full-width banner anchored at the top of the page below the app header
- Padding: `var(--space-md) var(--space-lg)` (or whatever the design tokens use; check `design-tokens.md` in project knowledge)
- Two-row stacked layout on mobile (header line, body line, CTA button on its own row)
- Single-row layout on desktop (header + body inline left, CTA button right-aligned)
- Subtle warm-tone background — *not* the cream main background, but a slightly more saturated warm shade that signals "attention" without alarming. If the design system has a `--color-surface-warning` or `--color-surface-elevated-warm` token, use that. If not, use the standard warm surface and add a subtle border-bottom in the mineral accent color.

**Type:**
- Header: Spectral serif, `var(--text-body-lg)` or equivalent, weight 500, color `var(--color-text-primary)`
- Body: Inter, `var(--text-body)`, color `var(--color-text-secondary)`, line-height 1.5
- Header sits above body on a separate line, both left-aligned

**CTA:**
- Single button labeled "Update card"
- Use the existing primary button style (`btn-primary` or whatever the codebase uses — match the protect screen's CTA style)
- Opens in a new tab — implementation handled by the page via `window.open(portalUrl, '_blank')`

### 5c. Component code

```tsx
'use client';

import type { VaultPastDueBannerProps } from './types'; // or inline

interface CopyVariant {
  header: string;
  body: string;
}

const COPY_VARIANTS: Record<1 | 2 | 3, CopyVariant> = {
  1: {
    header: "Your card didn't go through this time.",
    body: "Stripe will try again in a few days. You don't need to do anything yet — but you can update your card now if you'd rather.",
  },
  2: {
    header: "Your card didn't go through again.",
    body: "Stripe will try once more in a few days. Updating your card now is the easiest fix.",
  },
  3: {
    header: "One more attempt before your vault pauses.",
    body: "If this last try doesn't go through, your vault pauses until you update your card. Your messages are safe either way.",
  },
};

function pickVariant(attemptCount: number): CopyVariant {
  if (attemptCount <= 1) return COPY_VARIANTS[1];
  if (attemptCount === 2) return COPY_VARIANTS[2];
  return COPY_VARIANTS[3]; // 3 or more
}

export function VaultPastDueBanner({
  attemptCount,
  onUpdateCard,
}: {
  attemptCount: number;
  onUpdateCard: () => void;
}) {
  const copy = pickVariant(attemptCount);

  return (
    <div
      role="status"
      aria-live="polite"
      className="vault-past-due-banner"
    >
      <div className="vault-past-due-banner__content">
        <p className="vault-past-due-banner__header">{copy.header}</p>
        <p className="vault-past-due-banner__body">{copy.body}</p>
      </div>
      <button
        type="button"
        className="vault-past-due-banner__cta btn-primary"
        onClick={onUpdateCard}
      >
        Update card
      </button>
    </div>
  );
}
```

### 5d. Styles

Add to whatever stylesheet the codebase uses for component-scoped CSS. If the codebase uses Tailwind utility classes inline rather than component-scoped CSS, translate the below into Tailwind classes using design tokens.

```css
.vault-past-due-banner {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-surface-warm); /* or the warning surface token if it exists */
  border-bottom: 1px solid var(--color-border-subtle);
}

.vault-past-due-banner__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.vault-past-due-banner__header {
  font-family: var(--font-display);
  font-size: var(--text-body-lg);
  font-weight: 500;
  color: var(--color-text-primary);
  line-height: 1.4;
  margin: 0;
}

.vault-past-due-banner__body {
  font-family: var(--font-body);
  font-size: var(--text-body);
  color: var(--color-text-secondary);
  line-height: 1.5;
  margin: 0;
}

.vault-past-due-banner__cta {
  align-self: flex-start;
}

@media (min-width: 768px) {
  .vault-past-due-banner {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .vault-past-due-banner__content {
    flex: 1;
  }
  .vault-past-due-banner__cta {
    align-self: center;
    flex-shrink: 0;
  }
}
```

**Smoke test:** `pnpm tsc --noEmit`. No errors.

---

## STEP 6 — Build the Customer Portal handoff route

**File:** `src/app/api/stripe/portal-session/route.ts` (new file)

The Customer Portal needs a session URL created server-side. The client POSTs to this route, receives a URL, and opens it in a new tab.

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';

export async function POST(_req: NextRequest) {
  if (!isFeatureEnabled('VAULT_STRIPE_ENABLED')) {
    return NextResponse.json(
      { error: 'Stripe disabled' },
      { status: 503 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Not authenticated', redirect: '/auth/sign-in?next=/app/vault/restore' },
      { status: 401 }
    );
  }

  // Look up the user's Stripe customer ID from profiles
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileErr || !profile?.stripe_customer_id) {
    console.error('[portal-session] no stripe_customer_id for user', user.id, profileErr);
    return NextResponse.json(
      { error: 'No Stripe customer found' },
      { status: 404 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100';
  const returnUrl = `${baseUrl}/app/vault/restore`;

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });

    return NextResponse.json({ portalUrl: portalSession.url });
  } catch (err) {
    console.error('[portal-session] Stripe portal create failed', err);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
```

**About `return_url`.** This is where Stripe sends the user when they click "Return to ESSENCE" in the Portal. We always return them to `/app/vault/restore`. If their card update succeeded, the webhook will have flipped their `subscriptions.status` back to `active` by the time they land — and the page-level guard on `/app/vault/restore` should detect that and redirect them onward (we'll handle that in Step 8).

**About error states.** If the Customer Portal isn't configured in the Stripe Dashboard (Prereq B), this route returns a 500 with the error message `No such default configuration` from Stripe. Catching that specific error and returning a clearer message is gold-plating — defer.

**Smoke test:**
- `pnpm tsc --noEmit`
- With flag ON and signed in: `curl -X POST http://localhost:3100/api/stripe/portal-session` returns `{ portalUrl: 'https://billing.stripe.com/p/...' }`. (You'll need a session cookie for this curl to work — easier to test from the dev sandbox or browser console.)
- Open the returned URL. Confirm the Portal renders with payment method update available, no cancel button.

---

## STEP 7 — Build the `<VaultRestoreScreen />` component

**File:** `src/components/screens/vault/VaultRestoreScreen.tsx` (new file in the existing screens directory)

### 7a. Component contract

```ts
export interface VaultRestoreScreenProps {
  /**
   * True if the user has at least one recording. Drives body copy variant.
   * False = "Your vault is ready when you are" (no-recordings variant).
   * True  = "Your messages are still here, exactly as you left them" (default).
   */
  hasRecordings: boolean;

  /**
   * Called when user taps the "Bring my vault back" CTA. Opens Customer Portal in a new tab.
   */
  onRestore: () => void;
}
```

### 7b. Visual specification

The restore screen is in the **elevated register**, not the operational register. It's a quiet, ceremonial moment. Per the design philosophy: "felt, not understood." Reference points: the protect screen's pacing, the sealed screen's stillness.

Layout:
- Full-screen, centered vertically and horizontally
- Generous vertical white space (per the 45–70 demographic UX principles)
- Single column, narrow max-width (around 32rem / 512px)
- No banner, no chrome, no breadcrumbs

Type:
- Header: Spectral serif, large display size (`var(--text-display)` or equivalent — match the other vault screen headers like protect/sealed), weight 400 or 500, letter-spacing -0.01em
- Body: Inter, `var(--text-body-lg)`, color `var(--color-text-secondary)`, line-height 1.7 (slow, readable)
- Body has two paragraphs separated by `var(--space-md)` — a single breath of space between

CTA:
- Single primary button: "Bring my vault back"
- Use the existing primary button style; match the style used on the sealed screen's "Hear your voice" button — same weight, same scale

No secondary CTA, no support line (per locked decisions, support line is skipped for this build).

### 7c. Component code

```tsx
'use client';

interface CopyVariant {
  body1: string;
  body2: string;
}

const COPY_HAS_RECORDINGS: CopyVariant = {
  body1: 'Your messages are still here, exactly as you left them. They\'re not going anywhere.',
  body2: 'When you\'re ready to bring the vault back, updating your card is the only step.',
};

const COPY_NO_RECORDINGS: CopyVariant = {
  body1: 'Your vault is ready when you are. Updating your card is the only step.',
  body2: 'When you come back, your first recording will be waiting.',
};

export function VaultRestoreScreen({
  hasRecordings,
  onRestore,
}: {
  hasRecordings: boolean;
  onRestore: () => void;
}) {
  const copy = hasRecordings ? COPY_HAS_RECORDINGS : COPY_NO_RECORDINGS;

  return (
    <main className="vault-restore-screen">
      <div className="vault-restore-screen__inner">
        <h1 className="vault-restore-screen__header">Your vault is paused.</h1>

        <div className="vault-restore-screen__body">
          <p>{copy.body1}</p>
          <p>{copy.body2}</p>
        </div>

        <button
          type="button"
          className="vault-restore-screen__cta btn-primary"
          onClick={onRestore}
        >
          Bring my vault back
        </button>
      </div>
    </main>
  );
}
```

### 7d. Styles

```css
.vault-restore-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xl) var(--space-lg);
  background: var(--color-surface-base); /* cream/oat */
}

.vault-restore-screen__inner {
  max-width: 32rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2xl);
  text-align: center;
}

.vault-restore-screen__header {
  font-family: var(--font-display);
  font-size: var(--text-display);
  font-weight: 500;
  color: var(--color-text-primary);
  line-height: 1.15;
  letter-spacing: -0.01em;
  margin: 0;
}

.vault-restore-screen__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.vault-restore-screen__body p {
  font-family: var(--font-body);
  font-size: var(--text-body-lg);
  color: var(--color-text-secondary);
  line-height: 1.7;
  margin: 0;
}

.vault-restore-screen__cta {
  /* Use whatever sizing the protect/sealed screens use for their primary CTAs */
  min-width: 220px;
}
```

**Smoke test:** `pnpm tsc --noEmit`.

---

## STEP 8 — Build the `/app/vault/restore` page

**File:** `src/app/app/vault/restore/page.tsx` (new file in new directory)

```tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSubscriptionStatus } from '@/lib/subscription/get-status';
import { VaultRestoreScreen } from '@/components/screens/vault/VaultRestoreScreen';
import { RestoreActionWrapper } from './RestoreActionWrapper';

const VAULT_ROUTE = '/app/vault/restore';

export default async function VaultRestorePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/sign-in?next=${VAULT_ROUTE}`);
  }

  // Check subscription status. If user is back to active/trial (e.g., they
  // just updated their card and the webhook fired), bounce them onward.
  const sub = await getSubscriptionStatus(user.id);
  if (sub.status === 'trial' || sub.status === 'active') {
    redirect('/app/record'); // moves to /app/home when that exists
  }

  // If user has no subscription history at all, this page doesn't apply —
  // send them to the start of the vault flow.
  if (sub.status === 'none') {
    redirect('/app/vault/reveal');
  }

  // Sub status is one of: 'past_due' | 'lapsed' | 'cancelled'. Render restore.
  // Determine has-recordings for body copy variant.
  // GREP TARGET for the recordings table — likely 'training_clips' or 'recordings'.
  // Confirm the table name with: grep -rn "training_clips\|from('recordings'" src/
  const { count, error: countErr } = await supabase
    .from('training_clips') // ← VERIFY before shipping; see comment above
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .limit(1);

  if (countErr) {
    console.error('[vault/restore] recordings count failed', countErr);
    // Fail gracefully — show the has-recordings variant by default.
    // Loss-aversion-safe: it's better to over-promise "your messages are here"
    // than to under-promise to a user who actually has recordings.
  }

  const hasRecordings = (count ?? 0) > 0;

  return (
    <RestoreActionWrapper hasRecordings={hasRecordings} />
  );
}
```

### 8a. Client wrapper for the Customer Portal action

The screen needs an `onRestore` handler that calls the Portal route from the client (so the new-tab open works). The cleanest split: page.tsx fetches the data, a small client wrapper calls the API and renders the screen.

**File:** `src/app/app/vault/restore/RestoreActionWrapper.tsx` (new file)

```tsx
'use client';

import { useState } from 'react';
import { VaultRestoreScreen } from '@/components/screens/vault/VaultRestoreScreen';

export function RestoreActionWrapper({ hasRecordings }: { hasRecordings: boolean }) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleRestore() {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/stripe/portal-session', { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.portalUrl) {
        console.error('[RestoreActionWrapper] portal session failed', data);
        // Surface a soft error — for now, just log. Future enhancement: inline error UI.
        setIsLoading(false);
        return;
      }

      window.open(data.portalUrl, '_blank', 'noopener,noreferrer');
      setIsLoading(false);
    } catch (err) {
      console.error('[RestoreActionWrapper] portal request errored', err);
      setIsLoading(false);
    }
  }

  return (
    <VaultRestoreScreen hasRecordings={hasRecordings} onRestore={handleRestore} />
  );
}
```

### 8b. Verify the recordings table name

Before this page works, Terminal must confirm the actual table name. Run:
```bash
grep -rn "training_clips\|from('recordings'\|from(\"recordings\"" src/
```

If the table is `training_clips`, the code above is correct. If it's `recordings`, swap the table name. If it's something else entirely (e.g., `voice_clips`, `audio_uploads`), use whatever exists. **Do not create a new table.**

If the table query is hard to get right (RLS issues, joining through another table, etc.), the fallback is acceptable: assume `hasRecordings = true`. The has-recordings copy is the safer default — it never claims something a user doesn't have. The no-recordings copy is the *better* copy in its case, but the has-recordings copy is harmless if applied wrongly.

**Smoke test:**
- Navigate to `/app/vault/restore` while not signed in → redirects to sign-in.
- Sign in as a user with `subscriptions.status = 'none'` → redirects to `/app/vault/reveal`.
- Sign in as a user with `status = 'lapsed'` → renders the restore screen.
- Sign in as a user with `status = 'lapsed'` and at least one row in the recordings table → renders the has-recordings body copy.
- Sign in as a user with `status = 'lapsed'` and zero recordings → renders the no-recordings body copy.
- Tap "Bring my vault back" → opens new tab to `https://billing.stripe.com/p/...`. Customer Portal renders.

---

## STEP 9 — Wire the banner into `/app/record`

**File:** `src/app/app/record/page.tsx` (existing file)

Before editing, grep to confirm the file exists and to see its current structure:
```bash
ls -la src/app/app/record/
cat src/app/app/record/page.tsx
```

If `/app/record/page.tsx` doesn't exist (recording lives at a different route), surface to Oremi. The banner needs *some* authenticated route to live on for this session — `/app/record` is the planned location per the locked decisions.

### 9a. Add subscription fetch + banner render

Add at the top of the existing page component (before the existing render logic):

```tsx
import { getSubscriptionStatus } from '@/lib/subscription/get-status';
import { VaultPastDueBanner } from '@/components/vault/VaultPastDueBanner';
import { RecordPageBannerWrapper } from './RecordPageBannerWrapper'; // or similar — see 9b
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function RecordPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Existing auth check — keep as-is. If there isn't one, add one.
  if (!user) {
    redirect('/auth/sign-in?next=/app/record');
  }

  // NEW: fetch subscription status to determine if banner shows
  const sub = await getSubscriptionStatus(user.id);
  const showBanner = sub.status === 'past_due';
  const attemptCount = sub.lastFailedAttemptCount;

  // ... existing data fetching for the record page continues ...

  return (
    <>
      {showBanner && (
        <RecordPageBannerWrapper attemptCount={attemptCount} />
      )}
      {/* ... existing record page render ... */}
    </>
  );
}
```

### 9b. Banner client wrapper

The banner needs an `onUpdateCard` handler that calls the Portal route. Same pattern as the restore screen's wrapper.

**File:** `src/app/app/record/RecordPageBannerWrapper.tsx` (new file colocated with the record page)

```tsx
'use client';

import { useState } from 'react';
import { VaultPastDueBanner } from '@/components/vault/VaultPastDueBanner';

export function RecordPageBannerWrapper({ attemptCount }: { attemptCount: number }) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleUpdateCard() {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/stripe/portal-session', { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.portalUrl) {
        console.error('[RecordPageBannerWrapper] portal session failed', data);
        setIsLoading(false);
        return;
      }

      window.open(data.portalUrl, '_blank', 'noopener,noreferrer');
      setIsLoading(false);
    } catch (err) {
      console.error('[RecordPageBannerWrapper] portal request errored', err);
      setIsLoading(false);
    }
  }

  return (
    <VaultPastDueBanner attemptCount={attemptCount} onUpdateCard={handleUpdateCard} />
  );
}
```

**Surgical edit guidance.** Do NOT rewrite the entire `record/page.tsx` file. Only add the imports, the subscription fetch, and the banner render at the top of the JSX return. Everything else in that file stays put.

**Smoke test:**
- Sign in as a user with `subscriptions.status = 'past_due'` and `last_failed_attempt_count = 1`. Visit `/app/record`. Banner Variant 1 renders at the top.
- Update the user's row to `last_failed_attempt_count = 2`. Reload. Banner Variant 2 renders.
- Update to `last_failed_attempt_count = 3` (or higher). Reload. Banner Variant 3 renders.
- Update `status` back to `active`. Reload. Banner is gone.

---

## STEP 10 — Refactor the four other vault page guards

The 7b refactor only handled the `trial`/`active` redirect. Now that `lapsed` and `cancelled` are real states with their own destination (`/app/vault/restore`), the four non-sealed vault pages need an additional branch.

**Files (same as 7b list, minus sealed):**
- `src/app/app/vault/reveal/page.tsx`
- `src/app/app/vault/protect/page.tsx`
- `src/app/app/vault/continuity/page.tsx`
- `src/app/app/vault/seal/page.tsx`

### 10a. Pattern to apply to each

Find the existing 7b guard block. It currently looks like:

```tsx
const sub = await getSubscriptionStatus(user.id);
if (sub.status === 'trial' || sub.status === 'active') {
  redirect('/app/home');
}
```

Replace with:

```tsx
const sub = await getSubscriptionStatus(user.id);
if (sub.status === 'trial' || sub.status === 'active') {
  redirect('/app/record'); // moves to /app/home when that exists
}
if (sub.status === 'lapsed' || sub.status === 'cancelled') {
  redirect('/app/vault/restore');
}
// status === 'none' or 'past_due' falls through and renders the vault flow as before.
```

**Note on the `/app/home` → `/app/record` change.** The 7b guard redirects to `/app/home`, which doesn't exist. This is a latent bug — if a trial/active user ever hits a vault route directly, they get a 404. Quietly fixing this in 7c is fine; flag it to Oremi in the verification checklist so the change is conscious.

**Note on `past_due` falling through.** A user who is `past_due` but still inside the retry window has a vault that works — Stripe is mid-retry, not deleted. They should still be able to use the app normally. The banner on `/app/record` tells them about the issue. Pushing them to the restore screen would be incorrect (the vault isn't paused yet).

### 10b. The sealed page (`src/app/app/vault/sealed/page.tsx`)

The sealed page is the one exception — it allows `trial`/`active` access (the user just paid) and has its own session_id polling logic. Do NOT add the lapsed/cancelled redirect here. If a lapsed user somehow lands on `/app/vault/sealed` without a session_id or mock param, the existing fallback already redirects them to `/app/vault/reveal`, which then redirects them to `/app/vault/restore` per Step 10a above. The chain works.

### 10c. Surgical edit guidance

```bash
grep -rn "redirect('/app/home')\|redirect(\"/app/home\")" src/app/app/vault/
```
Should return exactly four matches (one per non-sealed file). If counts don't match, surface to Oremi.

**Smoke test:**
- For each of the four pages: sign in as a `lapsed` user → redirects to `/app/vault/restore`. ✓
- For each of the four pages: sign in as a `cancelled` user → redirects to `/app/vault/restore`. ✓
- For each of the four pages: sign in as a `past_due` user → renders the page as normal. ✓
- For each of the four pages: sign in as a `trial`/`active` user → redirects to `/app/record`. ✓
- For each of the four pages: sign in as a `none` user → renders the page as normal. ✓

---

## STEP 11 — Dev sandbox at `src/app/dev/lapse/`

**File:** `src/app/dev/lapse/page.tsx` (new file in new directory)

Pure visual review — renders all four UI states stacked on a single scrollable page. No data fetching, no Stripe, no auth. Mock all props inline.

```tsx
'use client';

import { VaultPastDueBanner } from '@/components/vault/VaultPastDueBanner';
import { VaultRestoreScreen } from '@/components/screens/vault/VaultRestoreScreen';

const noop = () => {
  console.log('[dev/lapse] CTA clicked (no-op in sandbox)');
};

export default function LapseDevPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '4rem', padding: '2rem' }}>
      <section>
        <h2 style={{ fontFamily: 'monospace', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888' }}>
          Banner — Variant 1 (attempt 1)
        </h2>
        <VaultPastDueBanner attemptCount={1} onUpdateCard={noop} />
      </section>

      <section>
        <h2 style={{ fontFamily: 'monospace', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888' }}>
          Banner — Variant 2 (attempt 2)
        </h2>
        <VaultPastDueBanner attemptCount={2} onUpdateCard={noop} />
      </section>

      <section>
        <h2 style={{ fontFamily: 'monospace', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888' }}>
          Banner — Variant 3 (attempt 3)
        </h2>
        <VaultPastDueBanner attemptCount={3} onUpdateCard={noop} />
      </section>

      <section>
        <h2 style={{ fontFamily: 'monospace', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888' }}>
          Restore screen — has recordings (default)
        </h2>
        <div style={{ border: '1px solid #ddd' }}>
          <VaultRestoreScreen hasRecordings={true} onRestore={noop} />
        </div>
      </section>

      <section>
        <h2 style={{ fontFamily: 'monospace', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888' }}>
          Restore screen — no recordings
        </h2>
        <div style={{ border: '1px solid #ddd' }}>
          <VaultRestoreScreen hasRecordings={false} onRestore={noop} />
        </div>
      </section>
    </div>
  );
}
```

**Smoke test:** Visit `http://localhost:3100/dev/lapse`. All five sections render. Each section visually matches the production component. CTAs log to console when clicked.

This page exists only for Oremi to do visual review before the real Stripe events fire. Do not link to it from anywhere else in the app.

---

## STEP 12 — Unit test for the webhook event-type switch

**File:** `src/app/api/stripe/webhook/__tests__/event-routing.test.ts` (new file in new directory)

Goal: confirm each handled event type calls its corresponding handler function. Not a full integration test — just a routing assertion. Mock the handlers, fire mock events, assert which handler was called.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the handlers BEFORE importing the route module
const mockHandleCheckoutCompleted = vi.fn();
const mockHandleSubscriptionChange = vi.fn();
const mockHandleSubscriptionDeleted = vi.fn();
const mockHandlePaymentFailed = vi.fn();

vi.mock('@/lib/stripe/client', () => ({
  stripe: {
    webhooks: {
      constructEvent: (body: string) => JSON.parse(body),
    },
  },
}));

// You'll need to refactor route.ts slightly to export the internal handlers
// or to expose a routeEvent(event) function. Suggested refactor:
// extract the switch-statement body into an exported `dispatchEvent(event)`
// function that webhook POST() calls. Then this test imports dispatchEvent
// directly. Keeps the test from needing to mock NextRequest plumbing.

import { dispatchEvent } from '../route';

beforeEach(() => {
  mockHandleCheckoutCompleted.mockReset();
  mockHandleSubscriptionChange.mockReset();
  mockHandleSubscriptionDeleted.mockReset();
  mockHandlePaymentFailed.mockReset();
});

describe('webhook event routing', () => {
  it('routes checkout.session.completed to handleCheckoutCompleted', async () => {
    await dispatchEvent({ type: 'checkout.session.completed', data: { object: {} } } as any);
    expect(mockHandleCheckoutCompleted).toHaveBeenCalledOnce();
  });

  it('routes customer.subscription.created to handleSubscriptionChange', async () => {
    await dispatchEvent({ type: 'customer.subscription.created', data: { object: {} } } as any);
    expect(mockHandleSubscriptionChange).toHaveBeenCalledOnce();
  });

  it('routes customer.subscription.updated to handleSubscriptionChange', async () => {
    await dispatchEvent({ type: 'customer.subscription.updated', data: { object: {} } } as any);
    expect(mockHandleSubscriptionChange).toHaveBeenCalledOnce();
  });

  it('routes customer.subscription.deleted to handleSubscriptionDeleted', async () => {
    await dispatchEvent({ type: 'customer.subscription.deleted', data: { object: {} } } as any);
    expect(mockHandleSubscriptionDeleted).toHaveBeenCalledOnce();
  });

  it('routes invoice.payment_failed to handlePaymentFailed', async () => {
    await dispatchEvent({ type: 'invoice.payment_failed', data: { object: {} } } as any);
    expect(mockHandlePaymentFailed).toHaveBeenCalledOnce();
  });

  it('does not throw on unhandled event types', async () => {
    await expect(
      dispatchEvent({ type: 'invoice.created', data: { object: {} } } as any)
    ).resolves.not.toThrow();
  });
});
```

### 12a. Required refactor to make this test possible

Extract the `switch (event.type)` block from the existing webhook POST handler into a named function:

```ts
// In src/app/api/stripe/webhook/route.ts:

export async function dispatchEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionChange(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
  }
}

export async function POST(req: NextRequest) {
  // ... existing signature verification logic stays put ...
  // ... then ...
  try {
    await dispatchEvent(event);
  } catch (err) {
    console.error(`[stripe-webhook] Error processing ${event.type}`, err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
```

### 12b. Run the test

```bash
pnpm test src/app/api/stripe/webhook
```

If Vitest isn't already configured in this repo, surface to Oremi rather than installing it. Most Next.js 16 + TS projects include Vitest by default; if it's not set up, the unit test goal gets deferred and the manual test plan covers the dispatch logic implicitly.

**Skip-condition.** If wiring up Vitest takes more than 15 minutes, drop the unit test for this session. The manual test plan exercises every event type at least once. The unit test is belt-and-suspenders, not safety-critical.

---

## STEP 13 — Manual test plan (25 scenarios)

This is the bulk of 7c's value. Execute each scenario in order. For each one, record the actual behavior. The structure of every scenario:

- **Setup** — what state the user/data needs to be in before starting
- **Stripe action** — what to do in the Stripe Dashboard, Stripe CLI, or the app
- **Expected Stripe state** — what the Stripe Dashboard should show after
- **Expected Supabase state** — what the `subscriptions` and `voice_profiles` rows should look like after
- **Expected app behavior** — what the user sees in the browser

### Setup before any scenarios run

1. `VAULT_STRIPE_ENABLED=true` in `.env.local`
2. `stripe listen --forward-to localhost:3100/api/stripe/webhook` running in a dedicated terminal
3. The `whsec_...` Stripe CLI prints is in `.env.local` as `STRIPE_WEBHOOK_SECRET`. Restart dev server after updating.
4. Clean test user signed in. Verify in Supabase Studio: `auth.users` row exists, `profiles` row exists, no `subscriptions` row, no `voice_profiles` row (or one in `created` state if you want to test recording flows too).
5. Two browser windows open: one for the app (logged in as test user), one for the Stripe Dashboard (test mode).

### Test cards (Stripe official)

- `4242 4242 4242 4242` — happy path, succeeds always
- `4000 0000 0000 0002` — generic decline at checkout
- `4000 0000 0000 9995` — insufficient funds (decline at checkout)
- `4000 0000 0000 0341` — succeeds at checkout, then declines on first renewal (great for testing the past_due → lapsed flow)
- `4000 0000 0000 3220` — 3D Secure required

For all cards: any future expiry (e.g., 12/34), any 3-digit CVC, any 5-digit zip.

---

### HAPPY PATH SCENARIOS (1–6)

**Scenario 1: Fresh signup, monthly trial, happy card**
- **Setup:** clean test user, no subscription
- **Stripe action:** in app, click "Protect my vault" with monthly plan → land on Stripe Checkout → enter `4242 4242 4242 4242`, submit
- **Expected Stripe:** Customer created, Subscription created with `status: trialing`, trial_end ~7 days out
- **Expected Supabase:** `subscriptions` row inserted with `status: 'trial'`, `billing_period: 'monthly'`, `trial_ends_at` ~7 days out, `last_failed_attempt_count: 0`, `price_amount_cents` matches Stripe price
- **Expected app:** redirect to `/app/vault/sealed?session_id=cs_test_...`, seal animation plays, success state renders

**Scenario 2: Same as Scenario 1 but annual plan**
- **Setup:** clean test user
- **Stripe action:** click "Protect my vault" with annual plan → enter `4242` card
- **Expected Supabase:** `billing_period: 'annual'`, `price_amount_cents` matches annual price

**Scenario 3: Recordings exist before checkout — Site A trigger fires**
- **Setup:** test user, `voice_profiles` row exists with `status: 'collecting'`
- **Stripe action:** complete checkout with `4242` card
- **Expected Supabase:** subscription row created (per Scenario 1), AND `voice_profiles.status` flipped from `'collecting'` to `'processing'`
- **Expected logs:** webhook log line `[stripe-webhook] transitioned voice_profile <id> to processing`

**Scenario 4: Checkout completes before any recording — no trigger fires (correct)**
- **Setup:** test user, no `voice_profiles` row
- **Stripe action:** complete checkout with `4242` card
- **Expected Supabase:** subscription row created, no `voice_profiles` row created (correct — webhook only triggers transitions, doesn't create profiles)
- **Expected logs:** webhook log line `[stripe-webhook] no voice profile for user <id>, skipping processing trigger`

**Scenario 5: Checkout first, recording second — Site B trigger fires**
- **Setup:** test user, no `voice_profiles` row, fresh subscription with `status: 'trial'` from Scenario 4
- **App action:** record one clip in the app, completing the `created → collecting` transition
- **Expected Supabase:** `voice_profiles.status = 'processing'` immediately after the recording transition (not still `'collecting'`)
- **Expected logs:** voice-recording log line `[voice-recording] transitioned voice_profile <id> to processing`

**Scenario 6: Trial → active transition (when trial ends and renewal succeeds)**
- **Setup:** subscription in `status: 'trial'`
- **Stripe action:** in Stripe Dashboard → Subscriptions → find this sub → "Actions" → "End trial." Or use Stripe CLI: `stripe trigger customer.subscription.updated`
- **Expected Stripe:** sub flips to `status: active`
- **Expected Supabase:** webhook fires `customer.subscription.updated`, row updates to `status: 'active'`, `trial_ends_at` may be cleared or kept (Stripe behavior)
- **Expected app:** `/app/vault/reveal` (or any vault non-sealed page) → redirects to `/app/record`. Banner does NOT render. Vault flow is closed.

### DECLINE SCENARIOS (7–11)

**Scenario 7: Generic decline at checkout**
- **Setup:** clean test user
- **Stripe action:** click "Protect my vault" → land on Checkout → enter `4000 0000 0000 0002`
- **Expected Stripe:** Stripe shows decline error inline on the hosted page. No customer.subscription.created event.
- **Expected Supabase:** no `subscriptions` row inserted. App never sees this event.
- **Expected app:** user stays on Stripe checkout page, can retry with a different card or click back

**Scenario 8: Insufficient funds at checkout**
- **Setup:** clean test user
- **Stripe action:** enter `4000 0000 0000 9995`
- **Expected:** same as Scenario 7 (Stripe handles inline)

**Scenario 9: 3D Secure challenge**
- **Setup:** clean test user
- **Stripe action:** enter `4000 0000 0000 3220`
- **Expected Stripe:** Stripe Checkout displays a 3DS challenge modal. Click "Complete authentication" in the modal.
- **Expected Supabase:** subscription row created with `status: 'trial'` after challenge completes
- **Expected app:** redirect to sealed screen, seal animation plays normally

**Scenario 10: Trial ends, renewal fails — first failed attempt → Banner Variant 1**
- **Setup:** subscription in `status: 'trial'`, attached card is `4000 0000 0000 0341` (renewal-fails card)
- **Stripe action:** end trial via Dashboard or `stripe trigger customer.subscription.updated`. Then trigger renewal: easiest is to use `stripe trigger invoice.payment_failed`.
- **Expected Stripe:** subscription `status: past_due`, invoice with `attempt_count: 1`
- **Expected Supabase:** `subscriptions.status: 'past_due'`, `last_failed_attempt_count: 1`
- **Expected app:** visit `/app/record` → Banner Variant 1 renders at top. Header: "Your card didn't go through this time." CTA opens Customer Portal in new tab.

**Scenario 11: Same path, second failed retry → Banner Variant 2**
- **Setup:** continuing from Scenario 10, subscription is `past_due`
- **Stripe action:** `stripe trigger invoice.payment_failed` again. (Or wait ~3 days for Stripe's natural retry — only feasible in test mode if you're patient.)
- **Expected Supabase:** `last_failed_attempt_count: 2`
- **Expected app:** Banner Variant 2 renders. Header: "Your card didn't go through again."

### LAPSE SCENARIOS (12–14)

**Scenario 12: Third failed retry → Banner Variant 3**
- **Setup:** continuing from Scenario 11
- **Stripe action:** `stripe trigger invoice.payment_failed`
- **Expected Supabase:** `last_failed_attempt_count: 3`
- **Expected app:** Banner Variant 3 renders. Header: "One more attempt before your vault pauses."

**Scenario 13: Fourth attempt fails → subscription deleted → restore screen**
- **Setup:** continuing from Scenario 12
- **Stripe action:** in the Dashboard, navigate to the subscription and confirm Smart Retries fires the 4th and final attempt. Or use the dashboard's "Cancel subscription" with reason "payment failure" to simulate the same end state. Or run `stripe trigger customer.subscription.deleted` with the cancellation reason set to `payment_failed`.
- **Expected Stripe:** subscription deleted, `cancellation_details.reason: 'payment_failed'`
- **Expected Supabase:** `subscriptions.status: 'lapsed'` (NOT `'cancelled'` — this is the new branch from Step 3b), `cancelled_at` populated
- **Expected app:** visit `/app/record` → banner is gone (status is no longer `past_due`). Visit `/app/vault/reveal` → redirects to `/app/vault/restore`. Restore screen renders with has-recordings copy if user has recordings, no-recordings copy if they don't.

**Scenario 14: Restore screen — has-recordings vs no-recordings copy**
- **Setup:** two test users in `status: 'lapsed'` — one with recordings (any rows in the recordings table), one without
- **App action:** navigate each user to `/app/vault/restore`
- **Expected app:** user-with-recordings sees "Your messages are still here, exactly as you left them." User-without-recordings sees "Your vault is ready when you are."

### CUSTOMER PORTAL SCENARIOS (15–17)

**Scenario 15: Customer Portal opens with payment update enabled, cancel disabled**
- **Setup:** any user with a stripe_customer_id (i.e., has gone through checkout at least once)
- **App action:** tap any banner CTA or the restore CTA → new tab opens
- **Expected app (new tab):** Customer Portal renders. "Payment methods" section visible. "Cancel subscription" button NOT visible.

**Scenario 16: Updating card in Portal restores subscription**
- **Setup:** user in `status: 'past_due'`, banner showing
- **App action:** tap "Update card" → Portal opens → update card to `4242 4242 4242 4242` → click "Return to ESSENCE"
- **Expected Stripe:** new payment method attached, default. Stripe does NOT automatically retry the failed invoice — the user has to wait for the next retry, OR you can manually retry from the Dashboard.
- **Expected Supabase (after manual retry / next scheduled retry):** webhook fires for `customer.subscription.updated`, status flips to `active`, `last_failed_attempt_count` is NOT reset (keeps history). On next successful payment cycle, status is `active`.
- **Expected app:** banner persists until the next successful payment event flips status back to active. Acceptable — Stripe's retry cadence is a few days.

**Scenario 17: Updating card from restore screen brings vault back**
- **Setup:** user in `status: 'lapsed'`, on `/app/vault/restore`
- **App action:** tap "Bring my vault back" → Portal → update card → click "Return to ESSENCE"
- **Expected Stripe:** Portal redirects browser back to `https://<your-domain>/app/vault/restore`. **Note:** updating the card alone does NOT reactivate a deleted subscription — Stripe does not auto-resurrect. The user would need a new checkout flow to start a new subscription.
- **Expected app behavior:** lands back on `/app/vault/restore`. Status is still `lapsed`. The screen still renders.
- **Known limitation to document for Oremi:** for *deleted* subscriptions (lapsed users), updating card doesn't auto-resurrect. They need to re-enter checkout. The current 7c restore screen does not yet expose a "start a new subscription" CTA — it assumes the Portal does the work, which is true for past_due but not for lapsed/deleted subs. **This is a real gap.** Add to the open questions list at the bottom.

### STATE-MACHINE EDGE SCENARIOS (18–20)

**Scenario 18: Voluntary cancellation (manual Dashboard delete)**
- **Setup:** user in `status: 'active'`
- **Stripe action:** in Dashboard, find subscription → Actions → "Cancel subscription" with reason "Other" or no reason. This simulates a future self-serve cancellation path.
- **Expected Stripe:** subscription deleted, `cancellation_details.reason` is NOT `'payment_failed'` (it'll be `null`, `'cancellation_requested'`, or whatever Dashboard sets)
- **Expected Supabase:** `subscriptions.status: 'cancelled'` (NOT `'lapsed'` — confirming the branch in Step 3b distinguishes correctly), `cancelled_at` populated
- **Expected app:** vault routes redirect to `/app/vault/restore`, copy renders the same as for lapsed (intentional — same user-facing language for both)

**Scenario 19: Webhook idempotency — duplicate event delivery**
- **Setup:** any state. Have the Stripe CLI terminal visible.
- **Stripe action:** in the CLI terminal, identify a recent event (e.g., a `checkout.session.completed`). Replay it: `stripe events resend <event_id>`.
- **Expected Supabase:** no change. The upsert idempotency on `stripe_subscription_id` (unique constraint) means the second event hits the same row and either no-ops or updates non-null fields with the same values. No duplicate row inserted.
- **Expected logs:** webhook processes the event normally, no errors.

**Scenario 20: Out-of-order delivery — `customer.subscription.updated` before `checkout.session.completed`**
- **Setup:** trigger this manually because Stripe doesn't reliably misorder for testing. Easiest: in the CLI, run `stripe trigger customer.subscription.updated` first, then `stripe trigger checkout.session.completed`. (These are unrelated mock events, but they exercise the handler logic.)
- **Expected Supabase:** both events succeed. The first creates/updates a row from the `customer.subscription.updated` path; the second's `handleCheckoutCompleted` retrieves the same subscription and upserts again. No FK violations (7b.1 prevents profile-missing). No duplicate rows.
- **Note:** in production, real out-of-order delivery is rare but Stripe explicitly does not guarantee ordering. The upsert pattern handles it.

### GUARD BEHAVIOR MATRIX (21–25)

For each subscription status × each vault route, confirm the expected behavior. This is tedious but worth doing once.

| Status        | `/reveal` | `/protect` | `/continuity` | `/seal` | `/sealed` | `/restore` | `/record` |
|---------------|-----------|------------|---------------|---------|-----------|------------|-----------|
| `none`        | render    | render     | render        | render  | (special) | redirect to /reveal | render, no banner |
| `trial`       | redirect to /record | redirect to /record | redirect to /record | redirect to /record | render (post-checkout) | redirect to /record | render, no banner |
| `active`      | redirect to /record | redirect to /record | redirect to /record | redirect to /record | render (rare direct nav) | redirect to /record | render, no banner |
| `past_due`    | render | render | render | render | render (rare) | render restore screen | render WITH banner |
| `lapsed`      | redirect to /restore | redirect to /restore | redirect to /restore | redirect to /restore | redirect to /reveal then to /restore | render restore screen | render, no banner (banner only fires for past_due) |
| `cancelled`   | redirect to /restore | redirect to /restore | redirect to /restore | redirect to /restore | redirect to /reveal then to /restore | render restore screen | render, no banner |

**Scenario 21:** Verify the `none` row of the matrix.
**Scenario 22:** Verify the `trial` and `active` rows.
**Scenario 23:** Verify the `past_due` row. (Specifically confirm the banner renders on /record and no redirect happens for past_due on the vault flow.)
**Scenario 24:** Verify the `lapsed` row.
**Scenario 25:** Verify the `cancelled` row.

To set up each status quickly, use Supabase Studio to manually update the test user's `subscriptions.status` field. The webhook is the source of truth, but for testing route guards you can fake state directly in the DB and reload the page.

---

## STEP 14 — Flip `VAULT_STRIPE_ENABLED` for the test pass

In `.env.local`:
```
VAULT_STRIPE_ENABLED=true
```

Restart the dev server. Run the full test plan above.

**Production:** `VAULT_STRIPE_ENABLED` stays OFF in production until 7d (production webhook setup) ships and is verified. Do not flip the production flag in this session.

---

## STEP 15 — Commit and PR

```bash
git add supabase/migrations/ \
        src/lib/subscription/get-status.ts \
        src/app/api/stripe/webhook/route.ts \
        src/app/api/stripe/portal-session/ \
        src/components/vault/ \
        src/components/screens/vault/VaultRestoreScreen.tsx \
        src/app/app/vault/restore/ \
        src/app/app/vault/reveal/page.tsx \
        src/app/app/vault/protect/page.tsx \
        src/app/app/vault/continuity/page.tsx \
        src/app/app/vault/seal/page.tsx \
        src/app/app/record/ \
        src/app/dev/lapse/ \
        src/app/api/stripe/webhook/__tests__/ \
        # plus the Site B file once Terminal locates it

git commit -m "session-7c: lapse surfaces, voice processing trigger, test pass

- Add subscriptions.last_failed_attempt_count
- Webhook: populate attempt count on payment_failed, distinguish lapsed/cancelled on deletes
- Voice processing trigger at two sites (whichever-event-is-last-wins)
- VaultPastDueBanner component (3 variants) on /app/record
- VaultRestoreScreen at /app/vault/restore (has-recordings/no-recordings copy)
- Customer Portal handoff via /api/stripe/portal-session
- Vault page guards redirect lapsed/cancelled to /restore
- Dev sandbox at /dev/lapse for visual review
- Unit test on webhook event routing
- 25 manual test scenarios executed"

git push -u origin session-7c-lapse-surfaces
```

Open the PR. Tag for review.

---

## VERIFICATION CHECKLIST

**Schema & types**
- [ ] Migration adds `last_failed_attempt_count INTEGER NOT NULL DEFAULT 0` to `subscriptions`
- [ ] `getSubscriptionStatus` exposes `lastFailedAttemptCount` in returned shape
- [ ] `pnpm tsc --noEmit` clean

**Webhook**
- [ ] `handlePaymentFailed` populates `last_failed_attempt_count` from `invoice.attempt_count`
- [ ] `handlePaymentFailed` uses `invoice.parent?.subscription_details?.subscription` path (Basil API)
- [ ] `handleSubscriptionDeleted` branches on `cancellation_details.reason` — `'payment_failed'` → `'lapsed'`, else → `'cancelled'`
- [ ] `handleCheckoutCompleted` calls `maybeTriggerVoiceProcessing(userId)` after `upsertSubscription`
- [ ] `maybeTriggerVoiceProcessing` is idempotent and does not throw on missing profile
- [ ] `dispatchEvent` extracted into a separately-exported function

**Voice processing trigger**
- [ ] Site A: webhook `checkout.session.completed` calls the trigger
- [ ] Site B: voice recording transition site has the trigger added (Terminal must grep to locate; surface to Oremi if not found)
- [ ] Both sites use the optimistic concurrency `.eq('status', 'collecting')` clause

**Banner**
- [ ] `<VaultPastDueBanner />` exists in `src/components/vault/`
- [ ] Three copy variants render based on `attemptCount` (1 → V1, 2 → V2, 3+ → V3)
- [ ] Banner renders on `/app/record` only when `subscriptions.status === 'past_due'`
- [ ] Banner CTA opens Customer Portal in a new tab
- [ ] Banner does NOT render for `none`, `trial`, `active`, `lapsed`, or `cancelled`

**Restore screen**
- [ ] `<VaultRestoreScreen />` exists in `src/components/screens/vault/`
- [ ] Conditional body: has-recordings copy when recordings count > 0, no-recordings copy when 0
- [ ] Header always reads "Your vault is paused."
- [ ] CTA always reads "Bring my vault back"
- [ ] No support email line (per locked decision to skip)
- [ ] `/app/vault/restore` page exists with auth + status guards
- [ ] Lapsed/cancelled users reaching ANY vault route end up on `/restore`
- [ ] Trial/active users reaching `/restore` get redirected onward

**Customer Portal**
- [ ] `/api/stripe/portal-session` route exists
- [ ] Route returns 401 when not authenticated
- [ ] Route returns 404 when user has no `stripe_customer_id`
- [ ] Route returns `{ portalUrl }` on success
- [ ] Return URL is `/app/vault/restore`
- [ ] Stripe Dashboard Portal config: payment update ON, cancel OFF, default config saved

**Vault route guards**
- [ ] `reveal`, `protect`, `continuity`, `seal` redirect lapsed/cancelled to `/app/vault/restore`
- [ ] `reveal`, `protect`, `continuity`, `seal` redirect trial/active to `/app/record` (not `/app/home` — confirm this change with Oremi)
- [ ] `past_due` falls through and renders normally (banner does its job on /record)
- [ ] `none` falls through and renders normally
- [ ] No `/app/home` references remain in vault redirects (or they're noted as intentional future-targets)

**Dev sandbox**
- [ ] `/dev/lapse` renders all 5 visual states (3 banners, 2 restore variants)
- [ ] Sandbox does not require auth
- [ ] Sandbox is not linked from any production navigation

**Test pass**
- [ ] All 25 scenarios executed and passing
- [ ] Stripe Dashboard Smart Retries set to 4 attempts (per Prereq A)
- [ ] Customer Portal configured per Prereq B
- [ ] Local test pass complete with `VAULT_STRIPE_ENABLED=true`

**Production safety**
- [ ] `VAULT_STRIPE_ENABLED` is NOT enabled in production env
- [ ] Production webhook is NOT yet configured (deferred to 7d)

---

## WHAT NOT TO DO

- Do NOT enable `VAULT_STRIPE_ENABLED` in production. That happens after 7d ships and the production webhook is verified.
- Do NOT register the production webhook URL. That's 7d.
- Do NOT add a self-serve cancellation flow. Cancellation stays an unbuilt surface — designed deliberately later.
- Do NOT write a trial-expiration cron. Stripe's webhook handles trial-end via `customer.subscription.updated` automatically.
- Do NOT enable "Cancel subscription" in the Stripe Customer Portal. Per locked decision.
- Do NOT add custom retry logic in the webhook or anywhere. Stripe Smart Retries handles retries.
- Do NOT use the `?checkout=failed` query param for failure detection. The locked decision is in-app `past_due` detection only.
- Do NOT add the banner to any route other than `/app/record`. When `/app/home` ships, moving it is one import — but don't preemptively duplicate.
- Do NOT modify any existing screen component (anything in `src/components/screens/vault/*` other than the new `VaultRestoreScreen.tsx`). The banner and restore screen are new components.
- Do NOT write the voice processing trigger into `voice_profiles` from any client component. Both sites are server-side only.
- Do NOT reset `last_failed_attempt_count` on successful payment. Keep history. The banner stops rendering because `status` flips back to `active`, not because the count zeros.
- Do NOT assume the recordings table is named `training_clips`. Grep first. Use whatever exists.
- Do NOT add a "support@..." email line to the restore screen — Oremi explicitly skipped it for this build.
- Do NOT add countdown timers, deadlines, or "your vault will be deleted in N days" anywhere. ESSENCE is not a productivity tool.
- Do NOT use `setTimeout`-based polling on the banner or restore screen. Subscription state is fetched on page load. Page reloads naturally pick up new state.
- Do NOT introduce a new Supabase service client. Use the existing `supabaseServiceClient` from `src/lib/supabase/service.ts`.
- Do NOT install Vitest just for the unit test. If it's not already in the repo, drop the unit test for this session.

---

## OPEN QUESTIONS / GAPS FOR FUTURE SESSIONS

1. **Lapsed users cannot self-restore via the Portal alone.** Stripe does not auto-resurrect a deleted subscription when payment method is updated. The current restore screen routes lapsed users to the Portal, but updating their card there does not bring back the deleted sub — they need a fresh checkout. The current copy ("updating your card is the only step") is inaccurate for the lapsed-deleted case. Two fixes possible: (a) for lapsed users, route the CTA to a fresh checkout flow instead of the Portal, or (b) keep the Portal CTA but adjust copy and guide users into a re-subscribe flow on return. Decision deferred.

2. **`last_failed_attempt_count` does not reset on success.** Intentional — keeps history for analytics. But this means if a user lapses, restarts months later, and then has a fresh failure, the count persists from the prior incident. For 7c this is fine because the banner only renders when status is `past_due`. If future logic depends on the count for other things, the reset semantics may need revisiting.

3. **Banner permanence during retry windows.** A user on Banner 3 sees that copy for ~7 days until the 4th retry resolves. They might dismiss it mentally or learn to ignore it. Consider: a one-time toast on first appearance plus the persistent banner? Out of scope for 7c, worth a UX pass later.

4. **Restore screen visual review.** The styles in this doc are spec-level, not pixel-perfect. Once Terminal lands the component, Oremi reviews via `/dev/lapse` and likely iterates. Treat the styles as starting point, not final.

5. **Email notifications.** Stripe sends its own emails for payment failures (configurable in Dashboard → Settings → Subscriptions → Customer emails). Decide whether to enable Stripe's emails, send our own, or both. Out of 7c scope.

6. **Production webhook setup (7d).** Pre-flight session for going live. Includes: registering production webhook URL in Stripe Dashboard, generating production webhook secret, setting production env vars, running a controlled test in production with a real card on Oremi's account. Estimated: small session, mostly Dashboard work.

7. **Self-serve cancellation UX.** Deliberately deferred. When designed, it will live in settings. The Portal's cancel button stays disabled.

---

## REPO REALITY FACTS TO CARRY INTO 7d

- `subscriptions.last_failed_attempt_count` exists, default 0, drives banner variant selection
- `subscription_status_enum` distinguishes `lapsed` and `cancelled` based on Stripe's `cancellation_details.reason`
- `voice_profiles` table has the `'queued'` enum value; `processing` is reachable via two trigger sites
- `/api/stripe/portal-session` route exists, returns `{ portalUrl }` for authenticated users with a stripe_customer_id
- Customer Portal config in Dashboard: payment update ON, cancel OFF, return URL `/app/vault/restore`
- `VAULT_STRIPE_ENABLED` is true in dev, false in production
- Vault page guards now have a 4-branch decision: `trial`/`active` → forward, `lapsed`/`cancelled` → `/restore`, `past_due` → render with banner, `none` → render

---

## ESTIMATED EFFORT

- Steps 1–3 (schema + webhook): 30–45 min
- Step 4 (Site B trigger — depends on grep success): 30 min if obvious, surface-back if not
- Steps 5–7 (banner + restore components): 1–1.5 hr
- Step 8 (restore page + recordings count): 30 min
- Step 9 (banner wiring): 20 min
- Step 10 (guard refactor): 20 min
- Step 11 (dev sandbox): 15 min
- Step 12 (unit test): 30 min if Vitest is set up; skip if not
- Steps 13–14 (test pass + flag flip): 1.5–2 hr (this is the slow part — patient execution)
- Step 15 (commit + PR): 10 min

Total: 5–7 hours of focused work. The test pass dominates. Block the time accordingly.

---
