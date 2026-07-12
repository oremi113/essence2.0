---
id: 2026-07-12-account-deletion-never-deletes-the-elevenlabs-voice-clone
priority: P2
status: open
opened: 2026-07-12
resolved:
owner_paired: false
summary: Copy promises the voice is "permanently gone from our servers within 48 hours" but account teardown never deletes the ElevenLabs clone — it becomes an un-addressable orphan *(legal questionnaire 2026-07-12)*
---

# Account deletion never deletes the ElevenLabs voice clone — contradicts "permanently gone within 48 hours"

*(legal questionnaire 2026-07-12 — see `docs/legal/2026-07-12-legal-questionnaire-code-findings.md` §1.5, §8.2)*

`src/components/screens/onboarding/PrivacyPromiseModal.tsx:80-84` — "If you delete your account, your
voice is **permanently gone** from our servers within **48 hours**." The account teardown
(`deleteAccountAction`, `src/app/app/settings/actions.ts:170-248`) cancels the Stripe subscription,
wipes Supabase Storage (`essence-audio`, `profile-photos`), and deletes the DB rows — but it **never
calls ElevenLabs**. `src/lib/elevenlabs.ts` exports only `createVoiceFromClips` and `generateSpeech`;
there is **no `DELETE /v1/voices/{id}` call anywhere in the repo**. Worse, the teardown deletes the
`voice_profiles` row (`actions.ts:237`) which holds `vendor_voice_id`, so after deletion the app no
longer even has the ID needed to delete the clone later — it becomes an **un-addressable orphan on
ElevenLabs' servers**.

Two related reality-gaps against the same promise (details in the findings doc):
- **"Within 48 hours"** — the local teardown is actually *immediate and synchronous* (no 48h job, no
  cron, no grace period). The only thing that could take longer is Supabase backups/PITR, which retain
  deleted data well beyond 48h and are not scrubbed by any code (vendor fact — confirm the project's
  retention window).
- **Stripe** customer + payment/invoice history are intentionally retained (only the subscription is
  cancelled, `actions.ts:199`) — correct for tax retention, but "permanently gone" should be scoped to
  exclude financial records.

**Why it matters:** the cloned voice is the most sensitive derived asset in the product, and the
promise says it's *gone*. It is not — it persists on a third party's servers indefinitely, and the app
has thrown away the means to delete it. This is a direct contradiction of a core privacy promise and a
GDPR/CCPA erasure exposure.

**Fix shape (code):** add a `deleteVoice(voiceId)` helper to `src/lib/elevenlabs.ts` that calls
`DELETE /v1/voices/{voiceId}`, and invoke it in `deleteAccountAction` **before** the `voice_profiles`
row (and its `vendor_voice_id`) is deleted — reading the id first. Handle the already-gone case
(404/`voice_not_found`) as success, mirroring the Stripe `resource_missing` tolerance at
`actions.ts:206`. Confirm ElevenLabs' own retention/purge behavior on delete as a vendor fact. Then
either keep the "within 48 hours" copy (now truthful for our servers + a documented vendor purge) or
soften it — an owner/counsel call.

**Pick up when:** before the deletion/privacy copy is finalized for launch. Pairs with
`2026-07-12-privacy-copy-claims-e2e-encryption-but-audio-is-plaintext`. Note the existing
per-file follow-ups on the teardown ordering (FU-86) and the 1000-object storage-wipe cap (FU-95) touch
the same function — batch them.
