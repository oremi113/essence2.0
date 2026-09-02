---
id: 2026-07-12-no-affirmative-consent-gate-before-voice-cloning
priority: P2
status: open
opened: 2026-07-12
resolved:
owner_paired: true
summary: No affirmative consent gate before ESSENCE creates a synthetic voice clone — only a passive "I understand" on a privacy screen; no "I consent to processing my voice to create a synthetic voice" checkbox *(legal questionnaire 2026-07-12)*
---

# No affirmative consent gate before synthetic-voice creation

*(legal questionnaire 2026-07-12 — see `docs/legal/2026-07-12-legal-questionnaire-code-findings.md` §1.4)*

ESSENCE builds an AI clone of the user's voice (`src/lib/elevenlabs.ts` → `POST /v1/voices/add`), but
there is **no explicit consent-to-clone gate** before it happens. The closest surface is the privacy
screen, which ends with a passive **"I understand"** button acknowledging ESSENCE's *promises*
(`src/components/screens/onboarding/Screen4.tsx:50`) — not an affirmative authorization to create a
synthetic voice. The voice-profile creation form
(`src/components/voice/VoiceProfileCreateForm.tsx:92-222`) collects name/relationship/city/birth-year
only; its submit button reads "Start Voice Training" (`:219`). There is no consent checkbox and no
"I consent / I authorize" copy anywhere in the record or voice-creation flow.

**Why it matters:** voice is biometric data. Creating a synthetic clone without a recorded, affirmative,
specific consent is exposure under biometric-privacy regimes (e.g. Illinois BIPA, GDPR Art. 9) and is
also what ElevenLabs' own terms require the platform to obtain from the voice's owner. A passive
"I understand" on a marketing screen is unlikely to satisfy "express consent."

**Fix shape (owner decides wording, then code):** add an affirmative, separately-recorded consent gate
immediately before clone creation — a required checkbox on the voice-profile form
(`VoiceProfileCreateForm.tsx`) or a dedicated step gating `/api/voice-profiles/[id]/start`, e.g.
"I consent to ESSENCE and its service providers processing my voice recordings to create and operate my
personalized synthetic voice." Persist the consent (timestamp + copy version) so it's auditable — a new
column on `voice_profiles` or a `consents` row — rather than relying on a transient client checkbox.
Gate `/start` on its presence server-side.

**Pick up when:** before launch, alongside the Terms/consent authoring pass. Pairs with
`2026-07-12-no-ownership-impersonation-attestation-before-cloning` (same gate can carry both
affirmations). This is a build item, not just copy — the consent surface does not exist today.

**Update 2026-07-12 (same day): server scaffold landed, flag-OFF.** Mirroring the FU-22 pattern, the
copy-independent guard is now built and inert: `VOICE_CONSENT_REQUIRED` flag (default OFF,
`src/lib/feature-flags.ts`), `ErrorCode.CONSENT_REQUIRED`, `assertVoiceConsent()`
(`src/lib/voice-creation/consent.ts`) wired into `POST /api/voice-profiles` after body parse, unit-tested
both arms (`tests/unit/voice-consent-gate.test.ts`). **Remaining before flip:** (1) counsel provides the
exact `consentToClone` + `ownershipAttested` strings; (2) build the capture UI checkboxes on
`VoiceProfileCreateForm.tsx` (needs the flag exposed client-side, e.g. via a page prop or `NEXT_PUBLIC_`)
so the form actually sends the two flags; (3) decide durable audit-grade storage for the consent record
(a `usage_events` consent event is migration-free; a dedicated column/table is stronger) — today the
guard only enforces presence; (4) flip `VOICE_CONSENT_REQUIRED=true`. Do NOT flip before (2) or every
voice creation 422s.

**✅ Update 2026-07-14: gate built, wired, flag flipped (local), owner-approved.** The capture UI now
exists — two required checkboxes on `VoiceProfileCreateForm.tsx` (the sole `/api/voice-profiles` create
surface, rendered by the record page) that collect + send `consentToClone` + `ownershipAttested`;
client-side submit is blocked until both are checked, server enforces via `assertVoiceConsent`.
`VOICE_CONSENT_REQUIRED=true` set in `.env.local`. Verified: 4 component tests
(`tests/unit/voice-profile-create-form.test.tsx`, renders + blocks + sends flags) + a browser screenshot
of the blocked state. **Remaining (small):** (a) set `VOICE_CONSENT_REQUIRED=true` in **Vercel production
env** (local flag ≠ prod); (b) final attorney pass on the exact checkbox wording — a cheap string swap,
the mechanism is done. Consider moving from "enforce presence" to a durable audit record (a
`usage_events` consent event or a column) if legal wants proof-of-consent per user. Effectively resolved
pending the prod-env flip + wording sign-off.
