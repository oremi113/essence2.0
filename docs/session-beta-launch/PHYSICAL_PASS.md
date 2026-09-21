# Physical-feel pass — the irreducible one

**Device under test:** _____________  **iOS/Android version:** _______
**Date:** __________  **Build:** production, commit ______ (check below)
**Tester:** owner

No emulator answers these questions. Playwright resolves
`env(safe-area-inset-top)` to `0`, cannot render a notch or a home indicator,
cannot judge whether motion *feels* right, and cannot hear anything. That is
why this is the one item in the beta plan that no agent can close.

---

## 0. Before you start

| # | Check | How | ✓ |
|---|---|---|---|
| 0.1 | Prod is running the build you think it is | `gh api "repos/oremi113/essence2.0/deployments?environment=Production&per_page=1" -q '.[0].sha'` — compare to `git rev-parse origin/main` | |
| 0.2 | That deploy succeeded | `gh api "repos/oremi113/essence2.0/deployments/<id>/statuses" -q '.[0].state'` → `success` | |
| 0.3 | `VOICE_CONSENT_REQUIRED=true` in prod | Vercel → Settings → Env Vars → Production | ✅ 2026-09-21 |
| 0.4 | `NEXT_PUBLIC_APP_URL` set to the prod https URL | Same place. Unset = Stripe returns testers to `localhost`. | ✅ 2026-09-21 |
| 0.5 | **Silence the urge to help yourself.** | If you reach for a workaround, that is a finding — write it down instead of using it. | |

**Recording is a one-time cost.** The 25 prompts (stages of 5 + 12 + 8, ~11–14
min) are per *account*, not per walk. Once the account has a ready voice
profile, every later pass starts at §2.5 and takes about four minutes. The
server only needs 10 clips (`MIN_CLIP_COUNT`), but the UI gates on all 25
(`clipsRecorded >= TOTAL_PROMPT_COUNT`), so there is no shortcut in-product —
by design, and worth feeling once.

---

## 1. The two questions only hardware can answer

These are the reason this pass exists. Everything else is secondary.

| # | Question | What to look for | Result |
|---|---|---|---|
| 1.1 | **Does top content clear the notch / Dynamic Island?** | `/app/record` and `/app/settings` — pages with **no** tab bar, which is exactly where the inset used to be missing. Headings and controls must not sit under the status bar, and taps at the top must land. | |
| 1.2 | **Does anything sit under Safari's bottom chrome or the home indicator?** | Bottom CTAs on any `/app/*` screen. **Known gap:** `.app-main` has a hardcoded `padding-bottom: 40px` with **no** `env(safe-area-inset-bottom)` — the top inset was added 2026-09-21, the bottom was not. `SettingsScreen` and `LegalFooter` already use the bottom inset; the shell does not. Expect this to be real. | |
| 1.3 | **Does `/home` fit as one still frame?** | It should not scroll. Measured intrinsic content is 783px; on an inset device the available space shrinks and it may overflow. Note *how much* it scrolls and whether anything is cut off. | |

**On 1.2 — do not move the button.** If a CTA collides with Safari's chrome,
the fix is the shell reserving the space (`calc(40px + env(safe-area-inset-bottom, 0px))`),
not relocating the control. Moving it treats the symptom and leaves every other
bottom CTA exposed.

---

## 2. The exit bar — one walk, no help

The beta is ready when a tester can do all of this on their own phone and get
out of anything that fails.

