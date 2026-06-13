// Step 6 prototype token-reconciliation auditor.
// Diffs each prototypes/message creation/essence-step6-*.html :root block
// against production src/app/globals.css @theme, and reports undeclared
// var() refs, value drift, and filter:brightness / forwards-fill counts.
// See docs/session-8/Step6_Prototype_Token_Reconciliation.md. Run from repo root.

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const protoDir = "prototypes/message creation";
const globals = readFileSync("src/app/globals.css", "utf8");

// Production @theme token names + values
const themeBlock = globals.match(/@theme\s*\{([\s\S]*?)\n\}/)[1];
const prodTokens = {};
for (const m of themeBlock.matchAll(/(--[\w-]+):\s*([^;]+);/g)) prodTokens[m[1]] = m[2].trim();

const files = readdirSync(protoDir).filter(f => f.endsWith(".html"));
for (const f of files) {
  const css = readFileSync(resolve(protoDir, f), "utf8");
  // declared in any :root in this file
  const declared = new Set();
  const declaredVals = {};
  for (const rb of css.matchAll(/:root\s*\{([\s\S]*?)\n\}/g)) {
    for (const m of rb[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)) { declared.add(m[1]); declaredVals[m[1]] = m[2].trim(); }
  }
  // all var(--x) references
  const refs = new Set();
  for (const m of css.matchAll(/var\((--[\w-]+)/g)) refs.add(m[1]);

  // Refs used but not declared in this file's :root — prototypes carry no
  // production @theme, so any undeclared ref renders as an invalid value
  // (the A4 pip-token bug). A var declared on a non-root ancestor still
  // cascades, so this is a candidate list to eyeball, not an auto-fail.
  const undeclaredRefs = [...refs].filter(r => !declared.has(r));
  // declared values that differ from production
  const drift = [...declared].filter(t => t in prodTokens && declaredVals[t] !== prodTokens[t])
    .map(t => `${t}: proto=${declaredVals[t]} | prod=${prodTokens[t]}`);

  const brightness = (css.match(/filter:\s*brightness/g) || []).length;
  const forwardsFill = (css.match(/animation[^;]*forwards/g) || []).length;

  console.log(`\n### ${f}`);
  console.log(`  undeclared var() refs (RENDER BUGS): ${undeclaredRefs.length ? undeclaredRefs.join(", ") : "none"}`);
  console.log(`  value drift vs prod (${drift.length}):`);
  drift.forEach(d => console.log("     " + d));
  console.log(`  filter:brightness count: ${brightness} | forwards-fill animations: ${forwardsFill}`);
}
