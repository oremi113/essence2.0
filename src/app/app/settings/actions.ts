'use server';

/**
 * Server actions owned by the Settings page (three-layer: the screen bubbles
 * these out via callback props; the page keeps the Supabase / Stripe surface).
 *
 * The delete teardown is the load-bearing one. It is a fallible multi-write
 * (Stripe cancel + stored audio/avatar + the user's rows + the auth user), and
 * it reports success ONLY after every step confirms — the calm "account is
 * closed" terminal must never render over a half-deleted account
 * (success-reported-before-fallible-work, FOLLOW_UPS #43/#45/#66). Each row
 * delete goes through `checkedWrite`, which throws on a Postgrest error rather
 * than silently resolving as success.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { checkedWrite, bestEffortWrite } from '@/lib/supabase/checked-write';
import { stripe } from '@/lib/stripe/client';
import { deleteVoice } from '@/lib/elevenlabs';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { AVATAR_BUCKET } from '@/lib/profile/avatar';
import { logEvent, logError, generateRequestId } from '@/lib/logger';

export interface SettingsActionResult {
  ok: boolean;
  error?: string;
}

const AUDIO_BUCKET = 'essence-audio';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Latch the "trust band seen" UI flag (`profiles.ui_flags.settings_trust_seen`),
 * mirroring the A6 one-way latch pattern. The Settings trust band shows full on
 * the first visit, then a slim one-liner on every return. One-way false → true;
 * best-effort — a lost write just re-shows the full band once (no data loss), so
 * it never blocks the render. Same jsonb bag the repo uses for other UI latches,
 * so no migration (FOLLOW_UPS #36 / #54).
 */
export async function markTrustBandSeenAction(): Promise<void> {
  const requestId = generateRequestId();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from('profiles')
    .select('ui_flags')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) return;

  const flags =
    profile.ui_flags && typeof profile.ui_flags === 'object' && !Array.isArray(profile.ui_flags)
      ? (profile.ui_flags as Record<string, unknown>)
      : {};
  if (flags.settings_trust_seen === true) return;

  await bestEffortWrite(
    supabase
      .from('profiles')
      .update({ ui_flags: { ...flags, settings_trust_seen: true } })
      .eq('user_id', user.id),
    { op: 'settings.trust_band_seen', requestId, userId: user.id },
  );
}

/**
 * Change the login email (magic-link identity change). Supabase sends a confirm
 * link to the NEW address; the current email keeps working until it's tapped.
 * The link lands on the existing `/auth/callback` handler (which already accepts
 * `type=email_change`). We never mutate the identity here — only request it.
 */
