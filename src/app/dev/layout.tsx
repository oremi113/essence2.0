import { notFound } from 'next/navigation';

/**
 * Gate for the entire `/dev/*` segment. In production the whole subtree
 * returns 404 — dev sandboxes (`/dev/vault`, `/dev/lapse`, `/dev/record`,
 * `/dev/test-auth`, etc.) are local-only by design and must not be
 * indexable, screenshottable, or otherwise reachable from the public web.
 *
 * Controlled by ENABLE_DEV_ROUTES env var. Never set in Vercel.
 *
 * Individual dev routes may layer additional, tighter gates on top of
 * this one (e.g. /dev/test-auth also checks ENABLE_DEV_AUTH — defense
 * in depth against a future engineer flipping ENABLE_DEV_ROUTES on
 * in production for a debugging session).
 */
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.ENABLE_DEV_ROUTES !== 'true') {
    notFound();
  }
  return <>{children}</>;
}
