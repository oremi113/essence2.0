/**
 * /messages/limit — C3 Vault Limit Reached.
 *
 * Thin data-shuttle per CLAUDE.md: auth-check, confirm the user is actually
 * at the cap, render the client wrapper. The screen is static (no per-user
 * data beyond "you're capped"), so there are no props to derive.
 *
 * Guard — under-cap users don't belong here: this is the capped steady-state.
 * If a user with room navigates here directly (or their count changed since
 * the redirect), send them into the creation flow instead. This is the exact
 * complement of the A2-entry gate (capped → here; here → /messages/new if not
 * capped), so the two can't loop.
 *
 * `?from=save_race` marks the /save race-case 403 path; anything else
 * (including the A2-entry redirect and direct navigation) reads as the
 * entry gate. Feeds `surfaced_from` on step6.vault_limit_blocked.
 */
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ROUTES, signInWithNext } from "@/lib/routes";
import { STEP6_LIMITS } from "@/lib/messages/cost-controls";
import {
  VaultLimitPageClient,
  type VaultLimitSurfacedFrom,
} from "./VaultLimitPageClient";

export default async function MessagesLimitPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const surfacedFrom: VaultLimitSurfacedFrom =
    from === "save_race" ? "save_race" : "a2_entry";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(signInWithNext(ROUTES.messagesLimit));

  const { count: savedCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "saved");

  // Not capped → there's no ceiling to show. Send them to create.
  if ((savedCount ?? 0) < STEP6_LIMITS.maxSavedMessages) {
    redirect(ROUTES.messagesNew);
  }

  return <VaultLimitPageClient surfacedFrom={surfacedFrom} />;
}