export async function changeEmailAction(newEmail: string): Promise<SettingsActionResult> {
  const requestId = generateRequestId();
  const email = (newEmail ?? '').trim();
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: 'That doesn’t look like an email address. Check it and try again.' };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'Your session expired. Sign in and try again.' };
  }
  if (email.toLowerCase() === (user.email ?? '').trim().toLowerCase()) {
    return { ok: false, error: 'That’s already your email.' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3100';
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${baseUrl}/auth/callback?next=/app/settings` },
  );

  if (error) {
    logError({ event: 'settings.email_change', requestId, userId: user.id, error });
    return { ok: false, error: 'We couldn’t send the link just now. Try again in a moment.' };
  }

  logEvent({ event: 'settings.email_change_requested', requestId, userId: user.id, outcome: 'success' });
  return { ok: true };
}

/**
 * Remove the home photo: clear the avatar pointer on the profile and delete the
 * stored object. Reports failure honestly so the screen keeps the photo shown
 * rather than falsely claiming it's gone.
 */
export async function removePhotoAction(): Promise<SettingsActionResult> {
  const requestId = generateRequestId();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'Your session expired. Sign in and try again.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('avatar_storage_bucket, avatar_storage_path')
    .eq('user_id', user.id)
    .maybeSingle();

  try {
    if (profile?.avatar_storage_bucket && profile?.avatar_storage_path) {
      const service = createSupabaseServiceClient();
      const { error: rmErr } = await service.storage
        .from(profile.avatar_storage_bucket)
        .remove([profile.avatar_storage_path]);
      if (rmErr) {
        logError({ event: 'settings.remove_photo.storage', requestId, userId: user.id, error: rmErr });
        return { ok: false, error: 'That didn’t go through. Your photo is unchanged. Try again.' };
      }
    }

    await checkedWrite(
      supabase
        .from('profiles')
        .update({ avatar_storage_bucket: null, avatar_storage_path: null })
        .eq('user_id', user.id),
      { op: 'settings.remove_photo', requestId, userId: user.id },
    );

    logEvent({ event: 'settings.remove_photo', requestId, userId: user.id, outcome: 'success' });
    return { ok: true };
  } catch (err) {
    logError({ event: 'settings.remove_photo', requestId, userId: user.id, error: err });
    return { ok: false, error: 'That didn’t go through. Your photo is unchanged. Try again.' };
  }
}

/**
 * Account teardown. Order matters and every step is checked:
 *  1. Cancel any live Stripe subscription so a deleted account is never billed.
 *     A hard Stripe failure aborts BEFORE any data loss (nothing irreversible
 *     has happened yet) — the screen shows the "still here" failure terminal.
 *  2. Delete the cloned voice(s) on ElevenLabs so "permanently gone from our
 *     servers" is true — the vendor holds the clone, and once the local
 *     `vendor_voice_id` is gone (step 4) it can no longer be addressed for
 *     deletion. Runs before any local data loss so a hard vendor failure aborts
 *     while everything is still intact (same philosophy as the Stripe step); a
 *     404 is success (already gone).
 *  3. Wipe stored audio + avatar (storage is NOT cascaded by the auth delete).
 *  4. FK-safe row deletes (messages before voice_profiles — the FK RESTRICT the
 *     `/api/me` teardown documents), each via `checkedWrite`.
 *  5. Delete the auth user last; it cascades `profiles` and the remaining rows
 *     and invalidates the session.
 * Any throw → `{ ok: false }`, and the screen renders the failure terminal.
 */
export async function deleteAccountAction(): Promise<SettingsActionResult> {
  const requestId = generateRequestId();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'Your session expired. Sign in and try again.' };
  }
  const userId = user.id;
  const service = createSupabaseServiceClient();

  // No "invoked" start-marker: LogOutcome has only success|error|rejected, so a
  // start event would have to claim `success` before any work runs and inflate
  // success-rate queries. The teardown reports honestly instead — success via
  // `settings.delete_account_complete`, and each abort via a `logError`
  // (auto-stamped outcome:'error'). A `.delete_account.*` error with no
  // `_complete` is the half-failed-teardown signal (see the analytics note).
  try {
    // 1. Stripe — cancel any subscription that still exists.
    if (isFeatureEnabled('VAULT_STRIPE_ENABLED')) {
      const { data: subs } = await service
        .from('subscriptions')
        .select('stripe_subscription_id, status')
        .eq('user_id', userId);
      for (const sub of subs ?? []) {
        const stillLive = sub.status !== 'lapsed' && sub.status !== 'cancelled';
        if (sub.stripe_subscription_id && stillLive) {
          try {
            await stripe.subscriptions.cancel(sub.stripe_subscription_id);
          } catch (err: unknown) {
            const code =
              (err as { code?: string })?.code ??
              (err as { raw?: { code?: string } })?.raw?.code;
            // Already gone on Stripe's side is fine; anything else aborts before
            // we touch the person's data.
            if (code !== 'resource_missing') {
              logError({ event: 'settings.delete_account.stripe_cancel', requestId, userId, error: err });
              return { ok: false, error: 'We couldn’t finish closing your account just now.' };
            }
          }
        }
      }
    }

    // 2. ElevenLabs — delete the cloned voice(s) vendor-side BEFORE any local
    //    data loss, so a hard failure aborts while the account is still intact
    //    and we never orphan a clone we can no longer address (its id lives on
    //    the voice_profiles row deleted in step 4).
    const { data: voiceRows } = await service
      .from('voice_profiles')
      .select('vendor_voice_id')
      .eq('user_id', userId);
    for (const row of voiceRows ?? []) {
      if (!row.vendor_voice_id) continue;
      const result = await deleteVoice(row.vendor_voice_id);
      if (!result.ok) {
        logError({
          event: 'settings.delete_account.voice_delete',
          requestId,
          userId,
          error: new Error(`elevenlabs delete ${result.status}: ${result.message}`),
        });
        return { ok: false, error: 'We couldn’t finish closing your account just now.' };
      }
    }

    // 3. Storage — audio + avatar (not cascaded by the auth delete).
    for (const bucket of [AUDIO_BUCKET, AVATAR_BUCKET]) {
      const paths = await listAllStorageObjects(service, bucket, `users/${userId}/`);
      if (paths.length > 0) {
        const { error } = await service.storage.from(bucket).remove(paths);
        if (error) {
          logError({ event: 'settings.delete_account.storage', requestId, userId, error, meta: { bucket } });
          return { ok: false, error: 'We couldn’t finish closing your account just now.' };
        }
      }
    }

    // 4. FK-safe row deletes (messages before voice_profiles — FK RESTRICT).
    const del = (table: 'usage_events' | 'messages' | 'training_clips' | 'voice_profiles') =>
      checkedWrite(service.from(table).delete().eq('user_id', userId), {
        op: `settings.delete_account.${table}`,
        requestId,
        userId,
      });
    await del('usage_events');
    await del('messages');
    await del('training_clips');
    await del('voice_profiles');

    // 5. Delete the auth user — cascades `profiles` (→ subscriptions, recipients,
    //    pending_generations) and invalidates the session.
    const { error: authErr } = await service.auth.admin.deleteUser(userId);
    if (authErr) {
      logError({ event: 'settings.delete_account.auth_user', requestId, userId, error: authErr });
      return { ok: false, error: 'We couldn’t finish closing your account just now.' };
    }

    logEvent({ event: 'settings.delete_account_complete', requestId, userId, outcome: 'success' });
    return { ok: true };
  } catch (err) {
    logError({ event: 'settings.delete_account_error', requestId, userId, error: err });
    return { ok: false, error: 'We couldn’t finish closing your account just now.' };
  }
}

/** Recursively list every object under a storage prefix (list is flat per prefix). */
async function listAllStorageObjects(
  service: ReturnType<typeof createSupabaseServiceClient>,
  bucket: string,
  prefix: string,
  limit = 1000,
): Promise<string[]> {
  const paths: string[] = [];
  const { data } = await service.storage.from(bucket).list(prefix, { limit });
  if (!data) return paths;
  for (const item of data) {
    const fullPath = `${prefix}${item.name}`;
    if (item.id) {
      paths.push(fullPath);
    } else {
      paths.push(...(await listAllStorageObjects(service, bucket, `${fullPath}/`, limit)));
    }
  }
  return paths;
}
