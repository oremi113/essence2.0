import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MemoryShelf } from "@/components/shelf/MemoryShelf";
import { TabNav } from "@/components/nav/TabNav";
import { ROUTES, signInWithNext } from "@/lib/routes";

export default async function ShelfPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(signInWithNext(ROUTES.shelf));
  }

  return (
    <>
      <TabNav current="shelf" />
      <MemoryShelf />
    </>
  );
}
