# ESSENCE Beta Participation Terms

**Status:** DRAFT v1.0, prepared 2026-08-31. Not reviewed by counsel.
**Effective date:** September 1, 2026

> **Why this document exists.** This is the single highest-value legal document for ESSENCE right now, and it is the one most pre-launch founders skip. The Terms of Service and Privacy Policy describe a commercial product. The beta is not that. It is a small group of invited people using unfinished software that may lose their data. This rider sets expectations honestly, which is both the decent thing to do and the thing that actually reduces risk. Present it at invitation and require acceptance before the first recording.

---

## 1. What this is

ESSENCE is operated by ESSENCE APP LLC, a Florida limited liability company ("ESSENCE," "we," "us").

You have been invited to test a **pre-release version** of ESSENCE (the "Beta"). These Beta Participation Terms apply in addition to the [Terms of Service](/terms), the [Privacy Policy](/privacy), and the [Acceptable Use Policy](/acceptable-use). **Where this document conflicts with the Terms of Service, this document wins for the duration of the Beta.**

By accepting these terms and using the Beta, you agree to them. Participation is voluntary and you can stop at any time.

## 2. The Beta is unfinished software

Please take this section literally.

- **The Beta may lose your data.** Recordings, voice models, and messages may be deleted, corrupted, or become unplayable, by accident or as part of a planned reset. **We may need to wipe all Beta data before launch.**
- **The Beta may break, be unavailable, or behave incorrectly**, without notice.
- **Features may change or be removed**, including features you rely on.
- **We do not back up your audio.** Our infrastructure's backups cover database records only. If a recording is lost, we may not be able to restore it.

**Do not record anything into the Beta that you could not bear to lose, and do not treat the Beta as the only copy of anything meaningful to you.** If a recording matters, keep your own copy on your own device.

## 3. There is no delivery, and no posthumous release

This bears repeating in a document about legacy voice messages, because the concept invites an assumption that is not true:

**ESSENCE does not send your messages to anyone, ever.** There is no email or text delivery, no scheduling, no death or incapacity verification, and no release trigger. The people you name in the app are private labels in your own vault. **We do not have their contact information and we will never contact them.** Only you can play back your messages, from inside your own account.

Do not participate in the Beta on the understanding that anything will reach anyone.

## 4. Your voice, and your consent

The Beta creates a synthetic model of your voice from recordings you make. That is sensitive, and it is optional.

- **You must affirmatively consent before any voice model is created.** Nothing is created without it.
- **You may only record your own voice.** Not a family member's, not anyone else's, living or deceased. See the Acceptable Use Policy.
- **We do not use your recordings to train AI models.** We turned off model training on our voice provider account before the Beta opened.
- **You can withdraw at any time** by deleting your account, which removes your content from our systems and instructs our voice provider to delete the voice model.

The Privacy Policy describes exactly what we collect, who processes it, how long it lasts, and what deletion does and does not reach. Please read it before your first recording rather than after.

## 5. Cost

**The Beta is free.** You will not be charged, and no payment method is required during the Beta.

We may end the Beta and move to a paid product. **If we do, we will tell you before anything becomes paid, and we will never convert you to a paid subscription automatically.** You would have to sign up deliberately.

## 6. Feedback

We would like your feedback, and you are under no obligation to give any.

If you do give us feedback, ideas, bug reports, or suggestions, **you grant us a perpetual, irrevocable, worldwide, royalty-free right to use them for any purpose, including building them into the product, without payment, credit, or obligation to you.** Feedback is not confidential and does not create any ownership interest for you in ESSENCE. This does not affect your ownership of your own recordings and messages, which remains yours under the Terms of Service.

## 7. Confidentiality

The Beta is not public. Please do not publish screenshots, recordings, screen captures, or descriptions of unreleased features publicly, and please do not share your access with anyone else. You can of course talk about your experience privately, and you can tell us anything.

This obligation ends when the relevant feature becomes publicly available.

## 8. No warranties, and limited liability

**THE BETA IS PROVIDED "AS IS," WITH ALL FAULTS, AND WITHOUT WARRANTY OF ANY KIND.** We disclaim all express and implied warranties to the fullest extent permitted by law, including any warranty of merchantability, fitness for a particular purpose, reliability, availability, accuracy, or data preservation.

Without limiting the disclaimers in the Terms of Service, we specifically disclaim liability for **loss, corruption, or deletion of your recordings, voice model, or messages during or after the Beta**, and for **emotional distress arising from the loss of, absence of, or content of any recording or message.**

The limitation of liability in the Terms of Service applies. Because the Beta is free, our total liability to you for anything arising from the Beta is limited to **US$100**.

## 9. Ending the Beta

We may end the Beta, remove any participant, or change these terms at any time, with or without notice.

**Before we shut the Beta down or wipe Beta data, we will make reasonable efforts to give you at least 14 days' notice by email**, so that you can save anything you want to keep. If self-serve export does not exist yet, email **help@essencevault.app** and we will get your recordings and messages to you manually.

You may leave at any time by deleting your account in Settings.

## 10. Support and contact

The Beta is supported by email at **help@essencevault.app**. We are a very small team, so please be patient with response times. Bug reports are welcome and genuinely useful.

**ESSENCE APP LLC**, 610 W Las Olas Blvd, #513, Fort Lauderdale, FL 33312

---

## Implementation notes (delete before publishing)

**How to actually use this document:**

1. **Present it at invitation, not buried in a footer.** A short screen with the four things that matter, and a link to the full text: no delivery, may lose data, free, your own voice only.
2. **Require an explicit checkbox** before the first recording: "I have read and agree to the Beta Participation Terms, the Terms of Service, the Privacy Policy, and the Acceptable Use Policy." Log the acceptance with a user ID, a timestamp, and a version string. That log is your evidence that consent happened, and it costs almost nothing to build.
3. **Version the documents.** Store `terms_version_accepted` on the profile row. When you change a document, bump the version and re-prompt.
4. **Say the same thing in your invitation email** that this document says. A beta invitation that promises delivery, or implies messages reach loved ones, undoes the protection this rider provides.

**Owner decisions — resolved 2026-09-01:**

- **Beta access: invite-only.** Participants are invited individually (not a public waitlist), which keeps the confidentiality obligation in Section 7 realistic.
- **Collect country at signup: yes.** One dropdown added at signup so we know which privacy regime we operate under. *(Build item — see Compliance Pack Part 3 / chunk L4.)*
- **Manual export on request during beta: yes.** Section 9's commitment stands — until self-serve export exists, we retrieve a participant's recordings and messages manually on email request.
