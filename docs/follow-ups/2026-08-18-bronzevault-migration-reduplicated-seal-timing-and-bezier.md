---
id: 2026-08-18-bronzevault-migration-reduplicated-seal-timing-and-bezier
priority: P4
status: open
opened: 2026-08-18
resolved:
summary: The bronze-vault migration's `BronzeVault` wrapper re-hardcodes the canonical seal timing, adds a 3rd copy of the cubic-bezier sampler, and ships `animate`/`sealed` machinery only the dev sandbox exercises — all untested *(triage 2026-08-18)*
---

# BronzeVault migration re-duplicated canonical seal timing + bezier, and ships dev-only machinery

**What:** the vault-engine migration (`refactor(vault): migrate vault screens to the
canonical bronze vault engine`) added `src/components/vault/BronzeVault.tsx`, which carries
three overlapping bits of maintainability debt:

1. **Seal timing is re-hardcoded** (`BronzeVault.tsx:27-33`). The four values
   (`IRIS 800 / EMBER_OFFSET 175 / EMBER 400 / SETTLE 300`) already exist as the exported
   single source of truth `SEAL_TIMING` in
   `src/components/screens/step3/useSealTimeline.ts:14`. BronzeVault copies them as local
   literals; the code comment itself admits the dual home ("if the canonical timing is
   retuned, update both").
2. **The cubic-bezier sampler is copied a third time** (`BronzeVault.tsx:42-65`) — the same
   Newton-Raphson `cubicBezier`/`parseBezier` math that already lives in `useShimmerLoop`
   (and the retired seal canvas), with no shared util.
3. **`animate` and `sealed` modes are dev-only in production** (`BronzeVault.tsx:82`). The
   only production caller is `VaultRevealScreen.tsx:24` with `mode="open"` (a static
   drive); the RAF seal loop, the bezier sampler, and the timing mirror above are reached
   only from `/dev/vault`. There is no unit test on `BronzeVault` or on the
   `src/lib/vault-render` engine it paints through (`resolveDrive`/`phaseToDrive` are
   annotated "exported for unit testing" but nothing tests them).

**Why it matters:** no production user is harmed today (the live path is `mode="open"`),
so this is maintainability/drift rather than a live bug — but retuning the Step-3 seal
would silently desync the BronzeVault ceremony (visible when iterating in `/dev/vault`,
which the house rules treat as canonical scaffolding), and three copies of the bezier math
are three places to fix a curve. The migration shipped an animation machine that only the
dev sandbox drives, untested, carrying that drift risk for no production benefit.

**Fix shape:** import `SEAL_TIMING` and derive the four constants from it (as the timing's
owner intends); extract one `src/lib/animation/cubicBezier.ts` and import it in all
call-sites; and either wire the real post-payment seal ceremony onto BronzeVault's
`animate` mode or drop to open-only + the static drives and delete the RAF machinery. A
small pure-function test on `resolveDrive`/`phaseToDrive` is cheap coverage on a seam four
production screens paint through.

**Pick up when:** next time the vault seal/paint code is touched, or a calm week for UI
consolidation. Not blocking. Agent-fixable, but the visual modes need in-browser
verification (Playwright, 4× throttle) if the `animate` machinery is changed rather than
deleted.
