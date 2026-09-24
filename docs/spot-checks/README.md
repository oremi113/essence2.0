# Spot checks — a human drives the fix before it counts as fixed

**Started 2026-09-24**, after a session in which three separate faults all
looked like working software:

- a feature that had **never worked in production** and looked like a slow load,
- a wait screen that said *"we'll have it ready soon"* about a generation that
  could never happen,
- a render that played the right voice with the delivery switched off.

Every one of those passed CI. Two of them passed a manual test plan — run
against a *local* stack, which is why the plans now state their environment.

A spot check is the missing step: **a short, numbered walk a human drives on the
real thing, where every step names what you should see and what it means if you
don't.** Not a test suite, not a QA sweep. Five minutes, in the environment the
users are in.

---

## The rule

A bug fix is **not done** when it type-checks, passes tests, and merges. It is
done when someone has watched the broken thing not be broken any more, in the
environment where it was broken.

Until then the honest words are *"shipped, not yet verified"* — and they should
be said out loud rather than rounded up to "fixed."

---

## What makes a spot check worth writing

**It provokes the real failure.** Confirming that the happy path still works
proves nothing about a fix to the *unhappy* path. If the fix is about what
happens when something breaks, the check has to break it.

**Step 0: prove the provocation provokes — before anyone opens the app.**
Learned the hard way on 2026-09-24. The check assumed that reducing an
ElevenLabs key's `Voices` scope to `Read` would block voice creation. It does
not: `POST /v1/voices/add` still returned 422 (validation), not 401. The whole
pass ran green, proved nothing about the fix, and cost a real clone and a real
render before anyone noticed the failure had never been induced.

A provocation is an assumption about someone else's system until it is
measured. Measure it with one cheap call first — an intentionally invalid body
fails *after* auth, so the status code reveals the permission without creating
anything. Only when that says `401` does a human open the app.

**Every step has an expected observation.** "Check the screen looks right" is
not a step. "You should see *'We're making sure it gets created'* — NOT *'we'll
have it ready soon'*" is a step, because it can fail.

**It says what a failure means.** A check that can fail without telling you what
the failure implies just moves the confusion later.

**It is honest about what it cannot prove.** Every check has a boundary. Naming
it is the difference between verified and assumed.

**It restores what it disturbed.** If it provokes a real failure on real data,
it ends by putting everything back, and says exactly what "back" means.

---

## Template

```markdown
# Spot check — <what is being verified>

**Date:** · **Environment:** production / local · **Time:** ~N minutes
**Verifies:** <the specific claim being tested>
**Why it needs a human:** <what automation cannot see here>

## Before you start
<state to set up, who does it, anything reversible being disturbed>

## Steps
| # | Do this | You should see | If you don't |
|---|---|---|---|

## Restore
<exact steps back to normal, and who does them>

## What this does NOT prove
<the boundary, stated plainly>
```

---

## Index

- [2026-09-24 — operator-failure honesty](2026-09-24-operator-failure-honesty.md)
  — FOLLOW_UPS #112: a vendor failure caused by *our* account must not lie to
  the user, must not spend their retry budget, and must reach the operator.
