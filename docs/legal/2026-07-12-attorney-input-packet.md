# ESSENCE — Attorney Input Packet: Decisions & Documents Needed

**Prepared:** 2026-07-12
**Owner-decisions update:** 2026-08-31 — Section 1 partially resolved (see the status log below).
**For:** Owner's counsel (Terms of Service / Privacy Policy / Acceptable-Use engagement)
**Technical companion:** `docs/legal/2026-07-12-legal-questionnaire-code-findings.md` — a code-grounded, `file:line`-cited answer to the questionnaire's technical questions. Read that doc for "what the product does." Read **this** doc for "what the owner must decide and what counsel must draft."

> **On the resolutions marked below (2026-08-31):** items tagged **✅ RESOLVED** or **🟡 OWNER WORKING POSITION** were settled by the owner (with assistant help) *to reduce billable consult time on structural defaults* — they are not legal advice, and counsel remains free to override any of them. Items tagged **🔴 NEEDS COUNSEL** are genuine legal-judgment calls left open on purpose.

---

## How to use this packet

The findings doc settles the *factual* questions about the shipping product. This packet collects everything the code **cannot** answer: the business/policy calls the owner must make, and the documents counsel must author from scratch. Each item below is a **decision prompt**, a short **context** note, and — where the findings doc supports one — a **suggested default** clearly labeled as a starting point for counsel to accept or override.

Two framing facts that shape almost every decision here:

- **The delivery / posthumous-release system is entirely unbuilt.** Nothing is ever sent to anyone. A "recipient" is a private label (name + optional relationship, **no contact info**) inside the creator's own vault. Messages are played back **only by the creator**. Terms must not imply a delivery capability that does not exist.
- **No legal documents exist yet.** There is no Terms of Service, no Acceptable-Use Policy, no Privacy Policy, and no governing-law/venue language anywhere in the repo. The only "policy" artifact is a 3-bullet marketing "Privacy Promise" modal. Everything below must be authored, not edited. *(Update 2026-08-31: the operating **entity now exists** — ESSENCE APP LLC, a Florida LLC — see Section 1.)*

---

## Section 1 — Company & disputes

*(Findings §14. Governing-law/venue/arbitration/liability language still needs authoring — but the entity, state, and governing-law defaults are now settled. Status per item below.)*

> **Section 1 status (2026-08-31):** 1.1, 1.2, 1.3 resolved · 1.6 accepted as a working position · 1.4, 1.5 left open for counsel (with a stated leaning). No open owner inputs remain in Section 1 — venue county confirmed as **Broward County, Florida**. What's left is counsel's judgment on arbitration-vs-courts (1.4) and the liability-cap figure (1.5).

**1.1 — Legal entity name and form.** — ✅ **RESOLVED (2026-08-31)**
**Operating entity: `ESSENCE APP LLC`, a Florida limited liability company.** This is the contracting party to name in the Terms and Privacy Policy. The product ships under the domain **`essencevault.app`**; `essence.co` (dev mock data) is not a corporate identifier and should not appear in any document.

**1.2 — State/base of incorporation.** — ✅ **RESOLVED (2026-08-31)**
**Organized in Florida.** Principal place of business: **610 W Las Olas Blvd, #513, Fort Lauderdale, FL 33312** (Broward County; owner-confirmed 2026-09-01). Confirm registered-agent of record separately if different from the principal address.

**1.3 — Governing law.** — ✅ **RESOLVED (2026-08-31): Florida.**
**The Terms are governed by the law of the State of Florida** (without regard to conflict-of-laws rules). *Reasoning (owner working default, counsel may override):* aligning governing law with the state of organization and principal place of business is the standard, lowest-friction choice; Florida carries no consumer-contract quirk that would make a foreign state's law preferable, and choosing a non-home state's law for a Florida consumer product buys a single-member LLC nothing while inviting enforceability questions. Left as a settled default precisely so counsel doesn't bill time re-deriving it — counsel may still substitute a more favorable forum if they see a specific reason.

