---
id: 2026-07-12-consolidate-duplicated-back-chevron-affordance
priority: P3
status: open
opened: 2026-07-12
resolved:
owner_paired: false
summary: The icon-only "Back" chevron is defined 5× across the app (step3 + three message screens + a header class) → consolidate into one shared component so touch-target / style fixes can't drift out of sync again *(triage 2026-07-12)*
---

# Icon-only "Back" chevron is duplicated 5× — consolidate into one shared affordance

*(triage 2026-07-12 — surfaced while fixing the `<44px` Back tap-target on `fix/screen-header-back-tap-target`)*

The same "left-chevron Back button" affordance is implemented **five separate times**, each with its own
near-identical styling:
- `src/app/globals.css` `.step3-backbar__btn` (Card Capture)
- `src/components/screens/messages/PersonalNoteScreen.css.ts` `.backbar__btn`
- `src/components/screens/messages/PreviewRefineScreen.css.ts` `.backbar__btn`
- `src/components/screens/messages/CategorySelectorScreen.css.ts` `.backbar__btn`
- `src/components/screens/messages/RecipientSetupScreen.tsx` — inline Tailwind (`p-2 -m-2 min-h-[44px] …`)
- (plus `.screen-header__back` in `globals.css`, a text-labeled sibling of the same idea)

**Why it matters:** this duplication is *why* the sub-44px tap-target bug existed on four surfaces at once and
had to be patched in four places — a single fix to one copy would silently leave the others broken. Any future
change to the Back affordance (hit area, focus ring, hover, icon size, a11y label) has to be made 5× or it
drifts. It's a recurring-bug generator, not a one-off.

**Fix shape:** extract one shared `BackButton` component (or a single canonical `.backbar__btn` class the
message screens + step3 all reference), owning: 44×44 min hit area, the optical negative-margin so the icon
aligns to the content edge, hover/focus states, and the `aria-label`. Repoint all five call sites to it and
delete the copies. Keep it a pure UI primitive (`src/components/ui/` or a message-screens shared sidecar) —
no data/Supabase. Verify each screen still aligns identically after the swap.

**Pick up when:** the mobile-web polish pass (roadmap bucket #6) or the next messages-screens refactor.
Related: [[2026-07-12-app-main-missing-safe-area-inset]] (sibling touch-target/inset polish from the same QA loop).
