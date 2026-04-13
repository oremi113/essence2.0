import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MemoryShelf } from "@/components/shelf/MemoryShelf";
import { TabNav } from "@/components/nav/TabNav";

export default async function ShelfPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/sign-in?next=/app/shelf");
  }

  return (
    <>
      <TabNav current="shelf" />
      <MemoryShelf />
    </>
  );
}
