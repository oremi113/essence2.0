/**
 * /messages/waitlist — C2 Waitlist.
 *
 * Thin data-shuttle per CLAUDE.md: auth-check, prefill the email from the
 * authed user, derive `surfaced_from` from `?from`, render the client wrapper.
 * No cap check — the waitlist is open to anyone (it's reachable from C3 at the
 * cap, but also a standalone "look ahead").
 *
 * `?from=c1` (C1 ceremony) / `?from=c3` (C3 vault limit) set the attribution;
 * anything else (direct nav) reads as `c2_direct`. Feeds `surfaced_from` on
 * step6.waitlist_joined.
 */
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ROUTES, signInWithNext } from "@/lib/routes";
import {
  WaitlistPageClient,
  type WaitlistSurfacedFrom,
} from "./WaitlistPageClient";

function normalizeFrom(from: string | undefined): WaitlistSurfacedFrom {
  if (from === "c1" || from === "c3") return from;
  return "c2_direct";
}

export default async function MessagesWaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(signInWithNext(ROUTES.messagesWaitlist));

  return (
    <WaitlistPageClient
      defaultEmail={user.email ?? ""}
      surfacedFrom={normalizeFrom(from)}
    />
  );
}
