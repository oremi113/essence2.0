# Step 9 · Settings & Trust — Prototype Design Brief

**For:** the design architect
**From:** engineering
**Date:** 2026-06-30
**Status:** A **fresh design**, not a revision. There is no Settings screen today
— no route, no stub. The Home B settings affordance currently dead-links (by
design — see Step 8 handoff §7). Your deliverable is a **new self-contained
prototype**, `prototypes/essence-step9-settings-trust.html`. Because there's
nothing to audit, Appendix A is a **token starter kit** (same canonical values
that landed Step 7/8 clean) — design from those exact values up front.

---

## 0. The why (read once, then work from §1)

Every other screen in the journey is about *making* something — record, reveal,
create, save, return. Step 9 is the opposite beat: it's where the user confirms
they **own** what they made and can **control** it without fear. The spec's
emotional intent is one sentence — *"User understands ownership and control
without fear"* (§4.2 Step 9). That word **fear** is the whole brief. A boomer/
Gen-X user who just spent real money preserving their voice for someone they love
needs to open Settings and feel *reassured*, not exposed to a wall of
account-deletion and billing toggles that read like a bank's danger zone.

So Settings & Trust is two things braided together: the **functional** account
surface (email, plan, payment, notifications) and the **trust** surface (plain-
language reassurance that the voice and messages are theirs, safe, and under
their control). The trust copy isn't decoration — it's the load-bearing reason
this screen is called "Settings **& Trust**" and not just "Settings."

This is the **last design-gated screen of Phase 1** (M3). It unblocks the build
that makes the product fully manageable — and it carries the **delete-account**
control that Phase 2 (App Store) will require, so getting it designed now is
cheap and getting it wrong later is expensive.

---

## 1. What to design (the scope checklist)

**Ships in V1 (these are load-bearing — MASTER_SPEC §V1.5):**

- [ ] **Account basics** — the user's **email** (display + a way to start a
      change), **password** (a "change password" entry — magic-link/email auth
      today, so this may be "we'll email you a link" rather than an inline form;
      see §7), and **plan visibility** (what they're on: trial / Vault Protected,
      monthly vs annual, renewal or trial-end date).
- [ ] **Subscription management** — **view trial status** (days remaining when on
      trial), **update payment method**, and **cancel** subscription. These are
      the highest-stakes controls on the screen — design them calm and
      reversible-feeling, never a cliff. Cancel especially: warm, "your messages
      stay safe," no dark-pattern friction *and* no guilt-trip. (§V1.5.)
- [ ] **Notification preferences** — a **basic toggle set**. V1 email engagement
      is minimal (welcome, trial-expiring, payment-failed only — §V1.7), so the
      toggles should map to *those*, not invent categories we don't send. Keep it
      to the few switches that correspond to real emails.
