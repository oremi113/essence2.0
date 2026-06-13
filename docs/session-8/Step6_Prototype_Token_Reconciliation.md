# Step 6 — Prototype ↔ Production Token Reconciliation

Standing reference for the six Step 6 prototypes
(`prototypes/message creation/essence-step6-*.html`) against production's
canonical token block (`src/app/globals.css` `@theme`). Created from the
2026-06-12 reconciliation sweep, prompted by the design architect's meta
note: the prototypes each hand-maintain a `:root` block and those blocks
have drifted from each other and from production — which is how A4 shipped
with undefined pip tokens (invisible dots) and A7 with a stale gold value.

**Production `@theme` is the single source of truth.** The prototypes are
the design source of truth for *motion, copy, and composition*, but their
inlined token values are snapshots and must be read through this mapping,
not trusted verbatim.

---

## 1. Background-ramp taxonomy divergence (READ BEFORE MAPPING COLORS)

Production **widened and re-keyed** the warm ramp on 2026-04-18 ("widened
for visible stage progression on device"). Every prototype predates this,
so the *same token name* holds *different values* — and, critically, the
prototype's value often lives under a *different name* in production:

| Prototype token | Proto value | Production token with that value | Production's same-named token |
|---|---|---|---|
| `--color-bg-warm-1` | `#F9F3E8` | (no exact prod match) | `--color-bg-warm-1` = `#FBF6ED` |
| `--color-bg-warm-2` | `#F6F0E5` | `--color-surface-card` = `#F6F0E5` | `--color-bg-warm-2` = `#F2E8D2` |
| `--color-bg-gold`   | `#F2E8D6` | **`--color-surface-honey` = `#F2E8D6`** | `--color-bg-gold` = `#E8D8B3` |
| `--color-bg-rich`   | `#EDE3D0` | `--color-surface-warm` = `#EDE3D0` | `--color-bg-rich` = `#D9C28E` |

**The trap:** a prototype that paints a surface with `--color-bg-gold`
(#F2E8D6) maps to production **`--color-surface-honey`**, NOT production's
`--color-bg-gold` (which is the deeper #E8D8B3). A7's production gradient
already does this correctly (its honey stop is `--color-surface-honey`).
**Do not blind-sync prototype ramp values to production's same-named
tokens** — it would deepen surfaces the designer tuned against the lighter
values and break fidelity. Map by *value*, then pick the production token
that carries it.

The prototype ramp values were left unchanged in the sweep (changing them
would alter the design intent the prototypes encode); this table is the
reconciliation.

---

## 2. Fixed in the sweep (2026-06-12)

- **`--shadow-mineral` re-keyed warm** in a3, a5, a6-deferred, a7,
  c-screens → `0 4px 14px rgba(110, 80, 40, 0.20)`, matching the
  production re-key (FOLLOW_UPS #40). The old teal `rgba(74,107,126,.3)`
  predated the live `--color-mineral` and cast bluer than the buttons.
  (a4 was already re-keyed in its chunk.)
- **`filter: brightness` dropped from every stone-breath loop** across
  a5, c-screens, and a6-deferred → scale-only. Brightness filters force a
  per-frame repaint on the one element that must stay smooth (locked
  rule); the halo/shimmer opacity loops carry luminosity. The ONE filter
  left in the set is a6's `stoneShimmerRotate`, which rides with
  `hue-rotate` (no transform equivalent) — a deliberate effect, not a
  breath repaint.

---

## 3. Per-chunk footgun checklist (A3, A5, C1–C3 — apply at build time)

These are pre-located so each screen's chunk fixes its own with proper
verification, rather than re-discovering them in critique. (A4 and A7
already cleared these in their chunks.)

- **Undeclared `var()` audit.** Before building, grep the prototype for
  `var(--x)` refs not declared in its `:root` — undefined custom
  properties invalidate the declaration and the element collapses
  (A4's pip/pulse dots). Note: a var declared on a *non-root* ancestor
  (e.g. a6's `--transcript-rest` on `.transcript`) cascades fine — only
  truly-undeclared refs are bugs.
- **Brightness on stone loops.** All breath loops cleared (a5,
  c-screens, a6). The only filter left is a6's `stoneShimmerRotate`
  (rides with `hue-rotate`, no transform equivalent — deliberate, not a
  breath repaint). a6's CSS stone is moot in production anyway (canvas
  BreathStone), so it was reconciled for the invariant, not for prod.
- **`forwards`-fill entrance animations vs a later state.** A `forwards`
  fill pins the keyframe's end values forever, beating the normal
  cascade — so a later class-driven change (A4's question recede) never
  applies. Only a bug when a later state competes for the same property;
  harmless for one-shot reveals (A7's entrance). Audit per animation;
  convert to `backwards` only where a competing state exists. Locations
  to check: a5 (~4), c-screens (~5).
- **Reduced motion: pin, don't pause.** `animation-play-state: paused`
  during a delay window falls back to *base* styles (overshoot, like
  A7's halo). Pin loops to explicit mid-frame values instead.
- **Stale `--shadow-mineral`** — resolved app-wide (#40); new prototypes
  should use `0 4px 14px rgba(110, 80, 40, 0.20)`.

---

## 4. Method (re-run when prototypes change)

`node scripts/step6-token-sweep.mjs` (run from repo root) parses
production `@theme`, then per prototype reports undeclared `var()` refs,
value drift vs production, and `filter: brightness` / `forwards`-fill
counts. Re-run before each remaining spine chunk; treat any new
undeclared-ref as a build blocker.
