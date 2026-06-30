# Decision memo — Should the vault breathe during Processing?

**Date:** 2026-06-30
**Status:** ⏳ **Owner directive received; awaiting confirmation with full context
before implementation.** (Per the agreed plan: write the memo, then implement on a
small branch once the owner confirms the reversal with eyes open.)
**Touches:** `docs/session-step3-card-capture/ESSENCE_Step3_Motion_Spec.md` §5 +
§SEAL-INTEGRITY; `src/components/screens/step3/SealVaultCanvas.tsx`,
`VaultObject.tsx`; `src/lib/vault-render/paintVault.ts`.
**Why this is a memo, not a silent edit:** CLAUDE.md — a prototype/spec divergence
ships only by explicit decision memo, and this reverses a deliberately-reasoned
motion lock.

---

## The directive (2026-06-30)

Owner: **the vault should breathe during Processing** (the canvas rig has an
internal ~3.5s breath grammar; the owner wants it visible during the wait). This
was chosen when I asked whether to suppress the rig's idle breath in Step 3 — but
**I did not surface the rationale below when I asked.** So this memo puts it in
front of the owner before anything changes.

## What ships today

The canvas swap (merged, `a4bf38e`) renders the Processing vault **dead-still**:
`SealVaultCanvas.tsx` pins settle/sealed/handoff at `{mechT:1, emberT:1}` ("dead-
still"), and `VaultObject` paints a single static frame per phase. The only motion
during Processing is the **ground shimmer** (a slow ~7s sine on a ground layer the
vault never reads). This matches Motion Spec §5 exactly.

## The rationale the owner didn't have when deciding (the cost)

Motion Spec §5 / §SEAL-INTEGRITY makes stillness **load-bearing**, not lazy:

1. **Stillness is the budget for the Reveal's pour.** *"Processing is deliberately
   under-animated (one ambient layer, vault and ember dead-still). The quiet is
   what makes the Reveal's pour land. Do not spend motion on the vessel during the
   wait."* The Reveal (Step 4) is the emotional payoff — warmth pouring into the
   vessel. If the vessel is already moving/breathing through the wait, the Reveal
   has less contrast to land against. **Breath during Processing spends the
   Reveal's budget.**
2. **The ember is the one constant thread.** It catches at confirmed commit, holds
   **lit and static** through the entire wait, and is the last thing lit when the
   Reveal takes over — *"One element threads the whole ceremonial arc."* A vessel
   breath competes with that single-thread clarity.
3. **The shimmer already carries "working."** The "the wait/work has begun" signal
   is the ground shimmer rising (faint → active), by design. The vessel doesn't
   need to move to say "alive" — that job is already assigned.

So the shipped stillness isn't drift to fix; it's a deliberate choice the breath
directive **reverses**. That's legitimate — the owner may value the "alive,
breathing keepsake" read over the Reveal-contrast — but it's a real trade, and the
owner should make it knowing what stillness was buying.

## Options

**A — Full rig breath during Processing (the literal directive).**
Render the rig's ~3.5s vessel breath through the wait. Most "alive." Cost: spends
the Reveal-pour contrast (§SEAL-INTEGRITY), competes with the ember-constant.
Requires reversing §5 + §SEAL-INTEGRITY in the Motion Spec, and re-checking the
4× / 60fps perf gate (the static frame was free; a continuous canvas breath is
not — measured against a **production** build per FU-73, not `next dev`).

**B — Restrained vessel breath, ember held static (recommended middle path).**
A *much* gentler breath than the rig's full 3.5s amplitude — enough to read as a
living keepsake, not enough to pre-spend the pour — while keeping the **ember
dead-still** so the one-constant thread survives, and keeping the breath amplitude
clearly below the Reveal's motion so the Reveal still steps up. Honors the
directive's intent ("it should feel alive") while protecting most of what
stillness bought. Still a §5 amendment + perf re-gate, but a smaller reversal.

**C — Reconfirm stillness (no change).**
If, seeing the rationale, the owner now agrees the Reveal contrast is worth more
than a breathing wait, we keep the shipped behavior and close this out.

## Recommendation

**Option B.** It's the senior-craft path: it gives the owner the "alive keepsake"
they asked for without quietly cashing in the Reveal's payoff, and it keeps the
ember thread intact. If after seeing it at 4× the owner wants more, we dial the
amplitude up toward A. If the breath can't clear 60fps at 4× on a production build,
that's a hard constraint that pushes us toward C regardless of taste.

## Open sub-questions (fold into whichever option)

- **Reduced motion:** keep the shipped static settled frame for RM (the breath is
  motion; RM pins to rest). No change needed — confirm.
- **The reds in the rig palette** (`#ff8a80`, `#5c2b2e`): still unmapped — vault
  error/declined state, or other screens? Not blocking the breath, but flag it so
  the engine's state map is complete (kickoff §4 Q3).

## Next step

Owner picks A / B / C. On confirmation I: (1) amend Motion Spec §5 + §SEAL-INTEGRITY
with the decision + rationale, (2) implement on a small branch off `main`, (3)
re-run the 4× / 60fps perf gate against a production build, (4) update
`seal.spec.ts` / `processing.spec.ts` if the DOM/motion contract shifts.
