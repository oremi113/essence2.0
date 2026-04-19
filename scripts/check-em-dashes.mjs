#!/usr/bin/env node
/**
 * Fails if any prompt `line:` string in
 * src/lib/voice-training/script.ts contains an em dash (—).
 *
 * Rule: em dashes are banned in prompt bodies. Pass 3a copy policy —
 * the spoken delivery of an em-dash beat is unreliable, so we force
 * the writer to choose a period, colon, or comma instead, each of
 * which maps cleanly to a pause the TTS handles predictably.
 *
 * This guard catches only `line:` property assignments. Covers both
 * plain string lines and nested variant objects
 * (generation / relationship / relationshipGoodbye / timeOfDayName).
 *
 * Hook via `npm run lint` (see package.json) or run directly:
 *   node scripts/check-em-dashes.mjs
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import ts from "typescript";

const TARGET = resolve(
  process.cwd(),
  "src/lib/voice-training/script.ts"
);

const source = readFileSync(TARGET, "utf8");
const sf = ts.createSourceFile(
  TARGET,
  source,
  ts.ScriptTarget.Latest,
  /*setParentNodes*/ true,
  ts.ScriptKind.TS
);

/** @type {{ line: number; col: number; excerpt: string }[]} */
const violations = [];

function locOf(node) {
  const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  return { line: line + 1, col: character + 1 };
}

function recordIfDash(stringNode) {
  if (!stringNode.text || !stringNode.text.includes("—")) return;
  const idx = stringNode.text.indexOf("—");
  const start = Math.max(0, idx - 30);
  const end = Math.min(stringNode.text.length, idx + 30);
  const excerpt = stringNode.text.slice(start, end).replace(/\n/g, " ");
  const { line, col } = locOf(stringNode);
  violations.push({ line, col, excerpt });
}

function walkLineValue(valueNode) {
  if (ts.isStringLiteral(valueNode) || ts.isNoSubstitutionTemplateLiteral(valueNode)) {
    recordIfDash(valueNode);
    return;
  }
  if (ts.isObjectLiteralExpression(valueNode)) {
    for (const prop of valueNode.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      const v = prop.initializer;
      if (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v)) {
        recordIfDash(v);
      }
    }
  }
}

function visit(node) {
  if (ts.isPropertyAssignment(node)) {
    const name = node.name;
    if (
      (ts.isIdentifier(name) || ts.isStringLiteral(name)) &&
      name.text === "line"
    ) {
      walkLineValue(node.initializer);
    }
  }
  ts.forEachChild(node, visit);
}

visit(sf);

if (violations.length === 0) {
  process.exit(0);
}

console.error(
  `\nem-dash guard: ${violations.length} violation${
    violations.length === 1 ? "" : "s"
  } in ${TARGET}\n`
);
for (const v of violations) {
  console.error(`  ${TARGET}:${v.line}:${v.col}  ...${v.excerpt}...`);
}
console.error(
  `\nEm dashes are banned in prompt bodies. Use a period, colon, or comma instead.\n`
);
process.exit(1);
