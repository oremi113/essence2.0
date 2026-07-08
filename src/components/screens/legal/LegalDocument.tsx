/**
 * LegalDocument — the shared, props-driven renderer for static legal pages
 * (Privacy Policy, Terms of Service).
 *
 * Pure and content-agnostic per CLAUDE.md: it owns layout, the draft banner,
 * the prose rhythm, and the sibling cross-link; the actual copy is passed in
 * as data by PrivacyPolicyScreen / TermsScreen. No Supabase, no side effects,
 * no server actions — a legal page is a read-only surface, so the only
 * "action" is the header's back navigation, owned by the shared ScreenHeader.
 *
 * Composes the shell primitives (PageTransition + ScreenHeader) exactly like
 * every other shell page; the 430px cream frame comes from the segment's
 * AppShell layout, not from here.
 */

import Link from 'next/link';
import { PageTransition, ScreenHeader } from '@/components/ui';
import { LEGAL_DOCUMENT_CSS } from './LegalDocument.css';
import type { LegalDocumentProps } from './LegalDocument.types';

export function LegalDocument({
  title,
  effectiveLabel,
  intro,
  sections,
  backLabel,
  backHref,
  related,
  placeholder = false,
}: LegalDocumentProps) {
  return (
    <PageTransition>
      <style>{LEGAL_DOCUMENT_CSS}</style>

      <ScreenHeader title={title} backLabel={backLabel} backHref={backHref} />

      <article className="legal">
        <p className="legal__effective">{effectiveLabel}</p>

        {placeholder && (
          <div className="legal__placeholder" role="note">
            <span className="legal__placeholder-mark" aria-hidden="true">
              ✱
            </span>
            <p className="legal__placeholder-text">
              <strong>Draft — pending legal review.</strong> This is placeholder
              copy, not a binding agreement. The final wording is set by ESSENCE
              before launch.
            </p>
          </div>
        )}

        {intro && <p className="legal__intro">{intro}</p>}

        {sections.map((section) => (
          <section className="legal__section" key={section.heading}>
            <h2 className="legal__heading">{section.heading}</h2>
            {section.paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </section>
        ))}

        {related && (
          <footer className="legal__footer">
            <Link href={related.href} className="legal__related">
              <span>{related.label}</span>
              <span className="legal__related-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </footer>
        )}
      </article>
    </PageTransition>
  );
}

export default LegalDocument;
