'use client';

/**
 * Home A's client shell.
 *
 * The screen is pure and props-driven, but two of its states are only
 * knowable in the browser: whether the device is online, and the window
 * between a tap and the route actually changing. This owns both, plus the
 * router pushes and the support mailto — the same split `HomeBPageClient`
 * uses, so the page layer stays a thin data shuttle (CLAUDE.md).
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { HomeAScreen } from '@/components/screens/home/HomeAScreen';
import type {
  HomeARegister,
  HomeAFailedSubState,
  HomeAPastDueVariant,
} from '@/components/screens/home/HomeAScreen.types';
import { supportMailto } from '@/lib/config/support';
import { ROUTES } from '@/lib/routes';

export function HomeAPageClient({
  register,
  clipsRecorded,
  failedSubState,
  retryAt,
  retryWindowMs,
  pastDueVariant,
  banner,
}: {
  register: HomeARegister;
  clipsRecorded: number;
  failedSubState?: HomeAFailedSubState;
  retryAt?: number;
  retryWindowMs?: number;
  pastDueVariant?: HomeAPastDueVariant;
  banner?: ReactNode;
}) {
  const router = useRouter();

  // Start optimistic: `navigator.onLine` is unavailable during SSR, and
  // rendering the offline banner on the server would flash it for every user.
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  const [pending, setPending] = useState(false);

  const onPrimary = useCallback(() => {
    if (pending) return;
    setPending(true);
    // A failed build retries through the processing screen, which already owns
    // the /start trigger and the poll. Home A never calls /start itself — one
    // rule here, not a second copy of the paywall fan-out to keep in sync.
    router.push(register === 'failed' ? ROUTES.voiceProcessing : ROUTES.record);
  }, [pending, register, router]);

  const onContactSupport = useCallback(() => {
    window.location.href = supportMailto('My voice didn’t come through');
  }, []);

  const onSettings = useCallback(() => router.push(ROUTES.settings), [router]);

  return (
    <HomeAScreen
      register={register}
      clipsRecorded={clipsRecorded}
      failedSubState={failedSubState}
      retryAt={retryAt}
      retryWindowMs={retryWindowMs}
      pastDueVariant={pastDueVariant}
      offline={offline}
      pending={pending}
      onPrimary={onPrimary}
      onContactSupport={onContactSupport}
      onSettings={onSettings}
      banner={banner}
    />
  );
}
