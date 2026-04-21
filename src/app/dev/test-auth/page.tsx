import { notFound } from 'next/navigation';
import { TestAuthForm } from './TestAuthForm';

/**
 * Dev-only bootstrap for Playwright password sign-in.
 *
 * Two env-var gates. Both must be true for this route to render:
 *   1. ENABLE_DEV_ROUTES — gates the whole /dev/* segment (see layout.tsx)
 *   2. ENABLE_DEV_AUTH — specifically allows this credential-accepting route
 *
 * Separated because a future engineer flipping ENABLE_DEV_ROUTES on in
 * production for an unrelated debugging task should NOT also expose a
 * plaintext-credential endpoint. Opt-in to both, or this route 404s.
 *
 * Server-rendered check runs before the client component mounts, so
 * query params don't enter server-rendered HTML and the form never
 * loads client-side when disabled.
 */
export default function TestAuthPage() {
  if (process.env.ENABLE_DEV_AUTH !== 'true') {
    notFound();
  }
  return <TestAuthForm />;
}
