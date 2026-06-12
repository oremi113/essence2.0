# Step 6 · A7 (Save Confirmation) — Screen build, Chunk 3

Chunk 3 of the Step 6 spine, run **per-screen** (decision 2026-06-12): one
screen → design iterations on the dev page → sign-off → live wiring →
commit. A7 leads because it is the smallest spine screen and retires the
largest FOLLOW_UPS #38 stop-gap (save success → Home, plus the `page.tsx`
already-saved redirect in the A6 route).

**Authoritative prototype:** `prototypes/message creation/essence-step6-a7.html`
(plus `ESSENCE_Step6_Message_Creation_Screen_Inventory.md` §A7). Production
mirrors its timings, cadence, copy, and motion per CLAUDE.md.

## Scope (this chunk)

1. **Pure screen** — `src/components/screens/messages/SaveConfirmationScreen.tsx`
   (+ `.types.ts`, `.css.ts` sidecars). Props-driven, no Supabase, callbacks
   bubble out.
2. **Dev sandbox** — `/dev/messages-saved` (permanent). Variants + replay +
   recipient-name-length stress chips for the design pass.
3. *After design sign-off (same chunk, second pass):* the live route
   `/messages/saved/[messageId]` (thin page + wrapper), repoint A6's
   save-success navigation + already-saved redirect (#38), `message_saved`
   landing telemetry if any (A6 already fires `message_saved` on save —
   confirm no double-fire), live-verify via the saved protocol.

Out of scope: C1 (Three Shaped) — the `third` variant's "See what's coming"
CTA routes to C1 when it exists; until then the dev page mocks it and the
live wrapper keeps an interim destination (tracked in #38's successor note).

## Design contract (from the prototype header)

- **Variants:** `default` (msg 1 or 2) and `third` (msg 3 of 3). `third`
  does NOT replace A7 — same screen, secondary CTA becomes "See what's
  coming" (→ C1). The save deserves its own moment even on the third.
- **CTA hierarchy (locked):** primary "View on Memory Shelf"; secondary
  link "Create another, when you're ready" (default) / "See what's coming"
  (third).
- **Atmosphere:** ceremonial amber. 3-stop gradient (#EDDCAB →
  `--color-surface-honey` (#F2E8D6, the prototype's bg-gold stop) → #F4E5BC),
  ambient warm glow (13s loop), static vignette. Stone = shared canvas
  BreathStone in **infused** state (A6 precedent: prototype CSS stone
  re-expressed in the codebase stone grammar).
- **Entrance sequence (pure ceremony, don't rush):** stone arrival
  0→1200ms (fade + scale 0.92→1); title 1500ms; aside 1800ms; timestamp
  2100ms; primary CTA 2400ms; focus → primary 2600ms; secondary 2800ms.
- **Timestamp:** "Kept on {Mon D, YYYY} · {h:mm}{am|pm}", rendered from the
  server's `created_at` (prop), local timezone.
- **A11y:** confirm block `role="status" aria-live="polite" aria-atomic`;
  stone `aria-hidden`; primary receives focus after entrance; reduced
  motion → loops pause, entrance collapses to instant (screen arrives
  complete, focus immediate).
- **No backbar** — the save is committed, the flow is over.
- **DO NOT ADD:** confetti, particles, sparkle. Warm light + stone
  breathing IS the celebration.

## Decisions (design pass 2026-06-12, user-reviewed)

- **Aside pronoun:** neutral "They won't know it's there until they need
  to." — **approved** (prototype's "She" was Sarah-specific; production
  knows relationship, not pronouns).
- **32-char names:** three balanced wrapped lines, no truncation —
  **approved**.
- **Stone warmth:** user agrees the canvas `infused` stone reads dull next
  to the prototype's gold, but the fix is engine-wide (touches VaultSeal,
  FirstBreath, RecordScreen, A6) — **deliberately deferred** to its own
  pass; tracked in FOLLOW_UPS #35 (widened to cover A7). The 7s amber halo
  CSS layer stays as partial compensation.
- **Stone:** canvas BreathStone `infused`, size 200 (`--stone-xl`), wrapped
  in a div that owns the prototype's 1200ms arrival + the halo layer.
- The prototype's V2 backlog items (sound hook, repeat-view compression,
  category-aware asides) stay deferred.

## Verification plan

- Design pass: `/dev/messages-saved` in Playwright at 390×844, both
  variants, replay, name lengths; motion judged at 4× CPU throttle;
  reduced-motion check via emulation.
- Unit: timestamp formatter; variant→CTA mapping (if logic warrants).
- Live pass (post sign-off): save from A6 against the real backend lands on
  `/messages/saved/[messageId]`, already-saved revisit of the A6 route
  redirects here, ledger asserts unchanged.

## Build notes (first pass, 2026-06-12)

- Canvas BreathStone `infused` settled look is consistent with the
  reference sandbox / VaultSeal — notably less saturated than the
  prototype's local CSS-gradient gold. Recovered ceremonial warmth by
  restoring the prototype's **7s amber halo** as a CSS layer behind the
  canvas (`.stone-wrap::before`) — the second of the four breathing
  harmonics, which the first cut had dropped. Whether the stone *body*
  also needs warming (engine change, touches VaultSeal/FirstBreath) is a
  design-pass call.
- 4× CPU throttle, 390×844: 75fps avg / 14.4ms worst frame across the
  entrance (compositor-only animations + one canvas).
- Reduced motion verified: arrives complete, halo pinned at a static
  mid-frame opacity (its base is 0, so pausing would have hidden it),
  focus lands immediately.
- 32-char name wraps to three balanced lines, no clipping — overflow
  strategy still the prototype-backlog question.

## Design-architect amendments (2026-06-12, approved + applied)

Five notes from the architect's prototype review; agreed and applied to
BOTH the prototype (now the durable design memo — see the AMENDMENTS block
in its header) and production:

1. **Reduced motion pins, never pauses.** `animation-play-state: paused`
   during a delay window falls back to base styles (halo/shimmer snapped to
   opacity 1, over their animated peaks). Both files now pin every loop to
   explicit mid-frame values. Production's halo had already been pinned;
   the ambient glow was converted to match.
2. **No brightness filter on the stone breath.** Prototype-only fix
   (production's canvas stone has no CSS body loop).
3. **Timestamp: 16px warm sepia `#6E5E44`** (~5:1 on the gold field) —
   replaces 14px tertiary grey (~1.9:1, under the 45-70 floor).
4. **Aside verb: "until they need it."** (prototype: "she needs it.") —
   the dangling "needs to" read as a dropped word.
5. **Primary CTA gets a warm-keyed shadow** (`rgba(110,80,40,0.22)`),
   deliberately not `--shadow-mineral`, whose teal key is stale against the
   live mineral — global re-key tracked as **FOLLOW_UPS #40** (pairs with
   the #35 stone-warmth pass).

Two implementation findings during the apply, both verified in-browser:

- **Prototype cascade order:** the architect's reduced-motion pins are
  equal-specificity with the base rules, and the prototype's @media block
  sat *before* them — so the pins lost the cascade (copy never appeared,
  halo/shimmer still blew out). Moved the block to the end of the sheet;
  probe confirms title opacity 1 / halo 0.32 / shimmer 0.80 under reduced
  motion. Production was unaffected (its block was already last).
- **Production focus-visible flattened the new CTA shadow:** the
  `:focus-visible` ring *replaced* `box-shadow` — and the CTA is focused by
  default after the entrance. The ring now layers over the warm lift.

## Live wiring (second half, 2026-06-12)

**What shipped:**
- `src/app/messages/saved/[messageId]/page.tsx` — thin server page: auth,
  fetches the saved `messages` row, resolves the recipient name (with a
  "them" fallback for a data anomaly), derives the `third` variant from
  saved count ≥ `STEP6_LIMITS.maxSavedMessages`. Guards: bad UUID / missing
  / foreign / unsaved row → 404. Not flag-gated (arm-independent).
- `SaveConfirmationPageClient.tsx` — navigation only: shelf → `/app/shelf`,
  create-another → `/messages/new`, see-what's-coming → Home (interim, C1
  pending — #38). No telemetry: `message_saved` fires at the A6 save;
  arriving at A7 adds no V1 event.
- `messageSavedRoute()` in `src/lib/routes.ts`.
- **#38 repoints in A6:** save success → `messageSavedRoute(messageId)`;
  the already-saved redirect in the A6 `page.tsx` replays the same A7.
- `tests/unit/save-confirmation-timestamp.test.ts` — locks the attestation
  format (TZ-proof; midnight/noon/invalid cases).

**Live verify (2026-06-12, real server + DB, seeded via `.tmp/seed-a6.mjs`
+ magic-link login + `DEFERRED_AUDIO_ENABLED=true`):**
- A6 → Save → landed on `/messages/saved/<id>`; title resolved the
  PROMOTED pending recipient ("…on the shelf for Maya."), server
  `created_at` rendered ("Kept on Jun 12, 2026 · 4:24pm"), default
  variant, focus on the primary CTA.
- Revisiting the A6 URL after save redirected to the same A7 (replayed
  ceremony from the durable row).
- "View on Memory Shelf" → `/app/shelf`.
- Third variant at the real cap: seeded to 3 saved → secondary became
  "See what's coming" → interim Home push (the test user's Home gate
  forwards to /onboarding — pre-existing, unrelated).
- Guards: malformed UUID 404, unknown UUID 404.
- Ledger: `step6.message_saved` row carried the matching `message_id`,
  `saved_ordinal: 1`, `relationship: daughter`, `had_note: true` —
  semantics unchanged by the repoint.
- Test data fully cleaned (0 messages / 0 pending / 0 recipients /
  0 usage_events, `ui_flags` reset, storage objects removed); dev server
  stopped. Note for the protocol: delete `pending_generations` BEFORE
  `messages` — the `saved_message_id` FK blocks the reverse order.

**All green:** 176 unit (172 + 4 new), lint, typecheck.

## Status

- [x] Pure screen + dev page built — first design pass done
  (`/dev/messages-saved`; screenshots in `.tmp/a7-*.png`)
- [x] Design-architect amendments applied (prototype + production)
- [x] Live route + #38 save-success repoint + live verify
- [ ] Commit (awaiting go-ahead)
- [ ] Design sign-off
- [ ] Live route + #38 repoint + live verify
- [ ] Commit
