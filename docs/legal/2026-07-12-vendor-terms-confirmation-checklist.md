# ESSENCE — Vendor Terms Confirmation Checklist

**Derived from:** `docs/legal/2026-07-12-legal-questionnaire-code-findings.md` + a live read of ElevenLabs' published policies (2026-07-12) · **Date:** 2026-07-12 · **Updated:** 2026-09-01 (items 1–2 resolved: Starter tier confirmed, training opt-out re-verified off)

**What changed (read this first):** The earlier version of this doc told you to email ElevenLabs four legal questions. That was the wrong instinct — front-line vendor support does not write substantive legal answers, and it turns out **most answers are already in ElevenLabs' published documents** (Privacy Policy, Terms, DPA). So this rewrite splits the work into three honest buckets:

1. **DO NOW (self-serve, free, high-impact)** — settings you flip and facts you confirm yourself, today.
2. **LAWYER READS (published docs)** — the real answers, already in writing on their site.
3. **SALES / SIGNED AGREEMENT only** — the few things that genuinely require a commercial conversation.

And it flags the hard truths this research surfaced that **change what we can promise users** — those feed the copy + follow-ups, not just this list.

> **Confidence note:** ElevenLabs' policies were read live on 2026-07-12 and are dated (Privacy Policy 20 May 2026, ToS 31 Mar 2026, DPA 8 Apr 2026). Terms change — counsel should re-open the source URLs at drafting time. A few items (Trust Center cert list, IVC/PVC verification specifics) were only partially machine-readable and are marked *medium confidence*.

---

## The three findings that change our promises

Before the checklist, the load-bearing facts — because two of them mean a promise is **not currently true**:

