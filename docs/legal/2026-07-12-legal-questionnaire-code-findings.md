# ESSENCE — Legal Questionnaire: Code-Grounded Findings

**Prepared:** 2026-07-12
**Purpose:** Answer the attorney's Terms/Privacy questionnaire with what the **actual codebase** does, versus what is a **business/policy decision** for the owner + counsel. Every factual claim is cited to `file:line`.

**How to read this doc**
- **"Code answer:"** = verified from source, with citations. Treat as fact about the shipping product.
- **"⚠️ Policy / not in code:"** = the code cannot answer this; it is a decision for the owner and attorney. We did **not** invent a position.
- **"⚠️ Vendor fact:"** = depends on a third-party contract/config (ElevenLabs, Supabase, Vercel, Stripe) not visible in the repo. Must be confirmed against the vendor agreement/dashboard.

---

## 0. Read this first — the highest-stakes findings

These are the items where the **current marketing/policy copy contradicts the code**, or where the owner's stated assumptions are wrong. Fix these before any Terms/Privacy language is finalized.

1. **No end-to-end encryption exists.** Recordings are stored as **plaintext** audio in Supabase Storage. The server holds a Supabase **service-role key** that can download or sign a URL for **any** user's raw audio. The onboarding copy "**Protected with end-to-end encryption**" (`Screen4.tsx:36`) and "**encrypted the moment they leave your device… Not even our team can access them**" (`PrivacyPromiseModal.tsx:57`) are **not true as written**. (§4)

2. **The exact promised wording differs from the code.** The questionnaire quotes "*Not even our team can listen*," but the shipping copy says "*Not even our team can **access***" (`PrivacyPromiseModal.tsx:57`). Minor, but the attorney should work from the real string. (§1, §4)

3. **The AI voice clone is NEVER deleted from ElevenLabs.** Account deletion wipes ESSENCE's own database + Supabase Storage, but there is **no `DELETE /v1/voices/{id}` call anywhere in the repo**. After deletion the app even discards the `vendor_voice_id`, so the clone becomes an **un-addressable orphan on ElevenLabs' servers**. This directly contradicts "*your voice is permanently gone from our servers within 48 hours*" (`PrivacyPromiseModal.tsx:81-84`). (§1.5, §8.2)

4. **"Within 48 hours" is not what the code does.** Local deletion is **immediate and synchronous** (no 48h job, no cron, no grace period). The only thing that could take up to 48h+ is Supabase **backups/PITR**, which are not addressed in code and likely retain data *longer* than 48h. (§8)

5. **"We will never use your recordings to train AI models" is unsubstantiated by the code.** Nothing in the repo configures ElevenLabs for zero-retention / no-training. Whether this promise holds depends **entirely on the ElevenLabs account tier + DPA**, which must be confirmed. (§1.6)

6. **The pricing you gave us does not match the code.** The code has **one product — "Voice Vault"** — at **$12.99/month or $119/year** with a **7-day trial**. There is **no $19.99 "Legacy" tier and no $29.99 "Guardian" tier** anywhere. "Legacy" = a message category + a waitlist; "Guardian" = a code comment about a future feature. If a 3-tier ladder is the plan, it is **not built**. (§9)

7. **Nothing is ever delivered to a recipient — the entire posthumous/"legacy message" system is UNBUILT.** No email/SMS provider is installed. A "recipient" is a **private label (name + relationship only, no contact info)** inside the creator's own vault. There is no scheduling, no death verification, no release trigger, no delivery of any kind. Messages are played back **only by the creator**. This is the central gap between what the branding implies and what the product does. (§6, §7)

8. **No Terms of Service, Acceptable-Use, or Privacy Policy document exists in the repo.** The only "policy" artifact is a 3-bullet marketing **Privacy Promise** modal. No prohibited-use language, no impersonation clause, no estate/will disclaimer, no company entity, no governing law/venue. All must be authored from scratch. (§5, §7.7, §13, §14)

9. **No consent gate before voice cloning.** The closest thing is a passive "**I understand**" button on a privacy screen (`Screen4.tsx:50`). There is **no** affirmative "I consent to create a synthetic voice" checkbox, and **no** attestation that the voice is the user's own / not an impersonation. (§1.4, §5.2)

---

## 1. Voice: storage, generation, consent, deletion, training

