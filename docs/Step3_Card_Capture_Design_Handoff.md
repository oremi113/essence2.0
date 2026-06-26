# Step 3 · Card Capture — Subscribe-Moment Design Brief

**For:** the design architect
**From:** engineering
**Date:** 2026-06-19
**Status:** This is a **re-architecture**, not a reskin. A working five-screen
vault arc ships today (`Reveal → Protect → Continuity → Seal → Sealed`), built in
the 7a session — competent, but outdated on **journey order** and incoherent on
its **hero object**. Two things changed since it was built: (1) we confirmed card
capture happens **before** voice processing and the Vault Reveal — you commit,
*then* the voice is created, *then* Reveal is the payoff — which moves screens
around; and (2) we've decided the **Vault is its own significant product object**,
deliberately *not* the Breath Stone. Your deliverable is a **new self-contained
prototype** of the card-capture moment, `prototypes/essence-step3-card-capture.html`,
plus a single, weighty **Vault signature object** the moment is built around.
Appendix A is a token starter kit — design from those exact values up front.

---

## 0. The why (read once, then work from §1)

Card capture is the **commercial heart of the product.** Our monetization theory:
the **majority of users pay for the Vault itself** — preservation is the value —
while a smaller, active cohort go on to make messages. That makes this moment do
the heaviest commercial lifting in the whole app, and it's why the Vault gets a
**significant signature object of its own**, separate from the Breath Stone (the
Stone is the *voice/breath* metaphor; the Vault is the *preservation/protection*
metaphor — two products, two objects, on purpose — see §5).

The emotional brief from spec (MASTER_SPEC §Step 3): *"User commits to protecting
what they have built. The moment feels like a natural continuation of the journey,
not a gate."* Hold both halves. It's a **commit**, and we **do** use a loss-frame
to drive it (§1, §8) — but the register stays warm and continuous, not a paywall
slammed across the path.

**The ordering change (this is the load-bearing one).** Per Pricing Architecture
V3.0 (MASTER_SPEC §Step 3, l.418): *card is required before voice processing; there
is no free path; ESSENCE cannot absorb the ~$6 per-user voice-creation cost without
payment commitment.* So the true sequence is:

> Voice Training (record reference clip) → **Card Capture [THIS MOMENT]** → 7-day
> trial begins → Voice Processing (~the wait) → **Vault Reveal (payoff)** → First
> Playback → First Message → Home B

The shipped arc front-loads "Vault Reveal" *before* the ask and ends "Sealed → Create
a message." Both are now wrong: at card-capture time **the user has not heard their
preserved voice yet** — it doesn't exist until they commit. The Reveal is the
*reward for committing*, and it **relocates out of this brief** to the post-processing
beat (see §4, §7). The confirmation at the end of *this* moment leads into
**processing/"we're creating your voice now,"** not into message creation.

---

## 1. What to design (the scope checklist)

**The core surface (load-bearing — design all of these):**
- [ ] **The Vault signature object.** One significant, distinct, *weighty* object
      that represents the Voice Vault. It is the emotional and commercial anchor of
      this moment and will recur wherever the Vault appears (status lines, restore,
      the relocated Reveal). **Resolve the current split** (today there are *two*
      unrelated metaphors — a metal dial on Reveal/Sealed and a pearl/orb on
      Continuity/Seal). Pick one and make it singular. **Not** the Breath Stone —
      see §5 for why and for the line we're drawing between them.
- [ ] **The value + commitment ask.** What the Vault is, what they get (the four
      bullets, §6), the price, the plan choice, and the trial terms — in a calm,
      confident register. This is the "natural continuation" half of the brief.
- [ ] **The loss-frame beat.** The single, deliberate moment where we name the
      stakes: *without protection, what they've built doesn't endure.* We want this
      and we want it **here** — see §1 "Locked decisions" and §8. Design it with
      weight; it's earned because we use it almost nowhere else.
- [ ] **The checkout CTA — once.** The shipped arc has **two** checkout-initiating
      buttons ("Start 7-Day Trial" on Protect *and* "Seal My Vault" on Seal),
      separated by a screen. **Collapse to one card-capture CTA.** Decide where the
      single commit action lives in the moment's flow.
- [ ] **Plan toggle — monthly / annual.** Monthly $12.99, annual $119 ("Save 24%").
      Annual is the default-selected, higher-value choice today; keep it earning
      that default or argue otherwise.
