import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSubscriptionStatus } from '@/lib/subscription/get-status';
import { RestoreActions } from './actions';

const VAULT_ROUTE = '/app/vault/restore';

export default async function VaultRestorePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/sign-in?next=${VAULT_ROUTE}`);
  }

  const sub = await getSubscriptionStatus(user.id);

  // Already restored (webhook fired after Portal update) — send them onward.
  if (sub.status === 'trial' || sub.status === 'active') {
    redirect('/app/record');
  }

  // Never had a subscription — the restore screen doesn't apply.
  if (sub.status === 'none') {
    redirect('/app/vault/reveal');
  }

  // past_due | lapsed | cancelled → render restore.
  // Body copy branches on whether the user has at least one recorded clip.
  // Fail-safe: if the count query errors, render the has-recordings variant
  // (it's never wrong to a recording-bearing user; only marginally over-
  // promising to a blank one).
  const { count, error: countErr } = await supabase
    .from('training_clips')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .limit(1);

  if (countErr) {
    console.error('[vault/restore] recordings count failed', countErr);
  }

  const hasRecordings = (count ?? 1) > 0;

  return <RestoreActions hasRecordings={hasRecordings} />;
}
