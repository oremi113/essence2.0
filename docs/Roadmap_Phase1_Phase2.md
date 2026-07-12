# Essence — Phase 1 / Phase 2 Roadmap

**Date:** 2026-06-16
**Purpose:** Planning roadmap from "front half built" to a launchable, paying
product (Phase 1, web) and, later, the App Store (Phase 2, native). Estimates
are planning **ranges**, not commitments — software estimation is unreliable;
the assumptions are stated so you can adjust.

## Strategy (decided)
- **Web-first.** Ship a polished **mobile web app** that takes payment via
  **Stripe**. This is the launchable product and the validation instrument
  (V1's job per MASTER_SPEC: *prove people pay $12.99/mo for Vault*).
- **Full 10-step vision** — not a stripped MVP.
- **App Store deferred to Phase 2.** The native app *wraps the same web app*
  (Capacitor), so web work is the foundation, not throwaway. Defer until the
  numbers justify Apple's tax (review + 30% + IAP rebuild).

## Current state — 2026-07-12

**Where we are:** M0–M3 are **closed**. The full journey is wired end-to-end
(the monetization spine landed) and the money path is now unblocked. What's left
is the **launch tail** — real-device QA, legal/deploy, Stripe production, and the
owner sign-offs — which is the *least* AI-compressible part of the plan. Coding
is mostly behind us; calendar from here is bounded by owner availability and
QA surprises, not build speed.

Pricing is current in `MASTER_SPEC.md` §V1.1 (Vault $12.99/mo · $119/yr ·
7-day trial · 3 lifetime messages).

### Shipped in the last session or two
- **Stripe checkout race fixed — FU #84 ✅ RESOLVED** (`6429650`). Real Stripe
  redirected to `success_url` before the webhook wrote the trial row, bouncing
  just-paid users back to Card Capture. Fixed by reconcile-on-landing.
  **This was the gate on turning monetization on — S5 is now unblocked.**
- **Vault migrated to the canonical bronze engine** (`807ad88`) — the surviving
  vault screens now render on the reliquary engine (was tracked as "PR #96").
- **Card Capture plays a real voice sample** (FU #82, `3f40e25`/`33e5674`).
- **OfflineIndicator hydration mismatch fixed** (FU #83, `a5f264e`).

### Shipped in the batch that closed M3 *(earlier this cycle)*
- **Monetization spine — LANDED (PR #95).** record → Card Capture → processing →
  Reveal → First Breath → First Message, walkable end-to-end (was **0% connected**).
  Free-voice loophole closed by construction. Flags stay **OFF** — nothing charges
  yet; the flip is a deliberate owner step (S5, below).
- **First Breath ceremony audio built** (PR #91, FU #41) — procedural Web Audio
  engine, no asset files. *Owner ear-review still owed.*
- **Stripe lifecycle guards** (PR #92) — trial-abuse, double-sub 409, lapse-vs-cancel.
- **Step 10 S10-B offline** (PR #89) + **C3 Vault Limit cap confirmed wired** (403 at 3 saved).

### What's next
1. **S5 — turn monetization on** *(owner-run, now unblocked)*: flip
   `VOICE_CREATION_REQUIRES_PAYMENT` + `VAULT_STRIPE_ENABLED`, swap in real price
   IDs, drop the `?mock` bypass, then a **live vendor-backed Stripe E2E walk**.
2. **Owner ear-review** of the First Breath ceremony audio (a headless agent
   can't judge the sound).
3. **The launch tail** — real-device QA passes, legal (privacy/terms) + deploy
   hardening, mobile-web polish, and launch-blocking debt triage. See the
   recalibrated burn-down below.

*(Superseded audit snapshots from 2026-06 → 2026-07-08 are archived at the bottom
of this doc.)*

---

## Remaining work to launch — recalibrated 2026-07-12 (full path, no lean cut)

**What the last month actually cost.** Since this roadmap was written (2026-06-16),
in ~3.7 calendar weeks / **~11 active build days / 59 commits**, the entire
**M2 + M3 + monetization-spine** batch closed: Home B, Card Capture, Settings,
Step 4 vault, Step 10 S10-A/B, C3 Vault Limit, First Breath audio, Stripe guards,
the spine (PR #95), the FU #84 race fix, and the vault bronze-engine migration.
That's the middle-to-back third of the plan, done at the compressed end of the
AI-assisted estimate. So the **buildable screen/wiring work is largely spent** —
the buckets below drop the finished ones to their small remainders and re-anchor
what's left, which is now dominated by the non-compressible tail.

| # | Bucket | Was | Now | Focused hrs left |
|---|---|---|---|---|
| 1 | Step 10 — only S10-C First-Breath playback-error + consolidated copy pass left | 15–30 | S10-A/B ✅ | 4–10 |
| 2 | C3 Vault Limit screen | 10–24 | ✅ done | 0 |
| 3 | First Breath ceremony audio (owner ear-review owed, not coding) | 8–20 | ✅ built | 0 |
| 4 | Full-journey integration & wiring — spine landed; seam/nav polish left | 20–40 | spine ✅ | 8–20 |
| 5 | Stripe lifecycle — guards + #84 race ✅; live vendor E2E + real-voice cost left | 12–28 | guards ✅ | 6–16 |
| 6 | Mobile-web polish (responsive, touch targets, optional PWA) | 10–24 | — | 10–24 |
| 7 | **Real-device QA + bug-fix passes** (least AI-compressible) | 30–60 | — | 30–60 |
| 8 | Launch prep: privacy/terms build, analytics→validation, deploy hardening + monitoring | 12–30 | — | 12–30 |
| 9 | Launch-blocking debt triage (subset of the ~65 FOLLOW_UPS) | 10–25 | — | 10–25 |
| 10 | Cross-app design/polish rounds (the audit texture, applied everywhere) | 15–35 | — | 15–35 |
| | **Total** | ~140–315 | | **~95–220 focused hrs** |

**Calendar at current engaged pace** (~15–25 productive AI-assisted hrs/active
week, bursty ~2–3 engaged weeks/month): **~1.5–2.5 months, realistic middle ~2
months** — down from the 2026-07-06 estimate of ~3–3.5 months, because the coding
that estimate was pricing is now done. The remaining spread is almost entirely
**owner-gated and non-compressible**: real-device QA surprises, legal content,
Stripe production + tax setup, the ceremony ear-review, and the "is this
launch-quality?" call per flow. Little of what's left is code an agent can
sweep — it's judgment, hardware, and paperwork.

## Launch punch-list (burn-down)

Track these to done. `[ ]` = open, grouped by the buckets above.

**Finish the journey**
- [x] Step 10 S10-A — generation-failure state (contact-as-care ceiling, PR #88)
- [~] Step 10 S10-C — audio-can't-play state (Shelf ✅; First-Breath **now unblocked** — FU #41 landed, so the First-Breath playback-error state is buildable; not yet built)
- [x] Step 10 S10-B — offline / connection-lost state — **built** (PR #89): `useOnline`/`useConnectivity` + app-wide `OfflineIndicator`
- [ ] Step 10 X — consolidated error-copy pass across all surfaces (Ch2 + A5 + new)
- [x] C3 Vault Limit screen — built (PR #87); 3-message cap **confirmed wired** server-side (`api/messages/save` 403 `vault_limit_reached` at `STEP6_MAX_SAVED_MESSAGES=3`), FU #38 resolved
- [x] First Breath ceremony audio — **built** (PR #91, FU #41): procedural Web Audio engine (`src/lib/audio/firstBreathAudio.ts`), no asset files. *Owner ear-review still owed — a headless agent can't judge the actual sound.*
- [x] Remove dead `record/complete/stub`; confirm Card Capture is the only checkout path — **done (PR #95)**: old arc retired; stub → stable redirect (URL-lock kept)
- [ ] Decide Home A: build its brief, or delete the stub for V1

**Integrate & harden**
- [x] Full-journey wiring 1→10 (core spine) — **LANDED (PR #95, 2026-07-12)**: record → Card Capture → processing → Reveal → First Breath → First Message walkable end-to-end; free-voice loophole closed by construction. Flags OFF; S5 (owner) flips them — **FU #84 race RESOLVED (`6429650`), so S5 is now unblocked**
- [x] Vault → canonical bronze engine migration (`807ad88`) — surviving vault screens render on the reliquary engine (was tracked as "PR #96")
- [~] Stripe lifecycle E2E — guard logic **built** (PR #92: trial-abuse, double-sub 409, lapse-vs-cancel) + checkout-landing race closed (FU #84); live vendor-backed E2E walk still owed (spine S5, flags still OFF)
- [ ] Real-voice cost validation at expected volume
- [ ] Mobile-web polish — responsive, touch targets, (optional) PWA/installable
- [ ] Real-device QA matrix — walk the whole journey on real phones; bug-fix passes
- [ ] Launch-blocking FOLLOW_UPS triage — mark which of the ~65 block launch, fix those

**Launch prep** *(owner-dependent items flagged)*
- [ ] Privacy policy + terms — content **(owner)** + build the pages
- [ ] Analytics wired to the validation question (do people pay $12.99?)
- [ ] Production deploy hardening + monitoring
- [ ] Stripe production + tax setup **(owner)**
- [ ] Final launch-bar sign-off **(owner)**

*Estimates are planning ranges, not commitments — software estimation is
unreliable (see notes below). Biggest single unknown: how many cross-flow bugs
real-device QA surfaces once 1→10 is wired end-to-end.*

## Estimating notes (read before trusting the numbers)
- **"Coding hours"** = focused engineering by one experienced dev. AI-assisted
  build (as in recent sessions) compresses the **screen/web** work a lot; it
  compresses the **native / Apple / IAP** work much less.
- **Design is a separate, parallel track.** Several Phase 1 screens need a
  design-architect **prototype first** (the established rhythm). Those designer
  hours are **not** in the coding estimates below — they're a dependency.
- **Coding hours ≠ calendar.** Apple review (Phase 2) and design iteration
  (Phase 1) add calendar time that isn't coding.

---

# PHASE 1 — Launchable Mobile Web App

**Definition of done:** a real user can, on their phone's browser: onboard →
subscribe ($12.99 via Stripe) → train their voice → create messages → hear them
in their voice → revisit them on the shelf → manage their account — with proper
loading/error handling throughout. Polished, on-brand, production-deployed.

### Workstream A — Finish the journey screens
| # | Item | Needs design? | Coding hrs |
|---|---|---|---|
| 7 | **Memory Shelf** redesign + build + widen API (handoff written) | yes (in progress) | 16–30 |
| 8 | **Home B** — the ongoing home/hub (today a 34-line stub) | yes | 16–30 |
| 5 | **First Playback** — confirm the First-Breath beat covers it, or build the distinct screen | maybe | 4–16 |
| 3 | **Card Capture** — replace the checkout *stub* with a real, redesigned subscribe moment | yes | 12–30 |
| 4 | **Vault** freshness check (oldest redesigned set, April) | minor | 4–12 |

### Workstream B — Account, trust & system (required for a real product)
| # | Item | Needs design? | Coding hrs |
|---|---|---|---|
| 9 | **Settings & Trust** — account, subscription management, **delete account**, transparency surfaces | yes | 30–60 |
| 10 | **Error Recovery** — global error/loading/not-found boundaries + systematic states | light | 16–40 |

### Workstream C — Hardening & glue
| Item | Coding hrs |
|---|---|
| Cross-step **integration + full-journey wiring + nav/state** | 20–40 |
| **Tech debt:** #30 migration-history cleanup, #34 legacy-route consolidation, #28 audio bucket | 10–25 |
| **Real-device QA** + bug-fix passes across the whole flow | 20–50 |

### Workstream D — Launch prep (web)
| Item | Coding hrs |
|---|---|
| **Stripe subscription** end-to-end hardening (trial → active → lapse → restore), real-voice cost validation at volume | 8–20 |
| **Mobile-web polish** (responsive, touch targets, optional PWA/installable) | 8–20 |
| **Privacy policy + terms**, analytics/observability for the validation goal, production deploy hardening | 8–20 |

**Phase 1 total ≈ 170–360 coding hours** (~**4–9 focused full-time weeks** for one
engineer; less with heavy AI assist on the screens), **plus** design-architect
time on the screens marked "yes."

**Critical path:** design (7 → 8 → 3 → 9) feeds build; B + C + D can largely run
in parallel once their screens land. #30 (migrations) should be resolved before
launch — it blocks clean schema changes and is a production risk.

**Phase 1 exit = a live, paying web product.** No App Store work needed to get
here. This is the thing you validate with.

---

## Phase 1 — Sequenced Build Plan (execution order)

**The shape: two parallel tracks.** A **Design** track (the architect producing
one prototype at a time) and an **Engineering** track. The design-heavy screens
(7, 8, 3, 9) can't be built until their prototype lands — so **the design queue
is the likely critical path**, and the highest-leverage move is keeping the
architect fed and unblocked. Engineering stays busy on the no-design work in
parallel so it never idles.

**Critical path:** Design(7 → 8 → 3 → 9) → their builds. Everything else
parallelizes around it.

### M0 — Foundations & de-risk *(✅ COMPLETE 2026-06-17)*
> **Progress:** ✅ #34 done · ✅ Step 5 resolved · ✅ Step 10 global
> boundaries done · ✅ #30 reconciled (2026-06-16). **M0 fully complete.**
- ✅ **#30 migration-history cleanup** — RESOLVED 2026-06-16 (see FOLLOW_UPS #30).
  Colliding short-stub versions renamed to unique 14-digit versions and the
  ledger reconciled; `supabase db push --dry-run` now reports "up to date."
- ✅ **#34 legacy-route consolidation** — `/messages/new` is canonical; the
  legacy `/app/messages/new` now permanently redirects there, all callers
  repointed, the orphaned `NewMessageView` deleted. Verified live.
- ✅ **Step 5** — **confirmed: First Breath *is* First Playback** (owner, 2026-06-16).
  No separate "first playback" screen to build — the First Breath ceremony
  satisfies the spec's beat. Step 5 is **done** for V1.
- ✅ **Step 10 global boundaries** — app-wide `error.tsx`, `global-error.tsx`,
  `not-found.tsx`, `loading.tsx`, on-brand via a shared `SystemScreen`. (Per-flow
  error states remain M3.)
- **Design:** architect works the queue, starting with **Step 7** (handoff sent).
- *Exit:* clean migration pipeline ✅, one canonical creation route ✅, Step 5
  scope known ✅, app-wide error/loading scaffolding ✅, Step 7 design in hand ✅.

### M1 — The keepsake loop *(✅ COMPLETE 2026-06-17)*
- ✅ **Step 7 Memory Shelf** — built from design (relocated to
  `components/screens/shelf/`, skin mirrors the prototype on `@theme`),
  `/dev/shelf` added. `GET /api/messages` widened (category / duration /
  play-history / full body). Live-verified at 390×844 / 4× CPU on a real
  account; the verify found + fixed a defect (`played_count` was never written,
  so the unplayed glow never retired — the play route now records it). Hardened
  with smoke tests across data transform / format helpers / play route / screen
  states (288 unit tests).
- *Exit:* ✅ save a message → revisit/replay it on a redesigned shelf. Core loop whole.

### M2 — The hub + the subscribe moment *(🔨 ~90% — see 2026-07-06 status above)*
- **Step 8 Home B** — ✅ built (PR #61). The hub linking create / shelf / settings.
- **Step 3 Card Capture** — 🔨 in active build (PR #81); Stripe checkout underneath
  already works.
- *Exit:* full happy path — home → subscribe ($12.99) → create → hear → shelf —
  coherent and payable.

### M3 — Account, trust & system completeness *(🔨 in progress — see 2026-07-06 status above)*
- **Step 9 Settings & Trust** — ✅ built (PR #83). Account, subscription
  management, **delete account** (ships dark behind `ACCOUNT_DELETE_ENABLED`;
  also required later for the App Store), transparency surfaces.
- **Step 10 per-flow error states** — 🔨 **mostly done** (see 2026-07-08 update):
  payment/restore recovery (PR #79) ✅ · generation-failure S10-A (PR #88) ✅ ·
  playback Shelf ✅ (First-Breath S10-C blocked on FU #41) · **offline S10-B
  design landed, build pending** · consolidated copy pass owed.
- **Step 4 vault freshness check** — ✅ merged (PR #80).
- *Exit:* a user can fully manage and leave their account; failures handled gracefully.

### M4 — Integration, hardening & launch
- **Full-journey wiring** — 1→10 as one app: nav, state, transitions, the seams.
- **Stripe hardening** — trial → active → lapse → restore E2E; real-voice cost
  validated at expected volume.
- **Mobile-web polish** — responsive, touch targets, (optional) PWA/installable.
- **Real-device QA** — walk the whole journey on real phones; bug-fix passes.
- **Launch prep** (Eng + **owner**) — privacy policy + terms, analytics wired to
  the validation question, production deploy hardening + monitoring.
- *Exit:* **launch** — a live, paying mobile web app.

### Owner / decision touchpoints
- ~~**M0:** apply the #30 migration bundle; decide Step 5's fate.~~ ✅ done.
- **M2 (next, design-gated):** approve the **Step 8 Home B** prototype to unblock build.
- **Each design-heavy screen:** approve the prototype + a copy pass (clarity-first
  for boomers/Gen X, like the A4 pass).
- **M4:** provide privacy/terms content; sign off the launch bar.

### Why this order
- **Risk first** — #30 (production risk + owner coordination) and Step 5 (unknown
  scope) resolved in M0, before they can surprise the timeline.
- **Value first** — the keepsake loop (M1) and the payable happy path (M2) land
  before completeness work (M3), so the product is demonstrable and chargeable early.
- **Design-paced** — architect fed continuously (7→8→3→9) while engineering never
  idles on parallel non-design work.
- **Hardening last** — you can't wire or QA what isn't built.

---

# PHASE 2 — App Store (deferred until post-validation)

**Trigger to start:** Phase 1 is live and the $12.99 bet is showing signal worth
the App Store tax. Not before.

**The good news (carries over for free):** accounts, data, content, and existing
customers need **~zero migration** — the native app is the same web app in a
Capacitor shell talking to the same backend. Users log in with the same email
and everything's there. Existing Stripe subscribers stay on Stripe, grandfathered.

| Item | Coding hrs | Notes |
|---|---|---|
| **Native packaging** (Capacitor shell, native config, audio/deep-link, magic-link deep-link) | 30–80 | Risk: Apple rejects thin wrappers — must feel app-like |
| **IAP integration + entitlement unification** | **40–100** | The real chunk: StoreKit, receipt validation, **App Store Server Notifications** handler, **double-charge guard**. *Enabled by your existing entitlement abstraction — access already reads `getSubscriptionStatus()`, not Stripe directly, so access-control code doesn't change.* |
| **Apple compliance** (App Privacy labels, ATT if tracking, review prep; account-delete already built in P1) | 10–30 | "Sign in with Apple" likely **not** required (you only use email auth) |
| **Pricing & cohort handling** (eat 30% or raise iOS price; two-billing reconciliation) | 8–20 | Two billing systems from here on, permanently |
| **Apple review cycles** (fix + resubmit) | 10–40 | + calendar time (review is days, not coding) |

**Phase 2 total ≈ 100–270 coding hours**, dominated by IAP. Plus ongoing
operational cost: **two payment systems forever** (Stripe web + Apple IAP),
two refund flows, reconciliation.

**What "migration" actually means here:** *not* moving subscriptions (you can't
move a live Stripe sub into Apple IAP). It's **adding a parallel IAP billing
path** + a unified entitlement layer, with existing web payers grandfathered.

---

## Combined picture
| | Coding hrs | Calendar (rough) | Outcome |
|---|---|---|---|
| **Phase 1** | 170–360 | ~1.5–3 months | Live, paying mobile web app |
| **Phase 2** | 100–270 | ~1–2 months + Apple review | Same product on the App Store |

## Biggest variance drivers
1. **Design iteration bar** per screen (Phase 1) — how many rounds each screen takes.
2. **IAP / payments** (Phase 2) — the single largest, least-compressible item.
3. **Apple review** (Phase 2) — opaque; first submissions commonly bounce.
4. **Who's coding** — AI-assisted screen build compresses Phase 1 meaningfully.

## Out of scope (both phases, per MASTER_SPEC V1)
Legacy & Guardian tiers (deferred to waitlist), message editing/deleting
(immutable), scheduling/occasion reminders (v2), multi-voice, sharing/export.

## Assumptions
- One experienced engineer (AI-assisted), with a design architect feeding
  prototypes in parallel.
- Backend stays Supabase; payments stay Stripe for web; Capacitor for native.
- Scope holds to MASTER_SPEC V1 (no tier expansion mid-build).

---

## Status history (archive)

Superseded snapshots, newest first. Kept for provenance only — the live picture
is **Current state — 2026-07-12** at the top.

- **2026-07-12 — M3 closed, spine landed.** S10-B offline (PR #89), First Breath
  audio (PR #91, FU #41), Stripe guards (PR #92), C3 cap confirmed (403 at 3),
  monetization spine wired end-to-end (PR #95, flags OFF). Then, same day:
  FU #84 checkout race resolved (`6429650`) + vault bronze-engine migration
  (`807ad88`) — both since folded into Current state.
- **2026-07-08 — M3 nearly closed.** C3 Vault Limit found already built (PR #87);
  Step 10 re-scoped by §12 category (not 3 equal chapters): S10-A ✅ (PR #88),
  playback Shelf ✅, S10-B offline design landed / build pending, S10-C blocked
  on FU #41, error-copy pass owed.
- **2026-07-06 — "every screen exists" reality check.** M2 done (Home B PR #61,
  Card Capture PR #73/#81); M3 partial (Settings PR #83, Step 4 PR #80, Step 10
  Ch2 PR #79). Flagged genuine unbuilt work: Step 10 states, C3 Vault Limit,
  First Breath audio, legal surfaces, ~65-FOLLOW_UP debt.
- **2026-06-17 — original audit.** Built/redesigned Steps 1,2,4,6,7; stubs/gaps
  at Steps 3, 8, 9, 10. M0 + M1 complete; M2 the active, design-gated milestone.