**1.4 — Dispute venue: courts vs. arbitration.** — 🟡 **OWNER WORKING POSITION / 🔴 NEEDS COUNSEL**
**Owner's leaning: courts, not binding arbitration** — specifically the state courts located in **Broward County, Florida** and the federal courts of the U.S. District Court for the Southern District of Florida (which sits in Broward County), with each party consenting to that exclusive venue and jurisdiction. **No** aggressive mandatory-arbitration + class-waiver clause at launch.
*Reasoning:* for a solo/small LLC, a consumer-arbitration program adds per-case administrative fees that can exceed the value of small claims, real mass-arbitration exposure, and enforceability scrutiny that is heightened for grief-adjacent consumer contracts — the findings doc flags exactly this. Courts in the home county keep disputes cheap to defend and the clause easy to enforce.
*Why still open for counsel:* the courts-vs-arbitration trade-off is a genuine legal-judgment call (arbitration can also *reduce* class exposure), so counsel should confirm the leaning or make the case for arbitration with eyes open — not boilerplate either one. (Venue county is now settled: Broward.)

**1.5 — Limitation-of-liability cap.** — 🔴 **NEEDS COUNSEL** *(owner starting position noted)*
*Owner starting position for counsel to price/confirm:* a **fixed floor** — cap liability at **the greater of (a) fees paid in the trailing 12 months or (b) $100** — rather than fees-paid alone.
*Reasoning:* the product has **no fee floor for a large swath of users** (7-day free trial; playback of already-saved messages is not subscription-gated), so a pure "fees paid in the last 12 months" cap could be near-zero for many claimants. A modest fixed floor keeps the cap meaningful and defensible. Final figure is counsel's call.

**1.6 — Liability disclaimers to include.** — 🟡 **OWNER WORKING POSITION (2026-08-31): yes to all.**
Owner accepts the recommendation to **expressly disclaim liability for each of the following** (counsel to draft the operative language):
- **Failed or delayed delivery** — delivery is entirely unbuilt today, but the disclaimer future-proofs any later delivery feature.
- **Incorrect recipient information** — recipients are free-text labels the creator enters; nothing is validated.
- **Recipient conduct** — how any future recipient uses or reacts to a message.
- **Third-party outages** — Supabase, Vercel, Stripe, ElevenLabs, Anthropic are all load-bearing vendors.
- **Permanent preservation** — the product makes no durability/archival guarantee; storage depends on vendors and the active subscription.
- **Emotional distress from receiving legacy messages** — the subject matter is grief- and death-adjacent; this is a foreseeable claim category worth an express disclaimer.

---

## Section 2 — Product-reality decisions (delivery & estate framing)

*(Findings §6, §7. The headline gap between branding and product.)*

**2.1 — How should the Terms describe the product without implying delivery?**
The entire posthumous/"legacy message" delivery system is **unbuilt**: no email/SMS provider is installed, no scheduling, no death verification, no release trigger, no recipient-facing view. A "recipient" is a private label (name + optional relationship + optional internal note; **no email, phone, or address**). Messages are played back **only by the authenticated creator**. Counsel must choose language that describes ESSENCE as it actually is today — a private voice-vault the creator records into and plays back — **without** promising or implying that messages will be delivered to named recipients, now or on death. The current marketing framing ("for the people you choose," recipient tagging) invites a delivery assumption that is currently false.

**2.2 — Include a "not a will / trust / estate service" disclaimer?**
Recommend **yes.** There is no such disclaimer anywhere in the repo.
*Context:* even without delivery, recipient-tagged messages may be *perceived* by users as bequests or estate instructions. Suggested scope for counsel: an explicit statement that ESSENCE is **not** a will, trust, estate-planning service, executor, fiduciary, digital-estate custodian, or probate tool, and that users should not rely on it as the sole location for legally-important instructions (asset lists, passwords, crypto keys, funeral/medical/guardianship directions).

---

## Section 3 — Consent & voice-cloning (strings counsel must draft)

*(Findings §1.4, §5.2. The code team will implement whatever exact string counsel supplies — so these are drafting asks, not just decisions.)*

**3.1 — Affirmative consent-to-clone wording.**
There is currently **no** affirmative consent gate before a synthetic voice is created — only a passive "I understand" acknowledgement on a privacy screen. Voice cloning implicates biometric-privacy regimes (Illinois BIPA and similar), GDPR special-category data, and ElevenLabs' own required-consent terms. Counsel should **draft the exact affirmative-consent string** to be shown and checkbox-gated before cloning.
*Suggested starting language (for counsel to refine):* "I consent to ESSENCE and its service providers processing my voice recordings to create and operate my personalized synthetic voice."

