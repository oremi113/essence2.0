
# C3 · Vault Limit — Capped-Steady-State Design Brief

> **Format mirror:** `docs/Step3_Card_Capture_Design_Handoff.md`,
> `docs/Step8_Home_B_Design_Handoff.md`. Same shape, same rules.
>
> **Status going in:** C3 is **not a blank screen.** A functional,
> fully-wired, fully-telemetered version shipped in the Step 6 spine
> (Chunk 8, 2026-06-14) and lives at `/messages/limit`. The roadmap
> (2026-07-06 scan) re-flags it **design-gated** anyway — read §0 for why
> that isn't a contradiction. Your job is the design pass, not the plumbing.

---

## 0. The why (read once, then work from §1)

C3 is the **ceiling of the core monetization rule**: the plan includes
**three lifetime messages**, and this is the screen a user sees once all
three are saved (3/3). It is the calmest of the **three "ceiling" screens**:

- **C1 — Three Shaped** (`?ceremony=three-shaped`): the one-time *ceremony*
  on the 3rd save. A moment. Elevated register.
- **C2 — Waitlist** (`/messages/waitlist`): "more is coming," opt-in.
- **C3 — Vault Limit** (`/messages/limit`): the **ongoing, revisited** state
  every time a capped user tries to make another. **Not a moment — a fact.**

The prototype header for the current version names the tone exactly: *"the
calmest of the three… a gentle fact, not an event."* No celebration, no
scarcity, no countdown, no upgrade CTA. **Value-add stewardship:** *you got
what the plan promised, and your voice stays safe.* This is deliberately the
**anti-paywall** — the user already paid; hitting the cap must never feel
like being upsold or walled out.

**So why is a shipped screen "design-gated"?** Because the current C3 is a
faithful port of `prototypes/message creation/essence-step6-pass2-c-screens.html`
— a prototype drawn **before the Vault redesign** (Step 3 Card Capture, the
bronze-vault palette, and the decision that the **Vault is a distinct hero
object, NOT the Breath Stone**). The shipped C3 shows a **warm-amber stone**
in the Breath-Stone lineage. On a screen whose entire subject is *your Vault
is full*, that's **the wrong object** — and the owner has decided C3 should
show the **Vault object at rest** instead (§5, locked). That's the gate: a
*language-alignment* pass on a screen that already works — re-anchor it to the
redesigned Vault, hold the senior-designer bar. Not a from-scratch build.

**Audience:** skews boomer / Gen X. Clarity beats cleverness. This is a
returning, paying user — treat them as an owner, not a lead.

---

## 1. What to design (the scope checklist)

One screen, essentially one state. The craft is in restraint — small
surface, high tonal precision. Deliver a self-contained prototype
(`prototypes/essence-c3-vault-limit.html`) covering:

- [ ] **The hero object — decided: the Vault at rest** (§5). Show the **Vault
      object, full and sealed, at rest** — *not* a Stone. Make it **kin to the
      redesigned vault, distinct from the Breath Stone**, preserved and still,
      **no idle loop** (archive state, not a live one). This is the screen's
      craft centre; the rest is atmosphere around it.
- [ ] **Atmosphere / ground.** Currently a near-imperceptible static warm
      wash on cream. Decide whether the settled-ownership feeling wants
      more warmth (honey/rich grounds are licensed for weighted vault
      moments — §Appendix A.3) or should stay whisper-quiet. No animated
      ambient glow (that's C1/A7's ceremony language — C3 is calmer).
- [ ] **The entrance choreography.** A *state arriving*, not a *moment
      unfolding* — faster than the ceremony screens. Current cadence:
      stone 0ms → eyebrow 700 → title 900 → aside 1100 → primary 1300 →
      link 1500. Keep it a state; tune the curve/stagger to the new object.
- [ ] **The two CTAs.** Primary "Visit your Memory Shelf" (fill), secondary
      "See what's coming" (quiet link → C2). Their hierarchy is right; hold
      it. The primary must **not** read as a purchase button.
- [ ] **Vertical rhythm & anchoring.** Content is top-anchored (grounded,
      not floating), no backbar (there's nothing to go "back" within a
      fact). Confirm that reads as *settled ownership*, not *dead-ended*.
- [ ] **Reduced-motion resting frame.** The screen must **arrive complete**
      (see §9).

