---
id: 2026-07-28-health-endpoint-returns-200-when-db-check-fails
priority: P3
status: open
opened: 2026-07-28
resolved:
owner_paired: false
summary: `/api/health` answers HTTP 200 on every path — including when the DB `healthcheck` RPC errors or Supabase throws — so any status-keyed uptime/readiness probe reads a DB-down instance as healthy *(triage 2026-07-28)*
---

# `/api/health` returns 200 even when the database check fails

*(triage 2026-07-28)*

`src/app/api/health/route.ts:8-13` (RPC-error branch) and `:15-21` (catch branch) both explicitly
return `{ ok: false, ... }` with `{ status: 200 }`. Health is signalled **only** in the JSON body;
the HTTP status is always `200`, whether the DB is up, the `healthcheck` RPC errored, or the whole
Supabase call threw.

**Why it matters:** `README.md` calls this the "Production health endpoint." The entire point of a
health endpoint is that something upstream keys off it, and the near-universal convention is the HTTP
status code. Today nothing is wired to it, so this is a latent landmine rather than a live outage: the
moment a Vercel/load-balancer readiness probe, an uptime monitor (Pingdom/UptimeRobot/etc.), or a
k8s-style liveness check is pointed at `/api/health` — keyed, as they default to, on status — a
database-down instance will report perfectly healthy and never page anyone.

**Fix shape:** return `503` (Service Unavailable) on both the RPC-error and catch branches; keep `200`
only for the `{ ok: true }` path. Body shape can stay the same for any client that reads it.

**Pick up when:** before wiring any external monitor/probe to the endpoint, or the next monitoring /
observability pass (`docs/MONITORING.md`). Cheap, self-contained, non-visual.