- [ ] **Voice-ownership reassurance copy** — the "Trust" half. Plain-language,
      warm statements that the user owns their voice and messages, the messages
      are safe, and nothing happens to them by surprise. This is a **content
      surface**, and it's the screen's emotional anchor (§4.2 Step 9: "ownership
      and control without fear"; §9 transparency is required). Design where it
      lives and how prominent it is.
- [ ] **A "Remove photo" control** — resolves a parked follow-up (FOLLOW_UPS #12):
      today a user who added an onboarding photo and later wants *none* can only
      get there by deleting their whole account. Settings is the home for a
      "Remove photo" (and likely "Replace photo") affordance. Small, but design it
      in.
- [ ] **Sign out.** Mundane but required, and it has to live somewhere calm.

**Delete account — DECIDED, in scope (owner, 2026-06-30):**
- [ ] **Delete account (simple self-serve)** — **build it in P1.** The spec
      conflict is resolved: the **roadmap (M3)** wants *delete account* (Apple
      requires it in P2; it's core to *control without fear*), and **§V1.5**'s
      deferral applies only to *formal GDPR/CCPA tooling beyond minimum* — a
      different thing. **Owner ruling (2026-06-30): ship the simple self-serve
      "delete my account"** (tears down auth + the user's DB rows + their stored
      audio), and **defer** the formal compliance tooling to v2. Design the delete
      flow as a deliberate, calm, **double-confirm** beat that states plainly what
      is erased (account, voice, all messages) and that it can't be undone — the
      one place on this screen where friction is *kindness*, not a dark pattern.

**Out of scope for V1 (do NOT design — spec defers these):**
- [ ] **Voice export / download** — §V1.5 defers to v2. No "download my voice."
- [ ] **Tier upgrade / Legacy & Guardian management** — those tiers are v2
      waitlist deferrals; there's nothing to "manage." No tier switcher.
- [ ] **Formal GDPR/CCPA data-rights tooling** (data export request, processing
      records, etc.) — §V1.5 defers unless legally required. (Distinct from the
      simple self-serve delete above.)
- [ ] **Multi-profile / shared-archive settings** — Guardian-tier, v2.

**Still your call (open design decisions):**
- [ ] **Layout & grouping.** Is this one scrolling screen with grouped sections,
      or a settings *index* that routes into sub-screens (Account, Subscription,
      Notifications, Trust)? On a 390-wide column, a calm grouped single-scroll
      probably beats a multi-level menu for this audience — but it's your call.
      The constraint: **the trust/reassurance content must not be buried** under
      the transactional controls.
- [ ] **Where the Trust content sits** — a header banner? A dedicated section? A
      calm footer note under each risky control ("your messages stay safe")?
      Decide how reassurance is woven through vs. concentrated.
- [ ] **The risky-control treatment** — cancel and (if approved) delete: how much
      visual de-emphasis / confirmation / "are you sure, here's what stays safe"
      scaffolding. Find the line between *calm and reversible* and *frictionless
      footgun*.
- [ ] **Plan-state expression** — how the plan section reads across trial /
      active / past_due / lapsed / cancelled (see §3). The lapsed/past_due case is
      the emotionally loaded one — warm, never punitive, restore is present.

---

## 2. What Step 9 is (the intent to protect)

The control surface that lives **separate from the creation flows** (§4.2 Step 9
system rule). A user opens it to understand and adjust — not to be sold to, not to
be scared. Its job is **trust through transparency and control**.

**Emotional intent (MASTER_SPEC §4.2 Step 9):** *the user understands ownership
and control without fear.* Calm, plain, reassuring. The opposite of a bank's
account-danger-zone.

**System rules (locked, §4.2 Step 9 / §9):**
- The user **owns** their voice and messages — and the screen says so plainly.
- **Transparency is required** — no hidden state, no surprise charges, legible
  subscription status.
- **Control surfaces exist separately from creation flows** — Settings is its own
  place, reached deliberately, never injected mid-create.
- **Messages are immutable** (DECISIONS lock) — there is **no "edit message" or
  "delete a single message"** control here. Don't design one. The only deletion
  is account-level (if approved).

## 3. States the prototype should cover (and switch via the dev rail)

Settings reads differently by **subscription state**. The dev rail should switch:

1. **Trial** — card captured, 7-day trial active. Plan section shows "trial, N
   days left," payment method on file, cancel available (cancel during trial =
   no charge). (`status: 'trial'`.)
2. **Active** — paying (trial converted or direct), monthly or annual. Plan shows
   "Vault · Protected," next renewal date, update-payment + cancel available.
   (`status: 'active'`, `plan: 'monthly' | 'annual'`.)
3. **Past due** — payment failed, Stripe retrying. Warm "we couldn't process your
   payment — update your card to keep your vault protected." Not alarming.
   (`status: 'past_due'`.)
4. **Lapsed** — trial ended without converting, or payment failed past the retry
   ceiling. Vault paused; messages safe; **restore is present** (→
   `/app/vault/restore`). Warm, never punitive. (`status: 'lapsed'`.)
5. **Cancelled** — user voluntarily cancelled. Acknowledge plainly; messages safe
   through the paid-through date; restore/resubscribe path present.
   (`status: 'cancelled'`.)
6. **Loading** — quiet, on-brand skeleton while account + subscription data
   resolve (§V1.6).
7. **Error** — settings data couldn't load; calm, oriented, retry (§V1.6).

*(Delete-account is in scope — add a **delete-confirmation** state, the
double-confirm beat, as a switchable view too.)*

## 4. How users get here, and where they go next

**Entry:** the **quiet settings affordance on Home B** (Step 8 already designed
the entry point — an unobtrusive corner control — it just dead-links until this
ships). Settings is reached **deliberately**, never mid-flow (§4.2 rule: separate
from creation). May also be reachable from the Memory Shelf chrome if your layout
wants it — but Home B is the canonical entry.

**Exit:**
- **Back / done** → back to Home B (`/home`).
- **Update payment / cancel** → Stripe-backed flows (engineering wires to the
  billing portal / our restore surfaces — see §7).
- **Restore** (lapsed / past_due / cancelled) → `/app/vault/restore`.
- **Change email / password** → email-link flow (auth is magic-link today — §7).
- **Delete account** (if approved) → the confirmation beat, then sign-out + a
  calm "your account is closed" terminal.
- **Sign out** → `/auth/sign-in`.

## 5. The visual language (source it from the app, like the shelf & home)

Self-contained in the prototype (`:root` block), sourced from the app's canonical
design language — see the **token starter kit in Appendix A** for exact values.

- **MINERAL & WARMTH palette + Spectral/Inter type** — cream grounds, mineral
  CTAs, warm-keyed shadows. This screen is **calmer and flatter** than the
  ceremonial screens — it's utility with warmth, not a peak moment. No Breath
  Stone hero here (this isn't a stone beat); the warmth comes from ground, type,
  and copy, not from a centerpiece object.
- **Tonal neighbors to match:** `prototypes/essence-step8-home-b.html` (the home
  this is reached from — Settings should feel like the same house, one room over,
  quieter), `prototypes/essence-step7-memory-shelf.html` (the archive calm).
- **Risky controls** (cancel / delete) should read **quieter**, not louder — no
  red alarm buttons. De-emphasized, deliberate, with reassurance adjacent.

## 6. The data you can design around

Settings can surface:
- **Account:** email, photo (present / absent), auth method (email/magic-link).
- **Subscription state** — one of `trial | active | past_due | lapsed |
  cancelled`, **billing plan** (`monthly | annual`), **trial days remaining**
  (trial only), **renewal / paid-through date**, **payment method** summary (card
  brand + last4, from Stripe).
- **Notification prefs** — the minimal toggle set mapping to the three V1 emails
  (welcome / trial-expiring / payment-failed).
- **Trust facts** — voice & messages are the user's; messages are immutable and
  safe; the cap is 3 lifetime (factual, not a sell).

Design for what *should* be there; engineering makes the data match — see §7.

## 7. Notes for engineering — *not your job, just so you know it's handled*

So you don't design around blockers we own:

- **The build location & route.** New screen `SettingsScreen` in
  `src/components/screens/` (likely a `settings/` subfolder if it grows
  sub-surfaces); `src/app/<route>/page.tsx` fetches and renders it; `/dev/settings`
  renders it with mock data (per CLAUDE.md). **There is no settings route yet** —
  we'll add one (proposed `/app/settings`) to `src/lib/routes.ts` and wire Home
  B's affordance to it. URLs are backend and won't change after; you don't pick
  the URL, you design the screen.
- **Subscription data is available.** State reads from the existing layer:
  `getSubscriptionStatus(userId)` → `{ status, plan, ... }`
  (`src/lib/subscription/get-status.ts`); the restore path resolves via
  `resolveRestorePlan()` (`src/lib/subscription/restore-mode.ts`) into either
  *update card* or *restart*. The status union and plan type are real and locked
  (§3 / §6 reflect them exactly).
- **Auth is magic-link / email today.** There is no inline password form to mirror
  a typical app's "change password." "Change password" likely becomes "we'll
  email you a secure link" (or is simply absent for V1 if the owner prefers).
  Design the *entry*; engineering picks the mechanism. Flag your assumption in the
  prototype's NOTE FOR CODE ARCHITECT header.
- **Payment changes go through Stripe.** Update-payment / cancel are Stripe-backed
  (billing portal or our own restore surfaces). Secrets stay server-only
  (DECISIONS lock); the screen never touches Stripe keys — it calls our routes.
- **Delete account is pending an owner decision** (§1). If approved, the teardown
  (auth user + the user's DB rows + stored audio in Storage) is engineering's to
  build; you design the **confirmation experience**, not the deletion mechanics.
- **Messages are immutable** (DECISIONS lock). No per-message edit/delete control
  belongs on this screen — only account-level deletion (if approved).
- The prototype stays a **self-contained HTML file** (inline `<style>`, tokens in
  `:root`, a dev rail to switch §3 states) and becomes the **design source of
  truth** — production mirrors its copy, timing, motion, layout. Keep a short
  **NOTE FOR CODE ARCHITECT** header current.

## 8. Copy candidates (carry these over; we'll do a clarity pass after)

Audience skews boomer / Gen X — **clarity beats cleverness.** Calm register
throughout; money copy is factual and reassuring, never punitive. (See
`docs/ESSENCE_Copy_Voice_Guide.md` — money voice + error voice + "Vault"
once-per-screen rule apply here.)

- **Screen title:** "Settings" (the "& Trust" is the *intent*, not a visible
  heading) — or a warmer "Your account."
- **Trust / ownership reassurance:** "Your voice and your messages are yours. They
  stay safe here, and nothing happens to them without you." / "You own everything
  you've made. We just keep it safe."
- **Plan — trial:** "Trial · 5 days left" with "Your card won't be charged until
  your trial ends."
- **Plan — active:** "Voice Vault · Protected" · "Renews [date] · $12.99/mo" (or
  "$119/yr").
- **Plan — past due:** "We couldn't process your last payment. Update your card to
  keep your vault protected." (warm, fixable, not alarming)
- **Plan — lapsed:** "Your Voice Vault is paused — your messages are safe. Restore
  anytime." (matches Home B lapsed copy — keep them consistent)
- **Cancel:** "Cancel subscription" → confirm: "Your messages stay safe. You'll
  keep access until [paid-through date]. You can come back anytime." (no
  guilt-trip, no friction maze)
- **Remove photo:** "Remove photo" → confirm: "Remove your photo? You can add one
  again later."
- **Delete account (if approved):** *(give it your first go — we'll do the final
  clarity pass.)* The double-confirm must state plainly **what is erased**
  (account, voice, all messages) and that **it can't be undone** — the one place
  friction is kindness. Warm but unambiguous. Land "you're in control," not
  "danger."
- **Sign out:** "Sign out."

---

## 9. The motion bar

**Mobile-first**, 390×844 baseline; must hold up at a **4× CPU throttle** on a
simulated mid-range phone. Settings is a calm utility screen, so motion is
restrained — but the things to check at 4×: the **page-arrival** (`--ease-page`
stagger of the grouped sections), **toggle** transitions, the **confirmation
beats** (cancel / delete reveal), and the **skeleton → content** resolve. Honor
`prefers-reduced-motion`. If it feels off at 4×, it'll feel off on a real
mid-range Android at 1×.

---

### Reference index
- **Prototype to build:** new file → `prototypes/essence-step9-settings-trust.html`.
- **Spec:** `docs/MASTER_SPEC.md` §V1.5 (Settings & Trust ships/defers table),
  §4.2 Step 9 (intent + system rules), §9 (archive/continuity transparency
  context), §V1.6 (loading/error states), §V1.7 (the 3 V1 emails the toggles map
  to), §V1.1 (pricing: $12.99/mo · $119/yr · 7-day trial · 3 lifetime messages).
- **Tokens (canonical):** `src/app/globals.css` `@theme` — see Appendix A.
  `docs/design-tokens.md` is a guide but has drifted on two tokens (A.1).
- **Tonal neighbors:** `prototypes/essence-step8-home-b.html` (the home this is
  reached from), `prototypes/essence-step7-memory-shelf.html`.
- **Subscription types (real, locked):** `src/lib/vault.ts` — `SubscriptionStatus`
  (`trial|active|past_due|lapsed|cancelled`), `BillingPlan` (`monthly|annual`).
  `src/lib/subscription/get-status.ts`, `.../restore-mode.ts`.
- **Routes (canonical, don't invent):** `src/lib/routes.ts` — `home` `/home`,
  `vaultRestore` `/app/vault/restore`, `signIn` `/auth/sign-in`. (The settings
  route doesn't exist yet — engineering adds it; proposed `/app/settings`.)
- **Locks that constrain this screen:** `docs/DECISIONS.md` — messages immutable
  (no per-message edit/delete), secrets server-only (screen never touches Stripe
  keys), URL stability.
- **Open follow-up this screen resolves:** `docs/FOLLOW_UPS.md` #12 (Remove-photo
  control).
- **Copy guide:** `docs/ESSENCE_Copy_Voice_Guide.md` (money voice, error voice,
  Vault-once-per-screen).
- **Format mirror:** `docs/Step8_Home_B_Design_Handoff.md`.

---

## Owner decisions

1. ✅ **Delete account in P1 — DECIDED (2026-06-30):** build the **simple
   self-serve account delete** (auth + rows + audio teardown), **defer** formal
   GDPR/CCPA tooling to v2. Architect: design the delete-confirmation beat (§1,
   §3, §8).
2. **"Change password" mechanism** — *still open.* Given magic-link auth, do we
   offer an email-a-link "change password," or omit it for V1? (Affects §1 account
   basics.) Engineering's lean: an email-a-link entry, or omit for V1 — owner to
   confirm.

---

# Appendix A · Token starter kit (design from these — they're canonical)

Same canonical values that landed Step 7/8 clean. **Source:
`src/app/globals.css` `@theme`** (the true canonical). ⚠️ Two of these **differ
from `docs/design-tokens.md`**, which is stale — get them right from the start.

## A.1 ⚠️ The two that bit Step 7 — use the `globals.css` values, not the doc's
- **`--ease-breath: cubic-bezier(0.37, 0, 0.63, 1)`** — symmetric pendulum,
  reserved **only** for the Breath Stone's resting rhythm. (No stone on Settings,
  so you likely won't need it — but if anything breathes, this is the curve, not
  the universal one. `design-tokens.md` wrongly lists `0.4,0,0.2,1`.)
- **`--shadow-mineral: 0 4px 14px rgba(110, 80, 40, 0.20)`** — **warm-keyed**, so
  the cool mineral CTA sits naturally on cream. (`design-tokens.md` wrongly lists
  the old teal `rgba(74,107,126,0.3)`, re-keyed 2026-06-12, FOLLOW_UPS #40.)

## A.2 Motion curves & durations
- `--ease-essence: cubic-bezier(0.4, 0.0, 0.2, 1)` — **universal** state
  transitions (toggles, reveals — everything except the stone).
- `--ease-page: cubic-bezier(0.22, 1, 0.36, 1)` @ `--duration-page: 700ms` — the
  app's **signature page arrival** (page + staggered children). Use for the
  Settings entrance and grouped-section stagger.
- `--ease-press: cubic-bezier(0.2, 0.0, 0.0, 1)` — button press / tactile.
- Durations: `--duration-micro 200ms`, `--duration-small 400ms`,
  `--duration-medium 800ms`, `--duration-large 1200ms`, `--duration-breath 3000ms`.

## A.3 Color
- Grounds: `--color-bg-neutral #FBF8F4` (cream base — the right calm ground for a
  utility screen). Warm grounds (`--color-bg-warm-2 #F6F0E5`,
  `--color-bg-gold #F2E8D6`, `--color-bg-rich #EDE3D0`) for any reassurance
  banner you want to feel held.
- Surfaces: `--color-surface-card #F6F0E5`, `--color-surface-warm #EDE3D0`,
  `--color-surface-honey #F2E8D6` (hover).
- CTA: `--color-mineral #7A8088` (primary), `--color-mineral-dark #656B73`
  (hover). **Risky controls (cancel/delete) should NOT use a loud red** — prefer
  a quieter, de-emphasized treatment (secondary text/border), reassurance
  adjacent.
- Text: `--color-text-primary #1C1A18`, `--color-text-secondary #6B6B6B`.
  **Never** use `--color-text-tertiary #ADA9A5` on small elements — fails contrast
  (large text only); this audience skews 45–70.

## A.4 Shadows, type, radius
- Shadows: `--shadow-sm 0 2px 4px rgba(0,0,0,0.04)`,
  `--shadow-md 0 4px 12px rgba(0,0,0,0.08)`,
  `--shadow-lg 0 8px 24px rgba(0,0,0,0.12)`, plus warm `--shadow-mineral` for the
  primary CTA.
- Type: `--font-display 'Spectral', Georgia, serif` (section headings, tender
  asides); `--font-body 'Inter', system-ui, sans-serif` (body, UI, buttons).
  Scale: `--text-title 28px` (Spectral 600, lh 1.4), `--text-body-lg 18px`,
  `--text-body 16px`, `--text-ui 15px`, `--text-small 14px` (floor — don't go
  below), `--text-caption 12px` (eyebrows: Inter 600, uppercase, tracking
  0.12–0.16em).
- Radius: `--radius-lg 10px` (buttons), `--radius-2xl 16px` (cards/sections),
  `--radius-pill 20px` (status pill — apt for the plan-state line),
  `--radius-full 9999px`.
- Touch targets: **44px** minimum (especially toggles and the risky controls).
  Honor `prefers-reduced-motion` (pin to a mid-frame resting state).

> Values sourced from `src/app/globals.css` `@theme` on 2026-06-30. Where
> `docs/design-tokens.md` disagrees (A.1), `globals.css` wins.
