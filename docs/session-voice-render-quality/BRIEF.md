# Session — voice render quality, and the two silent failures behind it

**Date:** 2026-09-22
**Trigger:** a beta tester (`oremihislop+beta2@`) paid with a test card on
2026-09-21 and was parked on the Processing screen for a day. On returning the
next morning, the same screen.
**Environment:** production (`essencevault.app`, Supabase `idqvimiybiskposxhbor`)

What looked like one bug was three, stacked. Each failed quietly, and each
failed quietly *for a different reason* — which is the through-line of this
session and the reason it is written up at all.

---

## 1. What the tester experienced

1. Paid, then sat on *"It's taking a little longer to prepare than usual. We'll
   have it ready soon."* for ~24 hours.
2. Pressed **"Email me when it's ready."** Nothing happened.
3. Signed in the next day → the identical screen.
4. After fix #1: reached the ceremony, saw the Breath Stone form, heard the
   ceremonial bed — and no voice, indefinitely, on every replay.
5. After fix #2: heard their voice. Their reaction: *"is that my voice? it
   sounds kinda off from my other voice clones."*

Every step of that is a distinct fault. None of them raised an error anywhere
an operator would look.

---

## 2. Root cause A — the vendor account was full

```
voice_profiles.last_error_code:    bad_request
voice_profiles.last_error_message: "You have reached your maximum amount of
                                    custom voices (10 / 10)."
```

The ElevenLabs account held exactly 10 cloned voices, 9 of them dev junk from
2025 (`My Voice Voice` ×4, `TEST Voice`, `EMOTIONAL Voice`, …). Every new
signup's clone would have failed identically.

**Why it read as "taking longer":** by design. `Processing` degrades by elapsed
time, not error state (handoff §4) — generation failure is deliberately
invisible to the user. That is the right call for a transient vendor blip and
the wrong one for a permanent capacity wall, and nothing in the system
distinguishes the two.

**Made worse by three things:**
- The failure spent the *user's* retry budget. `attempt_count` reached 2 of 3
  for a condition no amount of user retrying could fix. The third attempt would
  have bricked the profile permanently (429 forever, same soft copy).
- `ProcessingActions` fired `/start` and discarded the response
  (`.catch(() => {})`), so a hard refusal was indistinguishable from work in
  progress.
- Nothing alerted. The vendor's message landed only in
  `voice_profiles.last_error_message`, a column nobody reads unprompted.

**Resolved:** 8 unreferenced clones deleted (verified against both the prod DB
and the repo first; `xtw4wiBa3u4cFZmEyDXK` "Oremi" and `0t4EwPRMYoEXgdXWO9ul`
"Default" kept, Regina/Carol are professional voices and don't count against the
clone cap). Tester's `attempt_count` reset to 0. Clone then succeeded:
`vendor_voice_id: e65aW1OoqK3pmRim69Lv`.

**Not resolved — see FOLLOW_UPS #112 (P1):** capacity errors still burn user
retries and still don't alert. The account cap is 10 and the beta plans for
5–15 testers, so this recurs *by arithmetic* unless the plan is raised.

---

## 3. Root cause B — three migrations had never been applied to prod

```
   Local          | Remote
   20260903170000 | 20260903170000   ← prod was current to here
   20260909180000 |                  voice_profile_sample
   20260910200000 |                  sample_word_offsets
   20260915190000 |                  storage_buckets_in_version_control
```

`ensureVoiceSample` claims its single-flight render with a conditional update on
`voice_profiles.sample_status`. The column did not exist. The claim failed,
`bestEffortWrite` swallowed it — correctly, since a failed sample must never
turn a paid voice creation into an error — and the beat went silent.

**Step 5 First Playback had therefore never worked in production.** Not
regressed: never worked. It shipped 9/9–9/10 and the schema stayed local.

Three properties compounded into total invisibility:

