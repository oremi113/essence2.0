---
id: 2026-07-12-migrate-legacy-followups-to-per-file
priority: P4
status: open
opened: 2026-07-12
resolved:
summary: Migrate the remaining `FOLLOW_UPS.md` monolith (items 1-84 + resolved history) into the per-file `docs/follow-ups/` layout
---

# Migrate the legacy `FOLLOW_UPS.md` monolith into the per-file layout

Move 2 (2026-07-12) established the collision-proof per-file layout and seeded it
with the then-open triage items (FU-85–102). The **older items (1–84) and the
resolved history still live in `docs/FOLLOW_UPS.md`** as the archive. That's the
deliberate pre-launch scope: the root cause (concurrent triage colliding on a
shared counter) is already fixed for *new* items, and bulk-migrating ~95
freeform detail sections is a fragile parse that could silently corrupt the
ledger — not worth the risk right before launch.

**Why it matters:** two ledgers (archive monolith + per-file index) is a
transitional state. It's fine — new work goes per-file, old items migrate on
touch — but the end state is a single system.

**Fix shape:** post-launch, either (a) let items migrate opportunistically (when
an item ≤84 is next worked, move it to a `docs/follow-ups/` file and delete its
monolith row/section), or (b) write a one-time migration script that parses the
monolith's `### N.` sections + table rows and emits per-file files, **behind a
lossless round-trip gate** (reconstruct the detail region from the files and
diff byte-for-byte against the original before shipping). Once the monolith holds
only resolved history, retire it or fold it into `docs/follow-ups/` as
`status: resolved` files.

**Pick up when:** after launch, or the next calm week for docs infrastructure.
Not blocking — the per-file layout already prevents new collisions.
