/**
 * Shared types for the legal-document flow (Privacy Policy, Terms of Service).
 *
 * A legal page is a title + an effective date + an ordered list of prose
 * sections. `PrivacyPolicyScreen` and `TermsScreen` are thin content shells
 * that hand one of these to the shared `LegalDocument` renderer.
 */

/** One prose section: a heading and one-or-more paragraphs beneath it. */
export interface LegalSection {
  /** Section heading, rendered as an <h2> in the display face. */
  heading: string;
  /**
   * Paragraphs under the heading. Each string is one <p>. Plain text only —
   * no markup — so the placeholder copy stays trivially reviewable by the
   * owner. Rich formatting is a deliberate non-goal until real copy lands.
   */
  paragraphs: string[];
}

/** A sibling legal page to cross-link to from the footer (e.g. Terms ↔ Privacy). */
export interface LegalRelatedLink {
  label: string;
  href: string;
}

export interface LegalDocumentProps {
  /** Document title — becomes the <h1> in the shared ScreenHeader. */
  title: string;
  /**
   * Human-readable effective date, e.g. "Effective — pending". Kept as a
   * free string (not a Date) because the placeholder has no real date yet;
   * the owner sets a literal when the copy is finalised.
   */
  effectiveLabel: string;
  /** Optional lead paragraph shown above the numbered sections. */
  intro?: string;
  /** Ordered body sections. */
  sections: LegalSection[];
  /** Back-button label in the header. Omit to hide the back affordance. */
  backLabel?: string;
  /** Override the back destination. Omit → ScreenHeader falls back to router.back(). */
  backHref?: string;
  /** The sibling legal page linked from the footer. */
  related?: LegalRelatedLink;
  /**
   * When true, renders the "draft — pending legal review" banner. Always true
   * for the current placeholder pages; the owner flips this off (per doc) once
   * real, counsel-reviewed copy replaces the placeholder body.
   */
  placeholder?: boolean;
}
