# ESSENCE Privacy Policy

**Status:** DRAFT v1.0, prepared 2026-08-31. Not reviewed by counsel.
**Effective date:** September 1, 2026
**Last updated:** September 1, 2026

> **Internal note, delete before publishing.** Every statement in this policy is grounded in the 2026-07-12 code findings and the vendor checklist. Claims that the old marketing copy made and the code could not support ("end-to-end encryption," "not even our team can access them," "permanently gone within 48 hours") have been removed and replaced with statements that are true. Do not put those phrases back.

---

## The short version

- Your voice recordings are the most sensitive thing here, and we treat them that way.
- **We do not sell your data, and we do not use your recordings to train AI models.** We have turned off model training at our voice provider.
- **We do not send your messages to anyone.** There is no delivery feature. Only you can play back your messages.
- **We do not use third-party analytics, advertising, or tracking.** No Google Analytics, no pixels, no ad networks.
- Deleting your account deletes your content from our systems right away and instructs our voice provider to delete your voice model.
- This summary is for orientation. The sections below are what actually governs.

---

## 1. Who is responsible for your data

**ESSENCE APP LLC**, a Florida limited liability company, 610 W Las Olas Blvd, #513, Fort Lauderdale, FL 33312, is the controller of the personal data described here.

Privacy and data-rights contact: **help@essencevault.app**. Please put "Privacy request" in the subject line.

## 2. What we collect

### 2.1 Information you give us

| Category | What it is | Why we have it |
|---|---|---|
| **Account** | Your email address | To create your account and sign you in by emailed link |
| **Profile** | First name, relationship label, city, birth year, home state, optional profile photo | To personalize the messages the Service generates for you |
| **Voice recordings** | Audio of you reading scripted prompts aloud, captured by your device microphone | To create and operate your synthetic voice |
| **Message content** | The message type you choose, the person label you attach, and the short personal note you write | To generate your message |
| **Person labels ("recipients")** | A name, an optional relationship, and an optional private note | A private label inside your own vault. **We collect no contact information for these people, and we never contact them** |
| **Support messages** | What you send to help@essencevault.app | To answer you |

### 2.2 Information created by using the Service

| Category | What it is |
|---|---|
| **Synthetic voice model** | A voice model created by our provider from your recordings, and an identifier for it |
| **Generated message audio** | The MP3 files the Service produces in your voice |
| **Usage events** | First-party product analytics: which screens and actions occurred, timestamps, a session identifier, and your account id (so we can understand product usage per account). **No audio and no message content are ever included in these events** |
| **Technical logs** | Server logs of requests and errors, containing identifiers and byte sizes. **Our logger is configured not to log audio or message content** |
| **Subscription status** | Your plan, trial, renewal, and payment status, received from Stripe |

### 2.3 What we do not collect

We do not collect contact information for the people you name in your vault. We do not use advertising identifiers. We do not buy data about you from data brokers. We do not have a Google Analytics, Meta Pixel, TikTok Pixel, PostHog, Mixpanel, Hotjar, Segment, or session-replay integration. **No analytics or tracking of any kind runs before you sign in.**

## 3. Your voice is sensitive data, and here is how we handle it

Voice recordings and the synthetic voice model created from them may be treated as **biometric data** or **special category data** under laws including the EU and UK GDPR and US state biometric privacy laws.

- **We process them only with your explicit consent.** Before any synthetic voice is created, you must affirmatively consent in the app. If you do not consent, no voice model is created.
- **You must confirm the voice is your own.** We do not permit creating a voice model from another person's voice.
- **You can withdraw consent** at any time by deleting your account, which deletes your recordings from our systems and instructs our voice provider to delete the voice model. Withdrawal does not undo processing that already occurred.
- **We do not use voice data for profiling, advertising, identity verification, or any purpose other than operating the Service for you.**

