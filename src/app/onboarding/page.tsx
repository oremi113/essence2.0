import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { OnboardingScreenData } from '@/components/screens/OnboardingScreen.types';
import { OnboardingPageClient } from './OnboardingPageClient';

/**
 * Normalize user-typed names and cities before saving.
 *
 *  - trims whitespace
 *  - if the user typed mixed-case (e.g. "McConnell", "O'Brien",
 *    "St. Louis"), we trust their intent and leave it alone
 *  - if all-lower ("sarah", "miami") or all-upper ("MIAMI"), we
 *    title-case it at word / hyphen / apostrophe boundaries
 *
 * Intentionally simple — common names won't be perfect ("de la Cruz"
 * becomes "De La Cruz") but the common-case wins and users can type
 * proper casing to override entirely.
 */
function smartCase(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  const hasLower = /[a-z]/.test(trimmed);
  const hasUpper = /[A-Z]/.test(trimmed);
  if (hasLower && hasUpper) return trimmed; // preserve user intent
  return trimmed
    .toLowerCase()
    .split(/(\s+|[-'])/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

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
    .select(
      'first_name, last_name, display_name, date_of_birth, city, state, onboarding_completed_at'
    )
    .eq('user_id', user.id)
    .maybeSingle();

  // Already completed — skip the wizard entirely.
  if (profile?.onboarding_completed_at) {
    redirect('/home');
  }

  // Prefer explicit first_name. Fall back to parsing display_name only if
  // it looks like a real name (not Supabase's auto-inserted email default).
  const displayLooksLikeEmail = /@/.test(profile?.display_name ?? '');
  const parts = !displayLooksLikeEmail
    ? profile?.display_name?.trim().split(/\s+/) ?? []
    : [];
  const fallbackFirst = parts[0] ?? null;
  const fallbackLast = parts.slice(1).join(' ') || null;

  const data: OnboardingScreenData = {
    firstName: profile?.first_name ?? fallbackFirst,
    lastName: profile?.last_name ?? fallbackLast,
    dateOfBirth: profile?.date_of_birth ?? null,
    city: profile?.city ?? null,
    state: profile?.state ?? null,
    isCompleted: false,
  };

  // Server action — persists everything the wizard collects.
  // display_name is kept as the canonical "First Last" string so existing
  // queries (e.g. /app/record) that select display_name continue to work.
  // birth_year is derived from the full DOB for voice-training resolution.
  async function completeOnboarding(
    firstName: string,
    lastName: string,
    dateOfBirth: string,
    city: string,
    stateCode: string,
    hasPhoto: boolean
  ) {
    'use server';
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const cleanedFirst = smartCase(firstName);
    const cleanedLast = smartCase(lastName);
    const cleanedCity = smartCase(city);

    const birthYear = /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
      ? parseInt(dateOfBirth.slice(0, 4), 10)
      : null;

    const displayName = [cleanedFirst, cleanedLast].filter(Boolean).join(' ');

    await supabase
      .from('profiles')
      .update({
        first_name: cleanedFirst,
        last_name: cleanedLast,
        display_name: displayName,
        date_of_birth: dateOfBirth,
        birth_year: birthYear,
        city: cleanedCity,
        state: stateCode,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // hasPhoto captured for a future session that wires Supabase Storage.
    void hasPhoto;
  }

  return <OnboardingPageClient data={data} onComplete={completeOnboarding} />;
}