1. **ElevenLabs trains on inputs BY DEFAULT** on non-Enterprise tiers, with a **prospective-only opt-out** (profile icon → Terms and privacy → Data use → "Improve the models for everyone" toggle). Source: [Privacy Policy](https://elevenlabs.io/privacy-policy) — "We may process your Personal Data to research, develop, train and/or otherwise improve our AI models… You may opt out… the opt-out will only apply with respect to Personal Data provided… following the submission of the opt-out." → the promise is false *unless* we opt out. **✅ STATUS: opted out 2026-07-12, pre-launch** — so it's now prospectively true for essentially all real user audio. The stronger "not anyone else's" wording can be restored with counsel's blessing (ElevenLabs also contractually bars its LLM subprocessors from training on customer content — see §10).

2. **Nothing makes the cloned voice "zero retention."** Zero Retention Mode is **Enterprise-only** *and* explicitly **excludes Instant & Professional Voice Cloning**. Source: [Zero Retention Mode docs](https://elevenlabs.io/docs/eleven-api/resources/zero-retention-mode). Retention cap is **"not longer than 3 years after your last interaction"** ([Privacy Policy](https://elevenlabs.io/privacy-policy)), and there is **no published backup-purge SLA** for a deleted voice. → **"permanently gone from our servers" is only true for OUR systems** (Supabase + our `DELETE /v1/voices` call, now in code). Vendor-side, the honest statement is "we instruct ElevenLabs to delete it, and their policy caps retention at 3 years" — not an immediate/absolute purge. This is why we dropped the "within 48 hours" wording.

3. **ElevenLabs contractually requires US to hold the voice owner's consent.** Source: [Terms of Use](https://elevenlabs.io/terms-of-use) §4 — users may upload "audio recordings of your voice **or the voice you are authorized to share**," and "You may not provide Input… for which you do not have all the rights necessary." → **Our consent + ownership-attestation gate (the `VOICE_CONSENT_REQUIRED` scaffold) is not optional polish — it's how we meet a contractual obligation to ElevenLabs.** Prioritize finishing it.

---

## Bucket 1 — DO NOW (self-serve, free, you can do these today)

| ✅ | # | Action | Why it matters | Where |
|----|---|--------|----------------|-------|
| ✅ | 1 | **Opt out of model training** — **DONE 2026-07-12** (pre-launch); **re-verified OFF 2026-09-01** by owner. | Makes "never train" true going forward. Prospective-only, but done before any real users exist, so ~all production audio is covered. Highest-value action on this page. | ElevenLabs → **profile icon (top-right) → "Terms and privacy" → "Data use"** → toggle **"Improve the models for everyone" OFF** → "Update your choice." *(NOT the left-sidebar Settings.)* |
| ✅ | 2 | **ElevenLabs tier — CONFIRMED: Starter ($5/mo, paid)**, owner-verified 2026-09-01 (Billing screen, 90k credits/mo). | **Key resolution:** the model-training opt-out is **NOT tier-gated** — it's available on Starter (and every plan), so **no upgrade is needed** to keep the "never train" claim true. Only **Zero Retention Mode** is Enterprise-only, and ZRM is about *deletion/retention*, not *training*, so it's irrelevant to our claim (item 10). A *binding contractual* training-off (item 11) still needs Enterprise, but that's optional. Sources: ElevenLabs Privacy Policy + [Data-use help article](https://help.elevenlabs.io/hc/en-us/articles/29952728805393-Is-my-data-used-to-improve-ElevenLabs-AI-models). | ElevenLabs dashboard → **Subscription/Billing**. |
| ☐ | 3 | **Confirm our code now deletes the voice on account deletion.** | Backs "permanently gone (our side)." ✅ Already shipped: `deleteVoice()` is wired into account teardown (commit `bb0a0e0`). Just verify it stays wired. | Code: `src/lib/elevenlabs.ts` + `src/app/app/settings/actions.ts`. |
| ☐ | 4 | **Supabase: confirm buckets `essence-audio` + `profile-photos` are PRIVATE.** | If public, anyone with a URL reaches raw recordings/photos. Set in the dashboard, not our code. | Supabase → **Storage** → each bucket → confirm not "Public." |
| ⚠️ | 5 | **Supabase backups — 2026-07-12: upgraded to Pro → DB backups on (7-day, PITR available). BUT Storage/audio NOT included in backups.** | DB metadata now protected. **The actual voice audio (`essence-audio` bucket) is still unbacked** — Supabase says "Storage objects are not included… restoring does not restore deleted objects." The crown-jewel durability gap stays open; needs a separate audio-export/replication strategy. See the P2 launch-gate follow-up (`2026-07-12-production-supabase-free-tier-has-no-backups`). Deletion-copy note: DB metadata lingers in backups up to 7 days; audio is deleted immediately with no backup copy. | Supabase → **Database → Backups** (note the "Storage objects are not included" banner). |
| ☐ | 6 | **Vercel: confirm HTTPS enforced + HSTS on** for the domain. | Backs "encrypted in transit." We have no header config in-repo, so it relies on Vercel's default. | Vercel → **Settings → Domains**; or run an SSL/HSTS scanner against the live domain. |

---

## Bucket 2 — LAWYER READS (already published — no email needed)

Hand these URLs to counsel. They need to read them anyway to write our privacy policy (this is the standard "subprocessor analysis"). Everything here is in writing today.

| ✅ | # | Document + what to extract | Backs / informs | URL |
|----|---|----------------------------|-----------------|-----|
| ☐ | 7 | **Privacy Policy** — training-by-default + opt-out mechanics; the **3-year** voice-data retention cap; biometric-data handling; CCPA/GDPR rights; the enterprise carve-out (business-customer data is governed by the DPA, not this policy). | "Never train" (conditional on opt-out), "permanently gone" (3-yr cap), our own privacy-rights section. | https://elevenlabs.io/privacy-policy |
| ☐ | 8 | **Terms of Use** — the **customer-carries-consent** obligation (§4); output ownership (paid = commercial use); the perpetual/irrevocable license we grant, with the "won't commercialize your voice standalone without permission" limit. *(Note: there's a separate EEA version — read the one matching our entity's governing law.)* | Our consent/attestation gate; our own Terms' voice-ownership language. | https://elevenlabs.io/terms-of-use |
| ☐ | 9 | **DPA** — it's **published and incorporated by reference** (no countersignature process described). Confirms ElevenLabs acts as **processor**; subprocessor list + **30-day** change notice; SCCs/UK/Brazil transfer terms; EU-US Data Privacy Framework certification. Counsel decides if we need to formally "accept" it for our tier. | Naming ElevenLabs as a subprocessor in our policy; international-transfer coverage. | https://elevenlabs.io/dpa · subprocessors: https://compliance.elevenlabs.io |
| ☐ | 10 | **Zero Retention Mode docs** — confirm for counsel that ZRM is **Enterprise-only** and **excludes voice cloning**, so it does *not* help our clone-retention story. Also: ElevenLabs states its third-party-LLM subprocessors are contractually barred from training on customer content regardless of ZRM (useful for the "not anyone else's" sub-claim, re: LLM vendors — not ElevenLabs' own training). | Why we can't promise vendor-side zero-retention; scoping the "not anyone else's" claim. | https://elevenlabs.io/docs/eleven-api/resources/zero-retention-mode |

---

## Bucket 3 — SALES / SIGNED AGREEMENT only (do only if the promise requires it)

These genuinely need a commercial conversation — approach as a prospective **Enterprise** buyer, short and specific, not as a support questionnaire. **Only pursue the ones whose promise you actually want to make.**

| ✅ | # | Item | When you need it | How |
|----|---|------|------------------|-----|
| ☐ | 11 | **Contractual "training off by default"** (vs. the self-serve opt-out) | If counsel wants training-off as a *binding contract term*, not a toggle we could lose. | ElevenLabs **Sales → Enterprise**; it lives in the negotiated DPA/order form. |
| ☐ | 12 | **Written deletion/backup-purge SLA** — confirmation that a deleted voice + its training samples are purged from backups, and on what timeline | If we want to state a concrete deletion timeframe for the *vendor* side (not just "their policy caps at 3 years"). **Not in any public doc.** | Sales / security addendum. Until you have this in writing, don't put a vendor-side deletion *deadline* in user copy. |
| ☐ | 13 | **SOC 2 Type II report** | If counsel/security review wants the actual report. | Request-gated to "entitled" customers under NDA (per the DPA). Ask Sales. |
| ☐ | 14 | **BAA (HIPAA)** | Only if ESSENCE is ever treated as handling PHI — likely **not** relevant to us. | Enterprise-tier only. Skip unless counsel says otherwise. |

---

## Still unverified — flag for counsel

1. **Does deleting a voice purge the training samples from ElevenLabs' backups, and on what timeline?** Not in published docs (item 12). Our copy already avoids a vendor-side deadline because of this.
2. **Trust Center certification list** (SOC 2 Type II / ISO 27001 / PCI DSS L1 / DPF) — corroborated by search + ElevenLabs' own announcements but the Trust Center is a JS app the researcher couldn't read directly. Confirm by logging in at https://compliance.elevenlabs.io.
3. **Instant vs Professional Voice Cloning verification specifics** — IVC is a self-attestation checkbox; PVC adds a "voice CAPTCHA." Sourced from search snippets (the canonical Help Center article blocked automated fetch) — *medium confidence*; verify if it matters to our flow.

---

## Bottom line for the owner

- **The one thing to do today:** ✅ **DONE** — opted out of ElevenLabs training on 2026-07-12, pre-launch (item 1). That's the difference between our "never train" promise being true or false, and it's now true for essentially all real user audio.
- **Most "legal questions" are already answered in their published docs** (Bucket 2) — hand those URLs to your lawyer instead of waiting on a support reply.
- **Two of our promises had to be softened** because of vendor reality (training-by-default; no zero-retention for clones + no backup-purge SLA) — that's already reflected in the trimmed copy and the follow-ups. Opting out (item 1) + a Sales DPA (items 11–12) are the paths to earning the stronger wording back, if you want it.
- **Finish the consent gate** — it's a contractual obligation to ElevenLabs, not optional.
