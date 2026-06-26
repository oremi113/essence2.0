'use client';

/**
 * Dev sandbox: visual review of 7c's lapse surfaces without driving real
 * Stripe events. Three banner variants + both restore-screen body variants,
 * stacked on one scrollable page. No auth, no data, no Portal calls — CTAs
 * are no-ops that log to console.
 *
 * Never linked from production. Don't add a link; don't add a guard. Per
 * CLAUDE.md: /dev/{name} routes are permanent scaffolding, reached only by
 * typing the URL.
 */

import { VaultPastDueBanner } from '@/components/vault/VaultPastDueBanner';
import { VaultRestoreScreen } from '@/components/screens/vault/VaultRestoreScreen';

const noop = () => {
  console.log('[dev/lapse] CTA clicked (no-op in sandbox)');
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: '#888',
  margin: '0 0 0.75rem',
};

const frameStyle: React.CSSProperties = {
  border: '1px solid #ddd',
};

export default function LapseDevPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '4rem',
        padding: '2rem',
      }}
    >
      <section>
        <h2 style={labelStyle}>Banner — Variant 1 (attempt 1)</h2>
        <VaultPastDueBanner attemptCount={1} onUpdateCard={noop} />
      </section>

      <section>
        <h2 style={labelStyle}>Banner — Variant 2 (attempt 2)</h2>
        <VaultPastDueBanner attemptCount={2} onUpdateCard={noop} />
      </section>

      <section>
        <h2 style={labelStyle}>Banner — Variant 3 (attempt 3+)</h2>
        <VaultPastDueBanner attemptCount={3} onUpdateCard={noop} />
      </section>

      <section>
        <h2 style={labelStyle}>Restore — past_due · has recordings (update card)</h2>
        <div style={frameStyle}>
          <VaultRestoreScreen hasRecordings={true} mode="update_card" onRestore={noop} />
        </div>
      </section>

      <section>
        <h2 style={labelStyle}>Restore — past_due · no recordings (update card)</h2>
        <div style={frameStyle}>
          <VaultRestoreScreen hasRecordings={false} mode="update_card" onRestore={noop} />
        </div>
      </section>

      <section>
        <h2 style={labelStyle}>Restore — lapsed/cancelled · has recordings (restart)</h2>
        <div style={frameStyle}>
          <VaultRestoreScreen hasRecordings={true} mode="restart" onRestore={noop} />
        </div>
      </section>

      <section>
        <h2 style={labelStyle}>Restore — lapsed/cancelled · no recordings (restart)</h2>
        <div style={frameStyle}>
          <VaultRestoreScreen hasRecordings={false} mode="restart" onRestore={noop} />
        </div>
      </section>
    </div>
  );
}
