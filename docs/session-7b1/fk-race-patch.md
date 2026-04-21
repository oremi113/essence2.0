# ESSENCE — Session 7b.1: Close FK Race + Sync Voice Profile Type

**Scope.** Three small fixes surfaced during 7b testing. Independent of 7c. Ships on its own.

**Why this is its own session.** Each fix is one or two lines. Bundling them into 7c clutters that doc. Shipping them now unblocks 7c work and removes a real bug class (FK violations on subscription upserts when the user's `profiles` row never got backfilled).

**Depends on:** Session 7b merged.

**Shippable?** Yes, immediately. Behind no flag.

**Estimated time:** 15 minutes including testing.

---

## CONTEXT

During 7b testing, the webhook's `subscriptions` upsert failed with a foreign-key violation on a real test user. Root cause: that user existed in `auth.users` but had no row in `profiles`. The `20260413` trigger that auto-creates profile rows on auth signup, plus its accompanying backfill, didn't cover that user — likely because they signed up before the trigger landed and the dashboard-paste path (where someone runs migration SQL directly in Supabase Studio rather than via the CLI) skipped the backfill step.

This is going to keep happening for any user who signed up between the addition of the trigger and a complete backfill. The fix is two layers of defense:

1. **Validate at the gate (`createCheckoutSession`).** Fail loudly *before* sending the user to Stripe. Better than charging a card and then 500ing on the webhook.
2. **Repair on receipt (webhook handler).** Insert a profile row if missing, ON CONFLICT DO NOTHING, before upserting the subscription. Safety net for any user who slipped past the gate.

Plus a third unrelated cleanup: the `queued` enum value added by `RUN_IN_DASHBOARD_voice_profiles_attempt_tracking.sql` exists in the database but not in the TypeScript type at `src/lib/profile/voice.ts`. One-line sync.

---

## STEP 1 — Read before you write

```bash
# Confirm 7b is merged
git log --oneline | head -5
# Should show session-7b commit.

# Find the createCheckoutSession file
grep -rn "createCheckoutSession" src/lib/stripe/ src/app/api/

# Find the VoiceProfileStatus TS type
grep -rn "VoiceProfileStatus\|voice_profile.*status" src/lib/profile/ src/types/

# Find the queued enum addition
grep -rn "queued" supabase/migrations/

# Confirm the webhook handler structure
grep -n "supabaseServiceClient\|upsertSubscription" src/app/api/stripe/webhook/route.ts
```

If any of these come back empty, stop and surface to Oremi — 7b state isn't what we expect.

---

## STEP 2 — Add profile validation to `createCheckoutSession`

**File:** `src/lib/stripe/create-checkout-session.ts`

**Goal:** Fail loudly *before* Stripe ever sees this user if their `profiles` row is missing.

**Edit location:** Right after the `auth.getUser()` block, before any Stripe API calls.

```ts
// ... existing auth.getUser() ...

if (!user) {
  throw Object.assign(new Error('User not authenticated'), {
    code: 'unauthenticated',
  });
}

// NEW: validate profile row exists before doing anything chargeable
const { data: profileExists, error: profileCheckError } = await supabase
  .from('profiles')
  .select('user_id')
  .eq('user_id', user.id)
  .maybeSingle();

if (profileCheckError) {
  console.error('[createCheckoutSession] profile lookup failed', profileCheckError);
  throw Object.assign(new Error('Profile lookup failed'), {
    code: 'profile_lookup_failed',
  });
}

if (!profileExists) {
  console.error(
    '[createCheckoutSession] missing profile row for authenticated user',
    user.id
  );
  throw Object.assign(
    new Error('Account setup incomplete. Please contact support.'),
    { code: 'profile_missing' }
  );
}

// ... existing get-or-create Stripe customer logic continues from here ...
```

**Then update the API route to map the new error code to a user-facing response.**

**File:** `src/app/api/stripe/create-checkout-session/route.ts`

In the `catch` block where `code === 'unauthenticated'` is handled, add a sibling case:

```ts
if (code === 'profile_missing' || code === 'profile_lookup_failed') {
  return NextResponse.json(
    {
      error: 'Account setup incomplete. Please contact support.',
      code,
    },
    { status: 500 }
  );
}
```

**Smoke test:**
- Manually delete a test user's profile row in Supabase Studio (don't delete the auth user — just the profile).
- POST `/api/stripe/create-checkout-session` with `{ plan: 'monthly' }` while signed in as that user.
- Should return 500 with the `profile_missing` error code. Check terminal logs — should show the `[createCheckoutSession] missing profile row` line.
- Restore the profile row. Same POST should succeed.

---

## STEP 3 — Add defensive profile insert to webhook handler

**File:** `src/app/api/stripe/webhook/route.ts`

**Goal:** If the gate in Step 2 was somehow bypassed (race condition, flag-off testing, manual Stripe Dashboard event replay), the webhook still self-heals by inserting the profile row before upserting the subscription.

**Edit location:** Top of `upsertSubscription` (or whatever the helper that does the subscription insert is named — confirm via grep before editing).

