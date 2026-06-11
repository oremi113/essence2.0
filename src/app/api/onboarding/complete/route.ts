import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { defineRoute } from '@/lib/api/defineRoute';

export const POST = defineRoute({ auth: true }, async ({ user }) => {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
