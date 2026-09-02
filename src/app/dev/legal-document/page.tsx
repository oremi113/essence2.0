import { LegalDocument } from '@/components/screens/legal/LegalDocument';
import type { LegalDocContent } from '@/content/legal/generated';

/**
 * /dev/legal-document — isolated harness for the shared legal reader.
 *
 * Renders LegalDocument with hand-written MOCK content that exercises every
 * prose element the generator can emit (h2/h3, lists, a GFM table, blockquote,
 * inline link + strong, hr), so the typographic treatment can be iterated
 * without running the docs/legal pipeline. Permanent per CLAUDE.md.
 */
const MOCK: LegalDocContent = {
  slug: 'terms',
  navLabel: 'Terms',
  title: 'Sample Legal Document',
  effectiveLabel: 'January 1, 2026',
  html: `
<h2>1. A section heading</h2>
<p>A lead paragraph with <strong>bold emphasis</strong> and an
<a href="/privacy">inline link</a> to another policy. This line exists to check
reading rhythm at a comfortable measure.</p>
<h3>1.1 A subsection</h3>
<ul>
<li>A bulleted item.</li>
<li>Another item with <strong>emphasis</strong> inside it.</li>
</ul>
<blockquote><p>A short callout, styled as a warm-bordered aside.</p></blockquote>
<h2>2. A table</h2>
<table>
<thead><tr><th>Column</th><th>What it holds</th></tr></thead>
<tbody>
<tr><td>Row one</td><td>Some descriptive text that may wrap onto two lines.</td></tr>
<tr><td>Row two</td><td>More descriptive text.</td></tr>
</tbody>
</table>
<hr />
<p>A closing paragraph after a rule.</p>
`.trim(),
};

export default function DevLegalDocumentPage() {
  return <LegalDocument doc={MOCK} />;
}
