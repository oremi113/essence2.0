'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { HomeAScreen } from '@/components/screens/home/HomeAScreen';
import { VaultPastDueBanner } from '@/components/vault/VaultPastDueBanner';
import type {
  HomeARegister,
  HomeAFailedSubState,
  HomeAPastDueVariant,
} from '@/components/screens/home/HomeAScreen.types';

function Inner() {
  const q = useSearchParams();
  const register = (q.get('register') ?? 'paused') as HomeARegister;
  const clips = Number(q.get('clips') ?? 12);
  const failedSub = (q.get('sub') ?? 'retryable') as HomeAFailedSubState;
  const waitLong = q.get('waitLong') === '1';
  const pastDueRaw = Number(q.get('pastDue') ?? 0);
  const pastDue = (pastDueRaw > 0 ? pastDueRaw : null) as HomeAPastDueVariant;
  const offline = q.get('offline') === '1';
  const pending = q.get('pending') === '1';
  const reducedMotion = q.get('rm') === '1';

  const isFailed = register === 'failed';
  const retryWindowMs =
    isFailed && failedSub === 'waiting' ? (waitLong ? 30 : 5) * 60 * 1000 : undefined;

  return (
    <HomeAScreen
      register={register}
      clipsRecorded={clips}
      failedSubState={isFailed ? failedSub : undefined}
      retryWindowMs={retryWindowMs}
      pastDueVariant={pastDue}
      offline={offline}
      pending={pending}
      onPrimary={() => {}}
      onContactSupport={() => {}}
      onSettings={() => {}}
      reducedMotionOverride={reducedMotion}
      banner={
        pastDue && !offline ? (
          <VaultPastDueBanner attemptCount={pastDue} onUpdateCard={() => {}} />
        ) : null
      }
    />
  );
}

export function DevHomeAFrame() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
