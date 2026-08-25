---
id: 2026-08-25-save-vault-quota-count-then-insert-toctou
priority: P3
status: open
opened: 2026-08-25
resolved:
owner_paired: false
summary: `/save` vault quota is a count-then-insert TOCTOU, not the "race-safe security gate" it claims — concurrent saves can exceed the 3-message cap *(triage 2026-08-25)*
---

# `/save` saved-message quota is a count-then-insert TOCTOU, not race-safe

*(triage 2026-08-25)*
`src/app/api/messages/save/route.ts:104-112` counts `messages` where `status = 'saved'` for the user,
rejects at `>= maxSavedMessages` (3), then inserts the new saved row at l.146-164. There is no DB
constraint behind the cap: the only unique index on `messages` is `source_generation_id`
(`supabase/migrations/20260601181822_messages_source_generation_id.sql`), which enforces
per-generation idempotency — not a per-user saved count. A migration grep confirms no per-user
saved-count constraint or trigger exists. Yet the code (l.104) and `cost-controls.ts:47-49` both call
this the **"race-safe security gate."**

**Why it matters:** count-then-insert without a transaction or supporting constraint is a classic
TOCTOU. Two concurrent `/save` calls for two *different* generations by a user at count = 2 both read
2, both pass the check, and both insert → 4 saved messages, one over the lifetime Vault cap. The
in-memory dedup (`src/lib/rate-limit.ts`) keys on `${userId}:${action}` and is per-instance, so on
serverless the two requests can land on different instances and both proceed. Impact is plan-quota
integrity (over-provisioning the Vault by a small margin) — **not** extra vendor spend (the render was
already paid at generate/commit) and not data loss. Low-frequency (needs a genuine concurrent
double-submit). What makes it ticket-worthy is the inaccurate "race-safe" claim: anyone building on
that guarantee inherits a hole. Same bug class as FU-81 (the best-effort duplicate-subscription
guard), on a different table.

**Fix shape:** back the cap with the database — e.g. enforce it in a trigger/constraint, or gate the
insert on a conditional write that fails when the user already holds `maxSavedMessages` saved rows —
so the DB rejects the over-cap row regardless of timing; treat that rejection as the existing
`vault_limit_reached` 403. Needs a migration. Until then, soften the "race-safe security gate"
comments to "best-effort" so they don't overclaim.

**Pick up when:** the next Step 6 / vault-cap pass, or a pre-launch billing/quota-hardening sweep
(pairs naturally with FU-81's partial-unique-index work — same read-then-act pattern).
