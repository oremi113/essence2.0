import "server-only";
import { AppError, ErrorCode } from "@/lib/errors";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";
import type { SubscriptionStatus } from "@/lib/vault";

/**
 * Subscription statuses that entitle a user to invoke paid voice creation
 * (the ElevenLabs call in `/api/voice-profiles/[id]/start`). Mirrors the
 * save-route gate — both protect a paid vendor call.
 *
 * **`past_due` is included, and that is deliberate** (FOLLOW_UPS #109). The
 * product already treats a past-due subscription as live everywhere else:
 * MASTER_SPEC §1.6/§6.3 and Home B read it as *Protected* — "the vault is
 * still live while Stripe retries; it only becomes paused once the retry
 * ceiling is crossed and the webhook writes `lapsed`" — and the Stripe webhook
 * and cancel routes both select `['trial','active','past_due']`.
 *
 * Excluding it here made the app tell a user their vault was protected while
 * silently blocking the two things the vault is for. Worse, it was a *dead
 * end*: `/app/voice/processing` lets `past_due` through, so a "Try again" tap
 * routed them to a new screen and only then produced a 402.
 *
 * The cost is bounded and accepted: a failing card can reach paid vendor calls
 * for the length of Stripe's retry cycle. They had a valid card, Stripe is
 * actively retrying, and `lapsed` — which IS excluded — is the state that means
 * the retries gave up.
 */
export const VOICE_CREATION_ALLOWED_STATUSES: ReadonlySet<SubscriptionStatus> =
  new Set<SubscriptionStatus>(["trial", "active", "past_due"]);

/**
 * Gate paid voice creation on an active subscription.
 *
 * FOLLOW_UPS #22. The product decision is **locked**: voice creation requires a
 * captured card / active trial before ElevenLabs runs — no free path (Step 3
 * Card Capture handoff, §6/§7). What's deferred is only the *wiring*: this gate
 * is correct ONLY once M2 Step 3 lands the card-capture-before-processing
 * reorder, which is what gives a user `trial` status before they reach `/start`.
 * Until then every current user is `none` at `/start`, so the check is held
 * behind `VOICE_CREATION_REQUIRES_PAYMENT` (default OFF). M2 flips the flag.
 *
 * No-op when the flag is off. When on, throws `SUBSCRIPTION_REQUIRED` (402) for
 * any status outside {trial, active}.
 */
export async function assertCanCreateVoice(userId: string): Promise<void> {
  if (!isFeatureEnabled("VOICE_CREATION_REQUIRES_PAYMENT")) return;

  const { status } = await getSubscriptionStatus(userId);
  if (!VOICE_CREATION_ALLOWED_STATUSES.has(status)) {
    throw new AppError(
      ErrorCode.SUBSCRIPTION_REQUIRED,
      "Start your free trial to create your voice.",
      402,
      false,
    );
  }
}