### 1.1 Does ESSENCE store the ElevenLabs voice ID?
**Code answer: Yes.** The voice id returned by ElevenLabs `/voices/add` is persisted as `voice_profiles.vendor_voice_id`.
- Returned: `src/lib/elevenlabs.ts:97-102`. Persisted: `src/lib/voice-training/persistVoiceReady.ts:33-36`. Column: `src/lib/supabase/types.ts:604`. Read back for TTS: `src/app/api/messages/generate/route.ts:350`.
- The stored id is removed only in a **full-account teardown** (`src/app/app/settings/actions.ts:237`). There is no path that deletes it on its own.

### 1.2 Can users generate new audio in their cloned voice from typed text?
**Code answer: Not arbitrary/verbatim text.** Generation is a **hybrid template + constrained-LLM** pipeline. The user's only free-text input is an optional **≤200-character "personal note"** (`PersonalNoteScreen.tsx:36`), which is **reinterpreted by Claude Haiku into a <40-word segment and explicitly NOT echoed verbatim** (`src/lib/messages/insert.ts:42`). The rest of the message is fixed template text (`src/lib/messages/generation.ts:75-132`). Users can regenerate subject to rate caps (`generate/route.ts:183-185`), but cannot get arbitrary typed text spoken word-for-word.

### 1.3 Conversational, or listen-only?
**Code answer: Listen-only (one-way, pre-generated).** The only ElevenLabs endpoints used are `/v1/voices/add` (clone) and `/v1/text-to-speech/{voice_id}` (batch TTS → finished MP3). No conversational-AI, WebSocket, streaming, or agent feature exists (`src/lib/elevenlabs.ts:66,161-207`). Recipients — if delivery existed — would only listen to a pre-generated message. It cannot hold a two-way conversation.