**Out of scope:** navigation, the cap logic, telemetry, the two entry paths
— all shipped and correct (§7). You design the object, the atmosphere, the
motion, and the copy's final home; we keep the wiring.

---

## 2. What C3 is (the intent to protect)

A capped user opens the create flow (or races a save in a second tab) and
lands here instead. The feeling to leave them with, in one line:

> *"I have what I was promised, and it's safe. Nothing is being taken from
> me and nothing is being sold to me."*

**The DO-NOT-ADD list (inherited from the prototype — treat as locked):**

- **No countdowns / urgency / scarcity.** Nothing expires; the cap is a
  steady state, not a deadline.
- **No upgrade CTA, no "unlock more," no pricing.** They already subscribed.
  C2 ("See what's coming") is the *only* forward-looking beat, and it's a
  quiet opt-in, not a sell.
- **No save-offer / loss-frame language.** The loss-frame is a Step 3
  (Card Capture) instrument and lives **only** at the pay moment. C3 is
  post-purchase; loss-framing here would betray the owner.
- **No celebration.** C1 already did the ceremony. C3 is the 4th, 40th, and
  400th visit — a warm, familiar fact.

If the design makes a capped user feel *managed*, *milked*, or *walled*,
it's wrong regardless of how pretty it is.

---

## 3. States the prototype should cover (switch via the dev rail)

C3 has **no per-user variant data** — the copy is fixed. But there are two
surfacing paths and the accessibility fallback to represent:

1. **Default (`a2_entry`)** — the common case: a 3/3 user opened the create
   flow and was gated here before starting. This is the canonical render.
