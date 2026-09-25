---
id: 2026-09-25-rem-type-scale-left-fixed-px-sizes-behind
priority: P4
status: open
opened: 2026-09-25
summary: The rem type-scale conversion (#171) left a few nearby sizes on the old px assumption — the Home A/B primary CTAs use a fixed `height: 56px` (HomeB with `overflow: hidden`, so the label clips) while their text now scales, and several screen titles are hard-pinned in px so headings freeze while body copy grows *(triage 2026-09-25)*
---

# px sizes left behind by the rem type-scale conversion — CTA boxes and titles that don't answer the reader's font setting

*(triage 2026-09-25 — blast-radius read after commit `4765f57`, feat(a11y): rem type scale)*

Commit `4765f57` (#171) correctly moved the twelve `--text-*` tokens from px to
rem so the app answers the reader's browser/OS font size (a WCAG 1.4.4 fix for
the 45-70 audience). The token change itself is clean. But a few elements nearby
were left on the old px assumption and now scale inconsistently:

**Fixed-height primary CTAs (the primary instance).**
`src/components/screens/home/HomeAScreen.css.ts:227` (`.homea__cta`) and
`src/components/screens/home/HomeBScreen.css.ts:145` (`.homeb__cta`) both set
`height: 56px` while their `font-size` is `var(--text-body-lg)` (now `1.125rem`).
Every sibling primary CTA in the app already uses `min-height` so it can grow —
`.btn-primary` (`globals.css:578`), `.fpb__btn`, `.step3-cta` (`globals.css:4533`)
— so these two are the outliers. `.homeb__cta` additionally has `overflow: hidden`
(line 143), so at a large reader size its label doesn't just crowd the box, it
**clips** — hidden information on one of the two most-used screens, the exact
reflow failure #171 was made to prevent.

**Titles/headings hard-pinned in px** (secondary, cosmetic):
`SettingsScreen.css.ts:63` (`.set__title`, 22px) and `:407` (`.set__sheet h3`,
23px — the `--text-ceremonial` value), and `FirstPlaybackScreen.css.ts:259`/`:343`
(`.fpb__aside`, 18px = `--text-body-lg`). On these screens the body copy scales
but the title stays frozen, so when a low-vision reader enlarges text the heading
can end up the same size as the text beneath it — the visual hierarchy inverts.
No information is hidden, so this half is P4 cosmetic.

(Not flagged: `LegalDocument.css.ts` is uniformly px with no rem tokens — a
pre-existing whole-surface gap, not a regression this commit exposed. The
`clamp(...)` payoff line in `FirstPlaybackScreen.css.ts:286` and the fixed-height
onboarding conveyor band are judgment calls that may be viewport-fit-by-design;
left out to avoid noise. The commit already filed home-b/settings horizontal
clips as "#111"; these are distinct from that list.)

**Why it matters:** the whole point of the rem change was that turning up the text
size makes the app's type grow with it. On the home screen's main button and a
few titles it still doesn't — the button can clip its own label at large sizes,
and titles stop leading their paragraphs — for exactly the readers the change was
made to serve.

**Fix shape:** change `height: 56px` → `min-height: 56px` on `.homea__cta` and
`.homeb__cta` (and drop or keep-with-headroom the `overflow: hidden` on HomeB);
point the pinned titles at their matching tokens (`--text-title` /
`--text-ceremonial` / `--text-body-lg`). Verify in a browser at a 200%+ root font
size on a mobile viewport per the house visual-validation bar.

**Pick up when:** an a11y/type-scale polish pass, or next time the Home or Settings
screens are touched. Cheap; the CTA half is the part worth doing first.
