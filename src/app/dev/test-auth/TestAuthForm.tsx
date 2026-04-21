'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

function TestAuthInner() {
  const params = useSearchParams();
  const [result, setResult] = useState<string>('working');

  useEffect(() => {
    const email = params.get('email');
    const password = params.get('password');

    // Wrap the whole effect in an async IIFE so every setResult path runs
    // inside a callback, satisfying the react-hooks/set-state-in-effect
    // rule (which flags synchronous setState in an effect body).
    (async () => {
      if (!email || !password) {
        setResult('missing-credentials');
        return;
      }
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

export function TestAuthForm() {
  return (
    <Suspense fallback={<p>loading…</p>}>
      <TestAuthInner />
    </Suspense>
  );
}
