'use client';

/**
 * Dev-only bootstrap route for Playwright tests.
 *
 * Calls Supabase's browser signInWithPassword so the SSR auth cookie
 * lands in the format @supabase/ssr expects. Real users never see this
 * route — the UI has no password form. Password auth is programmatic-only,
 * used exclusively by automated tests against the test account.
 *
 * Protected by a development-mode gate. Do not link to it from anywhere.
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

function TestAuthInner() {
  const params = useSearchParams();
  const [result, setResult] = useState<string>('working');

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      setResult('disabled-in-production');
      return;
    }
    const email = params.get('email');
    const password = params.get('password');
    if (!email || !password) {
      setResult('missing-credentials');
      return;
    }
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setResult(error ? `error: ${error.message}` : 'ok');
      } catch (err) {
        setResult(`error: ${(err as Error).message}`);
      }
    })();
  }, [params]);

  return (
    <main style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>test-auth bootstrap</h1>
      <p data-testid="test-auth-result">{result}</p>
    </main>
  );
}

export default function TestAuthPage() {
  return (
    <Suspense fallback={<p>loading…</p>}>
      <TestAuthInner />
    </Suspense>
  );
}
