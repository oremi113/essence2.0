# Home A — Design Architect Handoff

**What you're designing:** the *first real* version of **Home A**, the interim home
a user sees **before their voice is `ready`** — they're still on (or paused within)
the 25-prompt recording journey, or their clips are in and the voice is being built.

**Two states** the screen must handle (driven by one prop, `isProcessing: boolean`):
- `isProcessing: false` → **collecting.** User is mid-journey, has more prompts to record. Primary action = *Continue recording*.
- `isProcessing: true` → **building.** All clips are in; the voice is being created (can take a few minutes; user can leave and come back). Action = quiet *Check progress*.

**Sibling to mirror:** Home B (the completed-user hub) is fully built at
`src/components/screens/home/HomeBScreen.tsx` + `HomeBScreen.css.ts`. Home A should
feel like the *same app, one step earlier* — same stone, same calm register, same
warm-cream ground. It is not a different visual language.

---

## Hard architectural constraints (non-negotiable — from CLAUDE.md)

1. **File goes in `src/components/screens/home/HomeAScreen.tsx`.** Never in `src/app/`.
2. **Pure & props-driven.** The screen receives data via props and bubbles actions out
   via callback props. **It never imports Supabase, `redirect`, or a server action.**
   Data-fetching + auth already live in `src/app/home/page.tsx`.
3. **A `/dev/home-a` page must render it with mock data.** It already exists at
   `src/app/dev/home-a/` — keep it working; it's the canonical way to iterate in isolation.
4. **URLs never change.** Link targets come from the `ROUTES` map — see below.
5. **Reduced-motion is required.** Every animation needs a `@media (prefers-reduced-motion: reduce)`
   collapse to its destination state (see how `globals.css` does it everywhere).

---

## Routes Home A can link to (import from `@/lib/routes`)

```ts
ROUTES.record   // "/app/record"  — Continue recording / Check progress both target this
ROUTES.settings // "/app/settings" — gear, if you add one (Home B puts it top-right)
```

Do **not** hardcode path strings. Import `ROUTES`.

---

## THE CANONICAL DESIGN TOKENS

These are the *entire* `@theme` block in `src/app/globals.css` (the single source of
truth). Reach for these role/semantic tokens — **never raw hex** in the screen. If a
value you need isn't here, flag it rather than inventing a one-off.

### Background gradient ramp (warm cream → ceremonial)
```
--color-bg-neutral:    #FBF8F4   /* cream — base app background (Home A default ground) */
--color-bg-warm-phase: #F2EDE4   /* warmer oat — onboarding phase 2 */
--color-bg-warm-1:     #FBF6ED   /* opening cream, one step above neutral */
--color-bg-warm-2:     #F2E8D2   /* soft oat */
--color-bg-gold:       #E8D8B3   /* honey */
--color-bg-rich:       #D9C28E   /* richest; ceremonial */
--color-bg-primary:    #FBF8F4   /* alias of neutral (older name) */
```

### Surfaces (cards, tracks, hovers)
```
--color-surface-card:  #F6F0E5   /* cards, elevated surfaces */
--color-surface-warm:  #EDE3D0   /* progress tracks, disabled; Home B's "rich" ground-settle */
--color-surface-honey: #F2E8D6   /* hover, celebration */
```

