---
id: 2026-07-12-no-ownership-impersonation-attestation-before-cloning
priority: P3
status: open
opened: 2026-07-12
resolved:
owner_paired: true
summary: Nothing requires the user to attest the voice is their own / that they aren't impersonating another living or deceased person; no ToS, no ownership certification, no technical voice-identity check *(legal questionnaire 2026-07-12)*
---

# No ownership / anti-impersonation attestation before cloning a voice

*(legal questionnaire 2026-07-12 — see `docs/legal/2026-07-12-legal-questionnaire-code-findings.md` §5)*

There is no attestation that the recorded voice belongs to the user or that they have the right to clone
it. Training capture is live-mic-only (`src/components/audio/RecordingUpload.tsx:168-169`,
`getUserMedia` + `MediaRecorder`; no audio file-upload path exists), but nothing prevents a user from
holding the mic to another person or playing another recording into it, and there is **no speaker
verification, liveness check, "I confirm this is my own voice," or "I am not impersonating another
living or deceased person" gate** anywhere in onboarding, the record flow, or sign-in. The upload guard
checks only DB-row ownership + a clip-count cap (`src/lib/guards.ts:160-172`). No Terms of Service or
Acceptable-Use document exists in the repo to carry such a representation
(`git ls-files` for terms/privacy/legal returns only `PrivacyPromiseModal.tsx`).

**Why it matters:** the product's "voice keepsake / for someone you love" framing
(`src/components/screens/RecordScreen.tsx:267`) is compatible with users wanting to preserve a *dying
relative's* voice, and a synthetic clone of a third party (living or deceased) without authorization is
a right-of-publicity / impersonation / potential deepfake-statute exposure. Today the product neither
permits-by-policy nor forbids it — it's simply silent, which is the worst position legally.

**Fix shape (owner decides intended-use policy, then code):**
1. **Owner/legal:** decide whether cloning a non-account-holder's voice is an intended use case and
   under what authorization. This is the load-bearing decision.
2. **Code:** add a required attestation at the same gate as the consent checkbox
   (`2026-07-12-no-affirmative-consent-gate-before-voice-cloning`) — e.g. "This is my own voice, or I
   have the explicit authorization of the person (or their estate) to create this voice," recorded and
   persisted with the consent record. Gate `/api/voice-profiles/[id]/start` on it. There is no technical
   voice-identity verification and none is proposed here — the attestation is the proportionate control.
3. Fold the corresponding prohibition into the (unbuilt) Terms/AUP.

**Pick up when:** with the Terms/consent authoring pass, before launch. Cheapest to build together with
the consent gate — one surface, two affirmations.