Our legal bases, where the GDPR or UK GDPR applies: **explicit consent** (Article 9(2)(a)) for voice and biometric data; **performance of a contract** (Article 6(1)(b)) for account, message, and subscription data; **legitimate interests** (Article 6(1)(f)) for security, abuse prevention, and first-party product analytics; and **legal obligation** (Article 6(1)(c)) for tax and financial records.

## 4. How we use your information

We use your information to create your account and sign you in, create and operate your synthetic voice, generate and store your messages, let you play them back, take payment and manage your subscription, respond to your support requests, keep the Service secure and prevent abuse, understand which parts of the product are used so we can improve them, and comply with law.

**We do not** sell your personal information, share it for cross-context behavioral advertising, use your recordings or messages to train artificial intelligence models, use your voice in marketing, or disclose your content to anyone except the service providers listed below and where legally required.

## 5. Who processes your data on our behalf

These are our service providers. Each processes data only to provide its service to us.

| Provider | What it handles | Where |
|---|---|---|
| **Supabase** | Database, authentication, and file storage for recordings, message audio, and photos | United States |
| **ElevenLabs** | Voice model creation and text-to-speech generation. Receives your voice recordings | United States |
| **Anthropic** | Rewrites your short personal note into the passage that appears in your message. Receives that note text only, never audio | United States |
| **Stripe** | Subscription payments. Receives your email and payment details directly. **We never see or store your full card number** | United States |
| **Vercel** | Application hosting | United States |
| **Cloudflare** | Email routing for our support inbox | United States |

We may add or change providers. When we do, we will update this list, and we will give notice of a material change as described in Section 12.

### 5.1 About our voice provider specifically

Because it is the provider that touches your recordings, we want to be precise:

- **We have opted out of model training at ElevenLabs.** As of 2026-07-12, before the Service was available to any user, the "improve the models" setting on our account is turned off. Your recordings are not used to train ElevenLabs' models.
- **When you delete your account, we call ElevenLabs to delete your voice model.**
- **We cannot promise a vendor-side deletion deadline.** ElevenLabs' published policy caps retention at no longer than three years after the last interaction, and it does not publish a backup-purge timeline. We tell you exactly this rather than promising an immediate purge we cannot verify.
- ElevenLabs acts as our processor under its published Data Processing Addendum.

## 6. Security, stated accurately

- **In transit:** all connections to the Service and to our providers use HTTPS/TLS.
- **At rest:** files and database records are stored on infrastructure that encrypts data at rest at the disk level, and the storage holding your recordings and photos is configured to be private rather than publicly readable. *[Owner: verify both `essence-audio` and `profile-photos` are set to private in the live Supabase dashboard before publishing this line. The vendor checklist still has this as an unchecked item.]*
- **Access control:** your account data is scoped to you. Application code checks ownership before it will produce a playback link, and playback links are short-lived and expire.

**We want to be clear about what this is not.** ESSENCE does **not** use end-to-end or client-side encryption. Our servers process your recordings in unencrypted form in order to send them to the voice provider and to generate your messages, which means our systems are technically capable of accessing your recordings. **ESSENCE personnel do not access your recordings in the ordinary course of business.** We access content only where necessary to operate or repair the Service, investigate a reported violation, or comply with a legal obligation.

No system is perfectly secure, and we cannot guarantee absolute security.

## 7. How long we keep things, and what deletion actually does

### 7.1 While your account is open

We keep your content for as long as your account exists, so the Service can work.

### 7.2 When you delete your account

Deleting your account from Settings is **immediate and permanent**. There is no grace period, no recovery window, and no undo. When you delete:

| Data | What happens |
|---|---|
| Voice recordings | Deleted from our storage immediately |
| Generated message audio | Deleted from our storage immediately |
| Profile and home photos | Deleted from our storage immediately |
| Messages, notes, person labels, profile | Deleted from our database immediately |
| Usage events | Deleted immediately |
| Your synthetic voice model at ElevenLabs | We send a delete instruction immediately. Their retention policy governs after that, as described in Section 5.1 |
| Your subscription | Cancelled |
| **Payment records at Stripe** | **Retained.** Invoices, charges, and customer records are kept by Stripe as required for tax, accounting, and anti-fraud purposes, and outlive your ESSENCE account |
| **Database backups** | **Deleted records persist in routine database backups for up to 7 days** and then age out. Backups are not selectively edited |

