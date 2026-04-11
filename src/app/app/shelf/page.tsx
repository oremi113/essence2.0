import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MemoryShelf } from "@/components/shelf/MemoryShelf";

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
      <nav style={{ marginBottom: 16, fontSize: 14 }}>
        <a href="/app/record">Record</a>
        <span style={{ margin: "0 8px", color: "#ccc" }}>|</span>
        <a href="/app/messages/new">New Message</a>
      </nav>
      <MemoryShelf />
    </>
  );
}
