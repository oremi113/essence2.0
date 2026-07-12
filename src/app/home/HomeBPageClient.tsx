'use client';

/**
 * Home B client boundary. Owns the archive-preview fetch (`/api/messages`, the
 * same source the Memory Shelf reads) and navigation, so HomeBScreen stays
 * pure + dev-renderable. The vault state, first-arrival flag, and cap are
 * resolved server-side in page.tsx and passed in.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HomeBScreen } from '@/components/screens/home/HomeBScreen';
import type {
  HomeBLoadState,
  HomeBVaultState,
} from '@/components/screens/home/HomeBScreen.types';
import type { ShelfMessage } from '@/components/screens/shelf/types';
import { useResource } from '@/lib/data/useResource';
import { ROUTES } from '@/lib/routes';

export function HomeBPageClient({
  vaultState,
  firstArrival,
  maxSaved,
}: {
  vaultState: HomeBVaultState;
  firstArrival: boolean;
  maxSaved: number;
}) {
  const router = useRouter();

  const { data: messages, status, error, refetch } = useResource<ShelfMessage[]>(
    async (signal) => {
      const res = await fetch('/api/messages', { signal });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Could not load your messages');
      }
      const data = await res.json();
      return data.messages ?? [];
    },
    { initialData: [] },
  );

  const loadState: HomeBLoadState =
    status === 'error' ? 'error' : status === 'loading' ? 'loading' : 'ready';

  // Keep the raw load error observable for debugging without surfacing it to the
  // user — Home B shows fixed, on-voice copy instead (Copy Guide §8).
  useEffect(() => {
    if (error) console.error('[home-b] message preview failed to load:', error);
  }, [error]);

  return (
    <HomeBScreen
      vaultState={vaultState}
      messages={messages}
      loadState={loadState}
      onRetry={refetch}
      firstArrival={firstArrival}
      maxSaved={maxSaved}
      onCreate={() => router.push(ROUTES.messagesNew)}
      onRestore={() => router.push(ROUTES.vaultRestore)}
      onOpenShelf={() => router.push(ROUTES.shelf)}
      // Preview rows open the shelf, where playback lives (the prototype drops
      // duration here for the same reason — length belongs next to playback).
      onOpenMessage={() => router.push(ROUTES.shelf)}
      // "Hear about what comes next" → C2 Waitlist (the open look-ahead),
      // matching the Memory Shelf's full-state action. Not C3 /messages/limit:
      // that's the blocked-creation wall (surfacedFrom a2_entry/save_race) and
      // Home B's 3/3 isn't a blocked attempt. Documented divergence from the
      // prototype, which predates the app's C2/C3 split (session brief).
      onWaitlist={() => router.push(ROUTES.messagesWaitlist)}
      onSettings={() => router.push(ROUTES.settings)}
    />
  );
}
