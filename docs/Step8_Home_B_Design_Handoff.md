# Step 8 · Home B — Prototype Design Brief

**For:** the design architect
**From:** engineering
**Date:** 2026-06-17
**Status:** This one is a **fresh design**, not a revision. There is no Home B
prototype yet — production `/home` is a 34-line stub. Home B is the **hub** the
whole journey lands on: the calm, grounded home a user returns to once their
voice is preserved (`VoiceProfile.status === ready`). Your deliverable is a
**new self-contained prototype**, `prototypes/essence-step8-home-b.html`. Because
there's nothing to audit yet, Appendix A is a **token starter kit** — design from
those exact values up front so v1 lands clean.

---

## 0. The why (read once, then work from §1)

Every other screen in the journey is a *moment* — record, reveal, create, save.
Home B is the **place between moments**: where the user lands after finishing
their first message, and where they return on every visit afterward. Its job is
emotional, not transactional — "the artifact is complete, your voice is
preserved, you are empowered to use it." Grounded, whole, quietly proud. **Not a
productivity dashboard.** (MASTER_SPEC §6.3, §4.2 Step 8.)

Two things make Home B specific. First, it is **gated** — it must *never* appear
before `VoiceProfile.status === ready` (immutable rule §6.5). Second, it carries a
**calm vault-status line** that changes with the user's subscription state
(trial / protected / lapsed) — the only place that status lives on the home, and
it's stated **once, factually, never selling** (§1.6, §6.3).

Scope note: **this brief is Home B only.** Home A (the in-progress home for users
still on the 25-prompt journey) is a separate screen with a separate brief; the
production `page.tsx` will branch A-vs-B on `VoiceProfile.status`, but you're
designing B. Don't design Home A here.

---

## 1. What to design (the scope checklist)

**The core surface (§6.3 — these are the load-bearing elements):**
- [ ] **Breath Stone, infused state** — warm, stable, radiant. The signature
      hero object, resolved to its completed form (contrast: Home A's *guidance*
      state). See §5 for the stone behavior.
- [ ] **Vault status line** — calm register, **once per screen max**. Three
      variants the dev rail must switch (§3): trial (days remaining) / protected
      / lapsed. Warm, factual, never punitive. (§6.3, §1.6.)
- [ ] **Primary action — create a message.** The heart of Home B; **always the
      most prominent action** (§6.3 Action Priority). This is the one thing the
      eye should land on.
- [ ] **Archive preview — recent messages.** A small, glance-able preview of
      saved keepsakes (recipient + a hint), linking through to the Memory Shelf.
      *Not* the full shelf — a teaser that says "they're here, kept."
- [ ] **Tertiary action — open the archive / Memory Shelf** (the full Step 7
      screen).
- [ ] **A quiet settings entry point.** Step 9 (Settings & Trust) isn't built
      yet, so the *route* lands later — but Home B is where the affordance lives.
      Design the entry (an unobtrusive corner control); it can dead-link in the
      prototype.

**The one missing moment (design this deliberately):**
- [ ] **First arrival into Home B** — the §6.4 "stepping into a new chapter"
      beat. The user reaches Home B *for the first time* right after creating
      their first message; the stone has just shifted guidance → infused. This
      first landing should feel like an arrival, not a page load — distinct from
      the calm every-visit steady state. Decide what's different on visit #1.
      **Engineering's lean: an inline one-time page-arrival, not a blocking
      overlay** — see §1 "Still your call" for the reasoning; argue us out of it
      if you see it differently.

**Out of scope for V1 (do NOT design these — spec conflict resolved below):**
- [ ] **"Add more moments" / CCY secondary action.** §6.3 lists it, but **V1.7
      defers post-completion CCY enrichment to v2.** The V1-scope section
      supersedes the chapter. Leave it out.
- [ ] **Tier upsell / "behavioral upsell sequencing."** The §4.3 table notes it
      and §6.3/Step 8 mention Legacy/Guardian tiers — but **Legacy & Guardian are
      v2 deferrals** (V1 scope: Vault $12.99/mo is the sole tier, 3 lifetime
      messages). No tier pitch on Home B. When the vault is full (3/3), the path
      is the existing **C3 limit / waitlist**, not an upsell.

**Still your call (open design decisions):**
- [ ] **Layout hierarchy** — stone, status, primary CTA, archive preview: what's
      the vertical order on a 390-wide column? The constraint is only that
      *create* reads as most prominent and the stone is the emotional anchor.
- [ ] **Archive preview shape** — how many recent messages (1? up to 3?), and
      what each row shows (recipient alone, or + a date/duration hint). At the
      3/3 cap, does the preview say anything about completeness?