**3.2 — Ownership / anti-impersonation attestation wording.**
There is currently **no** attestation that the voice being cloned belongs to the user or that they are authorized. There is also no technical speaker-verification or liveness check — any audio the microphone hears is accepted. Counsel should **draft the exact attestation string** the user must affirm before cloning.
*Suggested starting language (for counsel to refine):* "This is my own voice, or I am authorized to create a synthetic voice from these recordings, and I am not impersonating any other living or deceased person."
*Related decision:* the product's "voice keepsake / for someone you love" framing is compatible with a user wanting to preserve a **dying relative's** voice. Counsel should decide the intended-use policy on cloning another person's voice (living or deceased) and whether authorization/consent-of-the-subject language is required in the attestation above.

---

## Section 4 — Pricing / subscriptions

*(Findings §9–10. Correcting a stated assumption plus two policy calls.)*

**4.1 — Confirm the real launch price sheet.**
The code has exactly **one paid product — "Voice Vault"** — at **$12.99/month or $119/year** (annual billed as "Save 24%"), with a **7-day, one-time free trial** (first subscription only). There is **no $19.99 "Legacy" tier and no $29.99 "Guardian" tier** in the code — "Legacy" is a message category + a marketing waitlist, and "Guardian" is a code comment about a future feature. If a 3-tier ladder is intended, it is **unbuilt.** Owner must confirm the actual launch price sheet so the Terms and any pricing disclosures match reality.

**4.2 — California Automatic Renewal Law (ARL) checkout-flow implications.**
The subscription auto-renews (monthly or annual) via Stripe. California's amended Automatic Renewal Law (amendments effective **2025-07-01**) tightens requirements for clear-and-conspicuous auto-renewal disclosure, affirmative consent at checkout, and an easy online cancellation path. Counsel should confirm the **checkout-flow disclosures and cancellation mechanics** meet the ARL (and comparable state laws). *Note for context:* cancellation today is **cancel-at-period-end via the Stripe Customer Portal** (not immediate), and there is no separate in-app cancel confirmation screen beyond the portal.

**4.3 — Refund policy.**
**No refunds are implemented** in code — any refund today would be a manual action in the Stripe Dashboard. Proration is Stripe's default via the portal; there is no custom refund or proration logic. Owner + counsel must decide the stated refund policy (e.g., no refunds / pro-rata / 7-day money-back) so the Terms match what will actually be honored.

**4.4 — Lapsed-subscription entitlement (confirm before promising).**
Today the behavior is **mixed**: a lapsed/cancelled user is **blocked from saving new messages** (403) but **can still play back already-saved messages** (playback is not subscription-gated). There is no grace period, read-only mode, or auto-delete on lapse. Owner should confirm the intended entitlement (keep playback? lock? delete after non-payment?) before the Terms promise anything, since any "we may delete after prolonged non-payment" clause would describe a *future/manual* capability, not current behavior.

---

## Section 5 — Privacy-rights posture

