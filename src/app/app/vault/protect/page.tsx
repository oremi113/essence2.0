import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { ProtectActions } from './actions';

export default async function VaultProtectPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/sign-in?next=/app/vault/protect');

  // PLACEHOLDER_7b: subscription_status route guard — see reveal/page.tsx.

  return <ProtectActions />;
}
