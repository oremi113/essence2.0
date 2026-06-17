import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import {
  AVATAR_BUCKET,
  AVATAR_MAX_BYTES,
  AVATAR_ALLOWED_MIME,
  avatarObjectPath,
  extensionForMime,
  getAvatarSignedUrl,
} from '@/lib/profile';
import type { OnboardingScreenData } from '@/components/screens/OnboardingScreen.types';
import { OnboardingPageClient } from './OnboardingPageClient';
import { persistOnboardingCompletion } from '@/lib/onboarding/persistOnboardingCompletion';
import { ROUTES, signInWithNext } from '@/lib/routes';

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
    redirect(signInWithNext(ROUTES.onboarding));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'first_name, last_name, display_name, date_of_birth, city, state, avatar_storage_bucket, avatar_storage_path, onboarding_completed_at'
    )
    .eq('user_id', user.id)
    .maybeSingle();

  // Already completed — skip the wizard entirely.
  if (profile?.onboarding_completed_at) {
    redirect(ROUTES.home);
  }

  // Prefer explicit first_name. Fall back to parsing display_name only if
  // it looks like a real name (not Supabase's auto-inserted email default).
  const displayLooksLikeEmail = /@/.test(profile?.display_name ?? '');
  const parts = !displayLooksLikeEmail
    ? profile?.display_name?.trim().split(/\s+/) ?? []
    : [];
  const fallbackFirst = parts[0] ?? null;
  const fallbackLast = parts.slice(1).join(' ') || null;

  // Resume case: if the user uploaded a photo on a prior session, mint a
  // fresh signed URL so the photo screen and review card render it.
  const serviceClient = createSupabaseServiceClient();
  const avatarUrl = await getAvatarSignedUrl(
    serviceClient,
    profile?.avatar_storage_bucket ?? null,
    profile?.avatar_storage_path ?? null
  );

  const data: OnboardingScreenData = {
    firstName: profile?.first_name ?? fallbackFirst,
    lastName: profile?.last_name ?? fallbackLast,
    dateOfBirth: profile?.date_of_birth ?? null,
    city: profile?.city ?? null,
    state: profile?.state ?? null,
    avatarUrl,
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
    stateCode: string
  ) {
    'use server';
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // Expired/lost session: throw rather than silently return — a silent return
    // resolves the action as "saved" and the wizard would navigate away,
    // discarding everything the user typed (FOLLOW_UPS #42).
    if (!user) throw new Error('Your session expired. Please sign in again.');

    const cleanedFirst = smartCase(firstName);
    const cleanedLast = smartCase(lastName);
    const cleanedCity = smartCase(city);

    const birthYear = /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
      ? parseInt(dateOfBirth.slice(0, 4), 10)
      : null;

    const displayName = [cleanedFirst, cleanedLast].filter(Boolean).join(' ');

    // Throws on a write error so the screen keeps the user on the wizard with
    // their draft intact instead of navigating into the app on a silent save
    // failure (FOLLOW_UPS #42).
    await persistOnboardingCompletion(supabase, user.id, {
      first_name: cleanedFirst,
      last_name: cleanedLast,
      display_name: displayName,
      date_of_birth: dateOfBirth,
      birth_year: birthYear,
      city: cleanedCity,
      state: stateCode,
    });
  }

  // Server action — uploads the Screen 10 photo to the private
  // `profile-photos` bucket and writes the path to profiles. Returns a
  // fresh signed URL so the wizard can show the just-uploaded image
  // immediately without waiting for a re-render.
  //
  // Validation: mime allowlist + 2MB cap. We trust the client's chosen
  // mime as a hint but enforce both sides server-side.
  async function uploadAvatar(formData: FormData): Promise<{ avatarUrl: string }> {
    'use server';
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not signed in');

    const file = formData.get('file');
    if (!(file instanceof File)) throw new Error('No file uploaded');

    const allowed = AVATAR_ALLOWED_MIME as readonly string[];
    if (!allowed.includes(file.type)) {
      throw new Error('Unsupported image type. Use JPEG, PNG, or WebP.');
    }
    if (file.size > AVATAR_MAX_BYTES) {
      throw new Error('Image is too large. Please choose one under 2MB.');
    }

    const ext = extensionForMime(file.type);
    if (!ext) throw new Error('Unsupported image type.');

    const path = avatarObjectPath(user.id, ext);
    const service = createSupabaseServiceClient();

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await service.storage
      .from(AVATAR_BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true, // re-upload overwrites in place
      });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // Persist the path; the bucket is constant today but stored alongside
    // for future-proofing (see migration comment).
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_storage_bucket: AVATAR_BUCKET,
        avatar_storage_path: path,
      })
      .eq('user_id', user.id);
    if (updateError) throw new Error(`Save failed: ${updateError.message}`);

    const signed = await getAvatarSignedUrl(service, AVATAR_BUCKET, path);
    if (!signed) throw new Error('Could not generate preview URL.');
    return { avatarUrl: signed };
  }

  return (
    <OnboardingPageClient
      data={data}
      onComplete={completeOnboarding}
      onUploadAvatar={uploadAvatar}
    />
  );
}
