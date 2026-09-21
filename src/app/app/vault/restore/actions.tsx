'use client';

import { useState } from 'react';
import { VaultRestoreScreen } from '@/components/screens/vault/VaultRestoreScreen';
import type { RestoreMode } from '@/lib/subscription/restore-mode';
import type { BillingPlan } from '@/lib/vault';

export function RestoreActions({
  hasRecordings,
  mode,
  plan,
}: {
  hasRecordings: boolean;
  mode: RestoreMode;
  plan: BillingPlan;
}) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFailed, setRestoreFailed] = useState(false);

  async function handleRestore() {
    if (isRestoring) return;
    setRestoreFailed(false);
    setIsRestoring(true);

    try {
      if (mode === 'update_card') {
        // past_due — the subscription still exists; the Customer Portal lets
        // them update the card so the next retry succeeds.
        const res = await fetch('/api/stripe/portal-session', { method: 'POST' });
        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.portalUrl) {
          if (data.redirect) {
            window.location.href = data.redirect;
            return;
          }
          console.error('[vault/restore] portal session failed', data);
          setRestoreFailed(true);
          setIsRestoring(false);
          return;
        }

        // Full-page handoff to the Customer Portal — it's the recovery flow, not
        // a side errand. A top-level navigation is never gesture-gated, unlike a
        // post-`await` `window.open('_blank')`, which iOS/Safari block as
        // non-user-initiated: the blocked handle was silently discarded (no
        // `restoreFailed`), dead-ending the card-update path on exactly the
        // devices most people tap this on. Stripe's `return_url` brings the user
        // back here afterward. Mirrors the `restart` branch's checkout handoff.
        window.location.href = data.portalUrl;
        return;
      }

      // restart — lapsed/cancelled: the old subscription is gone, so create a
      // new one on the existing customer, preserving the prior plan. A fresh
      // checkout carries the standard 7-day trial (watched for abuse).
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.checkoutUrl) {
        if (data.redirect) {
          window.location.href = data.redirect;
          return;
        }
        console.error('[vault/restore] checkout session failed', data);
        setRestoreFailed(true);
        setIsRestoring(false);
        return;
      }

      // Full-page handoff to Stripe Checkout — it's the flow, not a side errand.
      window.location.href = data.checkoutUrl;
    } catch (err) {
      // Offline / connection dropped — recover instead of dead-ending on a
      // silent reset (Step 10 / Chapter 12: no dead ends).
      console.error('[vault/restore] restore request errored', err);
      setRestoreFailed(true);
      setIsRestoring(false);
    }
  }

  return (
    <VaultRestoreScreen
      hasRecordings={hasRecordings}
      mode={mode}
      onRestore={handleRestore}
      isRestoring={isRestoring}
      restoreFailed={restoreFailed}
    />
  );
}
