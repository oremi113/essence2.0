import type { Metadata } from 'next';
import { LegalDocument } from '@/components/screens/legal/LegalDocument';
import { LEGAL_DOCS } from '@/content/legal/generated';

/**
 * /terms — public Terms of Service. Public by design: not in middleware's
 * protected set, so it's reachable signed-out and from an emailed link. Thin
 * data-shuttle — hands the generated content to the shared reader.
 */
export const metadata: Metadata = {
  title: 'Terms of Service — ESSENCE',
  description: 'The agreement between you and ESSENCE APP LLC when you use ESSENCE.',
};

export default function TermsPage() {
  return <LegalDocument doc={LEGAL_DOCS['terms']} />;
}
