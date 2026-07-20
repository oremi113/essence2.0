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
 *   - 401 carrying `{ redirect }` → router push to the sign-in redirect.
 *
 * Returns whether the request was **handled** (navigating away or redirecting).
 * A network failure or a non-redirect server error returns `false` so the
 * caller can surface a warm, recoverable error instead of leaving the user on a
 * dead spinner (Step 10 / Chapter 12: no dead ends, no silent failures).
 *
 * `label` only scopes the failure log (e.g. "seal" / "protect"); it has no
 * effect on the happy paths.
 */
export function useCheckout(label: string) {
  const router = useRouter();

  return useCallback(
    async (plan: BillingPlan): Promise<boolean> => {
      let res: Response;
      try {
        res = await fetch("/api/stripe/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
      } catch (err) {
        // Offline / connection dropped before a response — the caller shows the
        // recoverable error rather than letting the rejection go unhandled.
        console.error(`[${label}] checkout request errored`, err);
        return false;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.redirect) {
          router.push(data.redirect);
          return true;
        }
        console.error(`[${label}] checkout failed`, data);
        return false;
      }

      // A 200 must still carry a usable checkoutUrl. Parse defensively, mirroring
      // the error path above: an ok response with a broken body — non-JSON (a
      // proxy interstitial or truncated stream), or valid JSON missing/renaming
      // the field — is not a success. Without this guard the two failure modes
      // both defeat the hook's "no dead spinner, return false so the caller
      // recovers" contract: an unguarded `await res.json()` throw escapes the
      // hook so the caller's CTA never leaves its spinner, and an absent field
      // makes `checkoutUrl` undefined → `router.push(undefined)` a silent no-op
      // that still returns true, so the caller believes navigation is underway.
      const data = await res.json().catch(() => ({}));
      const checkoutUrl: unknown = data?.checkoutUrl;

      if (typeof checkoutUrl !== "string" || !checkoutUrl) {
        console.error(`[${label}] checkout succeeded without a URL`, data);
        return false;
      }

      // External Stripe URL: full page navigation. Internal mock path:
      // router.push keeps the SPA nav.
      if (/^https?:\/\//.test(checkoutUrl)) {
        window.location.assign(checkoutUrl);
      } else {
        router.push(checkoutUrl);
      }
      return true;
    },
    [router, label],
  );
}
