/**
 * Footer with links to the four public legal documents + the entity line.
 * Reusable primitive (usable on the landing page, Settings, etc.) — the pack's
 * "discoverability is part of clear-and-conspicuous" item. Links come from
 * routes.ts so paths never drift.
 */
import Link from 'next/link';
import { ROUTES } from '@/lib/routes';

const LINKS = [
  { href: ROUTES.terms, label: 'Terms' },
  { href: ROUTES.privacy, label: 'Privacy' },
  { href: ROUTES.acceptableUse, label: 'Acceptable Use' },
  { href: ROUTES.betaTerms, label: 'Beta Terms' },
];

const LEGAL_FOOTER_CSS = `
.legal-footer {
  border-top: 1px solid var(--color-border);
  padding: 24px clamp(20px, 5vw, 40px) calc(24px + env(safe-area-inset-bottom));
  font-family: var(--font-body);
}
.legal-footer nav ul {
  list-style: none;
  margin: 0 0 10px;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
}
.legal-footer a {
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 14px;
}
.legal-footer a:hover {
  color: var(--color-text-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.legal-footer__entity {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}
`;

export function LegalFooter() {
  return (
    <footer className="legal-footer">
      <style>{LEGAL_FOOTER_CSS}</style>
      <nav aria-label="Legal">
        <ul>
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <p className="legal-footer__entity">© 2026 ESSENCE APP LLC</p>
    </footer>
  );
}

export default LegalFooter;
