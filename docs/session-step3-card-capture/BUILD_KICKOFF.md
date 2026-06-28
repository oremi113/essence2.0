# Step 3 — Build kickoff (fresh-context entry point)

**Read this first in a new thread.** It is an *index + orchestration* doc, not a re-spec.
It points at the canonical sources and the existing 3-pass plan, lists what's resolved vs
open, and tells you exactly where to start. Do not duplicate spec content into new files —
the sources below are authoritative; this doc only routes you to them.

---

## 0 · How to start (paste into the fresh thread)

> Read `docs/session-step3-card-capture/BUILD_KICKOFF.md`, then the Pass 1 chunk it points
> to. Confirm the **pineapple** go-ahead is given before writing any code. Then build Build
> Pass 1 (static structure) only, stop at its gate for review.

**Gate reminder:** `pineapple` is the codeword that opens code (handoff §9.1, §10). No
implementation before it. Until then, the thread reads, plans, and reconciles copy.

---

## 1 · Read-first manifest (in order)

Auto-loaded already: root `CLAUDE.md` (architecture + collaboration rules) and memory. Then:

| # | File | Why / authority |
|---|---|---|
| 1 | `ESSENCE_Step3_Card_Capture_Build_Handoff.md` | **The build bible.** §0 three-layer contract, §3 prop shape, §4 the 18 rail states, §5 failure paths, §6 copy, §9 build sequence, NOTE FOR TERMINAL chunking. |
| 2 | `ESSENCE_Step3_Motion_Spec.md` | **Motion authority.** Seal timeline, shimmer, exit, RM, neutral handoff. Reconciled to Pass 3 (2026-06-28). |
| 3 | `palette-token-reconciliation.md` | **The canonical drop-in `@theme` block.** Paste tokens from HERE, not from the palette deck. |
| 4 | `token-prep.md` | Token staging rationale (now superseded by #3; kept for history). |
| 5 | `Pass3_Design_Brief.md` | Ambient-shimmer + neutral-handoff design intent for Pass 3. |
| 6 | `seal.spec.ts` | The never-fake-a-seal Playwright assertions. |

**Prototypes — the design source of truth (CLAUDE.md):** mirror their timing/cadence/copy/motion. Do not invent new motion grammar.
- `prototypes/essence-step3-card-capture.html` — the CardCapture rail.
- `prototypes/essence-step3-seal-pass2.html` — the seal hero.
- `prototypes/essence-step3-processing-pass3.html` — **the Processing rail + the authoritative shimmer mechanism** (single opacity-driven `--shimmer-intensity`, breath as a multiplier, exit via `--ease-seal-exit`). This file's `@theme` mirror and rAF loop are what production copies for Pass 3.

---

## 2 · The 3-pass build plan (authoritative: handoff §9 + NOTE FOR TERMINAL)

Do **not** re-plan. Build in these chunks, one chunk → one review surface → one commit (or
small stack). Stop at each gate.

| Pass | Scope | Doc chunk to load | Gate |
|---|---|---|---|
| **1 · Static structure** | Both components, all 18 states rendered static from mock data, §3 prop shape, tokens resolving to `@theme`, every `/dev/{name}` reachable. **No motion.** `--shimmer-intensity` lands at `0`. The two half-structural guardrails (§RETRY-BY-KNOWLEDGE: no "Try again" in timeout; §SEAL-INTEGRITY: no sealed frame / ignited ember in any pre-seal state). | handoff §0–§4, §6, §9 steps 1–2 | every state renders, every sandbox reachable, zero console errors, **no raw hex in screen components** |
| **2 · The seal alone** | Hero timeline only: iris close → ember catch (+175ms) → settle → shimmer onset to faint → copy crossfade. Plus the seal's RM settled frame. Hard assertion: seal renders only at `confirmed`. | motion-spec §3 + seal row of §6 + handoff §7 + §9 step 3 | 60fps @ 4× throttle, never fires pre-seal, RM settled frame static |
| **3 · Ambient + handoff** | `--shimmer-intensity` full activation map across all states, Processing stillness, exit ease-down to `neutral (0.025)` via `--ease-seal-exit`, RM shimmer rest, the neutral contract frame, then the full Playwright sweep. | motion-spec §4, §5, §7 + shimmer-rest row of §6 + handoff §5 + §9 step 4 | shimmer loop 60fps @ active, cold-start deep-links render correct state, neutral frame is a real nameable boundary |

**The Pass 2/3 seam** is the shimmer onset at the settle (the token value is the seam) —
handoff §9 explains it. As long as `--shimmer-intensity` exists from Pass 1 at `0`, the seam holds.

**Foundation step inside Pass 1:** paste the reconciled `@theme` block from
`palette-token-reconciliation.md` into `src/app/globals.css @theme` *before* any screen
references a token, then mirror into `docs/design-tokens.md` (never the reverse). All three
seal curves (`--ease-seal-iris` placeholder, `--ease-seal-ember`, `--ease-seal-exit`) land
here too, or transitions silently fall back to default `ease`.

---

## 3 · Resolved vs open (read before Pass 2)

**Resolved (do not re-debate):**
- Palette locked (greige/reliquary, FU #65). Full ramp in the reconciliation memo.
- Shimmer = single opacity-driven `--shimmer-intensity` over a fixed gradient. **The palette
  deck's `--shimmer-alpha` + radius tokens are superseded — do not paste them.**
- `--color-glow-warm-rgb` = `214, 162, 92`, comma form, consumed `rgba(var(--…), <a>)`.
- Neutral-exit shimmer pinned `0.025`; exit curve `--ease-seal-exit` = `cubic-bezier(0.4,0,0.2,1)`, ~1200ms.
- **The ~2.5s "Sealed" dwell is kept** (owner call, 2026-06-28). Motion-spec §3 now carries it
  (settle → shimmer onset under the held copy → ~2.5s dwell → copy crossfade at ~4200ms), and
  RM keeps the dwell beat as copy-pacing. Matches the build handoff; no longer a conflict.

**Open — resolve at pineapple, before they bite a pass:**
1. `--ease-seal-iris` real value — still owed by the vault design thread; ships on the
   `--ease-essence` placeholder (`cubic-bezier(0.4,0,0.2,1)`). One-token swap when it lands.
2. `--ease-seal-exit` tail — tune toward `(0.4,0,0.15,1)` on oat (Pass 3).
3. §6 copy reconciliation — reconcile the §6 lines into the copy guide *before* Pass 1 so
   rendered strings are canonical (handoff §9.1).
4. §8 notify infra — its own layer-1/2 work item ahead of the Frame 4 portion of Pass 1.
   Build notify-dependent states as static mock shells in Pass 1; their cold-start
   verification is a Pass 3 check that waits on the infra. Log the FOLLOW_UPS entries §8 names.

---

## 4 · Guardrails (don't trip these)

- Three-layer separation: screens in `src/components/screens/`, props-driven, no Supabase;
  data + actions in `page.tsx`; every screen gets a permanent `/dev/{name}` page.
- No raw hex/rgba/bezier in screen components — `var(--token)` only.
- `--ease-breath` is Stone-only — never the vault or shimmer. **Never retune `--ease-essence`**
  for the close (~60 refs); the close has its own `--ease-seal-iris`.
- No `brightness()` filter anywhere. No screen-blend on the oat shimmer (plain opacity). No
  em dashes in copy strings. No new packages. Dev port 3100.
- URL paths never change. `/dev/{name}` pages are permanent.
- Verify motion at **4× CPU throttle, 390×844** before calling any pass done.
