'use client';

/**
 * Last-resort boundary (Step 10 — System States): catches errors thrown by the
 * ROOT layout itself, where the normal error.tsx can't render. It replaces the
 * whole document, so it ships its own <html>/<body> and **inline literal
 * styles** — the @theme tokens live in globals.css, which may not have loaded
 * if the root failed. Kept deliberately minimal; this should almost never show.
 */
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: '100dvh',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FBF8F4',
          color: '#1C1A18',
          fontFamily: 'Inter, system-ui, sans-serif',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 360 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.25, margin: 0 }}>
            Something slipped on our end.
          </h1>
          <p style={{ fontSize: 17, color: '#5A5550', lineHeight: 1.55, marginTop: 12 }}>
            Nothing is lost. Give it another try.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 20,
              minHeight: 52,
              padding: '0 28px',
              background: '#7A8088',
              color: '#fff',
              border: 0,
              borderRadius: 12,
              fontSize: 17,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
