import type { Metadata } from 'next';
import { TermsScreen } from '@/components/screens/legal/TermsScreen';

/**
 * /terms — public Terms of Service. No auth gate (deliberately absent from
 * middleware's protected set): legal pages must be reachable to anyone,
 * signed in or not, including from an emailed link. Thin data-shuttle: it
 * renders the pure screen. Copy is placeholder pending owner review.
 */
export const metadata: Metadata = {
  title: 'Terms of Service — ESSENCE',
  description: 'The agreement between you and ESSENCE when you use the service.',
};

export default function TermsPage() {
  return <TermsScreen />;
}
