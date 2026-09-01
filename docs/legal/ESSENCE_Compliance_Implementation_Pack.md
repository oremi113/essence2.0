# ESSENCE Compliance Implementation Pack

**Prepared:** 2026-08-31
**Companions:** Terms of Service v1, Privacy Policy v1, Acceptable Use Policy v1, Beta Participation Terms v1
**Source of truth for product facts:** `2026-07-12-legal-questionnaire-code-findings.md` and the Vendor Terms Confirmation Checklist

This is the build side. The four policy documents say what is true. This document contains the exact strings to put in the app so that it stays true, plus an honest read on what risk remains and what would change it.

---

## Part 1: The consent gate (highest priority)

This is not polish. ElevenLabs' Terms of Use §4 require **you** to hold the rights to any voice submitted. Without a consent and attestation gate, you are in breach of your own vendor contract on every recording, and you have no evidence of user consent for what is very likely biometric data. It is also the cheapest thing on this list to build.

**Placement:** one screen after the voice profile form, before the first recording starts. Not inside onboarding's passive privacy screen. Not a link in a footer. A screen with two checkboxes, both unchecked by default, and a CTA disabled until both are checked.

### String 1: Consent to create a synthetic voice

**Checkbox label:**

> I consent to ESSENCE and its service providers creating and operating a synthetic model of my voice from these recordings, and generating audio in that voice for me.

**Supporting line beneath it (13px, muted):**

> Your recordings go to our voice provider, ElevenLabs, to build the model. Model training is turned off on our account, so your voice is never used to train AI. You can withdraw consent at any time by deleting your account.

### String 2: Ownership attestation

**Checkbox label:**

> This is my own voice. I am not recording, imitating, or submitting the voice of any other person, living or deceased.

**Supporting line beneath it (13px, muted):**

> ESSENCE only supports your own voice today. We know people want to preserve a loved one's voice, and we are not able to do that responsibly yet.

### String 3: The screen's framing copy

**Eyebrow:** BEFORE WE BEGIN
**Title:** Two things to confirm
**Body:**

> Creating a voice model is the most personal thing this app does, so we ask plainly rather than burying it. Both boxes have to be checked before recording starts.

**CTA:** Begin Stage 1 *(keeps the existing "Begin Stage N" pattern; do not introduce a new verb here)*

### What to persist

Write a row when both boxes are checked and the CTA is pressed. Do not infer consent from the existence of a recording.

```
voice_consent_records
  id
  user_id
  voice_profile_id
  consent_to_clone         boolean   -- string 1
  ownership_attestation    boolean   -- string 2
  consent_text_version     text      -- e.g. "2026-08-31-v1"
  accepted_at              timestamptz
  user_agent               text
  ip_address               inet      -- optional, note it in the Privacy Policy if kept
```

Store the **version string**, not the full text, and keep the versioned text in the repo. When you change a string, bump the version and re-prompt existing users before their next recording session.

Do the same for document acceptance: `terms_version_accepted` on the profile row, set at signup.

---

## Part 2: Copy replacements

The current Privacy Promise copy asserts four things the code does not do. Two are now closer to true than they were, and all four need rewording. These are drop-in replacements.

### 2.1 "End-to-end encryption"

**Current, in `Screen4.tsx:36` and `PrivacyPromiseModal.tsx:56-59`:**
> "Protected with end-to-end encryption" / "Your recordings are encrypted the moment they leave your device."

**Problem:** there is no client-side or end-to-end encryption. The server downloads plaintext audio.

**Replacement:**
> **Encrypted in transit and at rest.** Your recordings travel over encrypted connections and are stored in private, encrypted storage that only your account can reach.

### 2.2 "Not even our team can access them"

**Current, `PrivacyPromiseModal.tsx:57`:**
> "Not even our team can access them."

**Problem:** the server holds a Supabase service-role key that can read any user's audio.

**Replacement:**
> **We do not listen to your recordings.** Our team does not access your recordings in the ordinary course of business, and nothing in ESSENCE plays your voice to anyone but you.

*Why this wording:* it is a promise about conduct, which you can keep, rather than a claim about capability, which is false. It reads warmer than the literal version, and it survives contact with a technical reader.

### 2.3 "Permanently gone within 48 hours"

**Current, `PrivacyPromiseModal.tsx:81-84`:**
> "If you delete your account, your voice is permanently gone from our servers within 48 hours."

**Problem:** local deletion is immediate, not 48 hours. Database backups hold records about 7 days. The ElevenLabs model is now deleted by code, but their retention policy caps at three years with no published backup-purge timeline.

**Replacement:**
> **Delete, and it is gone.** Deleting your account removes your recordings and messages from our systems immediately, and tells our voice provider to delete your voice model. There is no undo. Routine database backups age out within about a week.

### 2.4 "We will never use your recordings to train AI models"

**Current, `PrivacyPromiseModal.tsx:72-77`:**
> "We will never use your recordings to train AI models. Not ours. Not anyone else's."

**Status:** this one is now **true going forward**, because training was turned off at ElevenLabs on 2026-07-12, before any real user existed. Keep the claim. Tighten the second half, because "not anyone else's" is a promise about a third party's behavior.

**Replacement:**
> **Never used to train AI.** We turned off model training on our voice provider account before ESSENCE opened, and we do not use your recordings to train anything, ever.

### 2.5 The delivery framing

**This is the one nobody flags, and it is the largest gap between what the product implies and what it does.**

