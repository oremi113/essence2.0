# Session · Step 8 · Home B build

**Date:** 2026-06-17
**Source of truth:** `prototypes/essence-step8-home-b.html` (+ `docs/Step8_Home_B_Design_Handoff.md`)
**Scope:** Build the completed-user hub (Home B) as a prop-driven screen, wire
`/home` to branch Home A vs Home B on voice-profile status, add a permanent
`/dev/home-b` sandbox, and cover it with unit tests. URL `/home` unchanged.

## What shipped

| File | Role |
|------|------|
| `src/components/screens/home/HomeBScreen.tsx` | Pure, props-driven screen — all 7 states |
| `src/components/screens/home/HomeBScreen.css.ts` | Scoped CSS (`.homeb`), ported from the prototype |
| `src/components/screens/home/HomeBScreen.types.ts` | `HomeBScreenProps`, `HomeBVaultState`, `HomeBLoadState` |
| `src/components/screens/home/mockHomeB.ts` | Mock recent messages for the dev page + test |
| `src/app/home/page.tsx` | Server: gate on `voiceProfile.status==='ready'`; derive vault state; render Home B (else the Home A stub) |
| `src/app/home/HomeBPageClient.tsx` | Client: `/api/messages` fetch (`useResource`) + navigation |
| `src/app/dev/home-b/page.tsx` | Permanent dev sandbox, dev rail over all 7 states |
| `tests/unit/home-b-screen.test.tsx` | 11 cases — states, CTA gating, callbacks |

The stone is the shared canvas `BreathStone` in its `infused` state — **not** a
forked CSS stone (FOLLOW_UPS #35). Motion (arrival stagger, ground settle, CTA
shimmer, skeleton) is pure CSS opacity/transform; reduced-motion pins to a
resting frame. Verified in-browser at a 390×844 viewport, 0 console errors,
across all 7 states.

## Decisions (made here, reversible)

1. **Subscription → vault-state mapping** (`deriveVaultState` in `page.tsx`):
   `trial`→trial · `active`/`past_due`→protected · `lapsed`/`cancelled`→lapsed
   · `none`→trial (defensive). **`past_due` reads as Protected** — the vault is
   still live while Stripe retries; it only becomes "paused" once the webhook
   writes `lapsed` past the retry ceiling. The prototype only models
   trial/protected/lapsed, so this is the fit.
2. **First-arrival is driven by `?welcome=1`** (mirrors the shelf's `?saved=1`).
   The visit-#1 beat (rich→cream ground, heavier stagger, the one-time line).
   **The upstream handoff that sets it is not yet wired** and it is **not
   durable** (a refresh with the param re-shows it) — see FOLLOW_UPS.
3. **Home A branch = the existing `/home` stub.** Home A is a separate
   screen/brief (not built); `page.tsx` renders the stub for non-`ready` users.
4. **Settings affordance dead-links** (no-op `onSettings`) until Step 9 / M3.
5. **Preview rows open the Memory Shelf** (`onOpenMessage`→`/app/shelf`). No
   per-message route on Home B; length/playback live on the shelf (the
   prototype drops duration here for the same reason).
6. **3/3 "Hear about what comes next" → `/messages/waitlist` (C2)**, matching
   the Memory Shelf. The prototype said `/messages/limit`, but that route is C3
   (Vault Limit Reached) — the *blocked-creation* wall (`surfacedFrom`
   `a2_entry`/`save_race`), which itself forwards to C2. Home B's 3/3 isn't a
   blocked attempt, so C2 (the open look-ahead) is the correct, shelf-consistent
   destination. Documented divergence from the prototype, which predates the
   app's C2/C3 split. (Consistency-audit fix, 2026-06-17.)
7. **`lapsed` + `3/3` edge:** full takes precedence (complete state, no restore
   CTA). A lapsed user at the cap can't create anyway; restore stays reachable
   from other surfaces.
8. **Token drift fix:** the prototype's local `--color-bg-rich` (#EDE3D0) is
   globals' `--color-surface-warm` — used the canonical token that reproduces
   the prototype's pixels (the same-named global is the saturated #D9C28E). CTA
   hover (#565C63), the lapsed pill warmth (#EBE3D6/#DCD0BC), and the AA-cleared
   reassurance grey (#5A5A5A) have no canonical token and are hardcoded with a
   flag, per house convention.

## Consistency audit (2026-06-17)

Pass over tokens + button actions vs the rest of the app. Changes applied:
- **Promoted two prototype-local values to canonical `@theme` tokens** (additive,
  no existing usage changes): `--color-mineral-darker #565C63` (pressed fill on
  a `mineral-dark` button) and `--color-text-secondary-strong #5A5A5A` (AA-safe
  supporting text on warm surfaces). Home B now consumes these instead of
  hardcodes; the lapsed pill bg uses `--color-surface-warm`. Only the lapsed
  pill's divider border remains a flagged one-off.
- **Routed 3/3 → C2 Waitlist** to match the shelf (decision #6 above).
- Verified Home B uses canonical tokens throughout (spacing/radius/type/
  duration/ease/shadow/color); the only literals left are designer-tuned
  atmosphere (stone ground-shadow, skeleton shimmer rgba) — same treatment as
  SaveConfirmation/Generation screens.

Cross-app a11y fix applied (owner-approved, FOLLOW_UPS #60 — RESOLVED):
- The audit found Home B's create CTA used the **AA-safe `--color-mineral-dark`
  fill** (the prototype's polish-pass fix) while the rest of the app put
  white-ish text on `--color-mineral` (#7A8088) ≈ **3.98:1, below WCAG AA**.
  Rather than fork, we **fixed it at the source app-wide**: 16 primary-CTA
  fills repointed `--color-mineral` → `--color-mineral-dark`, hovers →
  `--color-mineral-darker` (`.btn-primary`, the vault/shelf buttons, and the 8
  message-flow `.btn`s). Decorative/graphical mineral uses (progress fills,
  dots, step badges, scrubber, icon toggles — 3:1 threshold) left untouched.
  Visual-verified on shelf / save-confirmation / onboarding / message flow.
  Home B keeps its bespoke `.homeb__cta` for the shimmer + hero treatment, now
  colour-consistent with every other primary button.

## Manual test plan

`/dev/home-b` dev rail switches all 7 states:

| # | State | Expect |
|---|-------|--------|
| 1 | Trial · first arrival | warm ground settles to cream; "…This is home now." line; Trial pill; shimmering "Create a message" |
| 2 | Trial · steady | no first line; Trial pill; shimmering create CTA |
| 3 | Protected · steady | Protected pill; create CTA, no shimmer |
| 4 | Protected · full 3/3 | no create CTA; 3 rows; "Three, kept…" + "Hear about what comes next" |
| 5 | Lapsed | warm "Your messages are safe / Voice Vault · Paused"; "Bring it back" CTA |
| 6 | Loading | animated skeleton (stone/pill/cta/rows) |
| 7 | Error | "Your messages are safe" + retry |

Production `/home`: ready voice → Home B; non-ready → Home A stub; no
onboarding → wizard; signed-out → sign-in.
