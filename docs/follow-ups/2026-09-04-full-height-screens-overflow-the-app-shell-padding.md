---
id: 2026-09-04-full-height-screens-overflow-the-app-shell-padding
priority: P3
status: open
opened: 2026-09-04
resolved:
summary: "Every `min-height: 100dvh` screen inside `.app-main` overflows by the shell's 40px bottom padding — a phantom scroll on screens meant to be one still frame *(found in beta, 2026-09-04)*"
---

# `100dvh` screens inside the app shell scroll by exactly the shell's bottom padding

*(found while fixing the Reveal's missing forward affordance, 2026-09-04)*

`src/app/globals.css` — `.app-main` (`padding-bottom: 40px`, `100px` with
`--with-footer`) vs. any descendant with `min-height: 100dvh`.

A child sized to the full viewport inside a container that reserves 40px below
it is 40px taller than the viewport. Measured on the Reveal at 390×844 before
the fix: `document.scrollHeight` 884 vs `innerHeight` 844. Home B measured the
same 40px in the same session.

**Why it matters:** it is small enough to look like nothing and big enough to
change behaviour. On the Reveal it actively misled — the screen offered a
downward chevron, the page really did scroll, and the 40px of travel returned
nothing, so the user's reasonable reading was "this screen is stuck". It also
means no full-bleed screen in the app is truly a single still frame; each one
has a little rubber-band on touch.

**Fixed for `.vault-screen` only** (2026-09-04). `.app-main` now publishes
`--app-main-inset-bottom`, and `.vault-screen` sizes to
`calc(100dvh - var(--app-main-inset-bottom, 0px))` — correct inside the shell,
and falling back to a full `100dvh` in the `/dev` harnesses, which render
screens outside it. `.vault-screen` has exactly one consumer
(`VaultRevealScreen`), which is why the change was safe to make narrowly.

**Fix shape:** the token is already published, so each remaining screen is a
one-line change. The candidates are the `min-height: 100dvh` declarations in
`src/components/screens/**/*.css.ts` — Home A (both variants), Home B,
Settings, and the Step 6 screens (`GenerationScreen`, `PersonalNoteScreen`,
`SaveConfirmationScreen`, `ThreeShapedScreen`, `VaultLimitScreen`). Verify each
inside the shell (some routes may not use it) rather than sweeping blind.
Better still, fold it into a shared `screen-fill` primitive so the next
full-height screen inherits the correct sizing instead of re-deriving it.

**Pick up when:** next doing a layout pass across screens, or if touch
rubber-banding on a ceremonial screen is ever reported.
