#!/usr/bin/env node
/**
 * Point-in-time snapshot of the live Supabase project, taken on demand.
 *
 * This exists because PITR is a $100+/month add-on that also forces a compute
 * upgrade (see docs/FOLLOW_UPS.md #104's sibling discussion, 2026-09-01). At
 * pre-launch data volumes that is not worth buying, but "no protection at all"
 * is not the alternative — this is. Run it before any risky migration.
 *
 *   node scripts/backup-snapshot.mjs                 # -> backups/<timestamp>/
 *   node scripts/backup-snapshot.mjs --out ~/essence-backups
 *   node scripts/backup-snapshot.mjs --no-audio      # rows only, much faster
 *   node scripts/backup-snapshot.mjs --verify <dir>  # re-check an old snapshot
 *
 * WHAT THIS IS NOT: it is not PITR. It captures the moment you run it, and
 * only that moment. It cannot recover damage done after the last run, and it
 * only exists if you remember to run it. Buy PITR when real users have real
 * recordings; until then this covers the risk that actually exists, which is a
 * bad migration you are about to run deliberately.
 *
 * RESTORE PATH — the three pieces together are a complete rebuild:
 *   1. schema  -> supabase/migrations/ (already in git, not copied here)
 *   2. rows    -> tables/<table>.json in this snapshot
 *   3. audio   -> storage/<bucket>/<path> in this snapshot
 *   plus buckets.json to recreate the buckets themselves with their limits,
 *   since bucket creation lives outside migrations (FOLLOW_UPS #104).
 *
 * Tables are DISCOVERED from the Data API's OpenAPI document rather than
 * hardcoded, so a table added later is picked up automatically. A hardcoded
 * list would silently stop backing up whatever it did not know about — the
 * exact failure that makes a backup worthless at the moment you need it.
 *
 * An INCOMPLETE marker file is written first and removed only on full success.
 * A snapshot that died halfway is therefore obvious on disk instead of looking
 * like a good one. Never trust a directory that still has the marker.
 *
 * PII WARNING: tables/auth_users.json holds real email addresses, and the
 * audio is people's voices. The default output directory is gitignored. If you
 * point --out somewhere else, that is on you — keep it off shared drives.
 */
import { readFileSync, mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, statSync } from "fs";
import { resolve, dirname, join } from "path";
import { createHash } from "crypto";

// --- env -----------------------------------------------------------------

function readEnv(name) {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const line = content.split("\n").find((l) => new RegExp(`^\\s*${name}\\s*=`).test(l));
  if (!line) return "";
  let v = line.slice(line.indexOf("=") + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
    v = v.slice(1, -1).trim();
  return v;
}

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1] ?? null;
};

// --verify runs against an existing snapshot and touches no network.
const verifyDir = flag("--verify");
const skipAudio = args.includes("--no-audio");

// --- verify mode ---------------------------------------------------------

function verify(dir) {
  const root = resolve(process.cwd(), dir);
  console.log(`--- verifying snapshot ---\n${root}\n`);
  if (existsSync(join(root, "INCOMPLETE"))) {
    console.error("FAILED: this snapshot has an INCOMPLETE marker — it died partway through.");
    console.error("Do not restore from it. Take a fresh one.");
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
  let bad = 0;

  for (const [table, meta] of Object.entries(manifest.tables)) {
    const p = join(root, "tables", `${table}.json`);
    if (!existsSync(p)) { console.error(`  MISSING  tables/${table}.json`); bad++; continue; }
    const rows = JSON.parse(readFileSync(p, "utf8"));
    const ok = rows.length === meta.rows;
    console.log(`  ${ok ? "ok " : "BAD"}      tables/${table}.json  ${rows.length}/${meta.rows} rows`);
    if (!ok) bad++;
  }

  for (const obj of manifest.storage) {
    const p = join(root, "storage", obj.bucket, obj.name);
    if (!existsSync(p)) { console.error(`  MISSING  storage/${obj.bucket}/${obj.name}`); bad++; continue; }
    const buf = readFileSync(p);
    const sha = createHash("sha256").update(buf).digest("hex");
    if (sha !== obj.sha256) { console.error(`  BAD SUM  storage/${obj.bucket}/${obj.name}`); bad++; }
  }
  console.log(`\n  ${manifest.storage.length} audio file(s) checksummed`);

  if (bad > 0) {
    console.error(`\nFAILED: ${bad} problem(s). This snapshot is not trustworthy.`);
    process.exit(1);
  }
  console.log("\nPASS — every table and every file matches the manifest.");
  process.exit(0);
}

if (verifyDir) verify(verifyDir);

// --- snapshot mode -------------------------------------------------------

const URL_BASE = readEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = readEnv("SUPABASE_SERVICE_ROLE_KEY");

if (!URL_BASE || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

// Service role bypasses RLS, which is the point: a backup must capture every
// row, not just the rows some particular user is allowed to see.
async function api(path, init = {}) {
  const res = await fetch(`${URL_BASE}${path}`, { ...init, headers: { ...H, ...(init.headers ?? {}) } });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path} -> ${res.status} ${await res.text()}`);
  return res;
}

/** Tables currently exposed by the Data API, straight from its OpenAPI doc. */
async function discoverTables() {
  const spec = await (await api("/rest/v1/")).json();
  return Object.keys(spec.definitions ?? {})
    .filter((n) => !n.startsWith("(") && !n.includes("."))
    .sort();
}

/** Every row, paged — PostgREST caps a single response at max_rows (1000). */
async function dumpTable(table) {
  const PAGE = 1000;
  const rows = [];
  for (let offset = 0; ; offset += PAGE) {
    const res = await api(`/rest/v1/${table}?select=*&limit=${PAGE}&offset=${offset}`);
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  return rows;
}

/**
 * auth.users is not reachable through the Data API (only `public` and
 * `graphql_public` are exposed), but profiles.user_id is meaningless without
 * it — so pull it from the Admin API instead.
 *
 * Restoring these is NOT a simple re-insert: identities and sessions are
 * managed by GoTrue. Treat this file as the record of who existed and which
 * id was theirs, which is what you need to reattach rows and audio.
 */
async function dumpAuthUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const res = await api(`/auth/v1/admin/users?page=${page}&per_page=200`);
    const body = await res.json();
    const batch = body.users ?? [];
    users.push(...batch);
    if (batch.length < 200) break;
  }
  return users;
}

/** Storage listing is per-prefix, so walk the tree. */
async function listBucket(bucket, prefix = "") {
  const out = [];
  const PAGE = 100;
  for (let offset = 0; ; offset += PAGE) {
    const res = await api(`/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix, limit: PAGE, offset, sortBy: { column: "name", order: "asc" } }),
    });
    const batch = await res.json();
    for (const entry of batch) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // A folder comes back with no id; recurse into it.
      if (entry.id === null || entry.id === undefined) out.push(...(await listBucket(bucket, path)));
      else out.push({ bucket, name: path, size: entry.metadata?.size ?? null });
    }
    if (batch.length < PAGE) break;
  }
  return out;
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outRoot = resolve(process.cwd(), flag("--out") ?? "backups");
const dir = join(outRoot, stamp);

