'use client';

/**
 * Settings client boundary. Owns navigation, the Stripe redirects, sign-out, and
 * turning the page's server actions into the screen's callback props — so
 * SettingsScreen stays pure + dev-renderable. All data (email, photo,
 * subscription, notifications) is resolved server-side in page.tsx and passed in.
 */

import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { SettingsScreen } from '@/components/screens/settings/SettingsScreen';
import type {
  ActionResult,
  NotificationSettings,
  SettingsLoadState,
  SubscriptionData,
} from '@/components/screens/settings/SettingsScreen.types';
import { ROUTES } from '@/lib/routes';

export interface SettingsPageClientProps {
  email: string;
  photoUrl: string | null;
  subscription: SubscriptionData;
  notifications: NotificationSettings;
  cardUpdatedNotice: boolean;
  deleteEnabled: boolean;
  /** Full trust band on first visit, slim residual on return (durable latch). */
  trustBandSeen?: boolean;
  /**
   * 'error' when the page's data resolution threw (the calm "Your messages are
   * safe" + retry view); defaults to 'ready'. The page resolves server-side, so
   * there is no client 'loading' state to thread.
   */
  loadState?: SettingsLoadState;
  changeEmailAction: (newEmail: string) => Promise<ActionResult>;
  removePhotoAction: () => Promise<ActionResult>;
  deleteAccountAction: () => Promise<ActionResult>;
  /** Latch `settings_trust_seen` once the full band has been shown. */
  markTrustBandSeenAction?: () => Promise<void>;
}

export function SettingsPageClient({
  email,
  photoUrl,
  subscription,
  notifications,
  cardUpdatedNotice,
  deleteEnabled,
  trustBandSeen = false,
  loadState = 'ready',
  changeEmailAction,
  removePhotoAction,
  deleteAccountAction,
  markTrustBandSeenAction,
}: SettingsPageClientProps) {
  const router = useRouter();

  async function goToStripeCardUpdate() {
    try {
      const res = await fetch('/api/stripe/portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnPath: `${ROUTES.settings}?card_updated=1` }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.portalUrl) {
        window.location.href = data.portalUrl;
        return;
      }
    } catch {
      // fall through to the restore arc
    }
    // No portal (Stripe off / no customer yet): the restore arc owns the
    // card-capture fallback.
    router.push(ROUTES.vaultRestore);
  }

  async function signOutAndReturn() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push(ROUTES.signIn);
    router.refresh();
  }

  return (
    <SettingsScreen
      email={email}
      photoUrl={photoUrl}
      authMethod="magic-link"
      subscription={subscription}
      notifications={notifications}
      loadState={loadState}
      cardUpdatedNotice={cardUpdatedNotice}
      deleteEnabled={deleteEnabled}
      trustBandSeen={trustBandSeen}
      onBack={() => router.push(ROUTES.home)}
      onRetry={() => router.refresh()}
      onTrustBandSeen={markTrustBandSeenAction ? () => void markTrustBandSeenAction() : undefined}
      onUpdateCard={() => void goToStripeCardUpdate()}
      onCancelSubscription={async () => {
        try {
          const res = await fetch('/api/stripe/cancel-subscription', { method: 'POST' });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ok) {
            router.refresh();
            return { ok: true };
          }
          return { ok: false, error: data.error };
        } catch {
          return { ok: false };
        }
      }}
      onResume={() => router.push(ROUTES.vaultRestore)}
      onDismissCardNotice={() => router.replace(ROUTES.settings)}
      onToggleNotification={() => {
        // Optimistic in the screen only. Persistence + telemetry are pending a
        // notification-prefs store and an /api/analytics allowlist entry
        // (FOLLOW_UPS; events specced in docs/analytics/2026-07-06-settings.md).
        // Wired as a deliberate no-op — the same pattern as Home B's dead-linked
        // affordances — rather than firing to an endpoint that would drop it.
      }}
      onChangeEmail={(newEmail) => changeEmailAction(newEmail)}
      onRemovePhoto={async () => {
        const res = await removePhotoAction();
        if (res.ok) router.refresh();
        return res;
      }}
      onSignOut={() => void signOutAndReturn()}
      onDeleteAccount={() => deleteAccountAction()}
      onReturnToSignIn={() => void signOutAndReturn()}
    />
  );
}
