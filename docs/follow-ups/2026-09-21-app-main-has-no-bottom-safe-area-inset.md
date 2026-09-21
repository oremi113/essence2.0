---
id: 2026-09-21-app-main-has-no-bottom-safe-area-inset
priority: P2
status: resolved
opened: 2026-09-21
resolved: 2026-09-21
summary: "RESOLVED 2026-09-21 — `.app-main` reserves the notch at the top but keeps a hardcoded 40px at the bottom — on an inset device a bottom CTA can sit under Safari's chrome or the home indicator *(owner, iPhone 16 Pro, physical pass 2026-09-21)*"
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


---

## Resolved — 2026-09-21

Two parts, and the first alone would not have fixed the reported symptom.

**1. The shell reserves the space.** `.app-main` (and `--with-footer`) now use
`calc(40px + env(safe-area-inset-bottom, 0px))` for both `padding-bottom` and
the published `--app-main-inset-bottom`, so the four full-height children that
subtract the var stay correct and the phantom scroll is not re-created.
Verified with a simulated iPhone 16 Pro inset (59px top / 34px bottom): the
child computes `844 - 59 - 74 = 711px`, and at flat insets the scroll is still
exactly 0.

**2. `.onboarding-wrapper` had to subtract the insets too** — this is the part
that actually moved the button. Measured first: adding the shell padding alone
left the CTA at an unchanged 22px gap, because the wrapper is `min-height:
100dvh` and so spans past the padding to the raw viewport edge, anchoring its
CTA under Safari's toolbar. A shell reserving space underneath does nothing if
the child reaches past it.

This is the same class as
`2026-09-04-full-height-screens-overflow-the-app-shell-padding`, in the one
file that pass deliberately skipped — it was skipped on the strength of a
comment explaining the `100dvh` as a dev-sandbox floor. The comment was right
about *why* the floor exists and silent about what it does to content anchored
at the bottom.

Measured, onboarding CTA gap below the button:

| | wrapper min-height | gap below CTA |
|---|---|---|
| dev sandbox (no shell) | 844px — full `100dvh`, rationale preserved | — |
| in shell, flat insets | 804px | 62px |
| in shell, 34px home indicator | 770px | 96px |

**Still needs the device.** Chromium cannot render Safari's toolbar, so what is
verified is that the CTA moves up by exactly the inset. Whether
`env(safe-area-inset-bottom)` is sufficient clearance for Safari's bottom bar
in every state is a question only the phone answers — re-check on the iPhone 16
Pro that produced the original screenshot.

Also fixed alongside: the Settings trial line read "Your card won't be charged
until then" when the trial end date was missing, leaving "then" pointing at
nothing. Seen on a real account during the same pass.
