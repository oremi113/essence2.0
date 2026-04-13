import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { ENV } from './env';

export function adminClient(): SupabaseClient {
  return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type TestUser = {
  id: string;
  email: string;
};

export async function createTestUser(): Promise<TestUser> {
  const admin = adminClient();
  const email = `smoke+${randomUUID()}@essence-test.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { smoke_test: true },
  });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  return { id: data.user.id, email };
}

export async function deleteTestUser(userId: string): Promise<void> {
  const admin = adminClient();
  try {
    await admin.auth.admin.deleteUser(userId);
  } catch {
    // non-fatal in teardown
  }
}

/**
 * Generate a magic link token_hash for the given user, to be fed into
 * /auth/callback?token_hash=...&type=magiclink so the browser gets cookies.
 */
export async function generateAuthLinkHash(email: string): Promise<string> {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (error || !data?.properties?.hashed_token) {
    throw new Error(`generateLink failed: ${error?.message ?? 'no hashed_token'}`);
  }
  return data.properties.hashed_token;
}

/**
 * Seed a voice_profile in 'collecting' status. Also upserts a profiles row
 * so RecordScreen's data fetch doesn't trip.
 */
export async function seedVoiceProfile(
  userId: string,
  opts: { status?: string; label?: string; relationship?: string } = {}
): Promise<{ voiceProfileId: string }> {
  const admin = adminClient();

  // Ensure profile row (columns that the /record page reads)
  await admin.from('profiles').upsert(
    {
      user_id: userId,
      first_name: 'Smoke',
      display_name: 'Smoke Test',
      city: 'Testville',
      birth_year: 1990,
    },
    { onConflict: 'user_id' }
  );

  const { data, error } = await admin
    .from('voice_profiles')
    .insert({
      user_id: userId,
      label: opts.label ?? 'Smoke Voice',
      relationship: opts.relationship ?? 'self',
      status: opts.status ?? 'collecting',
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(`seedVoiceProfile failed: ${error?.message}`);
  return { voiceProfileId: data.id };
}

/**
 * Seed N training_clips rows as 'uploaded' without actually uploading storage.
 * Useful for gate tests (INSUFFICIENT_CLIPS / CLIPS_TOO_SHORT) where /start
 * short-circuits on DB counts before touching storage.
 */
export async function seedClipRows(
  userId: string,
  voiceProfileId: string,
  count: number,
  bytesEach: number
): Promise<string[]> {
  const admin = adminClient();
  const rows = Array.from({ length: count }, (_, i) => ({
    user_id: userId,
    voice_profile_id: voiceProfileId,
    prompt_index: i + 1,
    status: 'uploaded',
    storage_bucket: 'essence-audio',
    storage_path: `fake/${voiceProfileId}/${i + 1}.webm`,
    mime_type: 'audio/webm',
    bytes: bytesEach,
  }));
  const { data, error } = await admin
    .from('training_clips')
    .insert(rows)
    .select('id');
  if (error) throw new Error(`seedClipRows failed: ${error.message}`);
  return (data ?? []).map((r) => r.id);
}

/**
 * Upload a byte blob to storage at a given path so the commit endpoint's
 * download check passes. Uses service role to bypass RLS.
 */
export async function uploadToStorage(
  bucket: string,
  path: string,
  bytes: Uint8Array,
  contentType: string
): Promise<void> {
  const admin = adminClient();
  const { error } = await admin.storage.from(bucket).upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`uploadToStorage failed: ${error.message}`);
}

export async function getTrainingClip(id: string) {
  const admin = adminClient();
  const { data, error } = await admin
    .from('training_clips')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getVoiceProfile(id: string) {
  const admin = adminClient();
  const { data, error } = await admin
    .from('voice_profiles')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}
