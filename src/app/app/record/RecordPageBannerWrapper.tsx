'use client';

import { useState } from 'react';
import { VaultPastDueBanner } from '@/components/vault/VaultPastDueBanner';

export function RecordPageBannerWrapper({ attemptCount }: { attemptCount: number }) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleUpdateCard() {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch('/api/stripe/portal-session', { method: 'POST' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.portalUrl) {
        console.error('[record/banner] portal session failed', data);
        setIsLoading(false);
        return;
      }

      window.open(data.portalUrl, '_blank', 'noopener,noreferrer');
      setIsLoading(false);
    } catch (err) {
      console.error('[record/banner] portal request errored', err);
      setIsLoading(false);
    }
  }

  return <VaultPastDueBanner attemptCount={attemptCount} onUpdateCard={handleUpdateCard} />;
}
