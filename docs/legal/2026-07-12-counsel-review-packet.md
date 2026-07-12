# ESSENCE — Legal review packet (Terms + Privacy)

> **⚠️ DRAFT — NOT counsel-reviewed.** This is an on-brand plain-language draft
> written in the ESSENCE product voice, for your lawyer to review, correct, and
> complete. It is **not** legal advice and is **not** launch-ready as written.
> Source lives on branch `feat/legal-pages` (PR #90): `src/components/screens/legal/`.
> Rendered at `/terms` and `/privacy` (placeholder banner currently shown).

---

# Terms of Service  *(Effective date — PENDING)*

*Intro:* These terms explain the agreement between you and ESSENCE when you use
the service. We have kept them as plain as we can.

### Agreement to these terms
These terms are an agreement between you and ESSENCE. By creating an account or using the service, you agree to them. If you do not agree, please do not use ESSENCE.

### Your account
You are responsible for your account and for keeping access to your email secure, since we sign you in with a secure link rather than a password. Please let us know promptly if you believe someone else has accessed your account.

### Subscriptions and billing
Some features require a paid subscription. Payments are processed securely through Stripe. Your plan renews automatically at the end of each billing period unless you cancel beforehand.

You can cancel at any time from your account. When you cancel, you keep access until the end of the period you have already paid for. Refund eligibility is described at the point of purchase and follows applicable law.

### Your recordings and content
Your recordings and messages are yours. You keep ownership of everything you create. You grant ESSENCE only the limited permission needed to store your content and deliver it to the recipients you choose.

You are responsible for the content you record and for having the right to share it with the people you name.

### Acceptable use
Please use ESSENCE only for its intended purpose. Do not use it to break the law, to harm or harass others, or to interfere with the security or operation of the service.

### The Vault and message delivery
ESSENCE is designed to safeguard your recordings and deliver the messages you choose. While we work hard to keep the service reliable and your content safe, no digital service can promise perfect, uninterrupted availability, and specific delivery arrangements are described where you set them up.

### Ending your use
You may stop using ESSENCE and delete your account at any time. We may suspend or end access if these terms are seriously or repeatedly broken, and we will act reasonably and give notice where we can.

### Service "as is" and liability
ESSENCE is provided as a service that we improve over time. To the extent permitted by law, we limit our liability as described in the final terms. Nothing here removes rights that the law guarantees you.

### Changes to these terms
If we make a meaningful change to these terms, we will let you know and update the effective date above before the change takes effect.

### Contact us
Questions about these terms? Reach us at the contact address ESSENCE publishes before launch.

---

# Privacy Policy  *(Effective date — PENDING)*

*Intro:* Your voice belongs to you. This policy explains, in plain language, what
we collect, how we protect it, and the promises we will never break.

### What we collect
To create your account and keep your recordings safe, we collect your email address, the voice recordings and messages you choose to make, and basic technical information (such as device type and app activity) needed to run the service.

We do not ask for more than the service requires, and we never listen to your recordings for any purpose other than delivering them to you and the people you choose.

### How we use your information
We use your information to give you access to your account, to store and deliver your recordings, to process your subscription, and to send you service messages such as receipts and important account notices.

We do not build advertising profiles, and we do not sell or rent your personal information to anyone.

### What we will never do
We will never sell your voice data — not to advertisers, not to researchers, not to anyone.

We will never use your recordings to train AI models, ours or anyone else's.

Not even our team can listen to your private recordings. They exist for you and the people you choose.

### How your recordings are stored
Your recordings are encrypted in transit and at rest. They are stored with our infrastructure providers solely to make them available to you and your chosen recipients.

### Service providers
We rely on a small number of trusted providers to operate ESSENCE — for example, secure storage and authentication, and payment processing through Stripe. These providers handle data only on our instructions and only to provide their service.

### Your choices and deletion
You can access your recordings at any time, and you can delete your account whenever you wish. When you delete your account, your voice recordings are permanently removed from our servers within 48 hours.

### Children
ESSENCE is intended for adults. It is not directed to children, and we do not knowingly collect information from anyone under the age required by law in their region.

### Changes to this policy
If we make a meaningful change to how we handle your information, we will let you know and update the effective date above before the change takes effect.

### Contact us
Questions about your privacy? Reach us at the contact address ESSENCE publishes before launch. We read every message.

---

# For your lawyer — gaps to fill / vet before launch

The draft above deliberately leaves the following **blank or generic**. These are
the items counsel typically must supply or verify:

1. **Legal entity + address** — the registered company name (LLC/Inc/Ltd), its
   address, and the correct "you and ___" party name (currently just "ESSENCE").
2. **Governing law & jurisdiction** — which state/country's law applies and where
   disputes are heard. Not present.
3. **Dispute resolution** — arbitration clause / class-action waiver / venue, if any.
   Not present.
4. **Effective date** — currently "pending" on both docs. Set on publish.
5. **Contact address** — the app's support inbox is now `help@essencevault.app`
   (live). Confirm that's the address to publish in both "Contact us" sections.
6. **Limitation of liability & warranty disclaimer** — the draft gestures at
   "as is" and "we limit our liability as described in the final terms" but has
   **no actual cap or disclaimer language**. Counsel supplies the real clause.
7. **Refund / cancellation specifics** — the draft says refunds are "described at
   the point of purchase and follow applicable law." Confirm the actual refund
   policy and any consumer-law requirements (e.g. EU/UK withdrawal rights).
8. **Subscription auto-renewal disclosures** — some jurisdictions (e.g. California
   ARL, EU) mandate specific auto-renewal notice/consent wording.
9. **Privacy-law specifics** — GDPR / UK GDPR / CCPA-CPRA rights, lawful basis,
   data-subject request process, DPO/representative, international transfer
   mechanism. The draft has none of this; add per target markets.
10. **Subprocessor list & data retention** — name the actual providers (Supabase,
    Stripe, ElevenLabs, hosting) and concrete retention periods. Draft says voice
    recordings are deleted "within 48 hours" of account deletion — verify that
    matches the actual implementation.
11. **Children's age threshold** — draft says "the age required by law in their
    region." Counsel sets the concrete threshold (COPPA 13 / GDPR-K 16, etc.).
12. **AI / voice-cloning specific disclosures** — ESSENCE creates a synthetic voice
    via ElevenLabs. Counsel should confirm whether biometric-data laws (e.g.
    Illinois BIPA, Texas CUBI, Washington) require specific consent language for
    the voiceprint. The draft's "never train AI on your recordings" promise must
    match the actual ElevenLabs data-processing terms.

Once counsel returns final language: replace the `SECTIONS` copy in
`TermsScreen.tsx` / `PrivacyPolicyScreen.tsx`, set the real effective date, and
flip the `placeholder` flag off in `LegalDocument` (removes the draft banner).
