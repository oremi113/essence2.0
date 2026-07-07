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

## Where we are (the audit, updated 2026-06-17)
Built **and** redesigned: Steps 1, 2, 4, 6, **7** (Step 7 redesigned + built +
live-verified + test-hardened, 2026-06-17 — see M1 below).
Stub / missing / unclear: Step 3 (checkout stub), Step 5 (folded into First
Breath — confirmed done), Step 8 (Home B stub), Step 9 (Settings — missing),
Step 10 (global boundaries done; per-flow states pending — M3). Pricing is
current in `MASTER_SPEC.md` §V1.1 (Vault $12.99/mo · $119/yr · 7-day trial ·
3 lifetime messages).

**Next move:** M2 is the active milestone but is **design-gated** — the Step 8
Home B prototype must land before build can start. M0 + M1 are complete.

---

## Status update — 2026-07-06 (supersedes the 2026-06-17 audit above)

The build has moved well past the June snapshot. **Every primary journey screen
exists in the repo, and the M2/M3 feature batch is merged to `main`:**

- **M2 Hub + subscribe** — ✅ Step 8 Home B (PR #61) + Step 3 Card Capture
  (PR #73/#81). Complete.
- **M3 Account/trust/system** — ✅ Step 9 Settings & Trust (PR #83) · ✅ Step 4
  Vault freshness (PR #80) · 🔨 Step 10 per-flow error states **partial** — only
  Ch2 (payment/restore recovery, PR #79) landed.
- **M4** — not started.

### Reality check: what "every screen exists" hides *(surfaced by a 2026-07-06 code scan)*

The roadmap read as if only hardening/polish remained. It doesn't — these are
**genuine unbuilt requirements still on the launch path**, not polish:

1. **Step 10 error states are ~1/4 done.** Only payment-recovery (Ch2) shipped.
   Generation-failure, audio-can't-play, and offline states are unbuilt
   (MASTER_SPEC Ch.12).
2. **C3 "Vault Limit" screen is unbuilt** (FOLLOW_UPS #38) — the 3-lifetime-messages
   enforcement UI. **Gates the core monetization rule**, so not optional.
3. **First Breath ceremony audio is unwired** — `TODO` placeholders only
   (harmonic swell / resonant bell). May need sound design.
4. **Legal/launch surfaces don't exist** — only an onboarding privacy *modal*;
   no privacy-policy or terms pages, no production deploy hardening/monitoring.
5. **Debt + leftovers** — ~65 open FOLLOW_UPS to triage for launch-blockers; a
   dead `record/complete/stub` checkout stub to remove; Home A is still a stub
   (confirm whether V1 needs it).

**So the state is "back third of the build," not "final coat of paint."**

---

## Remaining work to launch — recalibrated 2026-07-06 (full path, no lean cut)

Calibrated to observed velocity: ~21 weeks elapsed (Feb 11 → Jul 7), bursty
cadence (heavy weeks ~20–25 commits, quiet weeks ~2–4), recent per-screen rhythm
of **1–2 calendar weeks each = an initial AI build sweep + 1–2 audit/verify/polish
rounds** (each round is a real focused session, as the Step 9 finalize showed).

| # | Bucket | Focused hrs (AI-assisted) |
|---|---|---|
| 1 | Step 10 remaining error chapters (gen-fail / playback / offline) | 15–30 |
| 2 | C3 Vault Limit screen (design-gated + build) | 10–24 |
| 3 | First Breath ceremony audio (assets + wiring; may need sound design) | 8–20 |
| 4 | Full-journey integration & wiring (1→10 as one app) | 20–40 |
| 5 | Stripe lifecycle hardening (trial→active→lapse→restore) + real-voice cost at volume | 12–28 |
| 6 | Mobile-web polish (responsive, touch targets, optional PWA) | 10–24 |
| 7 | **Real-device QA + bug-fix passes** (least AI-compressible) | 30–60 |
| 8 | Launch prep: privacy/terms build, analytics→validation, deploy hardening + monitoring | 12–30 |
| 9 | Launch-blocking debt triage (subset of the ~65 FOLLOW_UPS) | 10–25 |
| 10 | Cross-app design/polish rounds (the audit texture, applied everywhere) | 15–35 |
| | **Total** | **~140–315 focused hrs** |

**Calendar at current engaged pace** (~15–25 productive AI-assisted hrs/active
week): **~2.5–5 months, realistic middle ~3–3.5 months.** The spread is driven by
the items AI can't compress and that need the **owner**: real-device QA surprises,
legal content, Stripe production + tax setup, ceremony sound design, and the
"is this launch-quality?" call per flow. Design-gated items (C3, the Step 10
states) add calendar that isn't coding.

## Launch punch-list (burn-down)

Track these to done. `[ ]` = open, grouped by the buckets above.

**Finish the journey**
- [ ] Step 10 Ch — generation-failure state (create flow can't render a voice)
- [ ] Step 10 Ch — audio-can't-play state (playback failure on shelf/first-breath)
- [ ] Step 10 Ch — offline / connection-lost state
- [ ] C3 Vault Limit screen — design prototype → build → wire the 3-message cap
- [ ] First Breath ceremony audio — source/produce assets + wire the swell + bell
- [ ] Remove dead `record/complete/stub`; confirm Card Capture is the only checkout path
- [ ] Decide Home A: build its brief, or delete the stub for V1

**Integrate & harden**
- [ ] Full-journey wiring 1→10 — nav, state, transitions, the seams as one app
- [ ] Stripe lifecycle E2E — trial → active → lapse → restore, verified live
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
- **Step 10 per-flow error states** — 🔨 **partial**: only Ch2 payment/restore
  recovery merged (PR #79). Generation-failure, audio-can't-play, offline still
  unbuilt — see the punch-list above.
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
