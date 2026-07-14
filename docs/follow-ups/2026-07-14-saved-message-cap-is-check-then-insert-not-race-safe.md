---
id: 2026-07-14-saved-message-cap-is-check-then-insert-not-race-safe
priority: P3
status: open
opened: 2026-07-14
resolved:
summary: The saved-message (vault) cap in `/api/messages/save` is a count-then-insert labeled "race-safe" but nothing enforces it at the DB level, so two concurrent saves of different generations can both pass and land the user over the vault limit *(triage 2026-07-14)*
---

# The vault "saved message" cap is a check-then-insert, not the "race-safe" gate its comment claims

*(triage 2026-07-14)*
`src/app/api/messages/save/route.ts:104-112` enforces the vault cap by counting the user's `saved`
messages and rejecting if `savedCount >= maxSavedMessages`, then (further down) inserting
unconditionally. The header comment (`:11-13`) calls this "the race-safe security gate," but there is no
DB-level enforcement of the limit — the only unique constraint dedupes a single `source_generation_id`,
not the count. Two concurrent saves of **different** generations both read the same `savedCount` and both
insert, landing the user one (or more) over the cap. The in-memory `dedup` guard only debounces the same
action within a single serverless instance, so it does not make this cross-instance safe.

**Why it matters:** the vault cap is a product/pricing boundary (how many messages a plan includes). A
user racing two saves at the cap boundary — or any future UI that fires saves in parallel — can quietly
exceed it, and the "race-safe" label misleads the next engineer into trusting a guarantee the code
doesn't provide. Same atomicity gap as the already-logged FU-81 (the duplicate-subscription guard), just
on the vault-limit path instead of the billing path. Narrow trigger today; a landmine as soon as saves
can overlap.

**Fix shape:** enforce the cap atomically — a partial/exclusion constraint or a transactional
`SELECT … FOR UPDATE`-style RPC that counts and inserts in one step. Enforcing a *count* limit
atomically needs a DB-side mechanism, so this likely rides a **migration → ask-first** per the refactor
rules. At minimum, downgrade the "race-safe" comment to state the real (best-effort) guarantee so it
stops misleading.

**Pick up when:** alongside the FU-81 atomicity work (same class — worth one design pass for both), or
before launch if concurrent saves become reachable. Migration-coupled; owner-paired for the DB piece.
