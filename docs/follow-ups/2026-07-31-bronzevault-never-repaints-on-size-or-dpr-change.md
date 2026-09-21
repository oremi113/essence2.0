---
id: 2026-07-31-bronzevault-never-repaints-on-size-or-dpr-change
priority: P3
status: open
opened: 2026-07-31
resolved:
summary: "`BronzeVault` never repaints on a size/DPR/zoom change - the canonical-engine migration dropped the resize handler its sibling still keeps *(triage 2026-07-31, salvaged from the monolith 2026-09-21)*"
---

# Vault reveal canvas (`BronzeVault`) never repaints on a size/DPR/zoom change — the migration to the canonical engine dropped the resize handler its sibling keeps

*(triage 2026-07-31 - originally written into the legacy `docs/FOLLOW_UPS.md`
monolith by PR #123, which never landed. Salvaged into the per-file ledger on
2026-09-21 and verified to have no existing per-file entry before copying.)*

**Files:** `src/components/vault/BronzeVault.tsx:143` (paint effect deps `[mode, reducedMotion]`, `size` omitted) + `:145-152` (no resize/DPR listener), vs the sibling `src/components/screens/messages/VaultLimitScreen.tsx:65-73`, which attaches a `window.resize` handler so the backing store tracks the box × DPR.
**Why it matters:** `paintVaultFrame` sizes the canvas backing store from the CSS box × device-pixel-ratio *at paint time*, but `BronzeVault` only paints when `mode`/`reducedMotion` change. If the `size` prop changes, or the device-pixel-ratio changes after mount (a user changing browser zoom while on the page — plausible for the 45–70 audience), the backing store stays at its old resolution and the browser stretches the old bitmap, blurring the vault on the app's core monetized object. Latent today because every live caller passes a constant `size={320}` and the *initial* paint at any zoom is correct; the trigger is a post-mount DPR/size change. The vault-engine migration (807ad88) introduced the inconsistency — the newest sibling handles it, this canonical wrapper doesn't.
**Fix shape:** add `size` to the paint effect's deps and attach a `resize` listener that re-invokes `paintVaultFrame` (mirror `VaultLimitScreen`).
**Pick up when:** before any responsive/animated-size vault usage, or if reveal-screen crispness after zoom is reported.
## 2026-07-31 — discovery (scheduled triage)
- Outcome: Scan-only (read-only) — logged **6 new backlog items** (2 P2, 4 P3) + 3 trigger
  reconciliations; no code touched.
- Health at scan on `main` (93d0bbd): typecheck ✅ · lint ✅ · unit tests **386/386** ✅.
  (Deps were absent in the fresh container; ran `npm ci` first so the checks were real.)
- Branch: `triage/2026-07-31` off latest `main`. No `feat/*`/`refactor/*`/`triage/*` branch exists —
  `main` is the only branch, so nothing was excluded as work-in-progress. Marker-debt grep over `src/`:
  no new untracked TODO/FIXME/disable (all existing disables documented/known).
- Scanned (deep reads of the freshest / least-triaged subsystems): the S5 Stripe go-live gating +
  webhook handlers; the voice-creation entitlement path; the vault-render engine migration (807ad88);
  the Step 10 error-copy + First Breath audio-degradation + nav work; and the offline primitives.
- Discovered (new FOLLOW_UPS entries — full detail in `docs/FOLLOW_UPS.md`):
  - **FU-104 [P2 · owner-paired]** Stripe `incomplete` status derived to terminal `lapsed`; the
    out-of-order guard then locks in the bad state → a returning paid subscriber can be stranded
    `lapsed` and double-charged. Behind `VAULT_STRIPE_ENABLED` (OFF) — gate the S5 flip on this.
  - **FU-105 [P2]** The first-save "your first message is here" ceremony never fires in production —
    a mount-time `useState` initializer reads the client-fetched message list while it's still empty,
    freezing the ceremony shut; green on `/dev/shelf`, dead in the real save→shelf flow.
  - **FU-106 [P3 · owner-paired]** Voice-creation entitlement set omits `past_due` while the
    page guards admit it → a dunning (still-paying) user is let onto the screen then 402'd with
    "Start your free trial." Behind `VOICE_CREATION_REQUIRES_PAYMENT` (OFF).
  - **FU-107 [P3 · owner-paired]** Stripe `success_url`/portal `return_url` silently default to
    `http://localhost:3100` when `NEXT_PUBLIC_APP_URL` is unset → a just-paid user could land on a
    dead localhost page at go-live (and lose the `session_id`, so the FU-84 reconcile never runs).
  - **FU-108 [P3 · telemetry]** `breath_stone_sequence_completed` is never emitted for
    reduced-motion users (paused timeline skips `onEnter`), so the First Breath completion funnel
    under-counts the accessibility segment.
  - **FU-109 [P3]** `BronzeVault` reveal canvas never repaints on a size/DPR/zoom change — the
    engine migration dropped the `window.resize` handler its sibling `VaultLimitScreen` keeps.
- Triggers that came true (reconciliations — flagged for the fixer to verify + strike, not struck here):
  - **FU-76** legal pages not linked from Settings — Step 9 Settings has merged but `/privacy` +
    `/terms` remain URL-only; **promoted** (platform-review / launch gate).
  - **FU-24** `VoiceCreationView` success routing — the component was deleted in spine S4; **obsolete**.
  - **FU-25** `FirstBreathSequence` stub exit — now `router.push(ROUTES.messagesNew)`; **resolved-in-code**.
- Not logged (below the bar, recorded for honesty): 1 lower-value item — `OfflineActionNote`'s fixed
  `max-height: 72px; overflow: hidden` could clip the offline note if the still-provisional Step 10 copy
  wraps to 4 lines on a 320px device (P4/low-confidence; re-measure when the copy is final). Also dropped
  the `BronzeVault` seal-timing + cubic-bezier "duplications" (deliberately-documented mirrors, a
  conscious tradeoff, not accidental drift) and the speculative sealed/animate vault mode.
- Coordination (§5): only `docs/FOLLOW_UPS.md` (bulk appends + priority-queue table) and this log were
  edited. No fixer resolution strikes were altered; the three trigger reconciliations are left for the
  fixer to verify + strike.
- Checks: n/a (docs-only; CI re-runs lint/typecheck/test/build on the PR).
- Merged: <stamped later when the owner merges>
