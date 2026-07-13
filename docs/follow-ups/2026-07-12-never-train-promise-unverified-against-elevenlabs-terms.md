---
id: 2026-07-12-never-train-promise-unverified-against-elevenlabs-terms
priority: P2
status: open
opened: 2026-07-12
resolved:
owner_paired: true
summary: "We will never use your recordings to train AI models" is unsubstantiated by code — nothing configures ElevenLabs for zero-retention/no-training; depends entirely on the account tier + DPA *(legal questionnaire 2026-07-12)*
---

# "Never used to train AI models" promise is unverified against ElevenLabs' terms

*(legal questionnaire 2026-07-12 — see `docs/legal/2026-07-12-legal-questionnaire-code-findings.md` §1.6)*

`src/components/screens/onboarding/PrivacyPromiseModal.tsx:72-77` — "We will **never** use your
recordings to train AI models. Not ours. Not anyone else's." Raw recordings are transmitted to
ElevenLabs for instant voice cloning (`src/lib/elevenlabs.ts` → `POST /v1/voices/add`). Nothing in the
repo substantiates the "not anyone else's" half: the only ElevenLabs config is the API key
(`.env.example` `ELEVENLABS_API_KEY`) and the two request bodies. There is **no zero-retention header,
no enterprise/privacy-mode flag, no `do_not_train`/`data_retention` parameter, and no DPA reference**
anywhere. Whether ElevenLabs trains on or retains the uploaded audio is entirely a function of the
ElevenLabs **account tier + Data Processing Agreement** — which lives outside this codebase.

**Why it matters:** the promise makes a representation about a *third party's* use of user voice data
that the app cannot currently back up. If ElevenLabs' default tier reserves any right to use inputs for
model improvement, the promise is false through no code fault. This is the kind of downstream-vendor
claim that must be contractually true, not assumed.

**Fix shape (owner + code):**
1. **Owner/legal:** confirm against the actual ElevenLabs agreement that inputs are not used for
   training and get the retention terms in writing (zero-retention / enterprise DPA if needed). This is
   the load-bearing step.
2. **Code (if ElevenLabs offers an opt-out signal):** set whatever zero-retention/no-training header or
   flag ElevenLabs exposes on the `/voices/add` and `/text-to-speech` calls in `src/lib/elevenlabs.ts`,
   and document the account tier in `.env.example` / a `docs/` note so the promise is traceable to a
   config, not folklore.
3. If the terms can't support "not anyone else's," soften the copy with counsel.

**Pick up when:** before the privacy copy is finalized for launch — this is a hard dependency on the
ElevenLabs contract. Same vendor-verification bucket as the deletion-purge question in
`2026-07-12-account-deletion-never-deletes-the-elevenlabs-voice-clone`.

**Update 2026-07-12 (same day): copy softened interim.** The `PrivacyPromiseModal.tsx` proof line
"Not ours. Not anyone else's." → "Not to build a product. Not to sell you anything." — this drops the
unverified third-party absolute while keeping the commitment.

**Update 2026-07-12 (ElevenLabs terms read live):** the vendor picture is now concrete (see the rewritten
`docs/legal/2026-07-12-vendor-terms-confirmation-checklist.md` §"three findings"). ElevenLabs' published
[Privacy Policy](https://elevenlabs.io/privacy-policy) states they **train on inputs BY DEFAULT** on
non-Enterprise tiers, with a **prospective-only opt-out** in account Settings → "Data use". So the promise
is **false unless ESSENCE opts out**, and even then only for audio sent after the opt-out. **The fix is a
self-serve dashboard toggle, not a legal email** (profile icon → Terms and privacy → Data use → "Improve
the models for everyone" OFF). A binding contractual training-off term is Enterprise-only (Sales).

**✅ Update 2026-07-12: opt-out DONE (Starter tier, pre-launch).** The owner flipped the Data-use toggle
off. Because it's prospective-only and no real users exist yet, essentially all production audio is
covered → the "never use your recordings to train AI models" commitment is now substantively TRUE. Kept
**open** for one narrow reason only: counsel to (a) bless whether to restore the stronger "not anyone
else's" proof wording (now defensible — ESSENCE opted out + ElevenLabs bars its LLM subprocessors from
training), and (b) confirm no separate opt-out is needed if the account later moves to a higher tier
(the choice is account-level, not plan-gated, so it should persist).
