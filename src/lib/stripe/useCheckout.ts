"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { BillingPlan } from "@/lib/vault";

/**
 * Shared client-side Stripe checkout starter. Extracted from the vault Seal
 * and Protect actions, which carried an identical copy.
 *
 * POSTs the chosen plan to /api/stripe/create-checkout-session, then routes by
 * the response:
 *   - ok + external Stripe URL (http/https) → full-page navigation;
 *   - ok + internal mock URL → SPA router push (keeps the client nav);
 *   - 401 carrying `{ redirect }` → router push to the sign-in redirect;
 *   - any other failure → console.error tagged with `label`, then no-op.
 *
 * `label` only scopes the failure log (e.g. "seal" / "protect"); it has no
 * effect on the happy paths.
 */
export function useCheckout(label: string) {
  const router = useRouter();

  return useCallback(
    async (plan: BillingPlan) => {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.redirect) {
          router.push(data.redirect);
          return;
        }
        console.error(`[${label}] checkout failed`, data);
        return;
      }

      const { checkoutUrl } = (await res.json()) as { checkoutUrl: string };

      // External Stripe URL: full page navigation. Internal mock path:
      // router.push keeps the SPA nav.
      if (/^https?:\/\//.test(checkoutUrl)) {
        window.location.assign(checkoutUrl);
      } else {
        router.push(checkoutUrl);
      }
    },
    [router, label],
  );
}
