---
id: 2026-09-21-app-main-has-no-bottom-safe-area-inset
priority: P2
status: open
opened: 2026-09-21
summary: "`.app-main` reserves the notch at the top but keeps a hardcoded 40px at the bottom — on an inset device a bottom CTA can sit under Safari's chrome or the home indicator *(owner, iPhone 16 Pro, physical pass 2026-09-21)*"
---

# The shell reserves the notch but not the home indicator

*(owner observation on a real iPhone 16 Pro during the physical-feel pass)*

`src/app/globals.css` — `.app-main`:

```css
padding-bottom: 40px;                          /* hardcoded */
padding-top: env(safe-area-inset-top, 0px);    /* added 2026-09-21 */
```

The 2026-09-21 fix for `2026-07-12-app-main-missing-safe-area-inset` added the
**top** inset so every `/app` page clears the status bar. It did not add the
**bottom** one. So the shell now reserves space for the notch and still assumes
a flat 40px is enough underneath — which it is not on a device with a home
indicator, and especially not in Safari, whose bottom bar overlays the viewport.

The owner's report: on `/app/record`, the "Continue" celebration CTA lands right
where the page scrolls, on an iPhone 16 Pro.

**The codebase already knows the pattern.** `SettingsScreen.css.ts:391` uses
`calc(30px + env(safe-area-inset-bottom, 0px))` and `LegalFooter.tsx:20` does
the same. Only the shell — the thing every `/app` page sits inside — does not.

**Why it matters:** the affected control is usually the primary CTA, because
primary CTAs sit at the bottom. A tester who cannot comfortably tap "Continue"
in the middle of the 25-prompt recording flow is a tester who does not finish
onboarding. It reads as the app being badly fitted to the phone, which is
precisely the impression this beta exists to test for.

**Fix shape:** `padding-bottom: calc(40px + env(safe-area-inset-bottom, 0px))`
on `.app-main`, and the published `--app-main-inset-bottom` must carry the same
value, or the full-height children that subtract it (`vault-screen`,
`FirstPlaybackScreen`, `SettingsScreen`, `HomeBScreen`) will be short by the
inset and re-create the phantom scroll that
`2026-09-04-full-height-screens-overflow-the-app-shell-padding` fixed — the
same trap the top inset had. Check `.app-main--with-footer` (100px) too.

Then check whether `SettingsScreen`'s own bottom inset now double-counts with
the shell's, the way `.tab-nav`'s top inset did.

**Do not fix by moving the button.** That treats one symptom and leaves every
other bottom CTA exposed.

**Pick up when:** before the beta invites go out — it is on the onboarding path,
which every tester walks.
