---
id: 2026-06-30-vault-breath-during-step3-processing
priority: P2
status: open
opened: 2026-06-30
resolved:
summary: "Vault breath during Step 3 Processing reverses the shipped dead-still treatment - an owner decision, never recorded in the live ledger *(salvaged from the monolith 2026-09-21)*"
---

# Vault breath during Step 3 Processing (reverses shipped dead-still)

*(originally written into the legacy `docs/FOLLOW_UPS.md` monolith by PR #78,
which never landed. Its numbers 68 and 69 now collide with two DIFFERENT items
already carrying those numbers on `main` - notification toggles, and the
delete-failure support destination - so it could not be merged as written.
Salvaged into the per-file ledger on 2026-09-21; verified to have no existing
per-file entry before copying.)*

Owner directive (2026-06-30): the canvas vault should **breathe** during Processing (the rig has a ~3.5s breath grammar). The shipped canvas swap (`a4bf38e`) renders the vault **dead-still** through the wait, per Motion Spec §5 / §SEAL-INTEGRITY — and that stillness is **load-bearing**: it's "the budget for the Reveal's pour" and protects the ember-as-single-constant thread. So this is a real reversal of a reasoned lock, not drift.

**Why it matters:** breath during Processing spends the contrast the Step 4 Reveal pour lands against; done full-amplitude it can flatten the payoff. There's a middle path (restrained vessel breath, ember held static). Also a perf consideration: the static frame was free; a continuous canvas breath must clear 60fps @ 4× on a **production** build (per FU-73), not `next dev`.
**Fix shape:** owner picks A (full rig breath) / B (restrained breath, recommended) / C (reconfirm stillness). Then amend Motion Spec §5 + §SEAL-INTEGRITY, implement in `SealVaultCanvas.tsx` / `VaultObject.tsx` / `paintVault.ts` on a small branch off `main`, re-run the 4× perf gate, update `seal.spec.ts` / `processing.spec.ts` if the motion contract shifts. Full analysis + options: `docs/session-step3-card-capture/Decision_Breath_During_Processing_2026-06-30.md`.
**Pick up when:** owner confirms A/B/C. Carries kickoff §4 Q3 (the unmapped reds `#ff8a80`/`#5c2b2e` — error/declined state?) as a sub-question to close the engine's state map.