2. **`save_race`** — a rarer path: a mid-flow user's 3rd message was saved
   in another tab, and `/save` 403'd them here. **Decided: render this
   identically to `a2_entry`** — the fact is the same and simplicity serves
   the calm. `surfaced_from` stays a telemetry dimension only, never surfaced
   to the user. (Don't design a separate variant; one render covers both.)
3. **Reduced-motion** — the screen arrives fully composed, no entrance.

The dev rail today is just a **↻ Replay** control (`/dev/messages-limit`) —
one render, no variant toggle needed.

---

## 4. How users get here, and where they go next

**In:**
- `/messages/new` cap gate → redirect to `/messages/limit` (`a2_entry`).
- `/api/messages/save` returns `403 { code: 'vault_limit_reached' }` →
  client pushes `/messages/limit?from=save_race`.
- Direct navigation to `/messages/limit` (reads as `a2_entry`).
- **Guard:** an *under-cap* user who lands here is redirected straight into
  `/messages/new` — C3 only ever renders for a genuinely capped user, so
  design for 3/3 with confidence.

**Out:**
- **Primary → Memory Shelf** (`/app/shelf`, Step 7) — the natural home for a
  capped user: *go be with the three you kept.* This is the emotionally
  correct primary, not a consolation prize — design it as the warm default.
- **Secondary → C2 Waitlist** (`/messages/waitlist?from=c3`) — the quiet
  "more is coming" opt-in.

---

## 5. The visual language — and the hero object (decided: Vault at rest)

Source the language from the app, the way Step 7 and Step 3 did — not from
the stale token doc (Appendix A carries the canonical values).

**The object is decided — build to it, don't re-open it:**

> **C3 shows the Vault object at rest — full, sealed, complete. Not a Stone.**

Rationale, so you can design *with* the decision rather than around it:

- The **current** C3 renders a warm-amber **stone** — a self-contained CSS
  gradient in the **Breath-Stone family** (the "your voice" metaphor), ported
  verbatim from the old Step-6 prototype, which predates the Vault redesign.
  **That object is now wrong for this screen** and is what we're replacing.
- The product locked a distinction (see
  `docs/Step3_Card_Capture_Design_Handoff.md` §5 and the vault-decisions
  memo): the **Vault** is a **distinct hero object — the thing that keeps the
  voice safe**, deliberately *not* the Stone. It can be still, architectural,
  enclosing, sealable.
- C3's sentence is **"your Vault is full / three are kept"** — the subject is
  the **Vault**, so the Vault is what anchors the screen. Design it **full and
  sealed at rest**: preserved, still, **no idle loop** (archive, not a living
  object). Make it **kin to the redesigned vault world** (same palette, same
  craft) — the same object family the user met at Card Capture and will see
  in restore, now shown *complete*.

**Object references (open these):**
- `prototypes/bronze-vault-palette-all-stages.html` — the redesigned vault's
  color/stage language (the world C3's object must belong to).
- `prototypes/vault-canvas-rig.html`, `prototypes/vault-design-palette.html`
  — the current vault object / palette exploration.
- `src/app/dev/vault` — the production vault arc, if you can run the repo.
- **Breath Stone (for contrast — the thing C3 arguably should stop being):**
  `prototypes/breath-stone-api.md`. Do **not** put C3's object on
  `--ease-breath` — that curve is the living Stone's alone (Appendix A.1).

**Tonal neighbor for the calm to land in:**
`prototypes/essence-step7-memory-shelf.html` — the keepsake calm C3 hands
the user off into. C3 and the Shelf should feel like the same room.

**The shipped C3, to click through what exists today:**
`/dev/messages-limit` (production render, real tokens/motion), or the source
frame `prototypes/message creation/essence-step6-pass2-c-screens.html` (`c3`).

---

## 6. The data you can design around

Almost none — and that's the point. C3 is **static**:

- **The cap is 3** (`STEP6_LIMITS.maxSavedMessages`, canonical in
  `src/lib/messages/cost-controls.ts`). If your design references the number,
  three is the number.
- **No plan, no price, no status** surfaces here (post-purchase, and by
  design not a sell — §2).
- The only runtime signal is `surfaced_from` (`a2_entry` | `save_race`),
  which you may optionally reflect in copy (§3) but is otherwise invisible.

Design for what *should* be on a settled-ownership screen; there's no data
to fetch or fear.

---

## 7. Notes for engineering — *not your job, just so you know it's handled*

- **The plumbing is done and correct — don't redesign it, and don't let the
  design require re-plumbing.** The cap gate, the `save_race` 403 route, the
  under-cap guard, and navigation to Shelf / C2 all shipped in Chunk 8.
- **URLs never change** (CLAUDE.md / DECISIONS lock): `/messages/limit`
  stays; `/app/shelf` and `/messages/waitlist` stay. Rename components
  freely; routes are frozen.
- **Telemetry is specced and live — don't touch the contract.**
  `step6.vault_limit_blocked` fires once on mount with `surfaced_from`
  (analytics catalog event #13; see
  `docs/analytics/2026-06-14-step6-vault-limit-blocked-live.md`). If your
  design adds a user-visible `save_race` variant, that's a *rendering*
  change, not an analytics one — but drop a note in `docs/analytics/` per the
  repo rule if any new event or dimension appears.
- **Current implementation we're replacing:**
  `src/components/screens/messages/VaultLimitScreen.tsx` (+ `.css.ts`,
  `.types.ts`), page at `src/app/messages/limit/`, dev page at
  `src/app/dev/messages-limit/`. We rebuild the screen to your prototype,
  keep page.tsx thin, and keep the `/dev/` page (permanent per CLAUDE.md).
- **The prototype is the source of truth.** Self-contained HTML — inline
  `<style>`, tokens in `:root`, a dev rail for §3. Keep a short **NOTE FOR
  CODE ARCHITECT** header current; production mirrors your copy, timing,
  motion, layout.

### Port instructions (from the 2026-07-07 code audit — read before building)

The delivered prototype is design-correct and faithful to this brief. Three
things are **prototype-only conveniences that must NOT be ported verbatim**
(full detail: FOLLOW_UPS #74):

1. **Reuse the production engine — don't fork it.** The prototype inlines a
   verbatim, single-`t` copy of the vault canvas engine + `RELIQUARY` palette
   from `vault-canvas-rig.html`. Production truth is
   `src/lib/vault-render/{vaultEngine,paintVault,palette}.ts` (now a split
   `mechT/emberT` drive). The screen calls `paintVaultFrame(canvas, 1, {…})`
   with the lib's exported `RELIQUARY`; **delete** the inlined
   `initVaultEngine`/`drawVault`/local `RELIQUARY`/`readAnchors`. Porting the
   inline would be a third divergent engine copy.
2. **Drop the `getComputedStyle` token bridge.** `--shimmer-alpha` /
   `--shimmer-r-rest` aren't in `@theme` (canonical is `--shimmer-intensity`,
   opacity-driven), and `--color-glow-warm-rgb` is comma-form there — so the
   prototype's `readAnchors()` parse silently falls back to literals in
   production. Render the still rest-ground at the screen layer via
   `--shimmer-intensity`, or add the two tokens to `@theme` first (with
   rationale) if the alpha+radius model is kept.
3. **Never mutate the exported `RELIQUARY`** — it's shared with the
   reveal/restore vault screens.

The palette values themselves are byte-identical to `palette.ts` (no color
drift), and `metalCool #7A8088` vs `--color-vault-bronze` is invisible at
C3's `t=1` — already tracked in `palette-token-reconciliation.md`, out of
scope here.

---

## 8. Copy (approved as-is for now — don't block on it)

**The current copy is approved for this pass — carry it over verbatim.** The
alternates below are kept only as a reference if a line fights the new object;
don't spend time reworking copy that already works. A clarity pass, if any,
comes after the visual lands.

Warm, plain, owner-to-owner. Registers stay low — C1 already spent the
elevated moment; C3 is a familiar fact. (See
`docs/ESSENCE_Copy_Voice_Guide.md`: "Vault" once per screen; no scarcity
voice; no money voice here.)

- **Eyebrow:** "Your Vault" *(current — keeps the subject on the Vault)*.
- **Title (the fact):** "Three messages, kept." *(current)* / "Your three are
  kept." / "Your Vault holds all three."
- **Aside (the reassurance — this is the load-bearing line):** "Your voice
  stays preserved. You can revisit what you've saved anytime." *(current)* /
  "They're safe here for good — revisit them whenever you like."
- **Primary CTA:** "Visit your Memory Shelf" *(current)* / "See your three."
  *(Must never read as a purchase — it's a doorway home.)*
- **Secondary link:** "See what's coming" *(current — quiet, → C2)*.
- *(No separate `save_race` line — §3 renders both paths identically.)*

Locked out (do not write): any expiry/countdown, any "upgrade/unlock/more
for $", any "you've reached your limit" framing that reads as a wall.

---

## 9. The motion bar

**Mobile-first**, 390×844 baseline; must hold at a **4× CPU throttle** on a
simulated mid-range phone (`scripts/throttle-dev.mjs` or Playwright CDP). If
it feels off at 4×, it's off on a real mid-range Android at 1×.

Check at 4×:
- **The object's arrival** — a single settle, no bounce, no ceremony swell.
  This is a *state appearing*, and it should feel like it was always there.
- **The copy stagger** (`--ease-essence`, medium duration) — faster and
  lighter than C1/A7; a fact landing, not a revelation unfolding.
- **The footer two-tier reveal** — primary then link; focus lands on the
  primary as it arrives (~1400ms today).
- **No idle loop.** The object is **at rest** — archive, preserved, still.
  Any breathing/pulsing pulls it back toward the living Stone (wrong).
- **Reduced motion:** the screen **arrives complete** — no entrance, object
  pinned to its resting frame, everything at full opacity. (There's no loop
  to pin, which makes this the easy case — verify it anyway.)

---

### Reference index
- **Prototype to build:** new → `prototypes/essence-c3-vault-limit.html`.
- **Source frame being replaced:** `prototypes/message creation/essence-step6-pass2-c-screens.html`
  (the `c3` frame) — the old, pre-vault-redesign version.
- **Production render of what exists today:** `/dev/messages-limit`; screen
  `src/components/screens/messages/VaultLimitScreen.tsx`.
- **The other two ceiling screens (keep the family coherent):** C1 —
  `src/app/messages/saved/[messageId]/` (`?ceremony=three-shaped`);
  C2 — `prototypes/…`/`/messages/waitlist`.
- **Vault object world (the language C3 must join):**
  `prototypes/bronze-vault-palette-all-stages.html`,
  `prototypes/vault-canvas-rig.html`, `prototypes/vault-design-palette.html`,
  `src/app/dev/vault`; **decision context:**
  `docs/Step3_Card_Capture_Design_Handoff.md` §5.
- **Tonal neighbor:** `prototypes/essence-step7-memory-shelf.html`.
- **Stone (for contrast, do not reuse):** `prototypes/breath-stone-api.md`.
- **Cap constant (canonical):** `src/lib/messages/cost-controls.ts`
  (`STEP6_LIMITS.maxSavedMessages` = 3).
- **Routes (canonical, don't invent):** `src/lib/routes.ts` — `messagesLimit`
  `/messages/limit`, `shelf` `/app/shelf`, `messagesWaitlist`
  `/messages/waitlist`.
- **Telemetry:** `docs/analytics/2026-06-14-step6-vault-limit-blocked-live.md`.
- **Copy voice:** `docs/ESSENCE_Copy_Voice_Guide.md`.
- **Tokens (canonical):** `src/app/globals.css` `@theme` — see Appendix A.
  `docs/design-tokens.md` is a guide but has drifted (A.1).
- **Format mirror:** `docs/Step3_Card_Capture_Design_Handoff.md`,
  `docs/Step8_Home_B_Design_Handoff.md`.

---

# Appendix A · Token starter kit (design from these — they're canonical)

**Source: `src/app/globals.css` `@theme`.** ⚠️ Some values **differ from
`docs/design-tokens.md`**, which is stale — these were the primary cause of
the Step 7 "disjointed" finding, so get them right from the start.

## A.1 ⚠️ The two that bit Step 7 — use the `globals.css` values, not the doc's
- **`--ease-breath: cubic-bezier(0.37, 0, 0.63, 1)`** — symmetric pendulum,
  reserved **only** for the Breath Stone's resting rhythm. C3's object — Vault
  or Stone-at-rest — is **static**; do **not** put it on `--ease-breath`. Give
  its arrival `--ease-essence` / `--ease-page`. (`design-tokens.md` wrongly
  lists `0.4,0,0.2,1`.)
- **`--shadow-mineral: 0 4px 14px rgba(110, 80, 40, 0.20)`** — warm-keyed, so
  the cool mineral CTA sits naturally on cream. Applied to the primary button.
  (`design-tokens.md` wrongly lists the old teal — re-keyed 2026-06-12,
  FOLLOW_UPS #40.)

## A.2 Motion curves & durations
- `--ease-essence: cubic-bezier(0.4, 0.0, 0.2, 1)` — **universal** state
  transitions (C3's copy reveals live here today).
- `--ease-page: cubic-bezier(0.22, 1, 0.36, 1)` @ `--duration-page: 700ms` —
  signature page arrival + staggered children.
- `--ease-press: cubic-bezier(0.2, 0.0, 0.0, 1)` — button press / tactile.
- Durations: `--duration-micro 200ms`, `--duration-small 400ms`,
  `--duration-medium 800ms`, `--duration-large 1200ms`. **Avoid**
  `--duration-ceremonial 2000ms` here — that's ritual language, and C3 is
  explicitly *not* a ceremony.

## A.3 Color
- Grounds: `--color-bg-neutral #FBF8F4` (cream base — C3's current ground).
  **Warm grounds** licensed for weighted vault moments if you want more
  settled warmth: `--color-bg-gold #E8D8B3` (honey), `--color-bg-rich
  #D9C28E` (richest).
- CTA: `--color-mineral-dark #656B73` (AA-safe primary fill; white text
  clears 5.38:1), `--color-mineral-darker #565C63` (pressed). Plain
  `--color-mineral #7A8088` is for active/recording states, **not** white-text
  fills (fails AA at 3.98:1). *(C3's eyebrow uses `--color-mineral` as text on
  cream — that's fine; the AA caveat is white-on-mineral only.)*
- Text: `--color-text-primary #1C1A18` (headlines/body),
  `--color-text-secondary #6B6B6B` (asides). **Never**
  `--color-text-tertiary` on small text (fails AA; audience skews 45–70).
- Status: not needed here — C3 has no error/success/loss beat. If you reach
  for `--color-status-error` you're probably drifting toward a wall (§2).

## A.4 Type, radius, targets
- Type: `--font-display 'Spectral', Georgia, serif` (title + tender italic
  aside — C3 uses both today); `--font-body 'Inter', system-ui, sans-serif`
  (eyebrow, buttons). `--text-title 28px`. Floor at `--text-small 14px`.
- Radius: `--radius-lg 10px` (buttons, current), `--radius-full` (the object).
- Touch targets: **44px** minimum. Honor `prefers-reduced-motion`.

> Values sourced from `src/app/globals.css` `@theme`. Where
> `docs/design-tokens.md` disagrees (A.1), `globals.css` wins.
