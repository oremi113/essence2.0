# Step 9 · Settings & Trust — port handoff (Pass 2 code audit)

Open items from the Pass 2 code audit of `essence-step9-settings-trust.html`,
for the design architect porting the prototype into production. Companion to
[`Step9_Settings_Copy_Corrections.md`](./Step9_Settings_Copy_Corrections.md)
(copy, already applied).

The prototype is the design source of truth (CLAUDE.md). Production
`SettingsScreen` mirrors its copy, layout, grouping, state expression, and
motion — these items are what stands between the prototype and a faithful,
correct port.

## Already fixed in the prototype (no action needed)

- **Dead Delete button** — the in-screen Delete row called `openOverlay('delete1')`,
  but Pass 2 renamed the overlay to `delete` with a step model, so it opened
  nothing. Now `openDelete(1)`. Verified in browser: beat 1 opens from the real
  screen.
- **Trust-band port drift** — was `var(--color-bg-gold)`, which is `#F2E8D6`
  locally but `#E8D8B3` in canonical `@theme`; ported verbatim it would darken
  the anchor. Now `var(--color-surface-honey)` (canonical `#F2E8D6`, exact
  match). The three now-unused drifted `:root` decls (`--color-bg-gold`,
  `--color-bg-warm-2`, `--color-bg-rich`) were removed.

---

## 1 · Add three tokens to canonical `@theme` — **do this first** (blocking the port)

The prototype uses three tokens that do **not** exist in
`src/app/globals.css` `@theme`. Ported verbatim, each `var()` resolves to
nothing — the paused/lapsed/cancelled pill fills, the switch border, the
confirm-field border, the trust-band border, and every row hairline render
blank. Per the Step 3 contract a new token lands in `@theme` *first*, then gets
used.

| Token | Value | Powers |
|---|---|---|
| `--color-lapsed-surface` | `#EBE3D6` | paused/lapsed/cancelled pill fill (muted warm, never red) |
| `--color-lapsed-border`  | `#DCD0BC` | pill border, switch border, confirm-field border, trust-band border |
| `--color-hairline`       | `rgba(28,26,24,0.08)` | row top-borders — or map to existing `--color-border` if you'd rather not add it |

Also: **`--color-bg-warm-1` is drifted** — prototype `#F9F4ED` vs `@theme`
`#FBF6ED` (used on the Manage card). Accept the canonical `@theme` value on
port; don't re-hardcode the prototype's. (Inline `NOTE for port` comment left
on the `:root` line.)

## 2 · Tokenize or flag the raw effect values

These raw values live in port-relevant CSS (not device chrome) with no
`/* prototype-local: effect values @theme does not define */` flag. The header
claims "production reuses tokens verbatim," so each needs to become a token or
carry the flag:

- skeleton gradient stops — `.sk-line` (`#ECE5DA / #F4EEE5`), `.sk-band` (`#F0E7D6 / #F6EEDF`)
- scrim — `rgba(28,26,24,0.32)`
- sheet shadow — `0 -8px 28px rgba(0,0,0,0.18)`; bespoke radius `28px 28px 44px 44px`
- `btn-warn:hover` tint — `rgba(138,90,30,0.06)`
- `#fff` on the switch knob, confirm field, and primary-button text (vs `--color-bg-primary`)

## 3 · Build to the three-layer spec

- `SettingsScreen` is props-only, never imports Supabase/`fetch`/`redirect`.
  Props shape is in the prototype header (lines 10–16).
- `page.tsx` owns the cancel / update-card / delete server actions, the router
  pushes, and side effects; the screen bubbles them out via callback props.
- **Permanent `/dev/settings`** rendering the screen with mock data — required,
  non-negotiable, never deleted.
- URL `/app/settings` is a *new* route (not a rename) — register it; the
  URL-stability lock is fine.

## 4 · Delete teardown ordering — bug class this repo actually hits

The prototype's `confirmDelete()` jumps straight to the "Your account is closed"
terminal with no awaited work. In production the teardown is a multi-write —
auth user + the user's rows + stored audio (header lines 47–49). Showing the
calm terminal before those writes confirm is the *success-reported-before-
fallible-work* class (FOLLOW_UPS #43/#45/#66).

- The closed view renders **only after** the teardown succeeds, via
  `checkedWrite(...)` / `bestEffortWrite(...)` (`src/lib/supabase/checked-write.ts`)
  — never a bare awaited write whose `{ error }` is discarded.
- Partial failure needs a real path, not a reassuring screen over a
  half-deleted account.
- DECISIONS lock: service-role teardown is server-only (`import "server-only"`),
  audio is path-only (never in the DB).

## 5 · Sheet a11y + the type-to-confirm friction call

The confirmation *experience* is in this file's scope, so these ship with it:

- **Sheet dialog semantics:** scrims have no `role="dialog"` / `aria-modal`, no
  focus trap, and close only on backdrop click — no Esc, and only delete beat 2
  manages focus. Add dialog role, focus trap, Esc-to-close, and return focus to
  the invoking control on close.
- **Type-to-confirm friction (owner/architect decision):** `checkDelete` matches
  `.trim().toUpperCase() === 'DELETE'`, so `delete` / ` delete ` pass while
  beat 2 displays a bold caps **DELETE**. Either accept any case (kinder — then
  don't display caps as if exact) or require the exact string. Not a defect, a
  deliberate calibration. See the friction discussion in the Pass 1 design
  audit.

---

## Telemetry (same PR as the production change)

Notification toggles + cancel/delete/update events are telemetry-impacting —
drop a `docs/analytics/YYYY-MM-DD-settings.md` note in the PR that adds them
(schema in `docs/analytics/README.md`).