*(Findings §12. Which rights apply depends on the company's size/revenue thresholds — a determination for counsel.)*

**5.1 — Confirm which privacy regimes apply.**
Whether the full slate of CCPA/CPRA business obligations attaches depends on the company's revenue/data-volume thresholds. Counsel should confirm applicability (CCPA/CPRA, and any other state comprehensive privacy laws or GDPR if EU users are in scope) based on the entity's actual size and footprint.

**5.2 — MVP stopgap for DSAR / export / individual deletion.**
Self-serve **data export / DSAR** and **individual-recording deletion** are **not built** (only full-account deletion exists, and that is immediate and synchronous). The findings doc's recommended MVP stopgap is to **honor access, export, correction, and individual-deletion requests manually** via the support inbox and to **state that process explicitly** in the Privacy Policy until self-serve tooling is built. Owner + counsel should confirm this manual-handling posture is acceptable for launch.

**5.3 — Confirm the privacy-contact address and process.**
The only contact surface is **`help@essencevault.app`** — currently a general *support* address, not labeled as a privacy contact. Owner should confirm (a) the exact email to publish as the **privacy/DSAR contact**, and (b) the internal process and response-time commitment for handling manual requests, so the Privacy Policy can state it accurately.

---

## Section 6 — Acceptable-use / prohibited-use (document counsel must author)

*(Findings §5.5, §13. None of this exists in the repo.)*

**6.1 — Author a prohibited-use list.**
There is **no** acceptable-use or content policy anywhere, and no technical content moderation. Counsel should author prohibited-use language covering at least: **threats, harassment, fraud, impersonation, defamation, non-consensual intimate imagery (NCII), instructions to commit illegal acts, hate/abuse, and intellectual-property infringement** (there is no copyright/duration/moderation check on recorded audio today).

**6.2 — Content-removal and account-suspension reservation.**
No takedown, moderation, or suspension capability is built; the only lifecycle action is the user's own account deletion. Counsel should decide whether — and in what terms — ESSENCE reserves the right to **remove content and suspend/terminate accounts** for safety, legal, or abuse reasons. Recommend reserving these rights in the Terms even though enforcement is presently manual.

**6.3 — Reporting process.**
There is no report/flag mechanism. Counsel should define a **reporting/abuse-contact process** (likely routed to the same support inbox for MVP) and state it in the Terms/AUP.

---

## Section 7 — Copy that currently overstates reality (needs legal-approved replacements)

*(Findings §0, §1.7, §4, §8. This marketing copy contradicts what the code does. Engineering is trimming it toward defensible language; counsel should bless the exact replacement strings.)*

The following live in the onboarding "Privacy Promise" copy (`PrivacyPromiseModal.tsx`, `Screen4.tsx`) and currently assert more than the product delivers. Each needs a counsel-approved replacement:

**7.1 — "End-to-end encryption" / "encrypted the moment they leave your device."**
**Not true as written.** There is no client-side or end-to-end encryption; audio is stored as plaintext (TLS in transit, vendor disk-encryption at rest only). *Findings-doc suggested defensible rewrite (for counsel):* "Recordings are encrypted in transit and at rest, and access is restricted to you."

**7.2 — "Not even our team can access them."**
**Not true.** The server holds a Supabase service-role key that can download any user's raw audio, and raw clips are transmitted to ElevenLabs. *Suggested defensible rewrite:* "ESSENCE personnel do not access your recordings in the ordinary course of business" (rather than a literal zero-access claim).

**7.3 — "Permanently gone from our servers within 48 hours."**
**Not what the code does.** Local deletion is **immediate and synchronous** (no 48-hour job). Separately, two facts cut against the promise: the **synthetic voice model on ElevenLabs is never deleted** (no delete call exists anywhere), and **Supabase backups/PITR retain data longer than 48h**. Counsel should draft language that reflects immediate local deletion, discloses backup-retention windows, and addresses the ElevenLabs model. *(Vendor items to confirm: ElevenLabs voice-deletion behavior and DPA; Supabase backup retention window — see findings Appendix.)*

**7.4 — "We will never use your recordings to train AI models."**
**Unsubstantiated by code.** Nothing in the repo configures ElevenLabs for zero-retention/no-training; whether the promise holds depends entirely on the **ElevenLabs account tier + DPA**, which must be confirmed before the claim is relied upon. Counsel should condition or qualify this claim until the vendor contract is verified.

---

## Quick reference — vendor facts counsel should verify

These are not owner decisions but they gate several statements above; the findings doc Appendix has the detail:

1. ElevenLabs account tier + DPA — does it train on / retain uploaded recordings? (governs the "never train" claim)
2. ElevenLabs — is the cloned voice ever purged on their side? (nothing deletes it via code)
3. Supabase backup/PITR retention window (vs. the "48 hours" claim)
4. Supabase bucket privacy (`essence-audio`, `profile-photos` confirmed private in dashboard)
5. Vercel HTTPS/HSTS enforcement (no security-header config in the repo)

---

*This packet is the owner's homework; the findings doc is the technical companion. Where a "suggested default" appears, it is a starting point drawn from the code findings for counsel to accept or override — not legal advice from the engineering team.*
