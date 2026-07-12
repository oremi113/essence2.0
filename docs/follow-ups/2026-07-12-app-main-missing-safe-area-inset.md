---
id: 2026-07-12-app-main-missing-safe-area-inset
priority: P3
status: open
opened: 2026-07-12
resolved:
owner_paired: false
summary: `/app` pages without TabNav (record, settings, …) have no top safe-area inset — top content risks sitting under the notch / status bar on inset devices *(triage 2026-07-12)*
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
