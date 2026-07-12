import { redirect } from 'next/navigation';
import { ROUTES } from '@/lib/routes';

// Spine-wiring S4: the First-Breath "coming soon" placeholder is retired — the
// ceremony now hands off to first message creation (S3, FOLLOW_UPS #25 resolved).
// URL kept as a stable forward to Home (DECISIONS lock) rather than 404'd.
export default function RecordCompleteStubPage() {
  redirect(ROUTES.home);
}