### Primary accent — "mineral" (the app's blue-grey)
```
--color-mineral:        #7A8088   /* primary buttons, active states, recording */
--color-mineral-dark:   #656B73   /* AA-safe primary fill / hover (white clears 5.38:1) */
--color-mineral-darker: #565C63   /* pressed/hover on a mineral-dark fill */
```
> Use `--color-mineral-dark` for filled CTAs (it's the AA-safe one), `--color-mineral-darker` for the pressed state. `--color-mineral` for accents/active dots.

### Text
```
--color-text-primary:          #1C1A18  /* headlines, body — 17.8:1 on cream */
--color-text-secondary:        #6B6B6B  /* supporting text — 5.8:1 */
--color-text-secondary-strong: #5A5A5A  /* supporting text on WARM surfaces (AA-safe there) */
--color-text-tertiary:         #ADA9A5  /* disabled / subtle — LARGE TEXT ONLY */
```
> On a warm ground (not cream), use `-secondary-strong`, not `-secondary`.

### Status (muted, warm — never alarming)
```
--color-status-error:   #9C3528   /* terracotta */
--color-status-warning: #8A5A1E   /* amber-umber */
--color-status-success: #4A7A68   /* sage */
```

### Borders & shadows
```
--color-border:      rgba(0,0,0,0.06)
--color-hairline:    rgba(28,26,24,0.08)   /* weightier row top-borders */
--shadow-sm:         0 2px 4px  rgba(0,0,0,0.04)
--shadow-md:         0 4px 12px rgba(0,0,0,0.08)
--shadow-lg:         0 8px 24px rgba(0,0,0,0.12)
--shadow-mineral:    0 4px 14px rgba(110,80,40,0.20)  /* warm primary-action lift */
--shadow-terracotta: 0 4px 12px rgba(156,53,40,0.30)  /* recording (terracotta) state */
```

### Typography
```
--font-display: 'Spectral', Georgia, serif      /* headlines (h1/h2) */
--font-body:    'Inter', system-ui, sans-serif  /* everything else */
```

**Type scale (raw):**
```
--text-display: 48px   --text-h1: 36px   --text-h2: 28px   --text-h3: 20px
```

**Semantic type roles (PREFER THESE):**
```
--text-title:        28px   (+ --line-height-title: 1.4)   /* screen headlines, Spectral 600 */
--text-body-lg:      18px
--text-body:         16px
--text-ui:           15px   /* semibold UI labels */
--text-small:        14px
--text-caption:      12px
```

### Spacing (8px base unit)
```
--space-xs: 4px   --space-sm: 8px    --space-md: 12px   --space-lg: 16px
--space-xl: 24px  --space-2xl: 32px  --space-3xl: 40px  --space-4xl: 48px
```

### Border radius
```
--radius-sm: 4px   --radius-md: 8px    --radius-lg: 10px   --radius-xl: 12px
--radius-2xl: 16px (cards)   --radius-pill: 20px   --radius-full: 9999px
```

### Easing curves
```
--ease-essence: cubic-bezier(0.4, 0.0, 0.2, 1)    /* universal state transition */
--ease-breath:  cubic-bezier(0.37, 0, 0.63, 1)    /* symmetric pendulum — breath rhythm */
--ease-press:   cubic-bezier(0.2, 0.0, 0.0, 1)    /* tactile press */
--ease-page:    cubic-bezier(0.22, 1, 0.36, 1)    /* cinematic screen entrance + stagger */
```

### Timing / durations
```
--duration-micro:      200ms
--duration-small:      400ms
--duration-medium:     800ms
--duration-large:      1200ms
--duration-breath:     3000ms
--duration-page:       700ms   /* signature screen-entrance length the whole flow uses */
--duration-ceremonial: 2000ms  /* shimmer pulse / celebration swells */
```

> There is also a full **Vault / bronze-reliquary** token family (`--vault-*`,
> `--color-vault-*`, `--shimmer-*`, `--ease-seal-*`) in the same `@theme`. Home A almost
> certainly doesn't need it, but it's there if the stone/ember treatment calls for it.

---

## Reusable component classes already in `globals.css`

Prefer composing these over re-authoring buttons/shells from scratch:

- **`.app-shell` / `.app-main`** — the 430px-max centered mobile column, 28px side padding.
  `.app-main--with-footer` adds bottom room for a footer.
- **`.btn-primary`** — filled mineral CTA (52px min-height, radius-lg, hover-lift, press-scale,
  built-in `.btn-primary__loader` spinner). This is what *Continue recording* should be.
- **`.btn-secondary`** — outline button.
- **`.btn-link`** / **`.btn-link--soft`** — text-only actions (good fit for *Check progress*).
- **`.screen-header`** with `__eyebrow` / `__title` / `__subtitle` / `__back` — standard header stack.
- **`.page-transition`** — staggered cinematic child reveal wrapper (see the `record-*` stagger rules).

---

## Home B's grammar to rhyme with (the sibling)

Home B lives in `HomeBScreen.css.ts` as a template-string stylesheet scoped under a
`.homeb` root class (injected via `<style>{HOME_B_CSS}</style>`) — the repo convention for
screen-scoped CSS. Notable moves Home A should echo:

- **Ground:** opens on `--color-surface-warm` (the "rich" ceremonial ground) and eases to
  `--color-bg-neutral` (cream) over `1500ms var(--ease-page)` on first arrival. A calm settle,
  not a hard swap.
- **The stone is the shared canvas `BreathStone`, NOT a CSS gradient.** Home B renders it at
  `state="infused"`. (FOLLOW_UPS #35: never fork a bespoke CSS stone.) See the pinned Home A
  stone states below.
- **Quiet top bar:** settings gear top-right, 44px hit target, `--color-text-secondary` → primary on hover.
- Column width `430px` max, padding `var(--space-xl) var(--space-lg) 56px`.

---

## The BreathStone — pinned states for Home A (verified)

Component: `src/components/breath-stone/BreathStone.tsx`. Prop: `state: BreathStoneState`.
Iterate against it in isolation at `/dev/breath-stone`. The full state union is:
`idle · ready · recording · working · celebrate · playback · shimmer · guidance · priming · infused · archive`.

**Home A uses exactly two, one per screen state:**

| Home A screen state | `isProcessing` | **Stone state to pass** | Why |
|---|---|---|---|
| Collecting (mid-journey / paused) | `false` | **`state="idle"`** | "Resting heartbeat — lightest, slowest, coolest" (4.5s cycle, cool mineral, no warmth). The stone is dormant, waiting for the user to return. |
| Building (all clips in, voice generating) | `true` | **`state="working"`** | "Patient processing — slow + cool, but alive" (4.8s cycle). This is *literally* the generation state — already shared by A5 (voice generation) + RecordScreen. Exact semantic match. |

**Do NOT use `infused` on Home A.** `infused` = "voice preserved, the stone has been
transformed" (warm ember pulse). That's Home B's stone — the reward Home A is building
*toward*. Keeping Home A cool (`idle`/`working`) and Home B warm (`infused`) is the whole
narrative arc; the warmth arriving *is* the payoff. Don't spend it early.

> Optional design call: if the collecting state should feel like "waiting to resume" rather
> than pure rest, `state="guidance"` ("waiting / orienting — slower, deeper breath with a
> long peak hold that communicates anticipation") is the sanctioned alternative. Default to
> `idle` unless the architect deliberately wants that anticipation beat.

---

## Copy register (from `docs/ESSENCE_Copy_Voice_Guide.md`)

- Warm, calm, unhurried. "There's no rush." No urgency, no alarm — even for the "building" wait.
- The word **"Vault"** appears at most once per screen.
- CTA tiers: one clear primary action per screen; secondary actions stay visually subordinate.
- "Elevated" register is rationed (4 lifetime moments) — Home A is *not* one of them; keep it plain-warm.

---

## Definition of done (repo rules)

- [ ] `HomeAScreen.tsx` is pure/props-driven, no Supabase/redirect/server-action imports.
- [ ] `/dev/home-a` renders both states (`isProcessing` true & false) with mock data.
- [ ] Every animation has a reduced-motion collapse.
- [ ] Verified in a real browser via Playwright at **4× CPU throttle on a mobile viewport**
      before calling it done (CLAUDE.md motion shippability bar).
- [ ] No raw hex / raw px where a token exists — token drift is caught by `/essence-code-audit`.
