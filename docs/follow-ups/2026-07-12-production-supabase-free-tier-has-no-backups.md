---
id: 2026-07-12-production-supabase-free-tier-has-no-backups
priority: P2
status: open
opened: 2026-07-12
resolved:
owner_paired: true
summary: Production DB backups now enabled (Supabase Pro, 2026-07-12, 7-day) — BUT Supabase Storage (the actual voice audio) is NOT included in DB backups, so the crown-jewel recordings remain unprotected against logical delete/corruption on a "preserve forever" product *(surfaced 2026-07-12 during vendor checks)*
---

# Production database has no backups (Supabase Free tier) — durability gap vs. the "preserve forever" promise

*(surfaced 2026-07-12 while confirming the backup/retention window for the privacy work)*

The production Supabase project **`essence-mvp`** (branch `main`, labelled PRODUCTION) is on the **Free
plan**, which the dashboard states plainly: "Free Plan does not include project backups." So there are
**no daily scheduled backups and no Point-in-Time Recovery**. There is currently no way to restore the
database after data loss.

**Why it matters:** ESSENCE's core value proposition and marketing are *permanence* — preserving a loved
one's voice, "your voice belongs to you," a keepsake meant to last. With zero backups, a single bad
migration, an accidental/erroneous delete, a corruption event, or a project-level incident makes user
data **unrecoverable** — a user could permanently lose the preserved voice of a deceased parent, breaking
the central promise and creating real reputational + legal exposure. (Free-tier projects also pause after
inactivity — a separate reliability wrinkle.) This is the durability counterpart to the promise-vs-reality
copy work: promising permanence while the infrastructure can't guarantee it.

**Note the two-edged interaction with deletion (do not "fix" by staying on Free):** no backups currently
*helps* the "permanently gone on account deletion" promise (nothing lingers). But durability must win —
the answer is backups + adjusting the deletion copy, not skipping backups.

**Fix shape (owner action + a copy tweak):**
1. **Upgrade to Supabase Pro (~$25/mo) before public launch** → daily scheduled backups (7-day retention)
   + optional PITR. This is the durability gate.
2. After upgrading, reconcile the deletion copy: *with* backups, deleted data persists in them for up to
   the retention window. So the honest deletion statement becomes "removed from active systems
   immediately; purged from backups within [retention window]." Update
   `2026-07-12-account-deletion-never-deletes-the-elevenlabs-voice-clone` +
   `2026-07-12-privacy-copy-claims-e2e-encryption-but-audio-is-plaintext` accordingly.
3. Consider whether critical data warrants more than 7-day retention given the "forever" framing (PITR /
   longer retention / periodic off-platform export) — a durability design decision, not just a plan flip.

**Pick up when:** before public launch — treat as a launch-readiness gate. Owner-paired (billing decision
+ the durability/retention policy is a business call).

**Update 2026-07-12: DB backups enabled (Pro), but the AUDIO gap is now the live risk.** Owner upgraded
`essence-mvp` to Supabase **Pro** → daily scheduled DB backups, **7-day** retention (PITR available as a
paid add-on for finer/longer). **However, the Backups page states plainly: "Storage objects are not
included… Restoring an old backup does not restore objects that have been deleted since then."** So the DB
(rows/metadata: users, messages, voice_profiles, recipients, transcripts) is now protected, but the actual
**voice recordings + generated audio in the `essence-audio` Storage bucket are NOT** — the crown-jewel
asset for a voice-preservation product remains unbacked. Supabase Storage is S3-class (durable vs.
hardware failure) but has **no point-in-time restore for logical deletes**, so an accidental/erroneous
delete or bad code path loses audio irrecoverably.

**Remaining fix (the real durability gate):** design a **separate audio-durability strategy** before
promising "forever" — e.g. periodic export/replication of the `essence-audio` bucket to a second store,
S3 object versioning if exposed, or a scheduled backup job. This is a design decision, not a plan toggle.
Two-edged reminder: the audio-not-in-backups fact *helps* the deletion promise (deleted audio is truly
gone), so any audio-backup scheme must itself honor account-deletion (purge the user's audio from the
secondary store too). The DB-backup half is **resolved**; the audio half stays **open** as the launch gate.
