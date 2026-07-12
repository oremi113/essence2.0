---
id: 2026-07-12-privacy-copy-claims-e2e-encryption-but-audio-is-plaintext
priority: P2
status: open
opened: 2026-07-12
resolved:
owner_paired: true
summary: Onboarding copy promises "end-to-end encryption" / "not even our team can access" but audio is stored as plaintext and a service-role key can read any user's recordings *(legal questionnaire 2026-07-12)*
---

# Privacy copy claims end-to-end encryption, but recordings are plaintext the server can read

*(legal questionnaire 2026-07-12 — see `docs/legal/2026-07-12-legal-questionnaire-code-findings.md` §4)*

The shipping onboarding copy makes an encryption promise the code does not keep:
- `src/components/screens/onboarding/Screen4.tsx:36` — "Protected with **end-to-end encryption**."
- `src/components/screens/onboarding/PrivacyPromiseModal.tsx:56-59` — "Your recordings are
  **encrypted the moment they leave your device**… **Not even our team can access them.**"

In reality there is **no application-level or client-side encryption** anywhere. No crypto library is
in `package.json` (no libsodium/tweetnacl/openpgp/jose) and no `crypto.subtle`/WebCrypto usage touches
audio. Recordings are stored as plaintext webm/mp3 objects in the `essence-audio` Supabase bucket
(`src/lib/audio/storage-paths.ts:7`), and the server holds the Supabase **service-role key**
(`src/lib/supabase/service.ts:8-15`) which bypasses RLS and is actively used to `.download()` raw
clips (`src/lib/voice-creation/download-clips.ts:56-58`, `src/app/api/audio/commit/route.ts:52`) and
mint signed URLs (`src/app/api/audio/playback-url/route.ts:57-59`). Raw clips are also transmitted to
ElevenLabs. So both "end-to-end encryption" and "not even our team can access them" are false as
written — an operator with the service-role key (and the server itself) can read the audio.

**Why it matters:** these are affirmative security representations to users about their most sensitive
data (their voice). A claim of E2E encryption that isn't implemented is a material misstatement — the
class of thing that draws regulatory and plaintiff attention precisely because the promise is stronger
than the reality. This is a launch-blocking accuracy problem for the privacy surface.

**Fix shape (owner decision, then code):** pick one —
- **(a) Correct the copy** to the defensible truth: "encrypted in transit and at rest; access is
  restricted to you; ESSENCE personnel don't access your recordings in the ordinary course." Cheapest,
  and honest. Edit `Screen4.tsx:36` and `PrivacyPromiseModal.tsx:56-59` (+ the prototype source at
  `prototypes/onboarding-flow.html:1997`). *Or*
- **(b) Actually build client-side encryption** so the E2E claim becomes true — a large effort
  (client-held keys, encrypt-before-upload, and it fundamentally conflicts with sending plaintext audio
  to ElevenLabs for cloning, which would have to be reworked). Almost certainly not worth it for MVP.

Recommend (a). Also note the questionnaire quotes "not even our team can **listen**"; the real string
is "**access**" — reconcile the wording with counsel.

**Pick up when:** before the privacy/legal copy is finalized for launch — this gates the Privacy
Promise going live. Pairs with the deletion-promise follow-up
(`2026-07-12-account-deletion-never-deletes-the-elevenlabs-voice-clone`).
