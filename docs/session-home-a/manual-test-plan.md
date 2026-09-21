# Home A retrofit — manual test plan

**Screen:** `src/components/screens/home/HomeAScreen.tsx` at `/home`, before the
voice profile is `ready`.
**Harness:** `/dev/home-a` (permanent scaffolding). States are also addressable
directly at `/dev/home-a/frame?…` — see the parameters below.
**Automated:** `npm run verify:home-a` covers p95 at 4× throttle, focus order,
reduced motion, and zoom. This plan covers what it cannot.

---

## 0. Before you start

The harness loads the screen in an **iframe**, on purpose. A `div` sized 390×844
is not a viewport: media queries and `dvh` resolve against the browser window,
so at a desktop width the past-due banner rendered its ≥768px row variant inside
a phone-shaped box, and the screen overflowed its own frame. If you ever see the
harness disagree with a real device, check that first.

Frame parameters: `register` (`not-started` | `paused` | `failed`), `clips`,
`sub` (`retryable` | `waiting` | `exhausted`), `waitLong`, `pastDue` (0-3),
`offline`, `pending`, `rm`.

---

## 1. Harness pass — every state renders

Walk all of these in `/dev/home-a`. None should log a console error.

| # | State | Expect |
|---|---|---|
| 1 | not started | "Twenty-five short passages…", CTA **Record the first one**, band present but unfilled with all three labels |
| 2 | paused · 1 | "You're one moment in." (singular), "Four more and Everyday is behind you." |
| 3 | paused · 5 | **One full segment**, two empty. This is the equal-thirds payoff — if it reads 20% full, the band regressed to proportional widths |
| 4 | paused · 12 | "Five more and the longest stretch is done." Honey track on Emotional only |
| 5 | paused · 17 | Two full segments; honey moves to Personal |
| 6 | paused · 24 | "One more and **the reading** is done." Not "you're finished" — payment sits between the last clip and the voice |
| 7 | failed · 1 | No stone. Content vertically centred. CTA **Try again** |
| 8 | failed · 2 (5 min) | **No button at all.** Wait block reads "…in five minutes." |
| 9 | failed · 2 (30 min) | Same shape, "…in half an hour." |
| 10 | failed · 3 | Headline drops "this time". CTA **Send us a note** + the mail-app sub-line |
| 11 | past-due 1 / 2 / 3 | Banner in flow above the gear, copy escalating. Variant 3's title in amber |
| 12 | offline | Offline banner, CTA quiet (no shadow), reassurance line hidden |
| 13 | offline + past-due | **Only the offline banner.** Past-due suppressed |
| 14 | failed · 1 + past-due | **No "Try again".** Instruction block instead; the banner's button is the only action |
| 15 | pending | CTA label swaps to "Opening". No spinner — deliberate |
| 16 | reduced motion | Nothing animates. Content at its destination, no mid-flight pose |

---

## 2. Live pass — the real page

The harness cannot prove the page layer. These need a real account.

**2.1 Register selection.** With a profile at 0 clips, `/home` shows *not
started*. Record one clip, return to `/home`: *paused*, count correct.

**2.2 The redirect table.** At 25 clips, `/home` must **redirect to
`/app/voice/processing`** — never render Home A saying "pick up where you left
off" with nothing left to record. Same for `processing`/`queued`.

**2.3 The loop that isn't.** Confirm the 25-clip redirect does not bounce:
`/app/vault/protect` returns a `trial`/`active`/`past_due` user to `/home`, so
sending them there directly would ping-pong. Everything goes to
`/app/voice/processing`, whose guard fans out correctly.

**2.4 Resume lands correctly.** Tap the CTA at 12 clips → `/app/record` resumes
at prompt 13, not the beginning, and not through the full five-screen preamble.

**2.5 `app_opened` fires.** Load `/home` in the paused register and confirm a
`journey.app_opened` row in `usage_events`. It previously only fired on Home B —
see `docs/analytics/2026-09-21-home-a-app-opened.md`.

### Faking the states you cannot reach naturally

`failed` and past-due need seeded data:

- **failed sub-states:** set `voice_profiles.status='failed'` and vary
  `attempt_count` / `last_attempt_at` — `1` + recent → waiting (5 min), `2` +
  recent → waiting (30 min), `3` → exhausted, any count with an old
  `last_attempt_at` → retryable.
- **past-due:** set the subscription to `past_due` and vary the failed-attempt
  count for variants 1-3.

---

## 3. Device pass — non-compressible

The only part that cannot be automated.

**3.1 A real phone, and a small one.** Verified at 375×667 and 360×640, where
the content region genuinely overflows (185-212px) and the pinned CTA is what
keeps the screen usable. An earlier build grew the container past the viewport
here and put the CTA below the fold.

**3.2 Scroll cue.** Where the region overflows, the bottom edge fades. Confirm
it lifts once scrolled to the end, and never appears when nothing is hidden —
an early version showed the fade with zero hidden pixels.

**3.3 The stone.** It is the canvas `BreathStone` at `idle`, and it is expected
to read cool on cream — FOLLOW_UPS #35 owns its warmth and is scheduled after
this ships. **Do not compensate locally.**

**3.4 Read it slowly, at arm's length.** The audience is 45-70. The question is
not "does it look right" but "would someone cautious about technology know what
to tap, and believe nothing is lost."

---

## 4. Known and accepted

- **The `failed` register is sparse.** Two lines of text, vertically centred.
  Deliberate: there is nothing honest to add, and centring makes the space read
  as composition rather than truncation.
- **The stone reads cool.** FOLLOW_UPS #35, scheduled.
- **Text-size preference does nothing.** The type scale is px throughout, so the
  app does not respond to OS text settings anywhere — FOLLOW_UPS #106. Zoom is
  what a user actually has, and it works (verified to 200%).
- **`Try again` would dead-end a past-due user** once
  `VOICE_CREATION_REQUIRES_PAYMENT` is flipped on. Home A handles it; other
  entry points to `/start` do not — FOLLOW_UPS #109 gates that flag flip.
