#!/usr/bin/env node
// scripts/gen-types.mjs
//
// Single source of truth for `src/lib/supabase/types.ts` — the generated
// Supabase database types. Closes the last open piece of FOLLOW_UPS #26: a
// drift check that regenerates the types and fails when the committed file no
// longer matches the schema (e.g. a migration added an enum value but nobody
// re-ran the generator).
//
// Two modes:
//   --write   regenerate and overwrite the committed file (developer command)
//   --check   regenerate into memory, diff against the committed file, and
//             exit 1 on any difference (CI command)
//
// Schema source is selected by TYPES_SOURCE:
//   local  (default)  the local Supabase stack — `supabase db start` first.
//                     Self-contained: no secrets, no network. This is what CI uses.
//   linked            the linked remote project. Convenient for local dev when
//                     Docker isn't available but the remote is reachable
//                     (`TYPES_SOURCE=linked node scripts/gen-types.mjs --check`).
//
// The `--schema public` flag is load-bearing: the committed file is public-only,
// so omitting it would spuriously add the `graphql_public` schema and report
// false drift.

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const TYPES_PATH = fileURLToPath(
  new URL("../src/lib/supabase/types.ts", import.meta.url),
);

const mode = process.argv.includes("--write")
  ? "write"
  : process.argv.includes("--check")
    ? "check"
    : null;

if (!mode) {
  console.error("usage: node scripts/gen-types.mjs (--write | --check)");
  process.exit(2);
}

const source = (process.env.TYPES_SOURCE ?? "local").trim();
const sourceFlag =
  source === "linked" ? "--linked" : source === "local" ? "--local" : null;

if (!sourceFlag) {
  console.error(
    `Unknown TYPES_SOURCE="${source}". Expected "local" or "linked".`,
  );
  process.exit(2);
}

// Bare `supabase` (not `npx supabase`) so it resolves the CLI on PATH in both
// environments — homebrew locally, supabase/setup-cli in CI — with no risk of
// npx trying to download an npm package of the same name. Override with SUPABASE_BIN.
const bin = process.env.SUPABASE_BIN ?? "supabase";
const command = `${bin} gen types typescript ${sourceFlag} --schema public`;

function generate() {
  try {
    // Only stdout carries the types; the CLI's update-notice goes to stderr.
    return execSync(command, {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "inherit"],
    });
  } catch {
    console.error(`\nFailed to generate types (source: ${source}).`);
    console.error(`Command: ${command}`);
    if (source === "local") {
      console.error("Is the local stack running? Try `supabase db start`.");
    }
    process.exit(1);
  }
}

const generated = generate();

if (mode === "write") {
  writeFileSync(TYPES_PATH, generated);
  console.log(`Wrote ${TYPES_PATH} (source: ${source}).`);
  process.exit(0);
}

// --check
const committed = readFileSync(TYPES_PATH, "utf8");
if (generated === committed) {
  console.log(`src/lib/supabase/types.ts is up to date (source: ${source}).`);
  process.exit(0);
}

// Render a readable diff without taking a dependency — git is always present.
const dir = mkdtempSync(join(tmpdir(), "types-drift-"));
const freshPath = join(dir, "types.fresh.ts");
writeFileSync(freshPath, generated);
console.error("\nSupabase types are out of date.\n");
try {
  execSync(
    `git --no-pager diff --no-index -- ${TYPES_PATH} ${freshPath}`,
    { stdio: "inherit" },
  );
} catch {
  // git diff --no-index exits 1 when files differ; that's expected.
}
console.error(
  "\nThe committed src/lib/supabase/types.ts no longer matches the database\n" +
    "schema. A migration likely changed a table/enum without regenerating types.\n" +
    "Fix: run `npm run gen:types`, then commit the updated types.ts.\n",
);
process.exit(1);