| # | Step | Expected | Result |
|---|---|---|---|
| 2.1 | Open the invite link, sign in | 6-digit code arrives by email; entering it signs you in | |
| 2.2 | Onboard | Screens advance; no content under the status bar | |
| 2.3 | Consent to voice creation | An affirmative consent gate appears (not just "I understand") | |
| 2.4 | Record the 25 prompts | Mic permission flow is clear; celebration beats land; no dead ends between prompts | |
| 2.5 | Card Capture → Stripe | Real Checkout opens, shows **$0.00**, card fields present and required | |
| 2.6 | Pay with a real card | Returns into the app, not to `localhost` | |
| 2.7 | Processing → Reveal | The vault reveal reads as ceremony, not as a spinner | |
| 2.8 | First Breath | **Sound plays.** Motion holds. See §3.1 first. | |
| 2.9 | First Playback | You hear *your* voice; word timing tracks the audio | |
| 2.10 | Create a message | Category → note → generation → preview | |
| 2.11 | Save it | Lands on the confirmation | |
| 2.12 | Close Safari entirely. Reopen later. | Still signed in; the message replays from the Shelf | |

**Two recovery properties**, equally part of the bar:

| # | Step | Expected | Result |
|---|---|---|---|
| 2.13 | Turn on airplane mode mid-flow, then off | An offline state appears and recovers; nothing is lost | |
| 2.14 | Background the app mid-ceremony, return | Audio and motion recover, or degrade gracefully — never a stuck screen | |

---

## 3. iOS gotchas worth testing deliberately

An audio product on iOS has failure modes that never appear on desktop.

| # | Check | Why it matters | Result |
|---|---|---|---|
| 3.1 | **Ring/silent switch ON, then play First Breath and a message** | The classic iOS trap. Depending on the audio session, a muted switch can silence playback entirely — and silence is indistinguishable from "the ceremony is broken". Test both positions. | |
| 3.2 | **Volume at zero, then raised mid-playback** | Does audio resume, or does the beat pass in silence? | |
| 3.3 | **Low Power Mode on** | iOS throttles timers and animations. The ceremonies are the risk. | |
| 3.4 | **Larger text (Settings → Display → Text Size)** | Bumped Dynamic Type is common. Does any screen overflow or clip? | |
| 3.5 | **Rotate to landscape** | Not supported by design, but it must not break or trap the user. | |
| 3.6 | **Deny mic permission, then grant it** | Is the denial explained, and is there a real way back? | |
| 3.7 | **Incoming call / notification during recording** | Does the clip survive, or does the flow wedge? | |
| 3.8 | **Lock the screen during First Breath, unlock** | Audio context suspension is a known crash class here. | |

---

## 4. Money path

The beta is comped to $0, so the whole payment mechanism runs for real without
charging anyone. That is the point — do not skip it.

| # | Check | Expected | Result |
|---|---|---|---|
| 4.1 | Checkout summary | "7 days free · Then **$0.00**" | |
| 4.2 | Card fields | Present and required — the comp must not skip collection | |
| 4.3 | Stripe Link prompt | Uncheck "Save my information", or it demands a phone number. **Note whether a tester would get stuck here** — this is Stripe's UI, not ours, and it has caught people before. | |
| 4.4 | After paying | Returns to the app; a `subscriptions` row exists with `status = 'trial'` | |
| 4.5 | Vault cap | Save 3 messages; the 4th shows the Vault Limit screen, not an error | |

---

## 5. What you can skip

Verified in a browser on 2026-09-21; only look if something seems off:

- The 40px phantom scroll on Home B and Settings (fixed, measured 884px → 844px)
- The `?next=` open redirect (fixed across all four sites)
- The cost-cap copy — reaching it needs 20 generations in an hour
- Message-creation wedging after a failed generation (FU-93, fixed)

---

## 6. Findings

Log anything here as you go. A finding is anything you had to think about,
work around, or explain to yourself.

| # | Screen | What happened | Severity | Filed as |
|---|---|---|---|---|
| | | | | |

**Severity, plainly:** *blocker* = a tester cannot continue or loses something.
*Bad* = they can continue but will remember it wrong. *Polish* = you noticed and
they probably will not.

---

## 7. Result

- [ ] Every row in §1 and §2 passes → the beta's core question is answered yes
- [ ] §3 gotchas checked on at least one real iPhone
- [ ] A second device tried (a mid-range Android is the other half of the bar)
- [ ] Findings triaged into `docs/follow-ups/`

**Sign-off:** ______________________  **Date:** __________
