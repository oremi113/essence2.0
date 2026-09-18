#!/usr/bin/env node
/**
 * Regenerate the design-system token export from `src/app/globals.css`.
 *
 * The export is what external design tooling (Claude Design canvases, the
 * `_ds/` bundle) loads to get ESSENCE's tokens. It used to be lifted by hand,
 * with a header promising "Source wins if it drifts — regenerate from it" and
 * no way to actually do that. It drifted for five months:
 *
 *   --shadow-mineral   teal rgba(74,107,126,.3)  →  warm rgba(110,80,40,.20)
 *                      (FOLLOW_UPS #40, re-keyed 2026-06-12)
 *   --text-display     48px  →  34px
 *                      (renamed: the 48px scale step became --text-scale-display
 *                       and the name now owns the 34px ceremonial role)
 *
 * …and 52 tokens added since the lift were simply absent, including
 * --color-text-secondary-strong, which a design pass then re-derived from
 * scratch because the export said it did not exist.
 *
 * So this emits the whole `@theme` block verbatim, comments and all, rather
 * than a curated subset. Curation is what let it rot — someone had to decide
 * what to include, and nobody re-decided. A full lift cannot silently omit.
 *
 * Usage:  npm run build:ds-export      (or: node scripts/build-ds-export.mjs [outfile])
 *
 * Output is committed, like src/content/legal/generated.ts — it is a hand-off
 * artifact an external tool loads, not build output, so its diff should be
 * reviewable when a token changes.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SRC = resolve('src/app/globals.css');
const OUT = resolve(process.argv[2] ?? 'design-system/colors_and_type.css');

const css = readFileSync(SRC, 'utf8');

// The @theme block runs from its opening brace to the first `}` at column 0.
const start = css.indexOf('@theme {');
if (start === -1) throw new Error('No @theme block found in globals.css');
const end = css.indexOf('\n}', start);
if (end === -1) throw new Error('Unterminated @theme block in globals.css');
const block = css.slice(start + '@theme {'.length, end);

const tokenCount = (block.match(/^\s*--[a-z0-9-]+:/gim) ?? []).length;
const today = new Date().toISOString().slice(0, 10);

const out = `/* ═══════════════════════════════════════════════════════════════════════════
   ESSENCE — Design tokens + semantic type roles
   ───────────────────────────────────────────────────────────────────────────
   GENERATED — do not edit by hand.
   Source: src/app/globals.css @theme
   Regenerate: node scripts/build-ds-export.mjs
   Generated ${today} · ${tokenCount} tokens

   Emitted verbatim from source, comments included. If a token you need is
   missing here it is missing in the app too — add it to globals.css, not to
   this file. A local override in a design file is drift with extra steps.
   ═══════════════════════════════════════════════════════════════════════════ */

@import url('https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,600;1,400&family=Inter:wght@400;500;600;700&display=swap');

:root {${block}}

/* Two rules the export has always needed to stand alone, since a design file
   loads this stylesheet without the rest of globals.css. Both are real in the
   app; they live outside @theme, so a token-only lift misses them. */
button, input, select, textarea { font-family: inherit; }
button, a, [role="button"] { min-height: 44px; }
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, out, 'utf8');
console.log(`ds-export: ${tokenCount} tokens → ${OUT}`);
