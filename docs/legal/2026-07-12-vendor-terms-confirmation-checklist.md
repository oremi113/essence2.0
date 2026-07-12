# ESSENCE — Vendor Terms Confirmation Checklist

**Derived from:** `docs/legal/2026-07-12-legal-questionnaire-code-findings.md` (Appendix — "Vendor facts to confirm") · **Date:** 2026-07-12

**What this is:** A plain-English, do-it-yourself list for the owner. Each item is a question to ask a vendor (or a setting to check in a dashboard), why it matters, and where to find the answer. These are questions **to ask** — none of the answers are known yet. Get the important ones **in writing** (an email reply or a signed document), because they back promises we make to users.

**Work top to bottom.** ElevenLabs is first because it is the one vendor that receives the actual raw voice recordings and stores the AI voice clone — it backs almost every privacy promise we make.

---

## Priority 1 — ElevenLabs (receives raw recordings + hosts the voice clone)

ElevenLabs is where the raw voice recordings are sent and where the cloned voice lives. Four answers here decide whether three of our headline promises are true. **Send the email draft below** to get 1–4 in writing.

| ✅ | # | Ask them (exact question) | Why it matters / promise it backs | Where to find the answer |
|----|---|---------------------------|-----------------------------------|--------------------------|
| ☐ | 1 | "Do you use customer inputs — uploaded audio, generated audio, or text — to train or improve your models, ours or anyone's? Please confirm in writing." | Backs the promise: **"We will never use your recordings to train AI models, ours or anyone else's."** Our code does nothing to opt out of training — so this promise is only true if ElevenLabs says so contractually. | Their reply email + the Data Processing Agreement / enterprise terms. Ask for it in writing; a marketing-page claim is not enough. |
| ☐ | 2 | "What is your data-retention period for uploaded voice samples and for the cloned voice? Is a zero-retention, enterprise, or DPA tier available — what does it cost and require?" | Determines how long our users' raw recordings and clones physically survive on ElevenLabs' side. Backs **"permanently gone from our servers within 48 hours"** — that can't be true if ElevenLabs retains data longer. | Their sales/support reply; the enterprise/DPA tier terms. |
| ☐ | 3 | "When we call `DELETE /v1/voices/{voice_id}`, does that actually purge the cloned voice AND the training samples from your systems — including backups and logs — and on what timeline?" | Backs **"permanently gone from our servers within 48 hours."** (Note for us: our app does **not** currently call this delete at all — see findings §1.5/§8.2 — so this needs both a code fix and this vendor confirmation.) | Their reply email + API documentation for the delete endpoint. |
| ☐ | 4 | "Is a signed Data Processing Agreement (DPA) available? Do you act as a data processor / subprocessor for our users' data? Please send the DPA to sign." | A DPA is the document that legally binds items 1–3. Our privacy policy will need to name ElevenLabs as a subprocessor. | Request the DPA directly; larger vendors have a standard one on request or on a "legal/trust" page. |

### Ready-to-send email — ElevenLabs support/sales

Send to their support or sales/enterprise contact. Replace the bracketed bits before sending.

```
Subject: Data handling, retention, and DPA questions — [ESSENCE / your account email]

Hello,

We build a consumer product (ESSENCE) that uses your API to create and
play back a personalized voice for our users. Because we make specific
privacy promises to those users, I need to confirm a few points about how
you handle the audio and voices we send you. Written answers would be
greatly appreciated, as we may reference them in our privacy policy.

1. Training: Do you use customer inputs — uploaded audio, generated
   audio, or text — to train or improve your models (yours or any third
   party's)? Can you confirm in writing that our audio is not used for
   model training, and tell me whether that requires a specific account
   tier?

2. Retention: What is your data-retention period for (a) uploaded voice
   samples and (b) the resulting cloned voice? Do you offer a
   zero-retention, enterprise, or DPA-backed tier — and if so, what does
   it cost and require?

3. Deletion: When we call DELETE /v1/voices/{voice_id}, does that
   permanently purge both the cloned voice and its training samples from
   your systems, including backups and logs? On what timeline does that
   deletion complete?

4. DPA: Do you offer a signed Data Processing Agreement, and do you act as
   a data processor/subprocessor for the end-user data we send? If so,
   please send the DPA so we can review and sign it.

Thank you — I'm happy to hop on a call if that's easier.

Best regards,
[Your name]
[ESSENCE] · [account email] · [website]
```

