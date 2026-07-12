# Session · C3 Vault Limit — build notes

**Chunk:** C3 Vault Limit (design-gated screen port). One screen → one review
surface → one commit.
**Date:** 2026-07-07
**Brief / source of truth:** `docs/C3_Vault_Limit_Design_Handoff.md` (§5 object
decision, §7 port instructions). Prototype: `~/Downloads/essence-c3-vault-limit.html`.

## What this chunk did

Re-anchored C3 (`/messages/limit`) from the old warm-amber Breath-Stone to the
**canonical Vault object at rest**. Wiring (cap gate, `save_race` 403 route,
under-cap guard, `step6.vault_limit_blocked` telemetry, routes) is **untouched**
— this was a screen-layer swap only.

Files changed:
- `src/components/screens/messages/VaultLimitScreen.tsx` — canvas + rest-ground;
  paints the Vault once via the shared engine.
- `src/components/screens/messages/VaultLimitScreen.css.ts` — dropped the CSS
  stone + amber page-wash; added the vault box, one-shot settle, and the
  `--shimmer-intensity`-driven still rest-ground.
- Unchanged (frozen): `.types.ts`, `page.tsx`, `VaultLimitPageClient.tsx`,
  `src/app/dev/messages-limit/page.tsx`.

## Decision register

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Hero object = Vault at rest** (sealed + ignited, `{mechT:1, emberT:1}`), not a Stone | The screen's subject is the Vault being full; owner call, handoff §5. |
| 2 | `a2_entry` and `save_race` render **identically** | Same fact; `surfaced_from` stays telemetry-only. Owner call, handoff §3. |
| 3 | **Current copy kept verbatim** | Approved as-is; no clarity pass this chunk. Owner call, handoff §8. |
| 4 | Consume `src/lib/vault-render/` (`paintVaultFrame(cv, {mechT:1,emberT:1})`), **do not** inline the prototype's engine fork | Avoids a 3rd divergent engine copy. Audit / FOLLOW_UPS #74. |
| 5 | Rest-ground is a CSS layer driven by canonical `--shimmer-intensity`; **dropped** the prototype's `getComputedStyle` token bridge | The invented `--shimmer-alpha`/`--shimmer-r-rest` aren't in `@theme`, and `--color-glow-warm-rgb` is comma-form (works natively in CSS `rgba(var(...), a)` — no JS parse needed). FOLLOW_UPS #74. |
| 6 | Import the lib directly, **not** step3's `VaultObject` | Keeps `messages/` decoupled from `step3/`; the lib is the sanctioned shared primitive. |
| 7 | Added a resize/DPR repaint (rAF-debounced) | C3 is a full-viewport route (unlike step3's fixed box); keeps the backing store sharp on rotate. Still one-shot per resize — no loop. |

## Manual test plan

Run `npm run dev`, then:

- [ ] **Render** — `/dev/messages-limit` at 390×844 shows the sealed Vault with a
      lit warm ember core on cream; eyebrow "YOUR VAULT", title "Three messages,
      kept.", italic aside, mineral-dark primary + underlined secondary.
- [ ] **Entrance** — vault settles once (opacity + slight scale, no bounce);
      copy staggers eyebrow→title→aside; footer reveals primary then link;
      focus lands on the primary (~1400ms).
- [ ] **No idle loop** — after settle, the object is dead-still (verified: 0 rAF
      over 1s).
- [ ] **Reduced motion** — with OS "reduce motion" on, the screen arrives
      complete (no entrance), object present, focus on primary immediately.
- [ ] **4× CPU throttle** (`node scripts/throttle-dev.mjs /dev/messages-limit
      --rate=4 --mobile`) — entrance stays smooth; no jank (entrance is
      compositor-only; paint is a ~1ms one-shot).
- [ ] **CTAs** (prod route `/messages/limit`, not the dev mocks) — primary →
      `/app/shelf`; secondary → `/messages/waitlist?from=c3`.
- [ ] **Resize/rotate** — canvas stays sharp (repaints on resize).

## Verification done this session (2026-07-07)

- `npm run typecheck` ✅ · `npm run lint` (eslint + em-dash guard) ✅
- Browser @ 390×844: render ✅ (screenshot), no horizontal overflow ✅ (the 64px
  vertical overflow is the `/dev` harness `paddingTop`, not the screen).
- Canvas painted (warm ember center pixel), `--shimmer-intensity`=0.06 drives the
  ground, `--color-glow-warm-rgb` renders comma-form, primary fill `#656B73` ✅.
- 0 rAF callbacks over 1s (no idle loop) ✅; single repaint ~1.2ms ✅.

### 4× CPU throttle + reduced motion (real CDP, headless — `.tmp/c3-passes.mjs`)

Ran via a direct Playwright script (CDP `Emulation.setCPUThrottlingRate: 4`,
context `reducedMotion: 'reduce'`), on a DPR-3 mobile context (390×844).

- **4× throttle, production build** (`next start`, the meaningful bar per
  FOLLOW_UPS #73): cold mount worst frame **52.9ms** (a single one-time
  mount/hydration + first-paint frame; `next dev` inflated this to ~202ms).
  **Warm entrance replay: worst frame 9.8ms, 0 frames >32ms, 0 long-tasks** —
  the entrance choreography and settled state have no jank at 4×. Canvas
  painted; crisp at DPR 3 (`.tmp/c3-throttle4x-prod.png`).
- **Reduced motion:** all entrance elements at opacity 1, `animationName:
  none`, vault painted, **focus on the primary** — the screen arrives complete
  (`.tmp/c3-reduced-motion.png`).

Motion bar: **met.** The only long frame is the one-time mount (compositor-only
entrance + zero idle frames otherwise). Passes now checked ✅ in the plan above.

## Follow-ups opened

- **FOLLOW_UPS #74** — closes with this port (reuse lib, reconcile shimmer
  tokens). If the 2-param shimmer model is ever wanted in `@theme`, that's a
  separate `@theme` change; this chunk used the existing `--shimmer-intensity`.
