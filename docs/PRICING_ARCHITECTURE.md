# ESSENCE Pricing Architecture V3.0

**DTC · Vault-First · Preparedness-Led · Cost-Aligned**

> **Status:** Canonical source of truth for all pricing and monetization decisions.
> The ~30 in-repo references to "Pricing Architecture V3.0" point here.
> **Cross-references:** `docs/MASTER_SPEC.md` Chapter 11 mirrors this; per-message
> COGS basis (~$0.15 typical / ~$0.45 worst-case with 3 regenerations) lives in
> `MASTER_SPEC.md §8.9`. Code constants: `src/lib/vault.ts` (prices), `src/lib/rate-limit.ts`
> and `src/lib/messages/cost-controls.ts` (the caps that enforce cost discipline).
> **V1 shipping status:** Vault ($12.99) is the only live tier; Legacy and Guardian are
> built into the data model but waitlisted (see `MASTER_SPEC.md §V1.1`).

---

# PART I — Strategic Foundation

## 1. Executive Summary

V3 replaces the V2 growth-oriented structure with a disciplined, cost-aligned monetization framework.

Key structural changes:

- No free tier
- No founding member pricing
- No unlimited messaging
- No public comparison grid
- No early Guardian exposure
- No B2B positioning

Voice Vault is the primary monetization product.

Legacy and Guardian are contextual expansions triggered by demonstrated use and responsibility intent.

This architecture optimizes for:

- Paid acquisition viability
- 3–4 month CAC recovery
- ≥70% gross margin
- Controlled AI cost exposure
- Behavioral upsell sequencing
- Reduced cognitive overload at conversion

---

## 2. Core Monetization Philosophy

ESSENCE is preservation infrastructure, not a messaging utility.

We monetize: **Preparation → Responsibility → Continuity**

Key principles:

1. Card required before voice processing
2. 7-day trial included
3. Vault must carry CAC
4. No unlimited usage
5. Expansion is behavioral, not comparative

---

## 3. Cost Structure Overview

### Voice Creation Cost

Approx. **$6 per user** (one-time). Voice is processed only after card capture.

### Ongoing Vault Cost

Estimated ongoing cost: **~$1.50–2.00/month** equivalent.

### Legacy Cost (5 Messages / Month)

Estimated monthly cost: **~$3–4**.

### Contribution Margin Targets

| Tier | Margin target |
|---|---|
| Vault | ≥ $10 / month |
| Legacy | ≥ $14 / month |
| Guardian | ≥ $20 / month |

Target gross margin **≥ 70%**.

> Per-message cost basis (LLM + ElevenLabs audio, incl. the regeneration cap that
> bounds it) is detailed in `MASTER_SPEC.md §8.9`. ElevenLabs' rate is the one
> exogenous input to re-verify before scale; the regeneration cap is the primary
> lever if it shifts.

---

## 4. Acquisition Assumptions

- **Blended CAC:** ~$35–45
- **Monthly churn:** ~7%
- **Payback target:** ≤4 months

Vault must independently recover CAC.

Annual pricing:

- Vault — $119/year
- Legacy — $179/year
- Guardian — $269/year

---

## 5. Activation Architecture

**Voice Training → Card Capture → Trial → Voice Processing → Vault Reveal**

Trial includes Vault only. No Legacy or Guardian exposure during activation.

---

# PART II — Tier Structure & Expansion Logic

## 6. Tier Overview

Three-tier ladder:

1. **Voice Vault** — Preparation
2. **Legacy** — Responsibility
3. **Guardian** — Continuity

No public pricing comparison grid.

---

## 7. Tier 1 — Voice Vault

**Pricing:** $12.99/month · $119/year

**Includes:**

- 1 preserved voice profile
- 3 lifetime messages
- Cold storage stewardship
- Archive access

No replenishment. No additional purchases.

**Role:** Primary conversion product. Must carry CAC.

---

## 8. Tier 2 — Legacy

**Pricing:** $19.99/month · $179/year

**Includes** everything in Vault, plus:

- 5 messages per month
- 1,200 character cap
- Scheduling
- Occasion reminders

Upgrade introduced after 3 lifetime messages used.

---

## 9. Tier 3 — Guardian

**Pricing:** $29.99/month · $269/year

**Includes** everything in Legacy, plus:

- Up to 5 voice profiles
- 5 messages per profile per month
- Shared archive access

Guardian appears only when multi-voice intent is triggered.

---

## 10. Behavioral Expansion Sequencing

| Trigger | Response |
|---|---|
| Activation | Vault |
| Message 1 | No upsell |
| Message 2 | Soft responsibility cue |
| Message 3 | Legacy expansion |
| Multi-profile attempt | Guardian reveal |

---

## 11. Tier Discipline Rules

1. No unlimited message generation
2. No AI cost expansion without pricing review
3. No additional lifetime messages in Vault
4. No new tier without margin simulation

---

## 12. Success Metrics

| Metric | Target |
|---|---|
| Vault Conversion | 40–50% |
| Legacy Upgrade | 20–30% |
| Guardian Adoption | 5–10% |
| Blended ARPU | $18–22 |
| CAC Payback | ≤4 months |
| Churn | ≤7% |

---

*ESSENCE V3.0 is structured for sustainability, cost discipline, and controlled expansion.*
