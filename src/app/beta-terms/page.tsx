import type { Metadata } from 'next';
import { LegalDocument } from '@/components/screens/legal/LegalDocument';
import { LEGAL_DOCS } from '@/content/legal/generated';

/**
 * /beta-terms — public Beta Participation Terms (the rider that gates the
 * closed beta). Public by design (not in middleware's protected set). Thin
 * data-shuttle.
 */
export const metadata: Metadata = {
  title: 'Beta Participation Terms — ESSENCE',
  description: 'The terms for testing the pre-release ESSENCE beta.',
};

export default function BetaTermsPage() {
  return <LegalDocument doc={LEGAL_DOCS['beta-terms']} />;
}