console.log("--- essence snapshot ---");
console.log(`project: ${URL_BASE.replace(/^https:\/\//, "").split(".")[0]}`);
console.log(`out:     ${dir}\n`);

mkdirSync(join(dir, "tables"), { recursive: true });
// Written FIRST: if anything below throws, this marker survives and the
// snapshot is self-evidently untrustworthy.
writeFileSync(join(dir, "INCOMPLETE"), "Snapshot did not finish. Do not restore from this directory.\n");

const manifest = { takenAt: new Date().toISOString(), project: URL_BASE, tables: {}, storage: [], buckets: [] };

try {
  const tables = await discoverTables();
  console.log(`tables (${tables.length} discovered)`);
  for (const t of tables) {
    const rows = await dumpTable(t);
    writeFileSync(join(dir, "tables", `${t}.json`), JSON.stringify(rows, null, 2));
    manifest.tables[t] = { rows: rows.length };
    console.log(`  ${String(rows.length).padStart(6)}  ${t}`);
  }

  const users = await dumpAuthUsers();
  writeFileSync(join(dir, "tables", "auth_users.json"), JSON.stringify(users, null, 2));
  manifest.tables["auth_users"] = { rows: users.length };
  console.log(`  ${String(users.length).padStart(6)}  auth_users (from Admin API)`);

  const buckets = await (await api("/storage/v1/bucket")).json();
  manifest.buckets = buckets;
  writeFileSync(join(dir, "buckets.json"), JSON.stringify(buckets, null, 2));
  console.log(`\nbuckets (${buckets.length}) -> buckets.json`);
  for (const b of buckets) {
    console.log(`  ${b.name}  private=${!b.public}  limit=${b.file_size_limit ?? "none"}  types=${(b.allowed_mime_types ?? ["any"]).join(",")}`);
  }

  if (skipAudio) {
    console.log("\nstorage: SKIPPED (--no-audio). This snapshot cannot restore recordings.");
    manifest.audioSkipped = true;
  } else {
    console.log("\nstorage");
    let bytes = 0;
    for (const b of buckets) {
      const objects = await listBucket(b.name);
      for (const obj of objects) {
        const res = await api(`/storage/v1/object/${b.name}/${obj.name}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const dest = join(dir, "storage", b.name, obj.name);
        mkdirSync(dirname(dest), { recursive: true });
        writeFileSync(dest, buf);
        // Checksum the bytes we actually wrote, so --verify later proves the
        // file on disk is the file that came off the server.
        manifest.storage.push({ bucket: b.name, name: obj.name, bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex") });
        bytes += buf.length;
      }
      console.log(`  ${String(objects.length).padStart(6)}  ${b.name}`);
    }
    console.log(`  ${(bytes / 1024 / 1024).toFixed(1)} MB written`);
  }

  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  rmSync(join(dir, "INCOMPLETE"));

  console.log(`\nDone. Snapshot is complete and the INCOMPLETE marker is cleared.`);
  console.log(`Verify any time with:\n  node scripts/backup-snapshot.mjs --verify ${dir}`);
} catch (err) {
  console.error(`\nFAILED: ${err.message}`);
  console.error(`Partial snapshot left at ${dir} with its INCOMPLETE marker. Do not restore from it.`);
  process.exit(1);
}
