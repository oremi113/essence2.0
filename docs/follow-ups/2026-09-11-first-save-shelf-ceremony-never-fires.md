---
id: 2026-09-11-first-save-shelf-ceremony-never-fires
priority: P3
status: open
opened: 2026-09-11
resolved:
owner_paired: false
summary: The "your first message is here" Memory Shelf ceremony can never fire — its one-time state seed reads `messages.length` while the shelf is still mounting empty (loading), so it always seeds false *(triage 2026-09-11)*
---

# First-save Memory Shelf ceremony is dead on the real path

*(triage 2026-09-11 — found reading the A7→shelf handoff)*

`src/components/screens/shelf/MemoryShelf.tsx:64-66` seeds the first-save ceremony once,
at mount, from a `useState` initializer:

```ts
const [ceremonyOpen, setCeremonyOpen] = useState(
  justSaved && messages.length === 1
);
```

A `useState` initializer runs **only on the first render**. On the real route
(`src/app/app/shelf/ShelfPageClient.tsx:72-83`) the shelf is mounted unconditionally,
and the list comes from `useResource(..., { initialData: [] })`, which starts in
`status: "loading"` with `messages: []`. So the very first render — the only one the
initializer sees — always has `messages.length === 0`, and `ceremonyOpen` is seeded
`false`. When the fetch resolves and the single saved message arrives, the component
re-renders but the initializer does **not** re-run, so `ceremonyOpen` stays `false`
forever. The ceremony overlay never opens.

**Why it matters:** the A7 save flow redirects to `/app/shelf?saved=1`
(`justSaved = true`), specifically to play the "your first message is here" celebratory
beat the first time a user seals a message — a designed, prototype-authoritative
ceremonial moment. It is wired end-to-end but structurally unreachable, so every
first-time saver silently misses it. No data, money, or crash impact — a shipped
feature that is simply dead. (The Escape-key handler at `:131` and the overlay JSX
downstream are consequently dead code too.)

**Fix shape:** stop deriving the one-shot from mount-time props. Drive it from an effect
that fires when the real arrival condition first becomes true — e.g. a `useEffect`
keyed on `justSaved`, `loadState === "ready"`, and `messages.length === 1` that opens
the ceremony once (guarded by a ref/`hasShownRef` so it never re-opens after dismissal),
rather than a `useState` initializer that samples `messages` before the fetch lands.
Verify in the browser at mobile width on the real save→shelf redirect (the dev
`initialFocusId`/mock path bypasses the loading→ready transition, so it will not catch
this).

**Pick up when:** next time the Memory Shelf or the A7 save handoff is touched, or
sooner if the first-save moment is considered launch-relevant. Adjacent to the existing
shelf follow-up on the playback controller race
(`2026-06-30-memory-shelf-playback-controller-in-flight-fetch-race`) — same file, batch
if convenient.
