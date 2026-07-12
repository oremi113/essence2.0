# Step 9 · Settings & Trust — build handoff

Everything a fresh context window needs to build the production screen. The
prototype is the design source of truth; mirror its copy, layout, grouping,
state expression, and motion. Don't invent new grammar.

- **Prototype (authoritative):** `prototypes/essence-step9-settings-trust.html`
- **Copy rationale:** [`Step9_Settings_Copy_Corrections.md`](./Step9_Settings_Copy_Corrections.md)
- **Full port notes:** [`Step9_Settings_Port_Handoff.md`](./Step9_Settings_Port_Handoff.md)
- The prototype header comment (`NOTE FOR CODE ARCHITECT`) carries the copy
  locks, motion spec, a11y decisions, and PORT NOTES 1–6 inline. Read it first.

## Status: prototype is build-ready

Pass 1 (structure/copy) + Pass 2 (motion + a11y) are complete and verified in a
browser at 390×844. All confirmation sheets, both delete beats, the change-email
sheet, the delete-failed terminal, and the full dialog a11y (focus move + trap +
Esc + return) work. No outstanding prototype-side issues.

## Architecture (three-layer; do not leak)

- `SettingsScreen` lives in `src/components/screens/` — **props-only, never
  imports Supabase/fetch/redirect**. Props shape (from prototype header):
  ```
  { email, photoUrl|null, authMethod:'magic-link',
    subscription:{ status, plan, trialEndsAt, renewsAt, paidThroughAt,
                   priceMonthlyCents, priceAnnualCents, card:{ brand, last4 } },
    notifications:{ trialReminders:bool, paymentNotices:bool } }
  ```
- `src/app/app/settings/page.tsx` — thin: fetch, auth, render `<SettingsScreen …/>`.
  Owns the cancel / update-card / delete / email-change server actions and router
  pushes. Screen bubbles actions out via callback props.
- `src/app/dev/settings/page.tsx` — **permanent**, renders the screen with mock
  data for every rail state. Non-negotiable.
- Route `/app/settings` is **new** (not a rename). URL-stability lock is fine.

## Build tasks, in order

1. **Add tokens to `@theme` FIRST** (`src/app/globals.css`), then port — ported
   verbatim today they resolve to nothing and pill fills/borders render blank:
   - `--color-lapsed-surface: #EBE3D6`  (paused/lapsed/cancelled pill fill)
   - `--color-lapsed-border:  #DCD0BC`  (pill + switch + confirm-field + trust-band borders)
   - `--color-hairline: rgba(28,26,24,0.08)`  (row borders — or map to `--color-border`)
   - `--color-bg-warm-1` is drifted: **accept `@theme`'s `#FBF6ED`**, do not
     re-hardcode the prototype's `#F9F4ED`.
   - Trust band uses `--color-surface-honey` (canonical `#F2E8D6`) — keep it.
2. **Effect values** (skeleton gradient stops, scrim tint, sheet shadow + bespoke
   radius, btn-warn hover tint, `#fff` on switch knob/confirm field/button text):
   tokenize or carry the `/* prototype-local: effect values @theme does not define */`
   flag. They're flagged inline in the prototype.
3. **Delete teardown ordering** (the bug class this repo hits — FOLLOW_UPS
   #43/#45/#66): teardown is a fallible multi-write (auth user + user rows +
   stored audio) via `checkedWrite`/`bestEffortWrite` (`src/lib/supabase/checked-write.ts`),
   never a bare awaited write whose `{error}` is discarded.
   - all writes succeed → render `closed` terminal, then sign out
   - any write fails → render `delete-failed` terminal (built, on the rail)
   - **Never render `closed` over a partial teardown.** Service-role teardown is
     server-only; audio is path-only. The failure body's "reach us" needs a real
     support destination — owner to confirm.
4. **Payment "Update" routes OUT to Stripe's hosted card sheet / Payment Element.**
   Do NOT hand-build a card form (PCI surface you don't need). On return, confirm
   inline ("Your card is updated"). The prototype specs no card fields.
5. **Email "Change" is a real sheet** (magic-link identity change): confirm-by-
   link, old email keeps working until confirmed. Prototype has the sheet UI.
   **Still to design:** the "we sent a link to X — check your inbox" confirmation
   state + an empty/invalid-email guard on "Send the link" (the prototype just
   closes). This is the one deferred design item.
6. **Telemetry:** notification toggles + cancel/delete/update/email-change events
   are telemetry-impacting. Drop `docs/analytics/YYYY-MM-DD-settings.md` in the
   same PR (schema in `docs/analytics/README.md`).

## Locks & bar

- Copy locks (prototype header): trial states end as a DATE FACT never a
  countdown; restore verb is "Bring it back"; "Voice Vault" appears once per
  screen (the status pill carries it); Sign-in row is display-only (no password).
- Risky controls: no loud red ever; cancel/delete lead with reassurance and the
  primary action is to KEEP. Final destructive button is amber-umber
  (`--color-status-warning #8A5A1E`) outlined.
- Verify in a real browser at 390×844; hold motion at 4× CPU throttle
  (`scripts/throttle-dev.mjs`). Reduced-motion path must pin to resting states.
- Messages immutable (DECISIONS lock): no per-message edit/delete here.