---

## Priority 2 — Supabase (database + plaintext audio storage)

Supabase stores the recordings and the database. These are mostly **dashboard checks you can do yourself** rather than emails.

| ✅ | # | Check / confirm | Why it matters / promise it backs | Where to find it |
|----|---|-----------------|-----------------------------------|------------------|
| ☐ | 5 | Confirm the **automatic backup / Point-in-Time-Recovery (PITR) retention window** on our current project tier (e.g. 7 days, 28 days). | Deleted recordings survive in backups for this long — directly bears on **"permanently gone within 48 hours."** If backups keep data 7+ days, "48 hours" is not accurate for backups. | Supabase Dashboard → your project → **Database → Backups** (and **Settings → Add-ons / PITR** if PITR is enabled). |
| ☐ | 6 | Confirm the storage buckets **`essence-audio`** and **`profile-photos`** are set to **PRIVATE** (not public). | If either bucket is public, anyone with a URL could reach raw recordings or photos — a serious privacy breach. Bucket privacy is set in the dashboard, not in our code, so it must be eyeballed in the live project. | Supabase Dashboard → **Storage** → click each bucket → confirm it is **not** marked "Public." |
| ☐ | 7 | Confirm the **at-rest encryption posture** (Supabase encrypts data at rest by default). | Supports "encrypted at rest" in the policy. **Important caveat to state plainly:** this is disk-level encryption by the vendor, **NOT** end-to-end encryption — Supabase (and our server) can still read the plaintext. So we cannot claim "not even our team can access them." | Supabase security/compliance documentation and their SOC 2 report (Dashboard → **Settings → Compliance**, or their trust/security page). |

---

## Priority 3 — Vercel (hosting)

| ✅ | # | Check / confirm | Why it matters / promise it backs | Where to find it |
|----|---|-----------------|-----------------------------------|------------------|
| ☐ | 8 | Confirm **HTTPS is enforced** and **HSTS is enabled** at the platform/domain level. | Backs "encrypted in transit." Our repo has **no** security-header config, so this relies entirely on Vercel's platform default — worth confirming it is on for our domain. | Vercel Dashboard → your project → **Settings → Domains** (HTTPS/SSL status). For HSTS, check Vercel's docs or test the live site with a header-checking tool (e.g. an SSL/HSTS scanner) against our domain. |

---

## Priority 4 — Stripe (payments)

| ✅ | # | Confirm / decide | Why it matters / promise it backs | Where to find it |
|----|---|------------------|-----------------------------------|------------------|
| ☐ | 9 | Note that **Stripe customer, payment, and invoice records are intentionally retained after account deletion** (for tax/financial-record reasons). Confirm this posture is acceptable and is reflected in the privacy policy. | When a user deletes their ESSENCE account, we cancel their subscription but do **not** delete their Stripe payment history (findings §8.4). This is normal and legally expected — but our privacy policy must **disclose** that financial records outlive account deletion, so a user isn't surprised. | Stripe Dashboard → **Customers** (records persist there). Confirm the retention wording with counsel and make sure the privacy policy says transaction records are kept for legal/tax purposes. |

---

## After you have the answers

- Save every written reply (especially ElevenLabs 1–4 and the signed DPA) in one place — counsel will reference them.
- Where a vendor answer **contradicts** a current promise (most likely the "48 hours" and "never train" claims), flag it back so the copy or the code gets fixed before launch. See the "Copy that currently contradicts the code" section of the findings doc.
- Items 5, 6, and 8 you can complete yourself today in the dashboards — do those first while you wait on ElevenLabs' email reply.
