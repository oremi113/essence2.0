import 'server-only';
import { stripe } from './client';
import { handleCheckoutCompleted } from '@/app/api/stripe/webhook/handlers';

/**
 * Reconcile a subscription row directly from a completed Checkout Session.
 *
 * FOLLOW_UPS #84. Stripe redirects the browser to `success_url`
 * (`/app/voice/processing?session_id=...`) the instant checkout completes —
 * potentially BEFORE the `checkout.session.completed` webhook has written the
 * `trial` row. In that window a just-paid user reads as `none`, and the
 * processing-page guard (and the `/start` entitlement guard) would treat them as
 * unpaid. Rather than poll and hope the webhook lands, reconcile from the
 * authoritative source: retrieve the session and run the exact same
 * `handleCheckoutCompleted` path the webhook runs.
 *
 * Idempotent with the webhook: `upsertSubscription` keys on
 * `stripe_subscription_id` and has terminal-state guards, so a later or
 * concurrent `checkout.session.completed` for the same session is a harmless
 * no-op.
 */
export type ReconcileResult =
  /** Session complete + owned by the caller; subscription row written. */
  | { status: 'reconciled' }
  /** Session exists but isn't `complete` — the user didn't finish paying. */
  | { status: 'incomplete' }
  /** Session's `user_id` metadata doesn't match the caller — forged/borrowed id. */
  | { status: 'not_owned' }
  /** Retrieval or reconcile threw (Stripe down, unknown id, write failure). */
  | { status: 'error' };

export async function reconcileCheckoutSession(
  sessionId: string,
  userId: string,
): Promise<ReconcileResult> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // The session's `user_id` metadata is stamped by us at creation
    // (`createCheckoutSession`). A session whose metadata doesn't match the
    // caller is a forged or borrowed id — never reconcile it, or we'd grant this
    // user another account's subscription (or bypass payment with someone
    // else's paid session).
    if (session.metadata?.user_id !== userId) {
      console.warn(
        '[reconcileCheckoutSession] session/user mismatch — refusing',
        sessionId,
        userId,
      );
      return { status: 'not_owned' };
    }

    // Only a completed checkout entitles anything. `status` is `complete` for a
    // finished subscription checkout — including a 7-day trial, where
    // `payment_status` is `no_payment_required` (no immediate charge). Gate on
    // `status`, NOT `payment_status`, so trials aren't wrongly rejected.
    if (session.status !== 'complete') {
      return { status: 'incomplete' };
    }

    // Reuse the exact webhook path so the row we write is identical to what
    // `checkout.session.completed` would write.
    await handleCheckoutCompleted(session);
    return { status: 'reconciled' };
  } catch (err) {
    // Never let a reconcile failure crash the landing page. Log and report
    // 'error'; the caller falls back to the normal `none` guard (the webhook
    // will still write the row eventually, and the user can retry).
    console.error('[reconcileCheckoutSession] failed', sessionId, err);
    return { status: 'error' };
  }
}
