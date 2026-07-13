---
id: 2026-07-12-dev-breath-stone-horizontal-overflow
priority: P4
status: open
opened: 2026-07-12
resolved:
summary: /dev/breath-stone overflows the viewport by 45px — the state-label row doesn't wrap at 390px; dev-scaffold only, but a real horizontal overflow *(qa-scout full-sweep 2026-07-12)*
---

# /dev/breath-stone horizontal overflow (45px)

*(qa-scout full-sweep 2026-07-12)*
On the `/dev/breath-stone` state gallery at 390×844, a
`div.flex.items-center.justify-center` measures 480px wide (left −45 →
right 435) → 45px of body horizontal overflow. The row is the state-label
strip that lays the breath-stone's states out side by side and never wraps at
the mobile width.

**Why it matters:** `/dev/*` pages are permanent, load-bearing iteration
scaffolding (CLAUDE.md non-negotiable) — they're the canonical way to review a
screen in isolation, so a real horizontal-scroll break there degrades the tool
you use to catch exactly this class of bug elsewhere. It is **not** a production
route, so user impact is nil; this is dev-surface hygiene.

**Fix shape:** add `flex-wrap` (and/or `max-width:100%`) to the state-label row
in the `/dev/breath-stone` page so the states stack instead of forcing overflow
at 390px. Contained to the dev page — no production screen or token change.

**Pick up when:** low priority; fold into the next `/dev` scaffold or
breath-stone touch. Agent-fixable. Confidence: high (measured).
