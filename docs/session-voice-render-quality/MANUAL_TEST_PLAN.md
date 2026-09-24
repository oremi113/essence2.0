# Manual test plan — voice creation and First Playback, against production

**Date:** 2026-09-22
**Environment: PRODUCTION** — `https://essencevault.app`, Supabase
`idqvimiybiskposxhbor`, Stripe **test mode** (`sk_test`).

> **Why the environment is stated in the heading.** This session's root cause B
> was a feature verified locally and dead in production for two weeks. A test
> plan that does not say which environment it was run against cannot distinguish
> those two states. Every plan in this repo should carry this line; this one is
> the first. See FOLLOW_UPS #114.

---

## A. Regression — the two faults fixed this session

| # | Step | Expect | Verified |
|---|---|---|---|
| A1 | Query `voice_profiles` for `sample_status` | Column exists (not `42703`) | ✅ 2026-09-22 |
| A2 | `npx supabase migration list --linked` | No local row with an empty Remote | ✅ 2026-09-22 |
| A3 | Prod storage buckets after the push | `essence-audio` still 26214400, `profile-photos` 15728640 — the `on conflict do nothing` did not reach into prod | ✅ 2026-09-22 |
| A4 | ElevenLabs cloned-voice count | Well under the account cap; `xtw4wiBa3u4cFZmEyDXK` still present | ✅ 2/10 |
| A5 | New signup → pay → Processing | Reaches `ready`, lands on the ceremony | ✅ 2026-09-22 |
| A6 | Ceremony plays | The **voice** is audible, not only the bed | ✅ 2026-09-22 |
| A7 | Reload the ceremony | Voice plays again; `sample_render_count` does **not** increase | ⬜ |
| A8 | `sample_render_count` after several replays | Stays 1 — single-flight and cache hold | ⬜ |

A7/A8 matter because each render is billed. The claim is conditional
specifically so a refresh cannot bill twice; that guard has never been exercised
in production, since the column only started existing today.

---

## B. The failure paths, deliberately provoked

None of these had ever been walked in production. B1 is the one that bit a real
tester.

| # | Provoke | Expect |
|---|---|---|
| B1 | Fill the ElevenLabs voice cap, then sign up | Currently: soft "taking longer" forever, and the user's `attempt_count` burns. **This is FOLLOW_UPS #112 and is the bug.** After #112: does not spend the user's attempts, and the operator is told |
| B2 | `/start` returns 429 (attempts exhausted) | With this session's fix, the screen shows the support-tail register — *"we'll reach out within a day"* — immediately, not the soft wait. **Untested in a browser; see Limits below** |
| B3 | Press "Email me when it's ready" | Nothing happens. Known — FOLLOW_UPS #113 |
| B4 | Make a sample render fail (revoke TTS scope) | `sample_status` = `failed`, ceremony plays the bed alone. Confirm the row records *why* |
| B5 | Sample render while at the daily cap (5/day) | 429 from the play route, `voice_sample_render_rate_limited` logged |

---

## C. Render quality — the beta calibration pass

Per `DECISION-voice-sample-settings.md`. This is the part that cannot be run
retroactively: it needs real testers with real, different voices.

For **each** tester, after First Playback:

1. *"Did that sound like you?"* — 1–5.
2. If ≤3: *"Was it more that it didn't sound like you, or that it sounded flat?"*
   — this separates **likeness** (similarity) from **expressiveness** (style),
   which are different dials and generalise differently.
3. Record alongside: their `sample_voice_settings` (once stored), total source
   seconds, and where they recorded (quiet room / car / outdoors).

**Read it as:** uniformly high → one global setting is fine, close the question.
Split by voice → the split names the axis. Correlated with recording
environment → the problem is input quality, and Gap 1 in the decision memo
outranks any render tuning.

**Do not** tune per-voice off fewer than ~8 responses. Two samples of one
person's voice is noise, not signal.

---

## D. Diagnostic queries

Read-only, service role, against prod. Scripts used this session are in the
session scratchpad.

```
# is prod's schema behind the repo?
npx supabase migration list --linked        # needs SUPABASE_DB_PASSWORD

# one profile, end to end
/rest/v1/voice_profiles?user_id=eq.<uid>&select=*

# did the sample render, and was it billed more than once?
/rest/v1/voice_profiles?id=eq.<vp>&select=sample_status,sample_audio_path,sample_render_count

# what the vendor account actually holds
GET https://api.elevenlabs.io/v1/voices        (xi-api-key)

# does the key still have TTS scope? — 422 means yes, 401 means no.
# an invalid body fails AFTER auth, so this costs nothing and renders nothing.
POST https://api.elevenlabs.io/v1/text-to-speech/<voice>/with-timestamps  -d '{}'
```

---

## Limits of this plan — what was *not* verified

Stated explicitly, because this session's whole lesson is that unverified things
get recorded as working.

- **B2 was never driven in a browser.** The `ProcessingActions` change is
  reasoned and type-checked, and 558 unit tests pass, but no one has watched a
  real 429 produce the support-tail copy. Local Supabase was not running and the
  path lives in production. The copy it selects is the pre-existing
  `unrecoverable` register, so what is unverified is the branching, not the
  visuals. A unit test on `isTerminalStart` is the right coverage and, per the
  repo's extract-then-test rule, belongs in its own commit.
- **No 4× CPU throttle pass** was run on any of this. Required by CLAUDE.md for
  UI/motion work; this session changed which copy renders, not motion, but the
  ceremony itself has still not been walked at 4× on a mobile viewport in
  production.
- **A7/A8 are unchecked.** Nobody has yet confirmed that replaying the ceremony
  does not bill a second render.