Copy like "for the people you choose" invites users to believe that messages reach those people. They do not. A user who records a message for a dying parent, believing it will be delivered, and later learns it never could be, has a real complaint, and "the Terms said so" is a poor answer.

**Add, on the recipient-tagging screen and in the empty state of the vault:**

> Messages stay in your vault. ESSENCE does not send them to anyone, and the people you name here are private labels only. Nothing leaves your account.

Keep it plain and unapologetic. Framed as privacy rather than as a missing feature, it reads as a strength, which for a voice vault it genuinely is.

---

## Part 3: Routes and surfaces to build

| Item | Effort | Why it matters |
|---|---|---|
| `/terms`, `/privacy`, `/acceptable-use`, `/beta-terms` static routes | Small | Documents that are not published do not protect you. Also required by Stripe and by the app stores later |
| Footer links to all four, on the landing page and in Settings | Small | Discoverability is part of "clear and conspicuous" |
| Consent gate screen and `voice_consent_records` table | Medium | Vendor contract obligation and biometric consent evidence |
| Signup acceptance checkbox and `terms_version_accepted` | Small | Proof of assent. Do not use a browsewrap footer link alone |
| Country dropdown at signup | Small | You currently do not know which privacy regime applies. One field answers it |
| Auto-renewal disclosure adjacent to the checkout button | Small | Required by California ARL before you charge a US customer. Not needed for a free beta |
| Manual DSAR runbook in the support inbox | Small | The Privacy Policy commits to 7-day acknowledgement and 30-day completion. Have a written process |
| Self-serve export | Large | Defer. Manual handling at beta scale is fine and is disclosed |
| Individual message and recording deletion | Medium | Defer, but this is the first privacy-rights gap that will bite at scale |

---

## Part 4: Where the real risk is, honestly

Your read is right on the main point: pre-revenue, pre-beta, non-US testers, no app store presence, and a product that sends nothing to anyone. The probability of being sued is very low, and retaining counsel now would be spending money to solve a problem you do not have yet.

The risks that are actually live are not lawsuit risks. They are these four:

**1. Vendor contract breach, today.** ElevenLabs requires you to hold rights to submitted voices. You have no consent gate. This is a breach right now, on every recording, and the remedy is account termination rather than a lawsuit. Losing your ElevenLabs account mid-beta would be a genuinely bad week. **Fix this first. It is a day of work.**

**2. Untrue public claims.** "End-to-end encryption" is a statement about a security property you do not have. In the US that is an FTC Act §5 deceptive-practice question, and it is the kind of thing that survives being pre-revenue, because the claim itself is the violation. **This is the second thing to fix, and it is a copy change.**

**3. The delivery gap.** Not a legal exposure so much as a trust and refund exposure, and the one most likely to produce an angry beta participant. Fix it with copy, before beta, not after.

**4. Data loss.** Your audio is not backed up. A user records fifteen minutes of a voice for emotional reasons, it disappears, and no policy document makes that better. **This is the risk most likely to actually hurt someone in your beta**, and it is an infrastructure item rather than a legal one. The Beta Participation Terms set expectations for it, which is a mitigation and not a fix.

Notice that none of the top four is "we do not have a Terms of Service." Documents are necessary and now you have them. They were not the actual risk.

### What does not need to be solved now

- Arbitration versus courts. Matters when you have enough users for class exposure.
- The liability cap figure. Matters when there are fees to cap against.
- California ARL mechanics. Matters the day you charge a US customer.
- Self-serve export and DSAR tooling. Matters at scale, and is disclosed honestly until then.
- DMCA agent registration. Cheap, so do it when convenient, but not urgent while nothing is public.

### When to actually retain counsel

Hire a lawyer to review, not to draft. Walking in with these four documents plus the code findings turns a multi-thousand-dollar drafting engagement into a review engagement, which is what you are trying to accomplish. **Trigger the engagement at the first of these:**

- You take the first dollar from a real customer.
- You open the beta to US users, or to EU or UK users in any volume.
- You submit to the App Store or Play Store.
- You raise outside money, or a term sheet appears.
- You decide to support cloning another person's voice.
- You build any delivery, scheduling, or posthumous-release feature. **This is the big one.** The entire risk profile of ESSENCE changes the day a message can reach a third party, and every document here would need rewriting.
- Anyone alleges their voice was cloned without consent.

Ask for a **fixed-fee document review** rather than an hourly drafting engagement, and be specific: "Here are four drafts and a technical findings document. I want a redline and a risk memo, not a rewrite." That is a $1,500 to $4,000 conversation in most markets instead of $8,000 to $15,000.

---

## Part 5: Order of operations

1. **Publish the four documents** at real routes with footer links. Beta rider gates the beta.
2. **Build the consent gate.** Two checkboxes, one table, one version string.
3. **Ship the copy replacements.** Four Privacy Promise strings plus the delivery-framing line.
4. **Add the signup acceptance checkbox** and the country dropdown.
5. **Write the DSAR runbook**, one page in your support inbox.
6. **Solve the audio backup gap** before beta participants record anything they care about.
7. **Then open the beta.**

Items 1 through 5 are a few days of work. Item 6 is the one that could slip, and it is the one that actually protects your users.

---

**This document is not legal advice.** It is an engineering and operating plan built from your own code findings and your vendor's published terms. The four policy documents it accompanies are drafts written to be reviewed by a lawyer, not to replace one.
