---
id: 2026-07-21-get-or-create-voice-profile-nondeterministic-select
priority: P3
status: open
opened: 2026-07-21
resolved:
owner_paired: false
summary: `getOrCreateVoiceProfile` reads `limit(1)` with no `.order()` and no `archived` filter → on the paid Processing/Card-Capture spine it can pick an arbitrary/archived profile, diverging from the two sibling readers *(triage 2026-07-21)*
---

# `getOrCreateVoiceProfile` selects a nondeterministic voice profile on the paid spine

*(triage 2026-07-21 — surfaced auditing the Step 3 post-payment spine)*

`src/lib/profile/voice.ts:34-39` reads the user's voice profile with:

```ts
.from("voice_profiles").select("*").eq("user_id", user.id).limit(1).maybeSingle();
```

No `.order()` and no `.neq("status","archived")`. With no unique constraint on `voice_profiles.user_id`
(none exists in `supabase/migrations/`) and multiple profiles per user being a supported concept
(`src/app/app/record/page.tsx:15` — `?new=1` "for starting additional profiles", plus the `archived`
status), this returns an **arbitrary** row in Postgres physical order (typically the oldest, possibly an
`archived` one). This function is what the paid **Processing** page (`src/app/app/voice/processing/page.tsx:68`)
and **Card Capture** page (`src/app/app/vault/protect/page.tsx:40`) run. Its two sibling readers of the
same table disagree with it: `record/page.tsx:41-49` uses `.neq("status","archived").order("created_at",desc).limit(1)`
and `record/complete/page.tsx:16-22` uses `.order("created_at",desc).limit(1)`.

**Why it matters:** for any user with more than one `voice_profiles` row, the spine can `POST /start`
ElevenLabs on and poll the *wrong* profile id — Processing's ready-check and its `/start` fire against a
stale/archived row while the row the user actually recorded into never advances, so a just-paid user hangs
on the give-up "support tail" after a successful charge, and Card Capture's `recordingId` park state tags
the wrong profile. Single-profile users (today's common case) are unaffected — this is a latent
correctness landmine, not a live bug, which is why it hasn't surfaced.

**Fix shape:** give `getOrCreateVoiceProfile` the same read the other two use —
`.neq("status","archived").order("created_at",{ascending:false}).limit(1)` — so all three converge on one
deterministic "current" profile. Consider extracting the shared "current voice profile" query so the three
readers can't drift again.

**Pick up when:** next Step 3 spine / voice-profile work, or as soon as multi-profile (`?new=1`) or
profile-archival flows become reachable in production — whichever comes first.
