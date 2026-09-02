import type { Metadata } from 'next';
import { LegalDocument } from '@/components/screens/legal/LegalDocument';
import { LEGAL_DOCS } from '@/content/legal/generated';

/**
 * /acceptable-use — public Acceptable Use Policy. Public by design (not in
 * middleware's protected set). Thin data-shuttle.
 */
export const metadata: Metadata = {
  title: 'Acceptable Use Policy — ESSENCE',
  description: 'The rules for using ESSENCE — the voice must be yours.',
};

export default function AcceptableUsePage() {
  return <LegalDocument doc={LEGAL_DOCS['acceptable-use']} />;
}
