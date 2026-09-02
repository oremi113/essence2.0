import type { Metadata } from 'next';
import { LegalDocument } from '@/components/screens/legal/LegalDocument';
import { LEGAL_DOCS } from '@/content/legal/generated';

/**
 * /privacy — public Privacy Policy. Public by design (not in middleware's
 * protected set). Thin data-shuttle — hands the generated content to the
 * shared reader.
 */
export const metadata: Metadata = {
  title: 'Privacy Policy — ESSENCE',
  description: 'What ESSENCE collects, how it is used, and what deletion does.',
};

export default function PrivacyPage() {
  return <LegalDocument doc={LEGAL_DOCS['privacy']} />;
}
