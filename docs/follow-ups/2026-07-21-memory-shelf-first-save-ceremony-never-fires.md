---
id: 2026-07-21-memory-shelf-first-save-ceremony-never-fires
priority: P3
status: open
opened: 2026-07-21
resolved:
owner_paired: false
summary: Memory Shelf's first-ever-save ceremony is seeded from a mount-time `useState` that reads `messages` before the client fetch resolves (always `[]`) → the ceremony is dead on the real save path, though it works in `/dev/shelf` *(triage 2026-07-21)*
---

# Memory Shelf "your first message is here" ceremony never fires on the real save path

*(triage 2026-07-21 — surfaced auditing the shelf/playback subsystem)*

`src/components/screens/shelf/MemoryShelf.tsx:64-66`:

```ts
const [ceremonyOpen, setCeremonyOpen] = useState(
  justSaved && messages.length === 1
);
```

`ceremonyOpen` is seeded once, at mount, from `messages.length`. But in production `messages` comes from
`ShelfPageClient`'s `useResource` with `initialData: []` (`src/app/app/shelf/ShelfPageClient.tsx:24-40`) —
the list is fetched client-side, so at first mount `messages` is always `[]`. The initializer therefore
evaluates to `false`, and `setCeremonyOpen` is only ever called to **close** the overlay (Escape handler
`:131`, overlay `onClick` `:293`), never to open it. So the first-save ceremony JSX (`:288-304` — "Your
first message is here / This is where your voice lives") is dead on the primary path: a user arriving at
`/app/shelf?saved=1` right after saving their first message never sees it.

Contrast `freshId` (`:231`, `justSaved ? messages[0]?.id ?? null : null`), which is computed at render time
and therefore *does* update after the fetch resolves — that's why the fresh-card settle works and the
ceremony doesn't, confirming an accidental lazy-init desync rather than a product decision. It also renders
correctly in `/dev/shelf` (which feeds `messages` synchronously via `useMemo`, `dev/shelf/page.tsx:53`),
which is why the gap escaped review.

**Why it matters:** the intended ceremonial moment for a user's first-ever saved message — a
deliberately-designed emotional beat in a ceremony-first product — silently never renders in the real app.

**Fix shape:** drive the ceremony from an effect (or derived render-time state) that fires once when
`justSaved && messages.length === 1` becomes true *after* the fetch resolves — guard with a ref so it shows
exactly once and can still be dismissed — instead of a mount-time `useState` seed that reads not-yet-loaded
data. Add a test that mounts with `initialData: []` then resolves one message and asserts the ceremony
opens (the `/dev` synchronous path masks this).

**Pick up when:** next shelf/Home-B work or the ceremony-polish pass. Visual verification required
(Playwright, real fetch path) per house UI rules before closing.
