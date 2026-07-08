'use client';

/**
 * /dev/terms — permanent dev sandbox for the Terms of Service screen
 * (CLAUDE.md: every screen gets a /dev page; never delete).
 *
 * Renders the real TermsScreen inside AppShell so it looks exactly as it ships
 * (the /dev segment doesn't provide the shell that the /terms segment layout
 * does). No variants — a legal page is static — so the rail is just a label +
 * a jump to the sibling Privacy sandbox.
 */

import Link from 'next/link';
import { AppShell } from '@/components/ui/AppShell';
import { TermsScreen } from '@/components/screens/legal/TermsScreen';

export default function TermsDevPage() {
  return (
    <>
      <div style={railStyle}>
        <span style={labelStyle}>TERMS OF SERVICE · /terms</span>
        <Link href="/dev/privacy" style={linkStyle}>
          → Privacy sandbox
        </Link>
      </div>
      <div style={{ paddingTop: 44 }}>
        <AppShell>
          <TermsScreen />
        </AppShell>
      </div>
    </>
  );
}

const railStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 9999,
  background: 'rgba(28,26,24,0.9)',
  color: '#fff',
  padding: '8px 12px',
  display: 'flex',
  gap: 12,
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 11,
  letterSpacing: '0.06em',
};

const labelStyle: React.CSSProperties = {
  opacity: 0.6,
  textTransform: 'uppercase',
};

const linkStyle: React.CSSProperties = {
  color: '#fff',
  opacity: 0.85,
  textDecoration: 'none',
};
