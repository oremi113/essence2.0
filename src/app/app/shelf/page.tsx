import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ShelfPageClient } from "./ShelfPageClient";
import { TabNav } from "@/components/nav/TabNav";
import { ROUTES, signInWithNext } from "@/lib/routes";

export default async function ShelfPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(signInWithNext(ROUTES.shelf));
  }

  // A7 routes here with `?saved=1` after a save — drives the newest card's
  // fresh settle and the first-ever-save ceremony.
  const { saved } = await searchParams;

  return (
    <>
      <TabNav current="shelf" />
      <ShelfPageClient justSaved={saved === "1"} />
    </>
  );
}
