/**
 * App-wide 404 (Step 10 — System States). Reached for any unmatched route.
 * Calm and on-brand; routes the user back home rather than dead-ending.
 */
import Link from 'next/link';
import { SystemScreen } from '@/components/system/SystemScreen';
import { ROUTES } from '@/lib/routes';

export default function NotFound() {
  return (
    <SystemScreen
      title="We couldn’t find that page."
      body="It may have moved, or never existed."
    >
      <Link href={ROUTES.home} className="system-btn">
        Back home
      </Link>
    </SystemScreen>
  );
}
