'use client';

import { useState } from 'react';
import { VaultRevealScreen } from '@/components/screens/vault/VaultRevealScreen';
import { VaultProtectScreen } from '@/components/screens/vault/VaultProtectScreen';
import { VaultContinuityScreen } from '@/components/screens/vault/VaultContinuityScreen';
import { VaultSealScreen } from '@/components/screens/vault/VaultSealScreen';
import { VaultSealedScreen } from '@/components/screens/vault/VaultSealedScreen';
import { SealAnimation } from '@/components/vault/SealAnimation';
import type { BillingPlan } from '@/lib/vault';

// Dev sandbox conventions:
//   - Top-level at src/app/dev/, never inside src/app/app/dev/.
//   - Inline style={{ }} is acceptable here — this is a debugging surface,
//     not shipped UI. Production screen components still follow no-inline-
//     styles and token-only rules.
export default function VaultDevSandbox() {
  const [plan, setPlan] = useState<BillingPlan>('annual');
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
          Vault Flow — Dev Sandbox
        </h1>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
          <div>
            Plan: <strong>{plan}</strong>
          </div>
          <button
            type="button"
            onClick={() => setPlan(plan === 'annual' ? 'monthly' : 'annual')}
            style={{ padding: '4px 8px', fontSize: 12 }}
          >
            toggle plan
          </button>
          <div>
            Last action: <strong>{lastAction}</strong>
          </div>
        </div>
      </header>

      <Section label="1. Vault Reveal — /app/vault/reveal">
        <VaultRevealScreen onAdvance={() => log('advance → protect')} />
      </Section>

      <Section label="2. Vault Protect — /app/vault/protect">
        <VaultProtectScreen
          plan={plan}
          onPlanChange={(p) => {
            setPlan(p);
            log(`plan → ${p}`);
          }}
          onCheckoutInitiate={(p) => log(`checkout initiate → ${p}`)}
          onDismiss={() => log('dismiss → continuity')}
        />
      </Section>

      <Section label="3. Vault Continuity — /app/vault/continuity">
        <VaultContinuityScreen onAdvance={() => log('advance → seal')} />
      </Section>

      <Section label="4. Vault Seal — /app/vault/seal">
        <VaultSealScreen
          billingPlan={plan}
          onCheckoutInitiate={(p) => log(`SEAL checkout initiate → ${p}`)}
          onDismiss={() => log('dismiss → home')}
        />
      </Section>

      <Section label="5. Vault Sealed — /app/vault/sealed">
        <VaultSealedScreen
          onCreateMessage={() => log('create message → session 8')}
          onGoHome={() => log('go home')}
        />
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
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#6B6B6B',
                marginTop: 8,
              }}
            >
              open
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <SealAnimation mode="sealed" size={200} />
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#6B6B6B',
                marginTop: 8,
              }}
            >
              sealed
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <SealAnimation
              mode="animate"
              size={200}
              onComplete={() => log('seal animation complete')}
            />
            <div
              style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#6B6B6B',
                marginTop: 8,
              }}
            >
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
