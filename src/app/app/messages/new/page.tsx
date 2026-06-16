import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/routes";

/**
 * Legacy message-creation route — RETIRED in M0 (FOLLOW_UPS #34).
 *
 * The old `NewMessageView` flow is gone; the canonical creation flow is the
 * Step 6 spine at `/messages/new`. This route is kept only as a permanent
 * redirect so any stray link to the old path still lands in the right place.
 */
export default function LegacyNewMessageRedirect() {
  redirect(ROUTES.messagesNew);
}