- [ ] **The post-commit confirmation → handoff to processing.** After checkout
      succeeds: a calm "your card is in, we're now creating your voice" beat that
      hands off to the **processing wait** (not to "create a message"). This replaces
      today's "Sealed → Create a message."
- [ ] **A low-commitment exit.** Today's "Not now" / "Maybe later." There **is** no
      free path to processing, so decide honestly what "not now" means here (defer
      the whole journey? park them?) and design the affordance to match — don't
      promise an option that doesn't exist.

**Out of scope for this brief (do NOT design — but know they're affected):**
- [ ] **The Vault Reveal payoff.** It relocates to *after* processing and becomes a
      **sibling brief** (the ceremonial "here is your preserved voice" moment). You
      *do* design the Vault object it will reuse — but not the Reveal screen here.
- [ ] **Restore / lapsed flows.** `VaultRestoreScreen` shipped in M1 (hardened,
      tested). It reuses the Vault object you create, but its screens aren't in scope.
- [ ] **Legacy & Guardian tiers.** V1 is **Vault only** ($12.99/mo). No tier ladder,
      no upsell during activation (MASTER_SPEC §Step 3: "No Legacy or Guardian
      exposure during activation").

**Locked decisions (owner call — do not redesign around removing these):**
- [ ] **Keep the loss-frame, here.** This is the deliberate place we use it; it's a
      powerful driver precisely *because* it's rare across the app. Make it land.
      Don't soften it into a generic benefits line.
- [ ] **Vault object ≠ Breath Stone.** The differentiation is a product decision,
      not an oversight. Two objects, on purpose (§5).
- [ ] **Card before processing/Reveal.** The reorder is decided (§0). Design the
      moment as the *first* time money is mentioned and *before* the voice exists.

**Still your call (open design decisions):**
- [ ] **Screen count & flow shape.** With Reveal relocated and the two CTAs
      collapsed to one, how many screens *is* this moment — one rich screen, or a
      short 2–3 beat sequence (value → loss-frame → commit)? You own the structure;
      the constraints are only: one Vault object, one checkout CTA, the loss-frame
      present and weighty, ends by handing off to processing.
- [ ] **Where the loss-frame sits** relative to the price. Before the ask (set
      stakes, then price) or interleaved? Today it's a standalone bridge screen
      (Continuity) *after* the price — decide if that's still right.
- [ ] **How the Vault object behaves** at each beat — does it visibly "seal"/resolve
      on commit? Is the seal motion the commit feedback? (Today a separate
      `SealAnimation` plays; you may fold it into the one object.)
- [ ] **The loss-frame copy at this point in the journey.** Subtlety: the user hasn't
      *heard* the preserved voice yet (it's not made). "Won't remain available" has
      to be about **the work they've put in** (their recorded voice, this commitment),
      not a thing they've already experienced losing. Get the tense right.

---

## 2. What Card Capture is (the intent to protect)

The moment the user commits to preserving the voice they've just recorded — before
it's processed, before they've heard the result. The **first and primary monetary
ask** in the journey, framed as continuation, not toll-gate.

**Emotional intent (MASTER_SPEC §Step 3):** *the user commits to protecting what
they've built; it feels like a natural continuation of the journey, not a gate.*
Confident, warm, weighted with quiet significance — this is the decision the
business rests on, and it should feel important to the user too, not transactional.

**System rules (locked — MASTER_SPEC §Step 3 / Pricing V3.0):**
- Card is **required before voice processing** begins. No free path.
- **7-day trial begins at card capture.** Trial is **Vault tier only** ($12.99/mo
  after trial). No Legacy/Guardian exposure during activation.
- Voice processing (~$6 cost) triggers **only** after successful card capture.
- The Vault is **named** the "Voice Vault" — calm register elsewhere, but this is
  the moment it carries the most weight.

## 3. States the prototype should cover (and switch via the dev rail)

1. **Default — annual selected.** The primary path: annual plan, "Save 24%," full
   value + loss-frame + commit.
2. **Monthly selected.** Plan toggle flipped; price + terms update.
3. **Checkout submitting.** The commit CTA pressed — the in-between while we open
   Stripe / create the session. Calm, on-brand, **not** a spinner-on-blank.
4. **Checkout error.** Card declined / session failed to create — warm, oriented,
   retryable. (Engineering owns the codes; you own how the user feels.)
5. **Post-commit confirmation → processing handoff.** Card captured; the Vault
   object resolves/seals; copy hands off to "we're creating your voice now."
6. **The loss-frame beat in isolation** (if it's its own screen) — so we can tune
   its weight at 4× without scrolling the whole flow.
7. **Reduced-motion** resting state for the Vault object and any seal motion.

*(Deliberately not in the prototype: the Vault Reveal payoff, restore/lapsed,
any tier ladder — see §1.)*

## 4. How users get here, and where they go next

**Entry:** Voice Training complete (user has recorded their reference clip) →
**Card Capture**. This is the first time money is mentioned.

**Exit:**
- **Commit (primary)** → Stripe Checkout → on success, post-commit confirmation →
  **Voice Processing** (the wait) → *then* Vault Reveal (sibling brief) → First
  Playback → First Message → Home B.
- **Not now (low-commitment exit)** → defers the journey (no processing happens;
  there's no free path). Design the honest version of this — see §1.

**Note the reroute vs. today:** the shipped flow is `Reveal → Protect → Continuity
→ Seal → Sealed → (create a message)`. The new flow puts card capture *first*,
relocates Reveal to *after* processing, and ends this moment at the processing
handoff. The **URLs don't change** (engineering's problem — §7); the **order the
user walks them** does.

## 5. The visual language (source it from the app) — and the Vault/Stone line

Self-contained in the prototype (`:root` block), sourced from the app's canonical
language — exact values in **Appendix A** (some differ from `docs/design-tokens.md`,
which has drifted).

- **MINERAL & WARMTH palette + Spectral/Inter type.** Cream grounds, mineral CTAs,
  warm-keyed shadows. For *this* moment, the **ceremonial warm grounds**
  (`--color-bg-gold`, `--color-bg-rich`) are apt — it's a weighted, significant beat,
  not an everyday screen.
- **The Vault signature object — your central deliverable.** Significant, singular,
  weighty. **Where it sits relative to the Breath Stone:**
  - The **Breath Stone** is the app's signature object for the **voice / breath /
    presence** metaphor — it breathes, it's alive, it's the *person*. (See
    `prototypes/breath-stone-api.md`. Do not reuse it here.)
  - The **Vault object** is the **preservation / protection / endurance** metaphor —
    the *thing that keeps the voice safe over time.* It can be still, architectural,
    enclosing, sealable — qualities the Stone deliberately isn't. The seal/resolve
    motion is a natural fit for the commit feedback.
  - They should read as **kin in the same world** (same palette, same craft) but
    **distinct objects** — a user must never confuse "my voice" with "the vault that
    holds it." Today's metal dial gets closer to "vault" than the pearl; treat
    neither as canon — design the real one.
- **What we're replacing — open this first.** `prototypes/old-monetization-trigger.html`
  is the **full interactive prototype** the current arc was built from (reveal →
  loss-frame → pricing → seal); open it in any browser to click through what exists
  today. `src/app/dev/vault` is the same arc rendered in production (real
  motion/tokens) if you can run the repo.
- **Tonal neighbors:** `prototypes/vault-design-palette.html` (the existing vault
  color/status language), `prototypes/essence-step7-memory-shelf.html` (the keepsake
  calm the journey lands in).

## 6. The data you can design around

The moment can surface:
- **Plan choice** — monthly ($12.99) / annual ($119, "Save 24%"), annual default.
  (Canonical: `src/lib/vault.ts` `VAULT_PRICING`.)
- **The four value bullets** (`VAULT_BULLETS`): *1 preserved voice profile · 3
  lifetime messages included · Secure long-term storage · Private and encrypted.*
  Copy candidates open (§8), but these are the locked value props.
- **Trial terms** — 7 days free, cancel anytime, then $12.99/mo (or annual).
- **Subscription status** is `none` at entry (never captured a card). On success it
  becomes `trial`. (`SubscriptionStatus` in `src/lib/vault.ts`.)

Design for what *should* be there; engineering makes the data match — §7.

## 7. Notes for engineering — *not your job, just so you know it's handled*

- **The reorder is ours to wire.** Card capture moving before processing/Reveal is a
  **journey-wiring** change, not a backend one. **URLs never change** (CLAUDE.md /
  DECISIONS lock): `vaultReveal`, `vaultProtect`, `vaultContinuity`, `vaultSeal`,
  `vaultSealed`, `record` all stay (`src/lib/routes.ts`). We re-sequence which screen
  the user hits when; you design the moment, we route it.
- **Stripe is live-ish.** `POST /api/stripe/create-checkout-session` (monthly/annual),
  the customer portal, and webhooks (trial→active→past_due→lapsed→cancelled) shipped
  and hardened in M1 (66 tests). `VAULT_PRICING` carries `PLACEHOLDER_*` price IDs we
  swap for real Stripe products at wiring time. Checkout itself is **hosted by Stripe**
  — you're designing the *approach* and the *return*, not the card-number form.
- **The relocated Vault Reveal** becomes a sibling brief on the post-processing beat.
  Design the **Vault object** here; it'll be reused there (and in restore).
- **Current implementation we're replacing:** `VaultProtectScreen`,
  `VaultContinuityScreen`, `VaultSealScreen`, `VaultSealedScreen`,
  `VaultRevealScreen` in `src/components/screens/vault/`; the arc is wired in
  `src/app/dev/vault/page.tsx`. We'll build the new screen(s) in
  `src/components/screens/`, keep page.tsx files thin, and add `/dev/` pages with
  mock data (CLAUDE.md).
- The prototype stays a **self-contained HTML file** (inline `<style>`, tokens in
  `:root`, a dev rail for §3 states) and becomes the **design source of truth** —
  production mirrors its copy, timing, motion, layout. Keep a short **NOTE FOR CODE
  ARCHITECT** header current.

## 8. Copy candidates (carry these over; we'll do a clarity pass after)

Audience skews boomer / Gen X — **clarity beats cleverness.** Confident, warm; this
is the one place a loss-frame is on-brand, so it can have edge — but never cheap.

- **Value headline:** "Preserve your voice for the people who matter most." /
  "Keep your voice available, for good."
- **Plan / price:** "$12.99/month" · "$119/year — save 24%" · "7 days free. Cancel
  anytime."
- **The four bullets (locked props, copy open):** "1 preserved voice profile" · "3
  lifetime messages included" · "Secure long-term storage" · "Private and encrypted."
- **Loss-frame beat (keep the weight; fix the tense — they haven't heard it yet):**
  "What you've recorded won't last on its own. Protect it, and it endures." /
  "Your voice is ready to be preserved — without this, it isn't kept." *(Today's
  "Without protection, your preserved voice won't remain available" implies a voice
  that already exists; reshape for *before* processing.)*
- **Commit CTA (one, not two):** "Protect my voice" / "Start my 7-day trial" /
  "Seal my Vault." *(Pick one identity; today "Start 7-Day Trial" and "Seal My
  Vault" compete.)*
- **Post-commit → processing handoff:** "Your Vault is sealed. We're creating your
  voice now — this takes a moment." *(Replaces "Your voice is protected → Create a
  message.")*
- **Low-commitment exit:** *(give it your first go — must be honest that there's no
  free processing path; "not now" defers, it doesn't unlock a free tier.)*

---

## 9. The motion bar

**Mobile-first**, 390×844 baseline; must hold at a **4× CPU throttle** on a
simulated mid-range phone (`scripts/throttle-dev.mjs` or Playwright CDP). Check at
4×: the **Vault object's** idle presence and its **seal/resolve** on commit (this is
the moment's signature motion — it carries the "you committed, it's safe now" beat),
the **loss-frame entrance** (weight without melodrama), the **checkout-submitting**
state (no blank spinner), and the **page-arrival stagger** (`--ease-page`). If they
feel off at 4×, they'll feel off on a real mid-range Android at 1×. Honor
`prefers-reduced-motion` (pin the Vault object to a mid-frame resting state).

---

### Reference index
- **Prototype to build:** new → `prototypes/essence-step3-card-capture.html`.
- **Spec:** `docs/MASTER_SPEC.md` §Step 3 (Card Capture, l.636), l.418 / l.589 / l.1867
  (V3.0 ordering & cost rationale), §Step 4 (the relocated Reveal payoff, l.655).
- **Pricing/constants (canonical):** `src/lib/vault.ts` — `VAULT_PRICING`,
  `VAULT_BULLETS`, `SubscriptionStatus`, `VAULT_EVENTS`.
- **Tokens (canonical):** `src/app/globals.css` `@theme` — see Appendix A.
  `docs/design-tokens.md` is a guide but has drifted (A.1).
- **Routes (canonical, don't invent):** `src/lib/routes.ts` — `record` `/app/record`,
  `vaultProtect` `/app/vault/protect`, `vaultReveal` `/app/vault/reveal`,
  `vaultContinuity` `/app/vault/continuity`, `vaultSeal` `/app/vault/seal`,
  `vaultSealed` `/app/vault/sealed`.
- **What we're replacing (interactive):** `prototypes/old-monetization-trigger.html`
  (the current arc as a clickable, self-contained prototype — the design source the
  shipped screens were built from); `src/app/dev/vault` (production rendering);
  screens in `src/components/screens/vault/`.
- **Tonal neighbors:** `prototypes/vault-design-palette.html`,
  `prototypes/essence-step7-memory-shelf.html`. **Stone (for contrast, do not
  reuse):** `prototypes/breath-stone-api.md`.
- **Format mirror:** `docs/Step8_Home_B_Design_Handoff.md`,
  `docs/Step7_Memory_Shelf_Design_Handoff.md`.

---

# Appendix A · Token starter kit (design from these — they're canonical)

**Source: `src/app/globals.css` `@theme`** (the true canonical, read 2026-06-19).
⚠️ Two values **differ from `docs/design-tokens.md`**, which is stale — these were
the primary cause of the Step 7 "disjointed" finding, so get them right from the start.

## A.1 ⚠️ The two that bit Step 7 — use the `globals.css` values, not the doc's
- **`--ease-breath: cubic-bezier(0.37, 0, 0.63, 1)`** — symmetric pendulum, reserved
  **only** for the Breath Stone's resting rhythm. The Vault object is **not** the
  Stone — do **not** put it on `--ease-breath`. Give it its own character on
  `--ease-essence` / `--ease-page`, or a bespoke curve you declare. (`design-tokens.md`
  wrongly lists `0.4,0,0.2,1`.)
- **`--shadow-mineral: 0 4px 14px rgba(110, 80, 40, 0.20)`** — warm-keyed, so the cool
  mineral CTA sits naturally on cream. Apply to the primary commit button.
  (`design-tokens.md` wrongly lists the old teal `rgba(74,107,126,0.3)` — re-keyed
  2026-06-12, FOLLOW_UPS #40.)

## A.2 Motion curves & durations
- `--ease-essence: cubic-bezier(0.4, 0.0, 0.2, 1)` — **universal** state transitions.
- `--ease-page: cubic-bezier(0.22, 1, 0.36, 1)` @ `--duration-page: 700ms` — signature
  page arrival + staggered children. Use for the moment's entrance.
- `--ease-press: cubic-bezier(0.2, 0.0, 0.0, 1)` — button press / tactile.
- Durations: `--duration-micro 200ms`, `--duration-small 400ms`,
  `--duration-medium 800ms`, `--duration-large 1200ms`,
  `--duration-ceremonial 2000ms` (ritual one-shots — apt for the seal/commit swell).

## A.3 Color
- Grounds: `--color-bg-neutral #FBF8F4` (cream base). **Ceremonial warm grounds**
  (apt for this weighted moment): `--color-bg-gold #E8D8B3` (honey),
  `--color-bg-rich #D9C28E` (richest; ceremonial endpoint).
- Surfaces: `--color-surface-card`, `--color-surface-warm`, `--color-surface-honey`.
- CTA: `--color-mineral-dark #656B73` (AA-safe primary fill; white text clears
  5.38:1), `--color-mineral-darker #565C63` (pressed). Plain `--color-mineral
  #7A8088` is for active/recording states, **not** white-text fills (fails AA at
  3.98:1).
- Text: `--color-text-primary #1C1A18` (headlines/body), `--color-text-secondary
  #6B6B6B` (supporting), `--color-text-secondary-strong #5A5A5A` (supporting on warm
  surfaces — use this on `bg-gold`/`bg-rich`). **Never** `--color-text-tertiary` on
  small text (fails AA; audience skews 45–70).
- Status: `--color-status-error #9C3528` (terracotta, 6.72:1) — the loss-frame's
  accent if it needs one, but use sparingly; `--color-status-success #4A7A68` (sage,
  4.64:1) for the post-commit confirmation; `--color-status-warning #8A5A1E`.

## A.4 Type, radius, targets
- Type: `--font-display 'Spectral', Georgia, serif` (headlines, tender italic asides);
  `--font-body 'Inter', system-ui, sans-serif` (body, UI, buttons). `--text-title
  28px` (Spectral 600, line 1.4). Floor at `--text-small 14px` — don't go below.
- Radius: `--radius-2xl 16px` (cards), `--radius-pill 20px` (price/plan pills),
  `--radius-lg 10px` (buttons).
- Touch targets: **44px** minimum. Honor `prefers-reduced-motion`.

> Values sourced from `src/app/globals.css` `@theme` on 2026-06-19. Where
> `docs/design-tokens.md` disagrees (A.1), `globals.css` wins.
