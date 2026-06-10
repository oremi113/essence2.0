/**
 * Seed/read helpers for the Step 6 (message creation) endpoint smoke tests.
 *
 * All seeding goes through the service-role admin client (bypasses RLS), so
 * tests can construct any lifecycle state directly — letting us exercise the
 * gates, cost caps, save/idempotency, recipient promotion, and audio promotion
 * WITHOUT triggering a real ElevenLabs render or Anthropic call. Every endpoint
 * path these tests hit returns before the paid render (or copies a seeded fake
 * audio object), so the suite costs nothing in vendor spend.
 */
import { adminClient, uploadToStorage } from './supabase';

export const AUDIO_BUCKET = 'essence-audio';

/** A voice profile in 'ready' status with a (fake) vendor voice id. */
export async function seedReadyVoiceProfile(userId: string): Promise<string> {
  const admin = adminClient();
  await admin.from('profiles').upsert(
    { user_id: userId, first_name: 'Smoke', display_name: 'Smoke Test', city: 'Testville', birth_year: 1990 },
    { onConflict: 'user_id' },
  );
  const { data, error } = await admin
    .from('voice_profiles')
    .insert({
      user_id: userId,
      label: 'Smoke Voice',
      relationship: 'self',
      status: 'ready',
      vendor_voice_id: 'smoke_fake_voice',
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`seedReadyVoiceProfile failed: ${error?.message}`);
  return data.id;
}

export async function seedRecipient(
  userId: string,
  name: string,
  relationship: string | null = null,
): Promise<string> {
  const admin = adminClient();
  const { data, error } = await admin
    .from('recipients')
    .insert({ user_id: userId, name, relationship })
    .select('id')
    .single();
  if (error || !data) throw new Error(`seedRecipient failed: ${error?.message}`);
  return data.id;
}

export async function seedActiveSubscription(userId: string, status = 'active'): Promise<void> {
  const admin = adminClient();
  const tag = userId.slice(0, 12);
  const { error } = await admin.from('subscriptions').insert({
    user_id: userId,
    status,
    billing_period: 'monthly',
    price_amount_cents: 1299,
    stripe_customer_id: `cus_smoke_${tag}`,
    stripe_price_id: 'price_smoke',
    stripe_subscription_id: `sub_smoke_${tag}`,
  });
  if (error) throw new Error(`seedActiveSubscription failed: ${error.message}`);
}

type PendingOverrides = Partial<{
  category: string;
  template_variant: string;
  text_status: string;
  audio_status: string;
  generated_text: string | null;
  audio_path: string | null;
  note: string | null;
  recipient_id: string | null;
  pending_recipient_name: string | null;
  pending_recipient_relationship: string | null;
  pending_recipient_descriptor: string | null;
  regenerate_count: number;
  edit_note_depth: number;
  source_generation_id: string | null;
  superseded_at: string | null;
  saved_message_id: string | null;
}>;

export async function seedPending(
  userId: string,
  voiceProfileId: string,
  overrides: PendingOverrides = {},
): Promise<string> {
  const admin = adminClient();
  const { data, error } = await admin
    .from('pending_generations')
    .insert({
      user_id: userId,
      voice_profile_id: voiceProfileId,
      category: 'birthday',
      template_variant: 'birthday_generic_01',
      text_status: 'pending',
      audio_status: 'pending',
      ...overrides,
    })
    .select('generation_id')
    .single();
  if (error || !data) throw new Error(`seedPending failed: ${error?.message}`);
  return data.generation_id;
}

export async function setPending(generationId: string, patch: PendingOverrides): Promise<void> {
  const admin = adminClient();
  const { error } = await admin.from('pending_generations').update(patch).eq('generation_id', generationId);
  if (error) throw new Error(`setPending failed: ${error.message}`);
}

/** Upload a tiny fake audio object at the pending path AND point the row at it. */
export async function seedPendingAudioObject(userId: string, generationId: string): Promise<string> {
  const path = `users/${userId}/pending/${generationId}.mp3`;
  await uploadToStorage(AUDIO_BUCKET, path, new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]), 'audio/mpeg');
  await setPending(generationId, { audio_path: path });
  return path;
}

export async function seedSavedMessage(userId: string, voiceProfileId: string): Promise<string> {
  const admin = adminClient();
  const { data, error } = await admin
    .from('messages')
    .insert({
      user_id: userId,
      voice_profile_id: voiceProfileId,
      category: 'birthday',
      status: 'saved',
      body_text: 'seeded saved message',
      storage_bucket: AUDIO_BUCKET,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(`seedSavedMessage failed: ${error?.message}`);
  return data.id;
}

export async function seedSavedMessages(userId: string, voiceProfileId: string, n: number): Promise<void> {
  for (let i = 0; i < n; i++) await seedSavedMessage(userId, voiceProfileId);
}

// ----- read helpers --------------------------------------------------------

export async function getPending(generationId: string) {
  const admin = adminClient();
  const { data } = await admin.from('pending_generations').select('*').eq('generation_id', generationId).maybeSingle();
  return data;
}

export async function getMessageBySource(generationId: string) {
  const admin = adminClient();
  const { data } = await admin.from('messages').select('*').eq('source_generation_id', generationId).maybeSingle();
  return data;
}

export async function getRecipientByName(userId: string, name: string) {
  const admin = adminClient();
  const { data } = await admin.from('recipients').select('*').eq('user_id', userId).eq('name', name).maybeSingle();
  return data;
}

export async function countSavedMessages(userId: string): Promise<number> {
  const admin = adminClient();
  const { count } = await admin
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'saved');
  return count ?? 0;
}

export const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
