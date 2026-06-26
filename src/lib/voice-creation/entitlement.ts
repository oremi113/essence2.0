import "server-only";
import { AppError, ErrorCode } from "@/lib/errors";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getSubscriptionStatus } from "@/lib/subscription/get-status";
import type { SubscriptionStatus } from "@/lib/vault";

/**
 * Subscription statuses that entitle a user to invoke paid voice creation
 * (the ElevenLabs call in `/api/voice-profiles/[id]/start`). Mirrors the
 * save-route gate (`trial`/`active`) — both protect a paid vendor call.
 */
export const VOICE_CREATION_ALLOWED_STATUSES: ReadonlySet<SubscriptionStatus> =
  new Set<SubscriptionStatus>(["trial", "active"]);

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