- [ ] **The lapsed state's emotional weight** — how visible is "lapsed" without
      tipping into punitive or alarming? It must stay warm (§6.3).
- [ ] **First-arrival as overlay vs. inline — we lean inline** (a richer
      one-time page-arrival on the home itself), and here's why, so you can push
      back with eyes open: by the time the user lands on Home B they've *just*
      come through Vault Reveal → First Playback → the A7 save ceremony. Home B's
      job (§6.3) is the **comedown** — "grounded, whole, quietly proud" — not a
      fourth peak. §6.4's requirements (stone settles guidance → infused,
      progress resolves to complete, "new chapter") are **motion/state** beats a
      one-time page-arrival fully satisfies — the infused stone settling in, an
      `--ease-page` stagger, the warm ceremonial ground, the first-arrival copy —
      without a modal to dismiss. Inline also teaches the right thing ("this is
      home now, and it's complete") where an overlay teaches "this is an event."
      If you can make a one-time overlay feel like a soft landing rather than
      another threshold, make that case.

---

## 2. What Home B is (the intent to protect)

The home a user returns to once their voice record is complete. The entrance to a
personal archive — not a dashboard, not a feed.

**Emotional intent (MASTER_SPEC §6.3 / §4.2 Step 8):** *the artifact is complete,
the voice is preserved, the user is empowered to use it — grounded, whole, and
quietly proud.* Proud, supportive, tender; more grounded and complete than
Home A.

**System rules (locked):**
- Home B appears **only** when `VoiceProfile.status === ready` — never early,
  under any circumstance (§6.5, immutable).
- **Message creation is the primary action**, always most prominent (§6.3).
- The **archive is accessible** from here (§6.5).
- Vault status shows in the **calm register**, once per screen (§1.6, §6.3).
- Messages are capped at **3 lifetime** for V1; no replenishment (V1.1).

## 3. States the prototype should cover (and switch via the dev rail)

The home reads differently along two axes — **subscription state** and **archive
fullness** — plus system states. The dev rail should switch between:

1. **Trial · first arrival** — visit #1 into Home B, just after the first
   message. The §6.4 "new chapter" beat; stone freshly infused; status shows
   trial days remaining.
2. **Trial · steady (1–2 saved)** — the calm every-visit home during the 7-day
   trial; "N days left in your trial" in calm register.
3. **Protected · steady (1–2 saved)** — paying ($12.99/mo); "Voice Vault •
   Protected", factual, no selling.
4. **Protected · full (3/3 saved)** — the complete archive; the vault holds its
   lifetime 3. Create is no longer offered (→ C3 limit / waitlist territory).
   Decide how the home acknowledges "complete" without selling.
5. **Lapsed** — trial expired / payment failed; vault status reflects lapsed
   state, **warm, never punitive**; the affordance to restore is present
   (→ `/app/vault/restore`).
6. **Loading** — quiet, on-brand skeleton while home data resolves (V1.6).
7. **Error** — home data couldn't load; calm, oriented, retry (V1.6).

*(Deliberately not in the prototype per §1: any "add more moments"/CCY action,
any tier-upsell surface.)*

## 4. How users get here, and where they go next

**Entry:** the fixed arc (§6.4, immutable) — voice journey complete → card
capture → voice processing → Vault Reveal → First Playback → **first message
creation → Home B**. After that, Home B is the **default return destination** on
every app open for a completed user. Also reachable from the Memory Shelf and the
message-saved confirmation as "home."

**Exit:**
- **Create a message** (primary) → the creation flow (`/messages/new`).
- **Open the archive** (tertiary) → the Memory Shelf (`/app/shelf`).
- **Settings** → Step 9 (not built; affordance only for now).
- **Restore** (lapsed only) → `/app/vault/restore`.
- At **3/3 full**, "create" is unavailable — that's the C3 limit / waitlist path,
  same as the shelf's full state.

## 5. The visual language (source it from the app, like the shelf)

Self-contained in the prototype (`:root` block), but sourced from the app's
canonical design language — see the **token starter kit in Appendix A** for the
exact values (some differ from `docs/design-tokens.md`, which has drifted):
- **MINERAL & WARMTH palette + Spectral/Inter type** — cream grounds, mineral
  CTAs, warm-keyed shadows.
- **The Breath Stone** (`prototypes/breath-stone-api.md`) as the signature
  object, here in its **infused** form. Behavior per §5.7:
  - Trial / free tier: **infused + soft shimmer on the CTA**.
  - Activated protection (paying): **infused + occasional shimmer**.
- **Tonal neighbors:** `prototypes/essence-step7-memory-shelf.html` (the archive
  this home previews and links into — match its keepsake calm),
  `prototypes/vault-design-palette.html` (the vault/status language),
  `prototypes/message creation/*` (the create flow the CTA opens into).

## 6. The data you can design around

Home B can surface:
- **VoiceProfile status** (gates the whole screen — always `ready` here).
- **Subscription state** — trial / protected / lapsed, and **trial days
  remaining** when on trial.
- **Saved-message count** (0–3) and a **recent-messages preview** — recipient,
  category, created date, duration, play history (the fields Step 7 added to
  `GET /api/messages`).
- **Lifetime cap** — 3 (`STEP6_MAX_SAVED_MESSAGES`); whether the user is at 3/3.

Design for what *should* be there; engineering makes the data match — see §7.

## 7. Notes for engineering — *not your job, just so you know it's handled*

So you don't design around blockers that we own:
- **The build location.** Production `/home` is a 34-line stub. We'll build
  `HomeBScreen` in `src/components/screens/`, have `src/app/home/page.tsx` fetch
  the data and branch Home A vs Home B on `VoiceProfile.status`, and add a
  `/dev/home-b` page rendering it with mock data (per CLAUDE.md). The route
  `/home` does **not** change.
- **The data is available.** Subscription state reads from the existing
  entitlement layer (`getSubscriptionStatus()`); the recent-messages preview
  reads `GET /api/messages`, which **Step 7 already widened** with category /
  duration / play-history. The archive contract you preview against exists.
- **Step 7 lands first.** Home B is **M2**, after the Memory Shelf (**M1**) — so
  by the time this builds, the shelf and its API are in. Design the preview as if
  the shelf is already there (it is).
- **Settings route is a known gap.** Step 9 is **M3**; the settings affordance on
  Home B will dead-link until then. Design the entry point; we'll wire it when
  Step 9 lands.
- The prototype stays a **self-contained HTML file** (inline `<style>`, tokens in
  `:root`, a dev rail to switch §3 states) and becomes the **design source of
  truth** — production mirrors its copy, timing, motion, layout. Keep a short
  **NOTE FOR CODE ARCHITECT** header current.

## 8. Copy candidates (carry these over; we'll do a clarity pass after)

Audience skews boomer / Gen X — **clarity beats cleverness.** Calm register
throughout; the vault line is factual, never a sell.
- **Vault status — trial:** "Your Voice Vault · 5 days left in your trial" /
  "Voice Vault · Trial — 5 days remaining"
- **Vault status — protected:** "Voice Vault · Protected" (factual, no
  exclamation, no selling)
- **Vault status — lapsed:** "Your Voice Vault is paused — your messages are safe.
  Restore anytime." (warm, never punitive; "safe" before "restore")
- **Primary CTA:** "Create a message" / "Record a new message"
- **Archive preview heading:** "Your messages" / "Kept for someone you love"
- **First-arrival beat:** "Your voice is preserved. This is home now." /
  "Everything you've made lives here."
- **3/3 full note:** *(give it your first go — we'll do the final clarity pass
  with the rest of this copy.)* Acknowledge completeness without selling; pairs
  with C1 "Three are kept" / the C3 limit screen. Land the "you finished
  something whole" feeling, not "you hit a limit."

---

## 9. The motion bar

**Mobile-first**, 390×844 baseline; must hold up at a **4× CPU throttle** on a
simulated mid-range phone. The things to check at 4×: the **infused stone's
breathe/shimmer**, the **CTA shimmer** (free-tier), the **first-arrival** beat
(the guidance→infused settle and any page-arrival stagger), and the
archive-preview entrance. If they feel off at 4×, they'll feel off on a real
mid-range Android at 1×.

---

### Reference index
- **Prototype to build:** new file → `prototypes/essence-step8-home-b.html`.
- **Spec:** `docs/MASTER_SPEC.md` §6 (Home A/B), §4.2 Step 8, §1.6 (Vault naming
  /calm register), §5.7 (Breath Stone state map), §V1.1/V1.7 (scope —
  3-message cap, CCY-on-B deferral).
- **Tokens (canonical):** `src/app/globals.css` `@theme` — see Appendix A.
  `docs/design-tokens.md` is a guide but has drifted on two tokens (below).
- **Tonal neighbors:** `prototypes/essence-step7-memory-shelf.html`,
  `prototypes/vault-design-palette.html`, `prototypes/message creation/*`.
- **Stone API:** `prototypes/breath-stone-api.md`.
- **Routes (canonical, don't invent):** `src/lib/routes.ts` —
  `home` `/home`, `shelf` `/app/shelf`, `messagesNew` `/messages/new`,
  `messagesLimit` `/messages/limit`, `vaultRestore` `/app/vault/restore`.
- **Cap constant (the 3):** `STEP6_MAX_SAVED_MESSAGES`
  (`src/lib/messages/cost-controls.ts`).
- **Format mirror:** `docs/Step7_Memory_Shelf_Design_Handoff.md`.

---

# Appendix A · Token starter kit (design from these — they're canonical)

There's no prototype to audit yet, so this is the **inverse of the Step 7
appendix**: the exact canonical values to build the `:root` block from, so the
v1 prototype lands clean instead of needing a post-hoc audit. **Source:
`src/app/globals.css` `@theme`** (the true canonical). ⚠️ Two of these **differ
from `docs/design-tokens.md`**, which is stale — these two were the primary cause
of the Step 7 "disjointed" finding, so get them right from the start.

## A.1 ⚠️ The two that bit Step 7 — use the `globals.css` values, not the doc's

- **`--ease-breath: cubic-bezier(0.37, 0, 0.63, 1)`** — a symmetric pendulum,
  reserved **only** for the Breath Stone's resting rhythm. (`design-tokens.md`
  wrongly lists `0.4,0,0.2,1` — that's `--ease-essence`, the *universal* curve.
  Don't let the stone ride the universal curve; that's exactly what made the
  shelf's hero object feel "off.")
- **`--shadow-mineral: 0 4px 14px rgba(110, 80, 40, 0.20)`** — **warm-keyed**, so
  the cool mineral CTA sits naturally on cream. Apply it to the primary "create"
  button. (`design-tokens.md` wrongly lists the old teal
  `rgba(74,107,126,0.3)` — re-keyed 2026-06-12, FOLLOW_UPS #40. The old value
  casts bluer than the button it sits under.)

## A.2 Motion curves & durations

- `--ease-essence: cubic-bezier(0.4, 0.0, 0.2, 1)` — **universal** state
  transitions (everything except the stone).
- `--ease-page: cubic-bezier(0.22, 1, 0.36, 1)` @ `--duration-page: 700ms` — the
  app's **signature page arrival** (every page + staggered children). Use this
  for Home B's entrance and the first-arrival stagger.
- `--ease-press: cubic-bezier(0.2, 0.0, 0.0, 1)` — button press / tactile.
- Durations: `--duration-micro 200ms`, `--duration-small 400ms`,
  `--duration-medium 800ms`, `--duration-large 1200ms`, `--duration-breath 3000ms`.

## A.3 Color

- Grounds: `--color-bg-neutral #FBF8F4` (cream base). Warm grounds for elevated
  moments: `--color-bg-warm-2 #F6F0E5`, `--color-bg-gold #F2E8D6`,
  `--color-bg-rich #EDE3D0` (the ceremonial "ready" endpoint ground — apt for the
  infused / first-arrival beat).
- Surfaces: `--color-surface-card #F6F0E5`, `--color-surface-warm #EDE3D0`,
  `--color-surface-honey #F2E8D6` (hover / celebration).
- CTA: `--color-mineral #7A8088` (primary buttons / active),
  `--color-mineral-dark #656B73` (hover).
- Text: `--color-text-primary #1C1A18` (headlines/body),
  `--color-text-secondary #6B6B6B` (supporting). **Never** use
  `--color-text-tertiary #ADA9A5` on small elements — it fails contrast (large
  text only), and this audience skews 45–70.

## A.4 Shadows, type, radius

- Shadows: `--shadow-sm 0 2px 4px rgba(0,0,0,0.04)`,
  `--shadow-md 0 4px 12px rgba(0,0,0,0.08)`,
  `--shadow-lg 0 8px 24px rgba(0,0,0,0.12)`, plus the warm `--shadow-mineral`
  above for the primary CTA.
- Type: `--font-display 'Spectral', Georgia, serif` (headlines, tender italic
  asides); `--font-body 'Inter', system-ui, sans-serif` (body, UI, buttons).
  Scale: `--text-title 28px` (Spectral 600, line-height 1.4), `--text-body-lg
  18px`, `--text-body 16px`, `--text-ui 15px`, `--text-small 14px` (floor — don't
  go below), `--text-caption 12px` (eyebrows: Inter 600, uppercase, tracking
  0.12–0.16em).
- Radius: `--radius-lg 10px` (buttons), `--radius-2xl 16px` (cards),
  `--radius-pill 20px` (pill badges — apt for the vault-status line),
  `--radius-full 9999px` (circular).
- Touch targets: **44px** minimum. Honor `prefers-reduced-motion` (pin
  animations to a mid-frame resting state, as the shelf does).

> Values sourced from `src/app/globals.css` `@theme` on 2026-06-17. Where
> `docs/design-tokens.md` disagrees (A.1), `globals.css` wins.
