# Step 7 Memory Shelf — manual test plan

Run before declaring Chunk 2/3 done. Environment: Playwright MCP, **390×844**
viewport, **4× CPU throttle** (`scripts/throttle-dev.mjs` or CDP). Screenshots →
`.tmp/`. Compare every state against `prototypes/essence-step7-memory-shelf.html`
(use its dev rail side-by-side).

## State coverage (all 8)

| State | What to verify |
|-------|----------------|
| **empty (0)** | BreathStone (idle), "Your Memory Shelf" + promise copy, "Create your first message" CTA → `/messages/new`. |
| **1 message** | Single card; calm "Create another message" affordance visible. |
| **2 messages** | Two cards, newest first; "Create another" still present. |
| **3 full** | Three cards; **no** "create another"; the "Three, kept." complete block with "See what's coming" → `/messages/waitlist`. Reads as *complete*, not capped. |
| **playing** | Tap a card → ceremonial overlay: pre-play → playing → complete/replay; staggered stone → excerpt → controls fade-in; timer; "View transcript". Nothing auto-plays. |
| **just-saved** | Arriving from A7: newest card "fresh" settle, first-message ceremony on first-ever save. |
| **loading** | Quiet skeleton (no layout jump into loaded). |
| **error + retry** | Audio-unavailable card: "This message is safe…" + "Try again" restores playability. |

## Motion checks (the Appendix A fixes — confirm they survived the build)

- [ ] BreathStone breathes on the **pendulum** curve (`--ease-breath`
      `cubic-bezier(0.37,0,0.63,1)`), and *nothing else* uses it — all other
      transitions on `--ease-essence`.
- [ ] Page arrives via `page-enter` (`--ease-page` @ `--duration-page` 700ms).
- [ ] Card settle-in: 400ms, `--ease-essence`, ~200ms stagger.
- [ ] Primary/play CTAs carry the **warm** `--shadow-mineral`
      (`rgba(110,80,40,0.20)`), not a cool/neutral shadow.
- [ ] Cards are **flat** `surface-card` + hairline + `shadow-sm`; honey glow
      appears **only** on unplayed / just-landed cards.
- [ ] At 4× throttle the glows/pulses + overlay blur stay smooth (the
      shippability bar). If off at 4×, it's off on a real mid-range Android.
- [ ] `prefers-reduced-motion`: breathing freezes to a static mid-frame,
      atmosphere kept; entrances collapse to instant.

## Token/consistency checks

- [ ] Colors/type/spacing read from `@theme` (no re-hardcoded hex in the screen).
- [ ] Eyebrows (modal recipient, transcript label): 12px / 600 / 0.12–0.16em.
- [ ] No type below the 14px floor; primary copy ≥16px (45–70 audience).
- [ ] Touch targets ≥44px.

## Data/behavior checks

- [ ] Card meta renders `Kept on <date> · <m:ss>` from the widened API.
- [ ] Unplayed glow is driven by the `played` boolean from the API.
- [ ] Playback engine unchanged: signed-URL fetch, play/pause/stop, audio-error
      retry all still work.
- [ ] `/dev/shelf` renders every state with mock data.
