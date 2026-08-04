---
id: 2026-08-04-bronzevault-reduced-motion-skips-layout-retry
priority: P4
status: open
opened: 2026-08-04
resolved:
owner_paired: false
summary: `BronzeVault`'s reduced-motion `animate` path paints the vault once and ignores the "no layout yet" result — unlike every other paint path, it never retries — so a reduced-motion user can get a permanently blank vault while the ceremony advances. Latent: `mode="animate"` isn't wired to any production screen yet *(triage 2026-08-04)*
---

# `BronzeVault` reduced-motion animate path skips the layout-retry every other path has

*(triage 2026-08-04 — read of the canonical bronze-vault engine migration, commit `807ad88`)*

`src/components/vault/BronzeVault.tsx:107-113`

```js
if (reducedMotion) {
  paintVaultFrame(canvas, SEALED);                  // return value ignored — no retry
  const raf = requestAnimationFrame(() => onCompleteRef.current?.());
  return () => cancelAnimationFrame(raf);
}
```

`paintVaultFrame` returns `false` and paints nothing when the canvas has no layout yet
(`clientWidth === 0`). Every other paint path in this file handles that: the static path
`paintStatic` (`:96-101`) schedules one `requestAnimationFrame` retry on `false`, and the animated
`loop` (`:127-140`) self-heals by repainting every frame. **Only** the reduced-motion branch of
`animate` paints exactly once, ignores the result, and *still* fires `onComplete` on the next frame —
so a reduced-motion user whose canvas isn't laid out on the first effect tick gets a permanently
blank vault while the ceremony advances (onComplete → reveal / navigation) as if the seal had shown.

**Why it matters:** `BronzeVault` is the net-new canonical ceremony wrapper introduced by the engine
migration and is meant to replace the old `SealAnimation` across every `/app/vault` ceremony. The
blank-vault path is an accessibility regression that ships the moment `mode="animate"` is wired to a
real seal screen. **Latent today:** the only production consumer is `VaultRevealScreen.tsx:24`, which
uses the static `mode="open"`; `mode="animate"` is exercised only in `/dev/vault`. So no user is
harmed now — hence P4 — but it's a real, cheap-to-close inconsistency in the wrapper that will
outlive memory of this note.

**Fix shape:** mirror `paintStatic` — if `paintVaultFrame(canvas, SEALED)` returns `false`, schedule
one `requestAnimationFrame` retry (and gate the `onComplete` rAF behind a successful paint), cancelling
it in cleanup.

**Pick up when:** when wiring `BronzeVault mode="animate"` to a production seal ceremony — fix it in
the same pass so the animate mode ships without the reduced-motion hole.
