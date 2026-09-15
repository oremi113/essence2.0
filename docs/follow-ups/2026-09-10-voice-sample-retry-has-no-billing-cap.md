---
id: 2026-09-10-voice-sample-retry-has-no-billing-cap
priority: P3
status: resolved
opened: 2026-09-10
resolved: 2026-09-15
summary: "RESOLVED 2026-09-15 — A First Playback sample render that keeps failing AFTER the paid vendor call re-bills on every retry — `sample_status: 'failed'` is re-claimable with no attempt ceiling, so a storage outage charges the user once per attempt *(observed in live testing, 2026-09-10)*"
---

# The sample render has no retry ceiling

*(observed while running the Step 5 live guard tests against a stack with no storage bucket)*

`src/lib/voice-sample/ensureVoiceSample.ts`

The single-flight claim works: concurrent callers collapse to one paid render,
and that is mutation-verified against real Postgres. But **`failed` is
deliberately re-claimable** so the beat can recover — and there is no cap on how
many times.

The failure is only free when it happens *before* the vendor call. When the
vendor **succeeds** and a later step fails — the storage upload, or the finishing
write — every retry pays ElevenLabs again:

```
render → paid → upload fails → status 'failed'
retry  → paid → upload fails → status 'failed'   (sample_render_count 2)
…
```

Observed live with the bucket missing: six calls, **six paid renders**,
`sample_render_count` climbing each time. The counter recorded it correctly,
which is what it is for — nothing stopped it.

## Why it matters, and why it is P3

**Not currently reachable in production.** The render fires once from
`/api/voice-profiles/[id]/start`, and the only other caller is a GET that never
renders. So today a failure just leaves the beat silent, which is the agreed
degraded path.

**It becomes reachable the moment §4.7 lands.** The failure state the owner is
building will offer a retry, and a user tapping it during a storage incident
would be billed per tap with nothing to show.

## Fix shape

Cap the attempts. `sample_render_count` is already the number to read:

```
.in("sample_status", ["none", "failed"])
.lt("sample_render_count", MAX_SAMPLE_RENDERS)   // 3
```

A profile at the ceiling stops claiming and the beat degrades to silent-with-
the-line-on-screen, which is already the designed fallback. Surface the ceiling
distinctly from a transient failure so the §4.7 copy can say "we cannot make
this right now" rather than offering a retry that will not fire.

Worth pairing with an alert on `sample_render_count > 1` — above 1 always means
a user was charged twice for one artifact.

## Pick up when

With the §4.7 failure state, and before any retry affordance ships.

---

## Resolved — 2026-09-15

Fixed exactly as the fix shape above proposed, with `VOICE_SAMPLE_MAX_RENDERS`
(default 3, env-overridable) enforced *inside* the claim:

```
.in("sample_status", ["none", "failed"])
.lt("sample_render_count", VOICE_SAMPLE_MAX_RENDERS)
```

Beside the claim would have been advisory — two callers can both pass a
pre-check and then both spend. A fast-path check remains, but only to give the
common refusal a clear reason; the `.lt()` is the enforcement.

`render_cap_reached` is returned as its own result, distinct from `in_flight`,
so the §4.7 copy can say "we cannot make this right now" rather than offering a
retry that will never fire. Distinguishing them needs a re-read after a
zero-row claim, because a lost race and a full ceiling are identical from the
claim alone and mean opposite things to the caller.

Covered in `tests/unit/ensure-voice-sample.test.ts` (4 cases), mutation-checked:
removing the `.lt()`, flipping the fast path to `>`, and dropping the re-read
classification each fail a different test.

### The prediction in "Why it matters" was right, and early

This item said the hazard was "not currently reachable in production" and would
arrive "the moment §4.7 lands." It arrived sooner, from a direction not
considered here: making `GET /sample/play` render on demand — the fix for
existing profiles never getting a sample at all — turned *entering the ceremony*
into a render trigger. The sentence "the only other caller is a GET that never
renders" stopped being true, and the cap went in as part of that same change
rather than waiting for the retry affordance.

Worth keeping as the lesson: "not reachable yet" is a property of the current
call graph, not of the code, and it expires without notice.
