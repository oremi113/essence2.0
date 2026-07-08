import type { Metadata } from 'next';
import { PrivacyPolicyScreen } from '@/components/screens/legal/PrivacyPolicyScreen';

/**
 * /privacy — public Privacy Policy. No auth gate (deliberately absent from
 * middleware's protected set): legal pages must be reachable to anyone,
 * signed in or not, including from an emailed link. Thin data-shuttle: it
 * renders the pure screen. Copy is placeholder pending owner review.
 */
export const metadata: Metadata = {
  title: 'Privacy Policy — ESSENCE',
  description: 'How ESSENCE collects, protects, and never sells your voice.',
};

export default function PrivacyPage() {
  return <PrivacyPolicyScreen />;
}
