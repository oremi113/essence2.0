---
id: 2026-09-04-abandoned-pending-generations-have-no-sweeper
priority: P3
status: open
opened: 2026-09-04
resolved:
summary: "`pending_generations.expires_at` is written but nothing ever prunes it; the per-user active cap depends on an entry-point reclaim *(found in beta, 2026-09-04)*"
---

# Abandoned pending generations are only reclaimed on the way back in

*(found while fixing the beta "we couldn't find that page" report, 2026-09-04)*

`src/app/messages/new/page.tsx` · `supabase/migrations/20260601181821_pending_generations.sql:80`

`/generate` enforces one active `pending_generations` row per user
(`STEP6_LIMITS.maxActivePendingPerUser`). The cap assumes every row eventually
gets saved or superseded — but a row the user walks away from stays active
forever, and then returns 429 `cost_limit_blocked` on every future attempt. The
404 bug fixed on 2026-09-04 produced exactly that: a stranded row per attempt,
and users permanently locked out of message creation.

`/messages/new` now resolves it on entry (resume a finished row, supersede a
stale unfinished one — see `src/lib/messages/stale-pending.ts`), which unblocks
every affected user. But that is a repair at one doorway, not a sweeper.

**Why it matters:** the migration's own comment promises one —
*"Defaults to `created_at + 24h`. The cleanup job (manual prune in V1, periodic
post-MVP) deletes rows past this timestamp."* — and it does not exist. So
`expires_at` is written on every row and read by nothing. Rows accumulate
indefinitely, including their storage objects for rendered audio, and any future
code that trusts `expires_at` to mean something will be wrong.

**Fix shape:** a scheduled prune (Vercel Cron → an internal route, or a Supabase
`pg_cron` job) deleting `pending_generations` past `expires_at` along with their
`essence-audio` objects. Keep the entry-point reclaim regardless — it is what
makes the cap self-healing for a user who is *currently* stuck, which a daily
sweep would not be.

**Pick up when:** setting up any scheduled job, or when pending-row volume first
shows up in Supabase storage/row counts.