```ts
async function upsertSubscription(
  sub: Stripe.Subscription,
  userId: string,
  billingPeriod: 'monthly' | 'annual'
) {
  // NEW: ensure profile row exists before FK-dependent upsert.
  // Defensive only — Step 2 of 7b.1 should prevent this from being needed.
  const { error: profileEnsureError } = await supabaseServiceClient
    .from('profiles')
    .upsert(
      { user_id: userId },
      { onConflict: 'user_id', ignoreDuplicates: true }
    );

  if (profileEnsureError) {
    console.error('[stripe-webhook] profile ensure failed', profileEnsureError);
    throw profileEnsureError;
  }

  // ... existing upsert logic continues ...
}
```

**Important:** Use `supabaseServiceClient` (the existing service-role client per the 7b deviation note) — webhook handlers run without an authenticated user, so RLS would block a regular insert.

**Why `upsert` with `ignoreDuplicates: true` and not raw INSERT ... ON CONFLICT DO NOTHING:** the Supabase JS client doesn't expose a clean ON CONFLICT DO NOTHING; the `ignoreDuplicates` option on upsert achieves the same outcome. If you'd rather drop to raw SQL via `rpc()`, fine, but the upsert form is idiomatic for this codebase.

**Smoke test:**
- In Supabase Studio, delete a test user's profile row again (auth row stays).
- Use Stripe CLI: `stripe trigger checkout.session.completed`.
- Watch the webhook terminal log. The handler should:
  1. Log the incoming event.
  2. Insert the missing profile (no error).
  3. Upsert the subscription successfully.
- Verify in Supabase Studio: profile row exists, subscription row exists, both have matching `user_id`.

---

## STEP 4 — Sync `queued` into VoiceProfileStatus TS type

**File:** `src/lib/profile/voice.ts` (or wherever `VoiceProfileStatus` is defined — grep to confirm)

**Context:** Migration `RUN_IN_DASHBOARD_voice_profiles_attempt_tracking.sql` added `'queued'` to the `voice_profile_status_enum`, but the TypeScript type was never updated. This means current code can't represent the `queued` state and would fail type-checking if it tried to write a profile in that state.

**Edit:** Add `'queued'` to the union type in the canonical position (matches the order in the SQL enum — check the migration file to confirm).

```ts
// BEFORE:
export type VoiceProfileStatus =
  | 'created'
  | 'collecting'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'archived';

// AFTER:
export type VoiceProfileStatus =
  | 'created'
  | 'collecting'
  | 'queued'      // NEW — added in attempt-tracking migration, syncing here
  | 'processing'
  | 'ready'
  | 'failed'
  | 'archived';
```

**Verify the SQL position.** Open `supabase/migrations/RUN_IN_DASHBOARD_voice_profiles_attempt_tracking.sql`, find the `ALTER TYPE` or enum recreation, and place `'queued'` in the matching position in the TS union. The TS union doesn't have to match the SQL order semantically — but matching it makes the two read in parallel, which makes the next person's life easier.

**Smoke test:** `pnpm tsc --noEmit`. No errors. No code currently uses `'queued'`, so nothing else should change.

---

## STEP 5 — Commit

```bash
git add src/lib/stripe/create-checkout-session.ts \
        src/app/api/stripe/create-checkout-session/route.ts \
        src/app/api/stripe/webhook/route.ts \
        src/lib/profile/voice.ts

git commit -m "session-7b.1: close FK race between auth.users and profiles

- createCheckoutSession validates profile row exists before Stripe call
- Webhook upserts profile row before subscription (defense in depth)
- Sync queued status into VoiceProfileStatus TS type"
```

**PR target:** Either tack onto `session-7b-stripe` if you haven't merged it yet, or open a new branch `session-7b.1-fk-race` off main if 7b is already merged.

---

## VERIFICATION CHECKLIST

- [ ] `createCheckoutSession` returns 500 with `profile_missing` code when profile row is deleted
- [ ] `createCheckoutSession` succeeds when profile row exists
- [ ] Webhook handler self-heals: when profile is missing, it gets inserted before subscription upsert
- [ ] No FK errors in logs after `stripe trigger checkout.session.completed`
- [ ] `VoiceProfileStatus` TS type includes `'queued'`
- [ ] `pnpm tsc --noEmit` clean
- [ ] No other code paths broken (run any existing test suite, manual smoke through onboarding)

---

## WHAT THIS DOES NOT DO

- Does not backfill missing profile rows for existing users. If you want a migration that retroactively creates profile rows for every `auth.users` row that lacks one, that's a separate (and one-time) job. Worth doing eventually but not part of 7b.1.
- Does not refactor the trigger or backfill logic in the original migration. The trigger is fine; the bug is in users who slipped past it.
- Does not remove the original `RUN_IN_DASHBOARD_*.sql` file from the repo. That file's name suggests it was meant to be applied manually — leaving it is fine, but worth a future cleanup pass to either rename it or delete if it's been applied to all environments.
