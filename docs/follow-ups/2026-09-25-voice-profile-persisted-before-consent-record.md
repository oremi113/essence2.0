---
id: 2026-09-25-voice-profile-persisted-before-consent-record
priority: P2
status: open
opened: 2026-09-25
resolved:
summary: `POST /api/voice-profiles` inserts the voice_profiles row BEFORE writing the durable consent record, and `/start` (where the clone is actually created) never re-checks that record exists — so a failed consent write leaves a profile that can still be cloned with no consent evidence, the exact invariant the code's own comment claims it guarantees *(triage 2026-09-25)*
---

# Voice profile is persisted before its consent record, and `/start` never verifies the record — a clone can exist with no consent evidence

*(triage 2026-09-25 — deep read of the Compliance-Pack consent-persistence wiring)*

`src/app/api/voice-profiles/route.ts:124-171` orders the two writes wrong for the
invariant it is trying to hold:

1. Lines 124-133: insert the `voice_profiles` row (`status: "collecting"`) and
   return 500 if it fails.
2. Lines 155-171: **only then** write the durable `voice_consent_records` row via
   `checkedWrite`, which throws (→ 500) on failure.

The docstring at lines 149-154 states this ordering ensures "a lost consent
record surfaces loudly rather than leaving a clone with no evidence behind it."
The code does the opposite: if the consent `checkedWrite` throws, the
`voice_profiles` row is **already committed**. Nothing rolls it back. The result
is a `collecting` profile with no matching consent record — precisely the state
the comment says is impossible.

That orphaned profile is not harmless, because **consent is never re-checked
where the clone is actually created.** `src/app/api/voice-profiles/[id]/start/route.ts`
(the route that calls ElevenLabs and bills for the clone) contains no `consent`
check at all — grep confirms zero references. The `VOICE_CONSENT_REQUIRED` gate
(`src/lib/voice-creation/consent.ts:38`) runs only at request time in the *create*
route, validating the request-body booleans, not the persisted record. So the
sequence is: gate passes on the request values → profile created → durable proof
write fails → user records clips → `/start` clones the voice — with no consent
evidence on file and no reconciliation anywhere.

Today this is latent because `VOICE_CONSENT_REQUIRED` defaults OFF, but the
consent follow-up (`2026-09-01-wire-voice-consent-persistence`) records that the
persistence is "wired" and the only remaining step is the owner flipping the flag
on for beta. This ordering flaw is inside that wiring and is not noted there —
the moment the flag flips, the evidence guarantee is load-bearing and this gap
becomes real.

Secondary: the `voice_profiles` insert at line 124 is an unconditional
`.insert()` with no idempotency key and no unique constraint on `user_id`, so a
500 here (or a double-tap of the create form) forks a second `collecting`
profile. This is the same *class* as the already-logged
`2026-07-17-getorcreatevoiceprofile-race-creates-duplicate-profiles` /
`2026-08-04-voice-profile-lookup-missing-order`, but a distinct site (the
card-capture create route, not `getOrCreateVoiceProfile`). Fold it in when this
ordering fix lands.

**Why it matters:** ESSENCE's promise is that it never begins preserving a voice
without a signed consent record on file. A momentary database hiccup while saving
that record leaves the voice half-created and cloneable with the consent
paperwork missing — the one thing that was supposed to be guaranteed — and the
app reports only a generic error, so nobody knows the proof was lost.

**Fix shape:** write the consent record **before** the `voice_profiles` insert
(or in the same RPC/transaction), or delete the just-created profile if
`checkedWrite` throws so the two can never be observed disagreeing. Separately,
have `/start` fail closed when `VOICE_CONSENT_REQUIRED` is on and no consent
record exists for the profile, so a lost record blocks the billed clone instead
of letting it through. Make the create idempotent (reuse an existing `collecting`
profile / accept a client idempotency key) in the same pass.

**Pick up when:** before `VOICE_CONSENT_REQUIRED` is flipped on for beta — this is
the gate that makes the invariant matter. Compliance-sensitive; worth an owner
heads-up even though the files themselves are not on the never-touch list.