1. Vercel deploys code. Nothing deploys schema. They drift silently by default.
2. The failure surfaces as a *swallowed best-effort write* — right for a
   paid-render guard, catastrophic for diagnosis.
3. The symptom is **silence**, which is visually identical to blocked autoplay.

That third one is not a new observation. `20260915190000`'s own header warns
about it in as many words — *"silence is exactly what a blocked-autoplay result
looks like, so it would have produced a confident wrong answer to the question
under test"* — and that migration was itself among the three left unapplied.

**Resolved:** all three pushed via `supabase db push --linked`. Verified
additive-only; prod buckets confirmed unchanged afterwards (`essence-audio`
still at its hand-set 25MB limit, i.e. the `on conflict do nothing` behaved as
documented).

**Not resolved — see FOLLOW_UPS #114 (P1):** nothing still checks that prod's
schema matches the repo.

---

## 4. Root cause C — First Playback renders with expressiveness at zero

`ensureVoiceSample` calls the vendor with no voice settings:

```ts
const tts = await generateSpeechWithTimestamps({
  voiceId: profile.vendor_voice_id,
  text: VOICE_SAMPLE_LINE,
});          // ← no voiceSettings
```

So it falls through to the voice's stored defaults, where **`style` is 0**.
Every other render in the app passes tuned per-category settings, and not one of
them uses style 0:

| category | stability | style |
|---|---|---|
| birthday | .35 | .40 |
| holiday | .40 | .35 |
| encouragement | .45 | .30 |
| checking_in | .45 | .25 |
| future_message | .50 | .25 |
| comfort | .55 | .20 |
| daily_reminder | .60 | .15 |

`messageTemplates.ts` defines style as *"style exaggeration. Higher = more
dramatic delivery."* At 0 you get correct timbre with the performance flattened
out — which is precisely what the tester described.

**First Playback is the moment the product is built around, and it is the single
render in the entire app with expressiveness set to zero.** This is an omission,
not a tuning preference.

Ruled out first: the clone itself. Compared against the tester's earlier clone
on the vendor side — 25 clips vs 25, 12.6MB vs 11.5MB, both `audio/mpeg`, byte-
identical stored settings. Same pipeline, same inputs. The difference is
entirely at render time.

**Status:** comparison set rendered for an ear judgement (see
`DECISION-voice-sample-settings.md`). Not yet wired.

---

## 5. The generalisable finding

Three failures, three different silencing mechanisms:

| fault | why it was silent |
|---|---|
| vendor account full | UI degrades by elapsed time, not error, by design |
| migration never applied | best-effort write swallows it, by design |
| style 0 | nothing anywhere measures render quality |

None of these designs is wrong in isolation. Each is defensible and two are
documented choices. What they share is that **the system has no channel through
which bad news reaches an operator.** Failures are handled gracefully for the
user and then discarded.

The tester only noticed fault C because they happened to own older clones to
compare against. Tester #7 will not, and will not report it — they will quietly
conclude the product isn't quite them.

That is the thing to fix before testers land: not any one of these bugs, but the
absence of a path from "something rendered badly" to "someone knows."

See `DECISION-voice-sample-settings.md` for the settings call and the beta
calibration plan.

---

## 6. Changes made

**Production state (irreversible, made with owner consent):**
- 8 ElevenLabs cloned voices deleted; account went 10/10 → 2/10.
- `voice_profiles` row `09df22cf…`: `attempt_count` 2 → 0, error fields cleared.
- Three migrations applied to the prod database.

**Working tree:**
- `src/app/app/voice/processing/ProcessingActions.tsx` — reads `/start`'s
  response instead of discarding it; a terminal refusal now surfaces the honest
  support-tail register immediately rather than an indefinite "we'll have it
  ready soon". `tsc` clean, `eslint` clean, 558 unit tests pass.
- `docs/FOLLOW_UPS.md` — #112, #113, #114.
- This folder.

**Deliberately not done:** the two fixes the owner deferred to their own pass
(#112 capacity-error classification + alerting, #113 the inert notify button).
