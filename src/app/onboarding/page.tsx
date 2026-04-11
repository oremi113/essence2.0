import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { OnboardingPageClient } from './OnboardingPageClient';

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/sign-in?next=/onboarding');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed_at')
    .eq('user_id', user.id)
    .maybeSingle();

  // Already completed — skip the wizard entirely.
  if (profile?.onboarding_completed_at) {
    redirect('/home');
  }

  return <OnboardingPageClient />;
}
