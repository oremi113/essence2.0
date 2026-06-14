# Step 6 — A3 (Category Selector) · Chunk 6

**Date:** 2026-06-13
**Scope (agreed):** Build the A3 Category Selector screen + its permanent
dev page, AND wire the A2→A3→A4 client transitions in
`MessageCreationFlow` so the pre-generation form spine runs end-to-end.
Verified at the dev-page / 4× CPU throttle bar (no live backend).

**Out of scope (held the line):** the A4-submit `/generate` handoff. It
needs a `voiceProfileId` page-fetch and resolves the unsettled "A5 wait
vs A6 preview" landing — that is the A4→A5 forward-wiring chunk. The
orchestrator exposes the `onGenerate` callback; the dev sandbox mocks it;
production stubs it (see FOLLOW_UPS #47).

---

## What shipped

### The screen
- `src/components/screens/messages/CategorySelectorScreen.tsx` (+ `.types.ts`,
  `.css.ts`) — pure, props-driven production port of
  `prototypes/message creation/essence-step6-a3.html`.
- `src/app/dev/messages-category/page.tsx` — permanent dev sandbox
  (default / last-of-three variants, pre-select toggle, replay).

### Single source of truth for category copy (decision)
The prototype and the canonical registry (`src/lib/messageTemplates.ts`)
carried **two different** sets of card labels, descriptions, and order.
Per owner decision (2026-06-13), the **prototype copy + order were
promoted into the registry** so there is one source:
- 7 `description` fields → prototype sub-copy (warmer, more concrete).
- 7 `label` fields → prototype's sentence case (e.g. "Daily reminder",
  "A message for the future", "Just checking in").
- `CATEGORY_DISPLAY_ORDER` → prototype order (birthday, encouragement,
  daily_reminder, future_message, comfort, holiday, checking_in).

The screen reads label/description/order from the registry
(`CATEGORY_DISPLAY_ORDER` + `getCategoryDefinition`) — no hardcoded third
variant. Only the per-category icon lives in the screen, ported into
`@/components/icons` (`CakeIcon`, `AwardIcon`, `SunIcon`, `HourglassIcon`,
`MugIcon`, `CalendarIcon`, `HeartIcon`, plus `CheckIcon`).

### Orchestrator wiring (A2→A3→A4)
- `MessageCreationFlow.tsx` now renders all three form steps, stages
  `{ recipient, category }`, resolves the recipient **display name** for
  the crumb (the `existing` selection carries only `recipientId` — the
  orchestrator looks it up in `existingRecipients`; `new` uses `.name`),
  and threads `categoryLabel` into A4. A4 submit bubbles a typed
  `GenerateRequest` through the new `onGenerate` prop.
- `MessageCreationFlow.types.ts` — `StagedFlowState` gains `category`;
  new `GenerateRequest` + `onGenerate` on the props.
- Callers updated: `MessagesNewPageClient.tsx` (production stub,
  FOLLOW_UPS #47), `dev/messages-flow/page.tsx` (mock that logs the
  staged payload).

### Token reconciliation (per Step6_Prototype_Token_Reconciliation.md)
Token sweep clean for a3 (no undeclared `var()` refs). Mapped prototype
values → production tokens **by value, not by same-name**:
- Selected card / warm-2 tone / warm footer: prototype `--color-bg-gold`
  (#F2E8D6) → prod **`--color-surface-honey`** (NOT prod `--color-bg-gold`
  #E8D8B3, which is deeper).
- Progress pips: kept prod `--color-bg-gold` to stay pixel-identical to
  A4's shared backbar.
- Ceiling note: prototype `--color-bg-rich` (#EDE3D0) →
  `--color-surface-warm`.
- `--shadow-mineral` uses the warm-keyed prod value (FOLLOW_UPS #40).
Entrance motion is GPU-only (opacity + transform), staggered cards,
pinned under `prefers-reduced-motion`.

---

## Verification (dev-page bar, 4× CPU throttle, 390×844 mobile viewport)

Browser-driven via Playwright MCP with `Emulation.setCPUThrottlingRate: 4`.

| Check | Result |
|---|---|
| A3 default: prototype order, sentence-case labels, descriptions, icons, crumb, disabled CTA | ✅ |
| Card select → honey fill + mineral border + mineral icon tile + check glyph; CTA enables | ✅ |
| last-of-three: warmer ground, ceiling note, softer copy ("One more to shape.") | ✅ |
| A2→A3: crumb resolves "For Sarah" from `recipientId` | ✅ |
| A3→A4: crumb threads "FOR SARAH · COMFORT" (name + label) | ✅ |
| A4 submit → `onGenerate` fires `{recipient:{kind:'existing',recipientId:'r-sarah'}, category:'comfort', note:null}` | ✅ |
| Back-nav A4→A3 preserves staged category (Comfort `[checked]`) | ✅ |
| Motion at 4× throttle | smooth |
| Console | clean (only the expected no-auth `flow_started` 401, swallowed by design) |

**Gates:** `tsc --noEmit` ✅ · eslint ✅ · unit suite 181/181 ✅ (no test
asserted on the old copy/order).

---

## Deferred (FOLLOW_UPS #47)
- Forward `/generate` handoff (A4→A5 chunk): real `handleGenerate` +
  page-side `voiceProfileId` fetch + generation-route push.
- `isFinalOfThree` is hardcoded `false` until the saved-message-count
  query lands (same query as Q4's vault-cap UX gate; also replaces the
  hardcoded `saved_count_before: 0` in `flow_started`).
