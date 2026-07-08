/**
 * Scoped stylesheet for the legal-document flow (Privacy Policy, Terms).
 *
 * Injected once via `<style>{LEGAL_DOCUMENT_CSS}</style>` from LegalDocument.
 * Everything is scoped under `.legal` so nothing leaks global. All values
 * resolve from the @theme tokens in globals.css — no raw hex, no new fonts.
 *
 * Reading-comfort choices (45–70 demographic, CLAUDE.md touch-target rule):
 *   • Body copy runs at --text-body-lg (18px) with a roomy 1.7 line-height —
 *     one notch above the app default, because these are long read-throughs.
 *   • Section headings use the display face (Spectral) at --text-h3.
 *   • The document sits inside .app-main (430px, cream) from the segment
 *     layout, so this sheet owns rhythm/spacing only, not the frame.
 */
export const LEGAL_DOCUMENT_CSS = `
.legal {
  font-family: var(--font-body);
  color: var(--color-text-primary);
  padding-bottom: var(--space-4xl);
}

/* Effective-date fact, sits just under the header title. */
.legal__effective {
  margin-top: calc(-1 * var(--space-xs));
  margin-bottom: var(--space-xl);
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

/* Draft banner — flags the placeholder body for the owner. Warm amber-umber
   (status-warning) at low fill so it reads as "not final" without alarming. */
.legal__placeholder {
  display: flex;
  gap: var(--space-sm);
  align-items: flex-start;
  margin-bottom: var(--space-2xl);
  padding: var(--space-md) var(--space-lg);
  border: 1px solid rgba(138, 90, 30, 0.28);
  border-radius: var(--radius-lg);
  background: rgba(138, 90, 30, 0.06);
}

.legal__placeholder-mark {
  flex: none;
  margin-top: 1px;
  color: var(--color-status-warning);
  line-height: 1;
}

.legal__placeholder-text {
  font-size: var(--text-small);
  line-height: 1.5;
  color: var(--color-status-warning);
}

.legal__placeholder-text strong {
  font-weight: 600;
}

/* Lead paragraph — slightly heavier than section body. */
.legal__intro {
  margin-bottom: var(--space-2xl);
  font-size: var(--text-body-lg);
  line-height: 1.7;
  color: var(--color-text-primary);
}

.legal__section {
  margin-bottom: var(--space-2xl);
}

.legal__section:last-of-type {
  margin-bottom: 0;
}

.legal__heading {
  margin-bottom: var(--space-md);
  font-family: var(--font-display);
  font-size: var(--text-h3);
  font-weight: 600;
  line-height: 1.35;
  color: var(--color-text-primary);
}

.legal__section p {
  margin-bottom: var(--space-md);
  font-size: var(--text-body-lg);
  line-height: 1.7;
  color: var(--color-text-secondary);
}

.legal__section p:last-child {
  margin-bottom: 0;
}

/* Footer — cross-link to the sibling document. */
.legal__footer {
  margin-top: var(--space-4xl);
  padding-top: var(--space-xl);
  border-top: 1px solid var(--color-border);
}

.legal__related {
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  font-size: var(--text-body);
  font-weight: 500;
  color: var(--color-mineral);
  text-decoration: none;
  transition: color var(--duration-micro) var(--ease-essence);
}

.legal__related:hover {
  color: var(--color-mineral-dark);
}

.legal__related-arrow {
  transition: transform var(--duration-micro) var(--ease-essence);
}

.legal__related:hover .legal__related-arrow {
  transform: translateX(2px);
}
`;
