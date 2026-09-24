# Spot check — operator-failure honesty (FOLLOW_UPS #112)

**Date:** 2026-09-24 · **Environment: PRODUCTION** · **Time: ~5 minutes**

**Verifies three claims**, all of which were false on 2026-09-22:

1. A vendor failure caused by **our** account shows the user the honest screen,
   not *"we'll have it ready soon"* forever.
2. It does **not** spend the user's retry budget.
3. It **reaches the operator** — there is a row you can find.

**Why it needs a human:** the unit tests prove the classifier sorts messages
correctly. They cannot prove the route is wired to it, that the response reaches
the client, or that the client renders different words. That chain is only
observable by a person looking at a phone.

---

## Before you start

**I do this** — say the word and I'll run it:

- Snapshot your profile row (already saved to `.tmp/spot-check/row-snapshot.json`).
- Set `status = 'failed'`, `attempt_count = 0` so `/start` will run again. Your
  25 training clips are untouched, so nothing gets re-recorded.

**You do this** — the provocation, in the ElevenLabs dashboard:

- API Keys → edit your key → set **`Voices`** from `Write` to **`Read`**.
- Save.

That makes voice creation fail with `401 missing_permissions`, which is exactly
the *operator* class — our credentials, not the user's fault. It is the same
shape as Monday's full-account wall, and it is reversible in one click.

> **What this disturbs:** for the 2–3 minutes the scope is reduced, nobody can
> create a voice. There are 3 profiles in production and one of them is yours,
> so the real exposure is zero — but it is production, so it is said out loud.

---

## Steps

| # | Do this | You should see | If you don't |
|---|---|---|---|
| 1 | Open https://essencevault.app/app/voice/processing signed in as `oremihislop+beta2@` | The sealed vault, *"Preparing your voice."* | The guard bounced you — check you're signed in as the right account |
| 2 | Wait ~10 seconds | Copy changes to **"Your Vault is sealed and your voice is safe."** + **"We're making sure it gets created, and we'll reach out within a day."** | **THE FIX FAILED.** If it still says *"we'll have it ready soon"*, the route is not returning `retry_available: false`, or the client is not reading it |
| 3 | Look for the button | **"Email me when it's ready"** is present | Fine either way — it is still inert, FOLLOW_UPS #113 |
| 4 | Press it | Nothing happens | Expected. That is #113, not this fix |
| 5 | Reload the page | Same honest copy, immediately | If it reverts to the soft wait, the terminal verdict is not surviving a reload |
| 6 | Tell me you're done | I read the database | — |

**What I check at step 6:**

```
attempt_count                     must still be 0   ← the refund
usage_events.voice_create_operator_block  one row, with the vendor's
                                  own message in meta ← the alert
```

If `attempt_count` came back as 1, the refund did not land. If there is no
ledger row, you are still flying blind on this failure class and the alert half
of #112 is not done.

---

## Restore

**You:** set the key's `Voices` scope back to **`Write`**. Do this even if the
check fails — nothing else works without it.

**Me:** restore the row from the snapshot — `status: ready`,
`vendor_voice_id: e65aW1OoqK3pmRim69Lv`, `attempt_count: 1`,
`sample_status: ready`, `sample_render_count: 2`.

Restoring the snapshot rather than letting it re-clone is deliberate: a fresh
clone would burn your **last** sample render (2 of 3 used) and make a second
vendor voice for no reason.

---

## What this does NOT prove

- **It does not test the full-account wall specifically.** It tests the
  *operator class* using a rejected-permission failure, because that one is
  reversible in a click and a real cap is not. The classifier treats them
  identically; the test pinning Monday's verbatim message lives in
  `tests/unit/classify-vendor-failure.test.ts`.
- **It does not prove anything about a transient failure.** A vendor 502 should
  still be retryable and still show the softer copy. Unexercised here.
- **It does not test a first-time user.** You have a voice profile and a
  subscription already. A brand-new signup crosses payment and recording first,
  and neither is touched by this check.
- **No 4× throttle pass.** This checks words on a screen, not motion.

---

# OUTCOME — 2026-09-24: not driven

**Result: the fix was never exercised.** Three attempts to provoke an operator
failure against production all failed *before reaching the code under test*.
Owner's call to stop. #112 is labelled **shipped, unit-tested, not driven**.

Written up because every failure was informative, and two of them were worse
bugs than the one being verified.

## Attempt 1 — wrong account

The browser was signed into `oremikilfoy+beta2@gmail.com`; every piece of setup
was built on `oremihislop+beta2@gmail.com`. Two accounts, same `+beta2` suffix,
different base address.

The redirects that looked like bugs were the app being correct: `/home` →
`/onboarding` because that account never onboarded, `/app/voice/processing` →
`/app/vault/protect` because it has no subscription.

**Lesson:** confirm *which account the browser is in* before building state
around one. The database was read all session; the browser never was.

## Attempt 2 — the provocation did not provoke

Setting the API key's `Voices` scope to `Read` was assumed to block voice
creation. It does not. The clone succeeded, a real voice was made, a real sample
rendered, and the pass looked green while testing nothing.

This produced the **step 0** rule now in the README: prove the provocation
provokes, with one cheap call, before a human opens the app.

## Attempt 3 — production was running a different key

The restricted key was not the key production used. `.env.local` and
`.env.local.prod-backup` both held `sk_f16a…0cda`; Vercel Production held a
different key on the same account. Both worked, so nothing had ever surfaced.

Filed as **#116**. It is the most valuable thing this check produced: every
conclusion drawn by probing the local key was a claim about a key production
does not run.

## Measured, not assumed — the ElevenLabs permission model

With the keys matched and `Voices` set to **No Access**:

```
GET  /v1/voices     -> 401   the scope change took effect
POST /v1/voices/add -> 422   cloning is STILL permitted
```

**`Voices` does not gate voice creation.** No value of that toggle can induce
this failure. This is the fact that would have saved the evening, and it is
recorded here so the next attempt does not rediscover it.

## What remains unverified

- That a real operator failure renders the support-tail copy rather than
  *"we'll have it ready soon"*.
- That `attempt_count` is actually refunded.
- That a `voice_create_operator_block` row is actually written.

All three are covered by 28 unit tests on the classifier and by reading the
route. None has been observed.

**The one provocation known to work** is a deliberately invalid
`ELEVENLABS_API_KEY` in Vercel Production for ~3 minutes: every vendor call
401s, which is unambiguously the operator class. Judged not worth the
disruption tonight. It is the right move if this ever needs real verification.

## Also found on the way

- **#115** — middleware double-encodes `next`, so every signed-out deep link
  silently loses its destination and lands on `/home`. Affects the first thirty
  seconds of every beta invite.
- **#116** — the credential drift above.

## Housekeeping left behind

- `SPOT CHECK - delete me` (archived) still holds vendor voice
  `kpb0Cu5kVK0cgIbXbhl9` and a rendered sample object. Deleting the vendor voice
  needs `Voices: Write`, which was revoked during the check.
- **`Voices` must be restored to `Write`.** Account teardown calls `deleteVoice`
  to purge a cloned voice vendor-side — the mechanism behind the "permanently
  gone from our servers" promise in the privacy copy. It 401s while the scope is
  revoked.
