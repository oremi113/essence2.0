/**
 * /messages/saved/[messageId] — A7 Save Confirmation.
 *
 * Thin data-shuttle per CLAUDE.md: auth-check, fetch the saved `messages`
 * row, derive the screen props (recipient name, third-of-three variant,
 * server save timestamp), render the client wrapper. Navigation lives in
 * SaveConfirmationPageClient; all visuals live in the screen component.
 *
 * Not flag-gated: the save confirmation is arm-independent (both the
 * control and Deferred-Audio A6 land here after a save). Guards: bad
 * UUID / missing row / someone else's row / unsaved status → 404. The
 * page is revisit-safe — it renders from the durable messages row, so a
 * reload or a returning deep-link replays the ceremony harmlessly.
 *
 * C1 once-per-lifetime is now server-durable (FOLLOW_UPS #54): the page
 * reads profiles.three_shaped_ceremony_seen_at to decide the ceremony
 * branch, and owns the server action that stamps it on first show —
 * replacing the V1 per-device localStorage latch. An already-seen user
 * (any device) is never sent C1 HTML; they get the normal A7 third-variant
 * confirmation, so there's no ceremony flash-then-replace.
 */
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { messageSavedRoute, signInWithNext } from "@/lib/routes";
import { STEP6_LIMITS } from "@/lib/messages/cost-controls";
import { SaveConfirmationPageClient } from "./SaveConfirmationPageClient";
import { ThreeShapedPageClient } from "./ThreeShapedPageClient";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MessageSavedPage({
  params,
  searchParams,
}: {
  params: Promise<{ messageId: string }>;
  searchParams: Promise<{ ceremony?: string }>;
}) {
  const { messageId } = await params;
  const { ceremony } = await searchParams;
  if (!UUID_RE.test(messageId)) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(signInWithNext(messageSavedRoute(messageId)));

  const { data: message } = await supabase
    .from("messages")
    .select("id, status, recipient_id, created_at")
    .eq("id", messageId)
    .eq("user_id", user.id)
    .maybeSingle();

  // Only a saved message has a confirmation to show.
  if (!message || message.status !== "saved") notFound();

  // Recipient name for the title. /save promotes pending recipients before
  // inserting the message, so recipient_id is set on every current-flow row;
  // "them" covers a data anomaly without breaking the sentence.
  let recipientName = "them";
  if (message.recipient_id) {
    const { data: recipient } = await supabase
      .from("recipients")
      .select("name")
      .eq("id", message.recipient_id)
      .maybeSingle();
    if (recipient?.name) recipientName = recipient.name;
  }

  // Third-of-three: this user's saved count has reached the vault cap →
  // the secondary CTA becomes "See what's coming" (→ C2 Waitlist).
  const { count: savedCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "saved");
  const isThird = (savedCount ?? 0) >= STEP6_LIMITS.maxSavedMessages;

  // Page-owned server action: stamp the C1 once-per-lifetime flag on first show.
  // DB-level idempotent — the `.is(... null)` guard preserves the original
  // first-show timestamp even if the action fires more than once.
  async function markThreeShapedSeen(): Promise<void> {
    "use server";
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ three_shaped_ceremony_seen_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("three_shaped_ceremony_seen_at", null);
  }

  // C1 Three Shaped — the one-time ceremony after the 3rd save. Triggered by
  // ?ceremony=three-shaped (added by the 3rd-save redirect), and only when the
  // user is actually at the cap (param can't conjure the ceremony early). The
  // once-per-lifetime guard is now server-durable: we show C1 only if this user
  // has never seen it (profiles.three_shaped_ceremony_seen_at IS NULL), and the
  // client stamps it on mount via the page-owned action above. An already-seen
  // user (any device, stale ?ceremony deep-link) falls through to the normal A7
  // confirmation — no flash. The profile read is gated behind the trigger so the
  // common (non-ceremony) path keeps its query count.
  if (ceremony === "three-shaped" && isThird) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("three_shaped_ceremony_seen_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.three_shaped_ceremony_seen_at) {
      return <ThreeShapedPageClient onSeen={markThreeShapedSeen} />;
    }
  }

  return (
    <SaveConfirmationPageClient
      recipientName={recipientName}
      variant={isThird ? "third" : "default"}
      savedAtIso={message.created_at}
    />
  );
}
