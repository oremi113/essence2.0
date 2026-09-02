/**
 * Shared reader for the four public legal documents (Terms, Privacy, Acceptable
 * Use, Beta Terms). Pure and props-driven per CLAUDE.md — it takes one
 * generated `LegalDocContent` and renders it; routing/data lives in the pages.
 *
 * The body is pre-rendered, leak-checked HTML produced from the reviewed
 * markdown in docs/legal/ by scripts/legal-build.mjs (`npm run legal:build`).
 * We render it with dangerouslySetInnerHTML because the source is our own
 * trusted, build-time content — never user input.
 *
 * Server component: no client state. The only interactivity is <Link>
 * navigation, which needs no hydration.
 */
import Link from 'next/link';
import { ROUTES } from '@/lib/routes';
import {
  LEGAL_DOCS,
  LEGAL_ORDER,
  type LegalDocContent,
} from '@/content/legal/generated';
import { LEGAL_DOCUMENT_CSS } from './LegalDocument.css';

/** Map a generated slug to its canonical route (single source: routes.ts). */
const SLUG_TO_PATH: Record<string, string> = {
  terms: ROUTES.terms,
  privacy: ROUTES.privacy,
  'acceptable-use': ROUTES.acceptableUse,
  'beta-terms': ROUTES.betaTerms,
};

export function LegalDocument({ doc }: { doc: LegalDocContent }) {
  const others = LEGAL_ORDER.filter((slug) => slug !== doc.slug).map(
    (slug) => LEGAL_DOCS[slug],
  );

  return (
    <div className="legal-doc">
      <style>{LEGAL_DOCUMENT_CSS}</style>

      <div className="legal-doc__topbar">
        <Link href={ROUTES.root} className="legal-doc__home">
          ESSENCE
        </Link>
      </div>

      <article className="legal-doc__container">
        <header className="legal-doc__head">
          <h1 className="legal-doc__title">{doc.title}</h1>
          <p className="legal-doc__effective">Effective {doc.effectiveLabel}</p>
        </header>

        <div
          className="legal-doc__body"
          dangerouslySetInnerHTML={{ __html: doc.html }}
        />

        <nav className="legal-doc__nav" aria-label="More ESSENCE policies">
          <span className="legal-doc__nav-label">More from ESSENCE</span>
          <ul>
            {others.map((other) => (
              <li key={other.slug}>
                <Link href={SLUG_TO_PATH[other.slug]}>{other.navLabel}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </article>
    </div>
  );
}

export default LegalDocument;
