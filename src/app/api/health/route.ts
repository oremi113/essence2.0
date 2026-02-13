import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("healthcheck");
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 200 }
      );
    }
    return NextResponse.json({ ok: true, db: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 200 }
    );
  }
}