**Please read that last row.** We do not claim that your data is gone from every system the instant you press delete. Your files are removed immediately, and database records age out of backups within about a week.

### 7.3 If you stop paying

We do not delete your content because a subscription lapsed. See the Terms of Service for what access you keep.

## 8. Your rights and how to use them

Depending on where you live, you may have the right to access your data, receive a copy in a portable format, correct it, delete it, object to or restrict certain processing, withdraw consent, and not be discriminated against for exercising these rights.

**How to exercise them:** email **help@essencevault.app** with "Privacy request" in the subject line, from the email address on your account.

**Be aware of how this works today, because we would rather tell you than have you discover it.** ESSENCE does not yet have self-serve data export or a way to delete an individual recording or message. **We handle these requests manually.** We will acknowledge your request within **7 days** and complete it within **30 days**, or tell you why we need longer, up to the extension your law allows. Full account deletion is the one right you can exercise yourself, instantly, from Settings.

We do not charge for these requests. We may need to verify that the request comes from you, which we do by confirming control of the account email.

If you are in the EEA, the UK, or Switzerland, you also have the right to lodge a complaint with your local data protection authority.

If you are a California resident: we do not sell or share your personal information as those terms are defined under the CCPA/CPRA, and we do not use or disclose sensitive personal information beyond the purposes permitted for providing the Service.

## 9. Cookies and similar technologies

We use **strictly necessary cookies only**, to keep you signed in. We do not use advertising, marketing, or analytics cookies. Our product analytics use a random session identifier stored in your browser's session storage, which is cleared when you close the tab, is not a cookie, and is created only after you sign in.

## 10. International data transfers

The Service is operated from the United States, and your data is processed there. If you use ESSENCE from the EEA, the UK, or another country with data transfer restrictions, your data is transferred to the United States. Our providers rely on Standard Contractual Clauses, and in some cases the EU-US Data Privacy Framework, to cover those transfers. You can request more detail at help@essencevault.app.

## 11. Children

ESSENCE is for adults. You must be 18 or older. We do not knowingly collect personal data from anyone under 18 or create a voice model from a minor's voice. If you believe a minor has used the Service, email help@essencevault.app and we will delete the account.

## 12. Changes to this policy

If we make a material change, we will notify you by email or in the app at least **14 days** before it takes effect. **If a change would materially expand how we use your voice data, we will ask for your consent again rather than relying on notice.**

## 13. Contact

**ESSENCE APP LLC**
610 W Las Olas Blvd, #513, Fort Lauderdale, FL 33312
help@essencevault.app

---

## Open items for counsel (delete before publishing)

1. **Applicability determination.** Whether CCPA/CPRA business thresholds attach, and whether an EU representative under GDPR Article 27 is needed, depends on actual size and user footprint. This draft is written to a strict baseline on purpose, because complying above the minimum is free right now and downgrading later is easy.
2. **Manual DSAR posture.** Section 8 discloses the manual process honestly. Confirm this is acceptable for launch, and treat self-serve export as a build item before scale.
3. **Backup retention window.** Stated as 7 days based on the Supabase Pro plan. Reconfirm against the live project setting before publishing.
4. **Storage backup gap.** Audio in the `essence-audio` bucket is not covered by Supabase backups. This is a durability risk to the user's content, not a privacy risk, and it is why the Terms carry no preservation guarantee. Track it separately.
5. **Biometric-specific notice.** If Illinois, Texas, or Washington users are ever in scope, a standalone biometric notice, retention schedule, and written release may be required beyond this policy.
