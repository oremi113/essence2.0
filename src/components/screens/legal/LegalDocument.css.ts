/**
 * Scoped stylesheet for the public legal documents (Terms, Privacy, Acceptable
 * Use, Beta Terms). One reading-optimised typographic treatment, shared by all
 * four routes. Body HTML is generated from docs/legal/*.md by
 * scripts/legal-build.mjs; this file styles the rendered prose.
 *
 * All values resolve from the globals.css @theme tokens — no literals beyond
 * layout math. Selectors are scoped under `.legal-doc` so nothing leaks global.
 */
export const LEGAL_DOCUMENT_CSS = `
.legal-doc {
  min-height: 100dvh;
  background: var(--color-bg-neutral);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

.legal-doc__topbar {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 clamp(20px, 5vw, 40px);
  padding-top: env(safe-area-inset-top);
  border-bottom: 1px solid var(--color-border);
}

.legal-doc__home {
  font-family: var(--font-display);
  font-size: 18px;
  letter-spacing: 0.14em;
  color: var(--color-text-primary);
  text-decoration: none;
}

.legal-doc__container {
  max-width: 720px;
  margin: 0 auto;
  padding: clamp(32px, 6vw, 56px) clamp(20px, 5vw, 40px) 96px;
}

.legal-doc__head {
  margin-bottom: 36px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--color-border);
}

.legal-doc__title {
  font-family: var(--font-display);
  font-size: clamp(28px, 6vw, 38px);
  line-height: 1.15;
  font-weight: 500;
  margin: 0 0 10px;
}

.legal-doc__effective {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
}

/* ---- prose body ---- */
.legal-doc__body {
  font-size: 16px;
  line-height: 1.72;
  color: var(--color-text-primary);
}

.legal-doc__body h2 {
  font-family: var(--font-display);
  font-size: clamp(20px, 4vw, 24px);
  line-height: 1.25;
  font-weight: 500;
  margin: 40px 0 12px;
}

.legal-doc__body h3 {
  font-family: var(--font-body);
  font-size: 17px;
  font-weight: 600;
  margin: 28px 0 8px;
}

.legal-doc__body p,
.legal-doc__body li {
  color: var(--color-text-primary);
}

.legal-doc__body p {
  margin: 0 0 16px;
}

.legal-doc__body ul,
.legal-doc__body ol {
  margin: 0 0 16px;
  padding-left: 24px;
}

.legal-doc__body li {
  margin: 0 0 8px;
}

.legal-doc__body strong {
  font-weight: 600;
}

.legal-doc__body a {
  color: var(--color-text-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: rgba(var(--color-glow-warm-rgb), 0.8);
}

.legal-doc__body hr {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 32px 0;
}

.legal-doc__body blockquote {
  margin: 0 0 16px;
  padding: 12px 18px;
  border-left: 3px solid rgba(var(--color-glow-warm-rgb), 0.5);
  background: var(--color-bg-warm-1);
  border-radius: 0 8px 8px 0;
  color: var(--color-text-secondary-strong);
}

.legal-doc__body blockquote p:last-child {
  margin-bottom: 0;
}

/* Tables (the Privacy Policy carries several). Scroll on narrow viewports
   rather than overflow the page. */
.legal-doc__body table {
  display: block;
  width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  margin: 0 0 20px;
  font-size: 14.5px;
}

.legal-doc__body th,
.legal-doc__body td {
  border: 1px solid var(--color-border);
  padding: 10px 12px;
  text-align: left;
  vertical-align: top;
}

.legal-doc__body th {
  background: var(--color-bg-warm-1);
  font-weight: 600;
}

.legal-doc__body code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9em;
  background: var(--color-bg-warm-phase);
  padding: 1px 5px;
  border-radius: 4px;
}

/* ---- cross-document nav ---- */
.legal-doc__nav {
  margin-top: 56px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

.legal-doc__nav-label {
  display: block;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  margin-bottom: 12px;
}

.legal-doc__nav ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.legal-doc__nav a {
  color: var(--color-text-primary);
  text-decoration: none;
  font-size: 15px;
  border-bottom: 1px solid rgba(var(--color-glow-warm-rgb), 0.6);
  padding-bottom: 1px;
}

.legal-doc__nav a:hover {
  border-bottom-color: var(--color-text-primary);
}
`;
