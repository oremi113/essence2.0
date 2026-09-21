---
id: 2026-07-12-app-main-missing-safe-area-inset
priority: P3
status: resolved
opened: 2026-07-12
resolved: 2026-09-21
owner_paired: false
summary: RESOLVED 2026-09-21 — `/app` pages without TabNav (record, settings, …) have no top safe-area inset — top content risks sitting under the notch / status bar on inset devices *(triage 2026-07-12)*
---

# `.app-main` has no top safe-area inset, so non-TabNav `/app` pages can render under the notch

*(triage 2026-07-12 — qa-scout sweep; sibling of the TabNav tap-target fix on `fix/app-tabnav-tap-targets`)*

`src/app/globals.css` — the TabNav fix added `padding-top: env(safe-area-inset-top, 0px)` to
`.tab-nav`, which clears the status bar / Dynamic Island **only on pages that render the tab nav**.
`/app` pages that don't (e.g. `/app/record`, `/app/settings`) have nothing reserving that space:
`.app-main` (`globals.css:265`) has no `padding-top`, so their top content sits at `y=0`.

**Why it matters:** on a real notched device (the repo's target — mid-range phones + modern iPhones)
top-of-screen content on those pages can render under the status bar / Dynamic Island, clipping or
swallowing taps on headings and controls. Not reproducible in Chromium (it doesn't emulate the notch,
so `env(safe-area-inset-top)` resolves to `0`) — which is exactly why an emulated `qa-scout` sweep
can't catch it and it needs the physical-feel pass. The code-level gap is real and cheap to close now.

**Fix shape:** add `padding-top: max(<existing-top-padding>, env(safe-area-inset-top))` to `.app-main`
in `src/app/globals.css` (l.265) so every `/app` page reserves the inset regardless of whether it
renders TabNav. When you do, **drop the now-redundant inset from `.tab-nav`** (or the two stack and
double the top padding on nav pages). Verify on a real inset device — Chromium can't show it.

**Pick up when:** the mobile-web polish pass (roadmap bucket #6) or the physical-feel QA pass
(bucket #7).


---

## Resolved — 2026-09-21

`.app-main` now carries `padding-top: env(safe-area-inset-top, 0px)`, so every
`/app` page reserves the inset whether or not it renders TabNav. As this item
instructed, the now-redundant copy was **removed from `.tab-nav`** — leaving
both would have stacked and doubled the top padding on nav pages.

**One thing this item's prescribed fix would have broken.** Adding top padding
to `.app-main` silently re-creates the phantom-scroll bug that
`2026-09-04-full-height-screens-overflow-the-app-shell-padding` fixed: a child
sized `calc(100dvh - var(--app-main-inset-bottom))` accounts for the bottom
padding only, so the new top inset pushes it over by exactly the notch height.
Measured with a simulated 59px inset: **59px of phantom scroll**, i.e. the bug
back in full.

So `.app-main` now publishes **both** ends — `--app-main-inset-top` alongside
the existing `--app-main-inset-bottom` — and all four full-height children
(`vault-screen`, `FirstPlaybackScreen`, `SettingsScreen`, `HomeBScreen`)
subtract both. `--app-main-inset-bottom` keeps its name and contract because
`DevFirstPlaybackHarness` sets it directly.

**Not verified on hardware, by nature.** Chromium resolves
`env(safe-area-inset-top)` to 0, exactly as this item predicted, so the notch
behaviour was exercised by overriding the padding and the published variable to
59px rather than by a real inset device. The composition logic is verified; the
actual notch clearance still needs the physical-feel pass.

**Flagged for that pass:** with a 59px inset simulated on an 844px viewport,
Home B's 783px of content exceeds the 745px left over and scrolls 38px. That is
content height, not the min-height math (verified separately), and the
simulation is artificial — real notched iPhones have taller viewports. Worth a
look on device.
