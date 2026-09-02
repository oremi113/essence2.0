---
id: 2026-09-01-types-gen-linked-vs-local-internalsupabase-drift
priority: P3
status: open
opened: 2026-09-01
owner_paired: true
summary: gen:types --linked emits an __InternalSupabase PostgrestVersion header that the CI local generator (postgres-meta image) no longer emits, so any types.ts regenerated via --linked fails the types-drift check even when the schema matches
---

# `gen:types` linked vs local disagree on the `__InternalSupabase` header

**What happened:** L2/L4 added tables/columns and regenerated `src/lib/supabase/types.ts`
via `TYPES_SOURCE=linked` (the only mode available without Docker). That output
carried an `__InternalSupabase: { PostgrestVersion: "14.5" }` block (from the
remote's PostgREST version) plus a different trailing newline. The CI
`types-drift` job runs `TYPES_SOURCE=local` (a Docker `postgres-meta` image) which
**no longer emits that block**, so `check:types` reported drift on PR #134 even
though every table/column matched. `origin/main`'s committed `types.ts` *also*
still carries `__InternalSupabase`, so this is latent on main too — it only
surfaces when a PR touches `types.ts`.

**Stopgap applied (2026-09-01):** hand-normalized `types.ts` to the local
generator's shape (stripped the header block, matched the trailing newline) so
#134 goes green. This also clears main's latent drift once #134 merges.

**Root-cause fix (pick one):**
- Pin the local and linked generators to the same Postgres/PostgREST version so
  their output is identical, OR
- Post-process `gen:types` output to strip `__InternalSupabase` in both modes
  (a deterministic `sed`/normalize step in `scripts/gen-types.mjs`), so `--write`
  and `--check` can never disagree on this header again.

**Pick up when:** next `types.ts` regeneration, or if `types-drift` fails again
on a header/whitespace-only diff. Agent-fixable. Related: the FOLLOW_UPS #26
type-gen drift history.