### 1.4 Express consent before creating the synthetic voice?
**Code answer: No explicit consent-to-clone gate exists.** The onboarding privacy screen ends with a passive "**I understand**" button (`Screen4.tsx:50`) acknowledging privacy *promises* — not an affirmative authorization to create a voice clone. The voice-profile creation form collects name/relationship/city/birth-year only, with **no consent checkbox and no "I consent/authorize" copy** (`VoiceProfileCreateForm.tsx:92-222`; submit button "Start Voice Training" `:219`).
> ⚠️ **Policy / not in code:** Whether an "I understand" acknowledgement is legally sufficient consent for biometric/voice-clone creation (BIPA, GDPR, ElevenLabs' own required-consent terms) is a legal determination. If an affirmative "I consent to ESSENCE and its service providers processing my voice recordings to create and operate my personalized synthetic voice" checkbox is wanted, it must be **built** — it does not exist.

### 1.5 Can a user delete the synthetic voice separately?
**Code answer: No.** There is no standalone delete-voice endpoint or UI (the voice-profile routes expose no `DELETE` handler; Settings offers only "Delete account" — `SettingsScreen.tsx:654`). And crucially, **neither the account teardown nor anything else calls ElevenLabs to delete the clone** — `src/lib/elevenlabs.ts` has no delete function and there is no `DELETE /v1/voices/{id}` anywhere. The teardown deletes the Stripe sub, Supabase Storage objects, and local DB rows only (`actions.ts:189-241`).
> ⚠️ **Vendor gap:** The cloned voice persists on ElevenLabs after the user's data and the local `vendor_voice_id` are gone — an orphan the app can no longer even identify. Contradicts the "permanently gone from our servers" promise.

### 1.6 Is ElevenLabs configured to not train on / not retain the audio?
**Code answer: No evidence in the repo.** The only ElevenLabs config is the API key + two request bodies. No zero-retention header, no enterprise/privacy-mode flag, no `do_not_train`/`data_retention` parameter, no DPA reference. `.env.example` defines only `ELEVENLABS_API_KEY=`.
> ⚠️ **Vendor fact — must confirm:** The promise "We will never use your recordings to train AI models, ours or anyone else's" is **not substantiated by code**. It depends entirely on the ElevenLabs account tier + DPA/contract. Verify before relying on the promise.

### 1.7 Where the promised copy actually lives (for the attorney to edit)
Production (ships): `src/components/screens/onboarding/PrivacyPromiseModal.tsx`
- `:52` "Your voice belongs to you. Full stop."
- `:56-59` "Your recordings are encrypted the moment they leave your device… **Not even our team can access them.**" *(word is "access," not "listen")*
- `:65-69` "We will **never** sell your voice data. Not to advertisers. Not to researchers. Not to anyone."
- `:72-77` "We will **never** use your recordings to train AI models. Not ours. Not anyone else's."
- `:80-84` "If you delete your account, your voice is **permanently gone** from our servers **within 48 hours**."
- `Screen4.tsx:23-34` three "never" promises; `Screen4.tsx:36` "Protected with **end-to-end encryption**."

Source prototype: `prototypes/onboarding-flow.html:1599,1992,1997,2010,2019-2020`.

---

## 4. Recordings: encryption & administrator access

**Bottom line: there is no application-level or client-side encryption of audio. Not E2E.**

### 4.1 E2E, or only in transit / at rest?
**Code answer: Only TLS-in-transit + vendor at-rest. No client-side/E2E encryption.** No crypto libraries in `package.json` (no libsodium/tweetnacl/openpgp/jose); no `crypto.subtle`/WebCrypto usage on audio. The server **downloads the plaintext blob** to validate size and to ship to ElevenLabs (`src/app/api/audio/commit/route.ts:52,59`), proving it can read the bytes. Audio lives as plaintext objects in the `essence-audio` bucket (`src/lib/audio/storage-paths.ts:7`). The "encrypted the moment they leave your device" / "end-to-end encryption" copy is **not supported by the code**.

### 4.2 Can an administrator technically retrieve raw audio?
**Code answer: Yes.** The server holds the Supabase **service-role key** (`src/lib/supabase/service.ts:8-15`), which bypasses row-level security, and uses it to `.download()` clips (`src/lib/voice-creation/download-clips.ts:56-58`, `audio/commit/route.ts:51-52`) and mint signed URLs (`audio/playback-url/route.ts:57-59`). Raw clips are also transmitted to **ElevenLabs** (`src/lib/elevenlabs.ts`). **Zero-access is not literally true** — the accurate statement is "authorized personnel/server processes technically *could* access recordings; no employee does so in the ordinary course."

### 4.3 Is access governed by RLS? Does service-role bypass it?
**Code answer: Tables have owner-scoped RLS (`db/schema.sql:82-98`), but all Storage reads use the RLS-bypassing service-role client.** Product routes do enforce `row.user_id === user.id` in code before signing (`playback-url/route.ts:46`) — good defense-in-depth — but the object store itself is protected by app code + service-role, not Storage RLS (no `storage.objects` policy exists in any migration; bucket privacy is set in the Supabase Dashboard — `supabase/migrations/20260418_add_avatar_storage.sql:7-8`).

### 4.4 Do logs/monitoring/analytics capture audio or transcripts?
**Code answer: No.** The logger explicitly forbids logging audio/PII (`src/lib/logger.ts:4-8,28`); audio events log only IDs and byte sizes. No Sentry/Datadog/LogRocket/PostHog SDK present.
> ⚠️ **Vendor fact:** Whether Vercel's function/request logs or ElevenLabs' logs retain audio is vendor-side, not in this repo.

### 4.5 In transit vs at rest
**Code answer:** All vendor calls are HTTPS. But there is **no HSTS/security-header config** in the repo (`next.config.ts` has no `headers()`; no `vercel.json`) — HTTPS enforcement relies on the platform default.
> ⚠️ **Vendor fact:** Supabase encrypts at rest by default (disk-level, NOT E2E — the platform can still read plaintext). Bucket privacy is set in the dashboard; confirm `essence-audio` is actually private in the live project.

### Defensible rewrite (for counsel)
"Recordings are encrypted in transit and at rest, and access is restricted to you; ESSENCE personnel do not access your recordings in the ordinary course of business." **Not:** "end-to-end encryption" / "not even our team can access them."

---

## 5. Recording ownership & permissions

### 5.1 Arbitrary upload, or live-mic only?
**Code answer: Live-microphone capture only.** Training audio is recorded via `getUserMedia` + `MediaRecorder` (`src/components/audio/RecordingUpload.tsx:168-169`, `RecordScreen.tsx:294`). The server forces the extension to `webm` and ignores the client mime. The **only** `<input type="file">` in the app is the onboarding **avatar image** picker, restricted to images (`Screen10.tsx:107-108`). There is **no audio file-upload path**. Users read scripted prompts 1..25 aloud (`src/lib/voice-training/script.ts:9`).

### 5.2 Any attestation the voice is the user's / not impersonation?
**Code answer: None.** No "I confirm this is my own voice," no "I am not impersonating another living or deceased person," no terms-acceptance checkbox anywhere in onboarding, record flow, or sign-in. Marketing copy asserts ownership rhetorically ("Your voice is yours alone," `Screen1.tsx:14`) but asks for no confirmation.

### 5.3 Technical restriction preventing cloning someone else's voice?
**Code answer: None.** No speaker verification, biometric matching, or liveness check. The upload guard checks only DB-row ownership + a clip-count cap (`src/lib/guards.ts:160-172`). Any audio the mic hears (including another person, or another device played into the mic) is accepted.

### 5.4 Copyrighted music/speeches/audiobooks? Content restrictions?
**Code answer: No direct upload channel, and no moderation/copyright/duration checks.** No content filtering anywhere; no max-duration auto-stop; the 50 KB body cap guards only JSON metadata, not the audio (audio PUTs directly to Supabase via signed URL). Only structural limits: prompt order 1..25 and ~30 clips/profile (`src/lib/rate-limit.ts:27`).

### 5.5 Existing ToS/AUP language on ownership/impersonation/third-party content?
**Code answer: No ToS or AUP exists in the repo.** `git ls-files` for terms/privacy/legal returns only `PrivacyPromiseModal.tsx`. No `/terms` or `/privacy` route source.
> ⚠️ **Policy / not in code:** Whether to require an ownership/rights attestation, prohibit third-party-voice cloning (living or deceased) without authorization, and add copyright/moderation controls are all **unmade decisions**. Note the "voice keepsake / for someone you love" framing (`RecordScreen.tsx:267`) is compatible with users wanting to preserve a *dying relative's* voice — worth an explicit intended-use decision.

---

## 6. Recipients & message delivery

**Bottom line: there is no delivery mechanism to recipients at all. A "recipient" is a private label in the creator's vault.**

### 6.1 How does a recipient receive a message?
**Code answer: There is no recipient-facing receive path.** No email/SMS provider is installed (`package.json` has no resend/nodemailer/sendgrid/twilio/postmark). Audio is played **only by the authenticated creator** via an owner-gated, short-lived signed URL (`src/app/api/messages/[id]/play/route.ts:15-39`, `.eq("user_id", user.id)`). No delivery/release/scheduled routes, **no `vercel.json` crons**, **no `supabase/functions/`**. Scheduling was explicitly **deferred** (`supabase/migrations/20260421140000_...:7-8`). *(The one Twilio reference is Supabase Auth login OTP and is disabled — `config.toml:238`.)*

### 6.2 Does the recipient need an ESSENCE account?
**Code answer: Moot — recipients have no view surface at all.**
> ⚠️ **Policy / not in code:** An unmade decision once delivery is designed.

### 6.3 What recipient information is collected?
**Code answer: Only a display name + optional relationship label + optional internal note. No contact info of any kind.** Schema `db/schema.sql:41-48` and `supabase/migrations/20260213133000_...:227-239`: fields are `id, user_id, name (required), relationship (optional), notes (optional), status (active/archived), created_at, updated_at`. **No email, phone, address, birthday, or delivery-instructions column.** `recipient_id` on a message is nullable + `on delete set null` (`db/schema.sql:105`) — a soft label, not a delivery target.

### 6.4 Does ESSENCE contact a recipient before death/release?
**Code answer: No — ESSENCE never contacts a recipient at any time.** No capability and no contact data to do so.

### 6.5 Can a user name someone without their consent? Double opt-in?
**Code answer: Yes, anyone can be named with zero consent; there is no consent/opt-in mechanism** (creating a recipient needs only a `name`; RLS checks only creator ownership — `db/schema.sql:57-60`). Note: nothing is currently sent to the named person regardless.

### 6.6 Can recipients download/save/forward/screen-record/share?
**Code answer: Recipients have no access, so N/A today.** For the creator, playback is a short-lived Supabase signed URL to a **plain MP3** — **no DRM, no anti-forward/anti-screen-record control** (`messages/[id]/play/route.ts:45`; training clips 120s expiry `audio/playback-url/route.ts:14`).
> ⚠️ **Policy / not in code:** If delivery is later built as "emailed link to an MP3" (the architecture's likely shape), the delivered file is a durable copy the recipient fully controls unless DRM is deliberately added.

### 6.7 Can ESSENCE delete every copy after a recipient receives it?
**Code answer: N/A today (nothing is delivered).**
> ⚠️ **General fact for the policy:** Once any download-based delivery exists, ESSENCE **cannot** revoke/delete a recipient's local copy. The Terms should state that deleting content from ESSENCE does not remove copies already downloaded, saved, recorded, or shared.

---

## 7. Death, incapacity & release triggers

**Headline: there is NO legacy-message release system in the codebase. Nothing is ever released, scheduled, or delivered — to anyone, alive or after death.** This is an explicit, documented product decision, not an oversight.
- `docs/DECISIONS.md:50-57` — "Will NOT build in MVP": scheduling/occasion reminders, message-delivery workflows (email/SMS/notifications), background jobs/cron.
- `supabase/migrations/20260421140000_...:7-8` — "scheduled_for column was considered and deferred. V1 has no scheduling feature."

### 7.1 What triggers release/delivery?
**Code answer: Nothing.** No cron, dead-man's-switch, inactivity timer, death verification, trusted-contact confirmation, or scheduled delivery. The `messages` table has no `scheduled_for`/`release_at`/`delivered` column; the status enum is `generating/saving/saved/failed/unavailable` (no `released`/`delivered`). "Legacy" in the code = a future **paywall tier / waitlist** (`legacy_waitlist`, a demand-validation email list) or a **retired route** (`messages/new/page.tsx:5`) — never posthumous delivery.

### 7.2 How is death verified?
**Code answer: Not at all.** No death/incapacity/posthumous logic exists.

### 7.3 One trigger vs multiple confirmations? / 7.4 Cancel or modify while alive? / 7.5 Automatic on trigger?
**Code answer: N/A — no delivery mechanism exists.** (Note: messages are **immutable after generation** by design — `docs/DECISIONS.md:58`, enforced by a DB trigger.)

### 7.6 Edge cases (false death report, incapacity, unverifiable death, dead/invalid recipient, refusal, dispute)
**Code answer: None handled — none can arise, because nothing reaches a recipient.** Recipients have no address (§6.3), so these are structurally out of scope today.

### 7.7 Any "not a will/trust/estate service/executor/fiduciary" disclaimer?
**Code answer: None exists anywhere in the repo.** No ToS, no estate/will/executor/fiduciary/probate language. Legal pages are tracked as owner-gated and unbuilt.
> ⚠️ **Policy / not in code — strongly recommended:** Add an explicit disclaimer that ESSENCE is not a will, trust, estate-planning service, executor, fiduciary, or digital estate custodian. Even without delivery, recipient-tagged messages may be *perceived* as bequests.

### 7.8 Legally-operative instructions (assets, passwords, crypto keys, funeral/medical/guardianship)?
**Code answer: No handling and no warnings, and no content controls.** Messages are free-form; nothing inspects or restricts content.
> ⚠️ **Policy / not in code:** Consider warning users not to rely on ESSENCE as the sole location for legally-important instructions. Note today such content simply sits in the user's own vault (never delivered), yet the "for the people you choose" framing (`PrivacyPromiseModal.tsx:58`) invites a delivery assumption that is currently false.

---

## 8. Account deletion & data retention

### 8.1 Implemented? 48-hour job?
**Code answer: Deletion is implemented but IMMEDIATE and synchronous — no 48h window, no delay job, no cron, no grace period.** Real path: `deleteAccountAction` (`src/app/app/settings/actions.ts:170`), runs teardown inline and returns only after every step confirms (`:247-248`). The "48 hours" phrase exists in exactly one place — the marketing modal (`PrivacyPromiseModal.tsx:81-84`) — and describes a backup/grace reality the **code does not implement**. *(A second path `DELETE /api/me` is internal-testing-only, triple-gated, disabled in production — `me/route.ts:32-60`.)*

### 8.2 What is actually removed?
| Data | Removed? | Evidence |
|---|---|---|
| Original recordings (training clips) | **Yes** | `essence-audio` storage wipe, `actions.ts:216-224` |
| Generated message audio | **Yes** | same bucket (`storage-paths.ts:33-38`) |
| Avatar/home photo | **Yes** | `profile-photos` wipe, `actions.ts:216` |
| **Synthetic voice MODEL on ElevenLabs** | **NO** | teardown never calls ElevenLabs; no delete fn in `src/lib/elevenlabs.ts` |
| Local ElevenLabs voice ID (`vendor_voice_id`) | Row deleted | `actions.ts:237` — but model orphaned (row above) |
| Transcripts / prompts | **Yes** | `messages.prompt` → rows deleted `actions.ts:235` |
| Recipient info | **Yes (cascade)** | `recipients … on delete cascade` `db/schema.sql:43` |
| DB rows (messages, training_clips, voice_profiles) | **Yes** | `actions.ts:234-237` |
| Analytics ledger (`usage_events`) | **Yes** | `actions.ts:234` + cascade |
| profiles/subscriptions/pending/entitlements/waitlist | **Yes (cascade)** | `auth.admin.deleteUser` `actions.ts:241` |
| **Stripe customer + payment/invoice history** | **NO** (sub only cancelled) | §8.4 |

### 8.3 Do backups retain data beyond 48h?
**Code answer: Not addressed in code (infra).**
> ⚠️ **Vendor fact:** Supabase daily backups + PITR retain deleted rows/objects for the configured window (commonly 7 days, up to 28+). Nothing scrubs backups. The "within 48 hours" copy cannot be substantiated for backups. Confirm the live project's retention setting.

### 8.4 Financial records retained?
**Code answer: Yes — deletion only cancels the subscription (`actions.ts:199`); it never deletes the Stripe customer, charges, or invoices.** Generally correct for tax/financial retention, but means transaction records **outlive** account deletion — state this in the policy.

### 8.5 Recovery/grace period?
**Code answer: None. Immediate and irreversible** — hard deletes + `auth.admin.deleteUser` in one pass (`actions.ts:216-241`). No soft-delete, no undo. (Stricter than the 48h copy implies for local data — but does not cover backups or the ElevenLabs model.)

### 8.6 Scheduled legacy messages on deletion?
**Code answer: N/A — no scheduling feature exists.** `legacy_waitlist` (marketing list) is cascade-deleted. Revisit if scheduled delivery is ever built.

---

## 9–10. Subscriptions, refunds, plans & limits

**One paid product — "Voice Vault" — two cadences. NOT a three-tier ladder.**

### 9.1 Plans, prices, billing interval
**Code answer:** `src/lib/vault.ts:36-50`:
- **Monthly: $12.99/mo** (`priceCents: 1299`)
- **Annual: $119/yr** (`priceCents: 11900`, "Save 24%")

Real Stripe price IDs come from env (`STRIPE_PRICE_ID_VAULT_MONTHLY` / `_ANNUAL`, `create-checkout-session.ts:176-179`); `.env.example` documents "$12.99 / $119.00 recurring." Checkout is `mode: 'subscription'` (`create-checkout-session.ts:191`).
> ⚠️ **Correction — your assumption is wrong:** There is **no $19.99 "Legacy" tier and no $29.99 "Guardian" tier** in the code. "Legacy" = message category + waitlist (`api/messages/waitlist/route.ts:2`); "Guardian" = a comment about a future non-user-voice feature (`voice-training/resolver.ts:171`). If a 3-tier ladder is intended, **it is unbuilt** — confirm the real price sheet.

### 9.2 Annual billing & free trial
**Code answer: Annual — yes ($119/yr). Free trial — yes, 7 days** (`create-checkout-session.ts:194-196`, `trial_period_days: 7`), **one-time / first-subscription only** (anti-abuse: `grantTrial = !priorSub`, lines 107-137).

### 9.3 Purchase channel
**Code answer: Stripe on the ESSENCE website only** (hosted Stripe Checkout + Customer Portal). **No Apple/Google in-app purchase** — zero StoreKit/Play Billing/IAP code.

### 9.4 Refunds, proration, cancellation
**Code answer:** Refunds — **none implemented** (would be manual in Stripe Dashboard). Cancellation — **end-of-period, not immediate** (`cancel-subscription/route.ts:55-57`, `cancel_at_period_end: true`; copy "keep access until <date>"). Proration — **none in code** (Stripe default via portal).

### 9.5 Access after expiry/cancellation
**Code answer: Mixed — new creation blocked, existing playback still works.** Saving new messages requires `{trial, active}` → else 403 `subscription_lapsed` (`messages/save/route.ts:32,97-101`). But **playback of already-saved messages is NOT subscription-gated** (`messages/[id]/play/route.ts` checks only ownership). No grace period, read-only mode, or auto-delete on lapse.
> ⚠️ **Policy / not in code:** Whether a lapsed user *should* keep playback, or be locked/deleted, is undecided in code. Confirm intended entitlement before promising anything.

### 9.6 Payment failure
**Code answer:** `invoice.payment_failed` → status `past_due` + attempt count (`webhook/handlers.ts:110-155`); retries are Stripe's native dunning; exhaustion → `lapsed`. Past-due keeps full access with a banner.

### 9.7 Free tier & limits
**Code answer: No free tier** — card/trial required before voice creation (`voice-creation/entitlement.ts:18-24`, "no free path"). Enforced limits: **3 lifetime saved messages** (`cost-controls.ts:51-53`, hard-enforced `messages/save/route.ts:104-112`); **1 voice profile** (product bullet, not a hard numeric cap); **30 training clips/profile** (`rate-limit.ts:26-28`); plus abuse caps (20 msg/day, 5 voice creations/day, 30 signed-URLs/min). **Not found/enforced:** recipient-count limit, recording-length limit, total-storage-bytes limit, scheduled-delivery limit.
> ⚠️ **Policy / not in code:** These are global constants for the single plan, not per-tier entitlements. Any tiered limits in marketing do not exist in code.

### 9.8 Delete content on limit-exceed or non-payment?
**Code answer: No automatic deletion.** Exceeding the 3-message cap **blocks new saves** (403); it deletes nothing. Lapse/cancel triggers no purge. Only user-initiated account deletion removes content.
> ⚠️ **Policy / not in code:** Any ToS clause reserving the right to delete after prolonged non-payment would describe *future/manual* capability, not current behavior.

---

## 11. Service providers & analytics

### 11.1 Providers actually wired
| Provider | Purpose | Evidence |
|---|---|---|
| **Supabase** | DB, auth (magic-link), storage | `@supabase/ssr`, `@supabase/supabase-js`; `.env.example` |
| **Stripe** | Subscriptions/payments | `stripe`, `@stripe/stripe-js`; `api/stripe/*` |
| **ElevenLabs** | Voice cloning + TTS (server-only) | `.env.example` `ELEVENLABS_API_KEY`; `docs/DECISIONS.md:8` |
| **Anthropic (Claude Haiku)** | LLM for the ≤200-char "personalized insert" | `@anthropic-ai/sdk`; `.env.example` |
| **Cloudflare Email Routing** | Forwards `help@essencevault.app` support inbox (not app-integrated) | `src/lib/config/support.ts:5` |
| **Vercel** | Hosting (inferred; no runtime SDK) | `.env.example`, `eslint-config-next` |

**No dedicated transactional-email provider and no SMS provider.** Auth emails (magic link, email-change) are sent by **Supabase Auth's built-in mailer** (`auth/sign-in/page.tsx:35`, `settings/actions.ts:97`).

### 11.2 Analytics/tracking
**Code answer: No third-party analytics/tracking SDK at all.** No GA, PostHog, Mixpanel, Meta Pixel, TikTok Pixel, Hotjar, Microsoft Clarity, Vercel Analytics, Sentry, Amplitude, or Segment. Analytics is **first-party only** — a custom client posts events to `/api/analytics` → Supabase `usage_events` (`src/lib/analytics/client.ts`, `api/analytics/route.ts`). Session id is a random UUID in **`sessionStorage`, not a cookie**; "No PII or content ever lives in context" (`analytics/context.ts:16`).

### 11.3 Cookies/tracking before login?
**Code answer: No.** `/api/analytics` is `auth: true` (every event needs an authenticated user). Landing page and root layout load no scripts/pixels/cookies (`src/app/page.tsx`, `layout.tsx`). The analytics session id is minted only post-auth when an event fires.

### 11.4 Marketing vs transactional email?
**Code answer: Only transactional/service emails** (Supabase Auth magic-link + email-change). **No marketing-email code, no newsletter, no unsubscribe, no marketing opt-in field.** The only email-capture surface is the `legacy_waitlist` (stores `email + source`), but **no code sends anything to those addresses**.
> ⚠️ **Policy / not in code:** Whether `legacy_waitlist` emails will be used for marketing, and whether a separate marketing consent is needed, is undecided.

---

## 12. Privacy rights

| Right | Status | Evidence |
|---|---|---|
| Download/export data | **Not implemented** | deferred `docs/MASTER_SPEC.md:184`; `GET /api/me` returns `{id,email}` only |
| Correct/update info | **Partial** | change email `settings/actions.ts:76`; remove photo `:114`; profile fields at capture. **Messages immutable** (`DECISIONS.md:15`) |
| Delete individual recordings | **Not implemented (user-facing)** | no per-clip/per-message delete surface; `discard` only kills an in-flight generation |
| Delete entire account | **Implemented** | `deleteAccountAction` `settings/actions.ts:170` |
| Request a copy of all stored info (DSAR) | **Not implemented** | no access endpoint |

**Privacy contact:** `help@essencevault.app` (`src/lib/config/support.ts:12`) — a general *support* address, not labeled specifically as a privacy contact.

**Sell/share for targeted advertising?** **Code answer: No — no ad SDK, pixel, or data-sharing-to-ad-network anywhere.** In-app copy affirmatively promises never to sell voice data.
> ⚠️ **Vendor fact:** The "never sell" / "never train" / "48h" promises are marketing, not a legal policy — verify "never train" + "48h" against ElevenLabs' DPA and Supabase deletion behavior (see §1.6, §8).

> ⚠️ **Policy / not in code:** To honor CCPA/CPRA rights (access, deletion, portability, correction) as *rights*, export/DSAR and individual-recording deletion would need to be **built** — they don't exist today.

---

## 13. UGC & prohibited use

### 13.1 Existing ToS/AUP/content-policy docs
**Code answer: None exist.** No `/terms`, `/privacy`, `/legal` routes; no ToS/AUP/policy files in `docs/` or `prototypes/`. Only the marketing `PrivacyPromiseModal.tsx`.

### 13.2 Prohibited-use language (threats/harassment/fraud/impersonation/NCII/hate/IP)
**Code answer: None exists** — no acceptable-use text anywhere. All such prohibitions must be authored.

### 13.3 Public sharing?
**Code answer: No public sharing.** All content is RLS-scoped to the owner (`.eq("user_id", user.id)` throughout). No share-link/unlisted-URL/visibility feature; signed URLs are private + expiring, owner-only. "Multi-recipient sends" listed out of scope (`docs/MASTER_SPEC.md`).

### 13.4 Content-removal / suspension / reporting?
**Code answer: None built.** No report/flag/moderation/takedown/suspension code. The only lifecycle action is the user's own account deletion. Admin panels are out of scope (`docs/DECISIONS.md:60`).
> ⚠️ **Policy / not in code:** Whether ESSENCE should reserve rights to remove content/suspend accounts for safety/legal/abuse, and offer a reporting process, are decisions to author into the (unbuilt) Terms.

---

## 14. Liability & disputes — code findings

**Code answer: The repo contains no legal entity name, no state of incorporation, and no governing-law/venue/arbitration/limitation-of-liability language of any kind.** Grep for `LLC|Inc|governing law|arbitrat|venue|jurisdiction|limitation of liability|entity` returns only unrelated code hits.

Real-world identifiers found:
- Domain **`essencevault.app`** (support inbox `support.ts:12`).
- `essence.co` appears **only in dev mock data** (`dev/messages-waitlist/page.tsx:46`), not as a legal identifier.
- **"Florida"** appears only as one entry in a 50-state dropdown for the user's home-state profile field (`src/lib/us-states.ts:11`, `Screen8.tsx:321`) — **not** a corporate base.

> ⚠️ **Policy / not in code — for owner + attorney:** Legal entity name, state/form of incorporation, governing law, venue, arbitration/class-waiver, and any liability cap or damages disclaimer (including disclaiming responsibility for failed/delayed delivery, incorrect recipient info, recipient conduct, third-party outages, permanent preservation, and emotional distress from receiving legacy messages) are **entirely absent** — nothing in the repo to draft from or contradict. These are pure business/legal decisions.

---

## Appendix — Consolidated "must confirm with the vendor/owner" list

**Vendor facts to confirm (not in code):**
1. ElevenLabs account tier + DPA: does it train on / retain the uploaded recordings? (governs the "never train" promise) — §1.6
2. ElevenLabs: does the cloned voice get purged on their side, ever? (nothing deletes it via code) — §1.5, §8.2
3. Supabase backup/PITR retention window (vs the "48 hours" promise) — §8.3
4. Supabase bucket privacy (`essence-audio`, `profile-photos` set private in dashboard) — §4.3
5. Vercel HTTPS/HSTS enforcement (no header config in repo) — §4.5

**Owner/business decisions to make (not in code):**
- Real price sheet — is it one Voice Vault plan, or the 3-tier ladder you described? — §9.1
- Consent model for voice cloning (affirmative checkbox?) — §1.4
- Ownership/impersonation attestation; intended policy on cloning others' voices — §5
- The entire delivery / posthumous-release model (currently unbuilt) — §6, §7
- Estate/will/fiduciary disclaimer — §7.7
- Lapsed-subscription entitlement (keep playback? lock? delete?) — §9.5
- Marketing-email consent for `legacy_waitlist` — §11.4
- Build export/DSAR + individual-recording delete to honor privacy rights — §12
- Prohibited-use, content-removal, reporting policy — §13
- Entity, governing law, venue, arbitration, liability caps — §14

**Copy that currently contradicts the code (fix before ship):**
- "end-to-end encryption" / "encrypted the moment they leave your device" / "Not even our team can access them" — no encryption exists (§4)
- "permanently gone from our servers within 48 hours" — immediate local delete, but ElevenLabs clone never deleted + backups retain longer (§1.5, §8)
- "We will never use your recordings to train AI models" — unsubstantiated by code; depends on ElevenLabs DPA (§1.6)
