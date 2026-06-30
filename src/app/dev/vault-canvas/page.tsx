'use client';

import { useEffect, useRef, useState } from 'react';
import { paintVaultFrame } from '@/lib/vault-render/paintVault';

// Permanent tuning harness for the Canvas 2D vault engine (src/lib/vault-render).
// Drives the two split axes (DC1) directly so any frame can be frozen and
// inspected: mechT (iris/mechanism close) and emberT (warmth/ignition). This is
// where the iris-close amplitude is judged on the oat surface. Local-only via
// src/app/dev/layout.tsx. Inline styles are fine here — debugging surface.
export default function VaultCanvasDevPage() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [mechT, setMechT] = useState(0);
  const [emberT, setEmberT] = useState(0);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    if (!paintVaultFrame(cv, { mechT, emberT })) {
      const raf = requestAnimationFrame(() => paintVaultFrame(cv, { mechT, emberT }));
      return () => cancelAnimationFrame(raf);
    }
  }, [mechT, emberT]);

  const preset = (m: number, e: number) => () => {
    setMechT(m);
    setEmberT(e);
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#EDE6DA',
        color: '#1C1A18',
        fontFamily: "'Inter', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        padding: 24,
      }}
    >
      <h1 style={{ fontSize: 15, fontWeight: 600 }}>Vault Canvas — engine tuning harness</h1>
      <p style={{ fontSize: 12, color: '#6B6B6B', maxWidth: 520, textAlign: 'center', lineHeight: 1.6 }}>
        Drives <code>drawVault</code>&apos;s two axes directly. <b>mechT</b> = iris/mechanism close (cool on its
        own); <b>emberT</b> = warmth/ignition. The seal runs mechT 0→1 first (cool close), then emberT 0→1 (catch).
      </p>

      {/* Production-size box (196px on oat) */}
      <div
        style={{
          width: 196,
          height: 196,
          background: '#EDE6DA',
          borderRadius: 12,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
        }}
      >
        <canvas ref={ref} id="tune-vault" style={{ display: 'block', width: 196, height: 196 }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 360 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <span style={{ width: 70, color: '#6B6B6B' }}>mechT</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={mechT}
            onChange={(e) => setMechT(parseFloat(e.target.value))}
            style={{ flex: 1 }}
          />
          <span id="ro-mech" style={{ width: 42, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {mechT.toFixed(2)}
          </span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
          <span style={{ width: 70, color: '#6B6B6B' }}>emberT</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={emberT}
            onChange={(e) => setEmberT(parseFloat(e.target.value))}
            style={{ flex: 1 }}
          />
          <span id="ro-ember" style={{ width: 42, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {emberT.toFixed(2)}
          </span>
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={preset(0, 0)} style={btn}>
            establish · cool {'{0,0}'}
          </button>
          <button type="button" onClick={preset(1, 0)} style={btn}>
            iris shut · cool {'{1,0}'}
          </button>
          <button type="button" onClick={preset(1, 1)} style={btn}>
            sealed · ignited {'{1,1}'}
          </button>
        </div>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  color: '#6B6B6B',
  background: 'transparent',
  border: '1px solid rgba(0,0,0,0.12)',
  borderRadius: 8,
  padding: '7px 11px',
  cursor: 'pointer',
};
