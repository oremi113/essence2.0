'use client';

/**
 * /dev/privacy — permanent dev sandbox for the Privacy Policy screen
 * (CLAUDE.md: every screen gets a /dev page; never delete).
 *
 * Renders the real PrivacyPolicyScreen inside AppShell so it looks exactly as
 * it ships (the /dev segment doesn't provide the shell that the /privacy
 * segment layout does). There are no variants — a legal page is static — so
 * the rail is just a label + a jump to the sibling Terms sandbox.
 */

import Link from 'next/link';
import { AppShell } from '@/components/ui/AppShell';
import { PrivacyPolicyScreen } from '@/components/screens/legal/PrivacyPolicyScreen';

export default function PrivacyDevPage() {
  return (
    <>
      <div style={railStyle}>
        <span style={labelStyle}>PRIVACY POLICY · /privacy</span>
        <Link href="/dev/terms" style={linkStyle}>
          → Terms sandbox
        </Link>
      </div>
      <div style={{ paddingTop: 44 }}>
        <AppShell>
          <PrivacyPolicyScreen />
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
