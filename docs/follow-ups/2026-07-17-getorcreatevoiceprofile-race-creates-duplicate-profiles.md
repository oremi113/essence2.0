---
id: 2026-07-17-getorcreatevoiceprofile-race-creates-duplicate-profiles
priority: P3
status: open
opened: 2026-07-17
resolved:
owner_paired: true
summary: getOrCreateVoiceProfile is check-then-insert with no unique constraint on voice_profiles.user_id, so two concurrent calls create two "Default" profiles and later flows can attach clips to the wrong one *(triage 2026-07-17)*
---

# Two concurrent calls can create duplicate voice profiles, silently desyncing the pipeline

*(triage 2026-07-17)*

`src/lib/profile/voice.ts:34` — `getOrCreateVoiceProfile` reads the user's existing voice profile with
`.limit(1).maybeSingle()`, and if none is found (l.42) it `insert`s a fresh `"Default"` profile. There
is no unique constraint on `voice_profiles.user_id` (the table is deliberately multi-row — it is meant
to hold several labels like "Mom" / "Me"), so nothing stops two concurrent calls from both seeing "no
profile" and both inserting.

**Why it matters:** two near-simultaneous entries into the voice flow (a double-submit, or parallel
requests during onboarding) can leave the user with **two** "Default" profiles. Subsequent reads use
`.limit(1).maybeSingle()` and can return either one non-deterministically, so training clips uploaded
against one profile may later be read against the other — a silent state desync on the voice pipeline
that surfaces later as "my clips vanished" or a profile that never becomes ready.

**Fix shape (owner-paired — the clean fix needs a migration):** add a partial unique index enforcing
one auto-created/"primary" profile per user, and switch the insert to `upsert(..., { onConflict })`
(or serialize creation through a DB function). Migrations are on the never-touch list, so this needs an
owner conversation rather than an agent branch. A non-migration stopgap the agent *could* do: make the
insert tolerate a concurrent create by re-selecting the existing row on a unique/constraint error
instead of returning it as a hard failure — but that only helps once a constraint exists.

**Pick up when:** the next schema pass that touches `voice_profiles`, or the first time duplicate
profiles are observed in the data. Flagged owner-paired because the correct fix is a migration.
