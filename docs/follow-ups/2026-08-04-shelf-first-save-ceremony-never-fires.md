---
id: 2026-08-04-shelf-first-save-ceremony-never-fires
priority: P3
status: open
opened: 2026-08-04
resolved:
owner_paired: false
summary: The first-ever-save celebration overlay on the Memory Shelf ("Your first message is here / This is where your voice lives") never appears for real users — a one-shot `useState` reads the list before it has loaded, so the latch is stuck false forever *(triage 2026-08-04)*
---

# First-save ceremony overlay is dead in production — a designed emotional beat that never fires

*(triage 2026-08-04 — deep read of the Step 10 / message-playback surfaces)*

`src/components/screens/shelf/MemoryShelf.tsx:64-66`

```js
// First-ever-save ceremony shows once on arrival, then is dismissed.
const [ceremonyOpen, setCeremonyOpen] = useState(
  justSaved && messages.length === 1
);
```

`ceremonyOpen` is seeded by a `useState` **initializer**, which React evaluates exactly once, on the
first render. At that moment `messages` is still the empty `initialData: []` that
`ShelfPageClient` passes into `useResource` (`src/app/app/shelf/ShelfPageClient.tsx:39`, `:73`) — the
real list fetch is async and resolves in a later commit (`useResource.ts` starts `data = initialData`,
`status = "loading"`). So `messages.length === 1` is `false`, the latch is seeded `false`, and nothing
ever re-opens it: `setCeremonyOpen` is only ever called with `false` (Escape at `:131`, dismiss click
at `:293`). The overlay (`:288-304`, "Your first message is here." / "This is where your voice lives.")
therefore never renders for a real user. It only appears in the mock harness `/dev/shelf`, where
messages are injected **synchronously** as a prop (`src/app/dev/shelf/page.tsx:75`), so the beat looks
correct in isolation and the gap hides.

**Why it matters:** the moment a user saves their very first message and lands on the Shelf is the
designed emotional payoff of the whole creation flow — and it silently does nothing in production.
No data or money risk; it's a broken ceremonial feature, invisible because it "works" in dev.

**Fix shape:** drive the overlay from an effect that opens it the first time
`justSaved && messages.length === 1` becomes true *after* the list loads, latched by a "shown once"
ref so it fires exactly once. Mirror the sibling `freshId` glow (`:231`), which works precisely
because it is recomputed during render rather than seeded once. Do not seed ceremony state from an
async-loaded list in a `useState` initializer.

**Pick up when:** the Step 8/Step 10 connection-pass or any Memory Shelf touch — pairs naturally with
FU-99 (the shelf playback-controller fetch race) since both live in the shelf client.
