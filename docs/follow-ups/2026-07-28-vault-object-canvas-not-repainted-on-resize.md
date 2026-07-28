---
id: 2026-07-28-vault-object-canvas-not-repainted-on-resize
priority: P4
status: open
opened: 2026-07-28
resolved:
owner_paired: false
summary: `VaultObject`'s canvas paint effect is keyed only on `[phase, emberState]`, with no `ResizeObserver`, so a container resize / DPR change while phase is constant (orientation change on a held sealed vault) leaves a stale backing store → the vault renders stretched/blurry until the next phase flip *(triage 2026-07-28)*
---

# The signature Vault canvas isn't repainted on resize / DPR change → blurry vault on orientation change

*(triage 2026-07-28)*

`src/components/screens/step3/VaultObject.tsx:39-49` sizes the canvas backing store from
`canvas.clientWidth * dpr` inside `paintVaultFrame`, but the paint `useEffect` is keyed only on
`[phase, emberState]`. There is no `ResizeObserver` or `resize`/`orientationchange` listener. If the
canvas box changes size, or the element moves to a surface with a different device-pixel-ratio, while
`phase`/`emberState` stay constant — e.g. the Processing screen holding a sealed vault through a device
rotation — the backing store keeps its old dimensions and the vault renders stretched or blurry until
the next phase change repaints it. The same class applies to `SealVaultCanvas.tsx:76-135`.

**Why it matters:** cosmetic, but the Vault is the product's signature ceremonial object, and a
smeared render at exactly the "your vault is sealed" beat undercuts the moment. Most likely on a real
device orientation change; Chromium at a fixed viewport won't surface it, so it needs a physical /
emulated-rotation check to see.

**Fix shape:** attach a `ResizeObserver` to the canvas (or a window `resize`/`orientationchange`
listener) that re-invokes `paintVaultFrame` with the current drive; debounce to a frame. UI/motion
change → verify in-browser with a rotation, per house rules.

**Pick up when:** the mobile-web polish pass or the physical-feel QA pass (roadmap buckets #6/#7),
alongside the other inset/device-feel items.
