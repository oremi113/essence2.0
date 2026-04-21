'use client';

import { useState } from 'react';
import { VaultRestoreScreen } from '@/components/screens/vault/VaultRestoreScreen';

export function RestoreActions({ hasRecordings }: { hasRecordings: boolean }) {
  const [isRestoring, setIsRestoring] = useState(false);

  async function handleRestore() {
    if (isRestoring) return;
    setIsRestoring(true);

    try {
      const res = await fetch('/api/stripe/portal-session', { method: 'POST' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.portalUrl) {
        console.error('[vault/restore] portal session failed', data);
        setIsRestoring(false);
        return;
      }

      // New tab so the user keeps the "paused" context open behind them.
      window.open(data.portalUrl, '_blank', 'noopener,noreferrer');
      setIsRestoring(false);
    } catch (err) {
      console.error('[vault/restore] portal request errored', err);
      setIsRestoring(false);
    }
  }

  return (
    <VaultRestoreScreen
      hasRecordings={hasRecordings}
      onRestore={handleRestore}
      isRestoring={isRestoring}
    />
  );
}
