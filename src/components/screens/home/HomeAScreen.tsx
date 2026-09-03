import Link from 'next/link';
import type { ReactNode } from 'react';
import { ROUTES } from '@/lib/routes';

/**
 * Home A — the interim home a user sees BEFORE their voice is `ready` (they're
 * still on, or paused within, the 25-prompt journey). Its full design is a
 * pending brief (see /home page.tsx §6.5); this is a calm, on-brand stopgap so a
 * paused user lands somewhere real instead of a raw stub. Pure + props-driven.
 */
export function HomeAScreen({
  isProcessing,
  footer,
}: {
  /** true once all clips are in and the voice is being built (processing/queued);
   *  false while the user is still recording (collecting). */
  isProcessing: boolean;
  /** Sign-out control, supplied by the page (owns the client action). */
  footer?: ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'var(--font-body)',
        color: 'var(--color-text-primary)',
        background: 'var(--color-bg-neutral)',
        textAlign: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.14em',
            fontSize: 14,
            color: 'var(--color-text-secondary)',
            marginBottom: 24,
          }}
        >
          ESSENCE
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            fontWeight: 500,
            lineHeight: 1.2,
            margin: '0 0 12px',
          }}
        >
          {isProcessing ? 'Your voice is being created.' : 'Your voice is on its way.'}
        </h1>

        <p
          style={{
            fontSize: 16,
            lineHeight: 1.6,
            color: 'var(--color-text-secondary)',
            margin: '0 0 28px',
          }}
        >
          {isProcessing
            ? 'This can take a few minutes. You can close this and come back. It will be here when it is ready.'
            : "You've started recording your voice. Pick up where you left off whenever you're ready. There's no rush."}
        </p>

        {!isProcessing && (
          <Link
            href={ROUTES.record}
            style={{
              display: 'inline-block',
              minWidth: 220,
              padding: '14px 24px',
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 10,
              background: 'var(--color-mineral, #1C1A18)',
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            Continue recording
          </Link>
        )}

        {isProcessing && (
          <Link
            href={ROUTES.record}
            style={{
              display: 'inline-block',
              fontSize: 15,
              color: 'var(--color-text-secondary)',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
          >
            Check progress
          </Link>
        )}

        {footer && <div style={{ marginTop: 28 }}>{footer}</div>}
      </div>
    </main>
  );
}

export default HomeAScreen;
