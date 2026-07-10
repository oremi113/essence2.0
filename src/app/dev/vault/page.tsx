'use client';

import { useState } from 'react';
import { VaultRevealScreen } from '@/components/screens/vault/VaultRevealScreen';
import { SealAnimation } from '@/components/vault/SealAnimation';

// Dev sandbox for the surviving vault screen. The old subscribe arc
// (protect/continuity/seal/sealed) was retired in spine-wiring S4 — Card Capture
// (/dev/card-capture) + Processing (/dev/processing) replaced it. VaultRevealScreen
// is temp-reused as the post-payment payoff (spine-wiring-spec §6.1) until the
// relocated reveal lands.
//
// Dev sandbox conventions:
//   - Top-level at src/app/dev/, never inside src/app/app/dev/.
//   - Inline style={{ }} is acceptable here — this is a debugging surface,
//     not shipped UI. Production screen components still follow no-inline-
//     styles and token-only rules.
export default function VaultDevSandbox() {
  const [lastAction, setLastAction] = useState<string>('(none)');

  const log = (action: string) =>
    setLastAction(`${new Date().toLocaleTimeString()} — ${action}`);

  return (
    <div style={{ minHeight: '100dvh', background: '#1A1715', padding: 24 }}>
      <header
        style={{
          color: '#F5F0EA',
          fontFamily: 'monospace',
          padding: 16,
          marginBottom: 24,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 8,
        }}
      >
        <h1 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
          Vault Reveal — Dev Sandbox
        </h1>
        <div style={{ fontSize: 12 }}>
          Last action: <strong>{lastAction}</strong>
        </div>
      </header>

      <Section label="Vault Reveal — /app/vault/reveal (post-payment payoff)">
        <VaultRevealScreen onAdvance={() => log('advance → First Breath')} />
      </Section>

      <Section label="SealAnimation — standalone (all three modes)">
        <div
          style={{
            background: '#EDE3D0',
            padding: 40,
            display: 'flex',
            gap: 40,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <SealAnimation mode="open" size={200} />
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#6B6B6B', marginTop: 8 }}>
              open
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <SealAnimation mode="sealed" size={200} />
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#6B6B6B', marginTop: 8 }}>
              sealed
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <SealAnimation
              mode="animate"
              size={200}
              onComplete={() => log('seal animation complete')}
            />
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#6B6B6B', marginTop: 8 }}>
              animate (replays on mount)
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2
        style={{
          color: '#ADA9A5',
          fontFamily: 'monospace',
          fontSize: 11,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        {label}
      </h2>
      <div
        style={{
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </section>
  );
}
