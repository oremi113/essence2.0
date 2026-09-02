# L2 — Voice-cloning consent gate: status + apply runbook

**Chunk:** L2 (Compliance Implementation Pack, Part 1)
**Updated:** 2026-09-01

The consent gate has two jobs: **enforce** (don't create a voice clone without
both affirmations) and **record** (keep durable evidence that consent happened).
This chunk finished the enforcement/copy correctness in code; the durable record
needs a DB migration that could not be applied from the build environment
(Docker/local Supabase unavailable, and the remote is an owner-only `db push`).

---

## Part A — DONE (shipped + verified in this branch)

- **Own-voice-only contradiction fixed.** The ownership checkbox previously
  offered "…or I have authorization from the person it belongs to (or their
  estate)", which **contradicted** ToS §5.4 and AUP §1 (own voice only). Now
  uses the pack's canonical String 2: *"This is my own voice. I am not
  recording, imitating, or submitting the voice of any other person, living or
  deceased."*
- **Canonical strings + version** in `src/lib/voice-creation/consent-copy.ts`
  (`CONSENT_TEXT_VERSION = '2026-09-01-v1'`), consumed by the create form.
- Form **sends `consentTextVersion`** and **disables the CTA until both boxes
  are checked**.
- `/dev/voice-profile-create` harness added; unit tests updated (405 green);
  verified in-browser at 390×844.

## Enforcement — one owner env step (no code change)

The server already rejects creation without both affirmations **when the flag is
on** (`assertVoiceConsent`, gated by `VOICE_CONSENT_REQUIRED`). The form already
sends both flags. So enabling enforcement for the beta is purely:

```
# in the deployment environment (Vercel project env), before inviting beta users
VOICE_CONSENT_REQUIRED=true
```

Leaving it off means the boxes are collected but a malformed client could still
create a profile without them. Turn it on for beta.

## Part B — ✅ APPLIED 2026-09-01 (migration on remote + types + persistence wired)

Done via the CLI's `--linked` mode (no Docker): migration pushed to project
idqvimiybiskposxhbor, `types.ts` regenerated (drift-clean), and the persistence
write is live in `src/app/api/voice-profiles/route.ts`. The steps below are the
record of what was run. **The only remaining item is the enforcement env flip
above (`VOICE_CONSENT_REQUIRED=true`).**

Steps, in order:

### 1. Add the migration

Create `supabase/migrations/20260901130000_voice_consent_records.sql`:

```sql
-- Durable evidence of voice-cloning consent (Compliance Pack Part 1).
-- Written server-side (service role) at voice-profile creation. Not edited by
-- clients. Own-row SELECT only, so a future DSAR/export can read via the user
-- session. Account deletion erases it via the user_id cascade.
begin;

create table public.voice_consent_records (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  voice_profile_id      uuid references public.voice_profiles(id) on delete set null,
  consent_to_clone      boolean not null,
  ownership_attestation boolean not null,
  consent_text_version  text    not null,
  accepted_at           timestamptz not null default now(),
  user_agent            text,
  ip_address            inet
);

create index voice_consent_records_user_id_idx
  on public.voice_consent_records (user_id);

alter table public.voice_consent_records enable row level security;

-- Own-row read only. No client insert/update/delete policy: all writes go
-- through the service role, which bypasses RLS.
create policy "own consent records are viewable"
  on public.voice_consent_records for select
  using (auth.uid() = user_id);

-- 20260901120000_privacy_hardening revoked default Data API grants on new
-- tables, so grant the read that the SELECT policy implies. No write grants —
-- service role only.
grant select on public.voice_consent_records to authenticated;

commit;
```

### 2. Apply + regenerate types

```
supabase db push                 # apply to the linked project (owner)
npm run gen:types -- --write     # regenerate src/lib/supabase/types.ts (needs Docker OR TYPES_SOURCE=linked)
npm run check:types              # confirm no drift
```

### 3. Wire the persistence write

In `src/app/api/voice-profiles/route.ts`, after the `voice_profiles` insert
succeeds (row `id` in hand) and before the success response, record the consent
with the **service** client (RLS-bypassing; import
`createSupabaseServiceClient`) via `checkedWrite` — capture the version + request
metadata:

```ts
const service = createSupabaseServiceClient();
await checkedWrite(
  service.from("voice_consent_records").insert({
    user_id: user.id,
    voice_profile_id: row.id,
    consent_to_clone: body.consentToClone === true,
    ownership_attestation: body.ownershipAttested === true,
    consent_text_version: typeof body.consentTextVersion === "string"
      ? body.consentTextVersion
      : "unknown",
    user_agent: request.headers.get("user-agent") ?? null,
    ip_address:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
  }),
  { op: "voice_profiles.record_consent", requestId, userId: user.id },
);
```

This typechecks only after step 2 regenerates `types.ts` with the new table.

### 4. Re-prompt on version bumps

When any string in `consent-copy.ts` changes, bump `CONSENT_TEXT_VERSION` and
re-prompt existing users before their next recording. (Beta scale: a handful of
users; a manual note suffices until there's tooling.)

---

## Deferred, tracked

- **Separate consent screen.** The pack suggests a dedicated screen after the
  profile form ("Two things to confirm"). Consent is currently inline in the
  create form — legally equivalent (both boxes required, CTA gated), so this is
  UX polish, not a blocker.
- **Signup document-acceptance checkbox + `terms_version_accepted`** and the
  **country field** are chunk L4, not here.
