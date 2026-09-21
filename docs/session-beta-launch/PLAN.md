# Beta launch plan — closed beta, ~2 weeks

**Date:** 2026-09-21
**Shape:** invite-only, 5–15 hand-picked testers, URL-control (no allowlist)
**Money:** real Stripe, comped to $0 via `STRIPE_BETA_COUPON_ID`
**The question beta answers:** *does it hold up on a real phone?*

Not "will they pay," not "does it move them." Those are later betas. This one
asks whether a real person on their own hardware can walk the whole journey
without a dead-end, a 404, or a lost recording — and whether they can recover
on their own when something fails.

Everything below is sorted by that question. Items that don't serve it are
named and frozen, not silently dropped.

---

## 1. The exit bar

Beta is ready when **one tester, on their own phone, with no help from you**,
can do all of this — and when a failure anywhere in it leaves them somewhere
they can get out of:

1. Receive the invite, sign in with the 6-digit email code
2. Onboard, consent to voice creation, record the prompts
3. Reach real Stripe Checkout, enter a real card, be charged $0
4. Land back in the app with a subscription row written
5. Watch processing → Reveal → First Breath → hear their own voice
6. Create a message, hear it, save it
7. Reopen the app later and replay it from the Shelf

Plus two recovery properties, because "does it work on a real phone" includes
what happens when it doesn't:

- **No terminal states.** A failed generation, a cost-limit block, or a lost
  connection must never leave a tester permanently stuck in a way that needs
  you in the database.
- **No silent data loss.** Nothing tells a tester their recordings are safe
  when they aren't.

---

## 2. Why this has felt like whack-a-mole

It isn't focus. It's the merge queue. The evidence, as of today:

- **30 open PRs.** 18 are auto-generated `triage:` PRs stacking unmerged since
  **2026-07-14** — roughly one every three days, none landing.
- **The four oldest real fix PRs have all rotted to `CONFLICTING`**: #121
  (FU-86), #126 (FU-85), #129 and #132 (both FU-93).
- **#129 and #132 fix the same bug, written a week apart.** The first fix never
  landed, so the bug was re-found and re-fixed as if new. That is the loop,
  visible in the ledger.
- Meanwhile **FU-93 is still live on `main`** — verified today: no
  failed-pending release in `api/messages/generate/route.ts`.

So work is getting *done* and not getting *landed*. Any plan that only adds new
work makes this worse. Track A exists to stop the leak first.

---

## 3. Track A — clear the queue (do this first)

The highest-value engineering in the next two weeks is code that is **already
written and already paid for**. Land it.

### A1. Land the real fixes, oldest first

| PR | Fixes | State | Beta relevance |
|---|---|---|---|
| #132 | FU-93 — failed generation wedges creation forever | rebased, merging 2026-09-21 | **Blocker.** Chosen over #113/#129/#112. |
| #121 | FU-86 — teardown erases audio before the DB row | CONFLICTING | Blocker (data loss) |
| #151 | FU-87 — iOS Safari restore portal | ✅ **MERGED 2026-09-21** | — |
| #149 | Storage buckets in version control | ✅ **MERGED 2026-09-21** | — |
| #146 | Annual price is $119.99 | ⛔ **DUPLICATE — close it** | Already on main as **#144** (`eafa50a`). No unique content. |
| #126 | FU-85 — closed account keeps billing | CONFLICTING | Not a beta blocker ($0 comp), but land it while you're here |
| #113 | FU-93 — *third* duplicate fix | OPEN | ⛔ Close once #132 lands |
| #112 | FU-93 (4th dup) **+ FU-92 retry_audio cost cap** | OPEN | **Salvage the FU-92 half — it is blocker B3, already written.** Drop its FU-93 half. |

Order matters: land the three `MERGEABLE` ones first (they're free), then
rebase the conflicting ones one at a time. Per `project_build_status`, main is
strict + required `ci` + rebase-merge only, so merges are serial by
construction.

**Close the duplicate.** #129 and #132 must not both land. Read both, keep the
better one, close the other with a note pointing at the survivor.

### A2. Collapse the triage backlog

18 doc-only `triage:` PRs that collide with each other. They are not work; they
are a ledger of work. Options, in order of preference:

1. **Pause the triage generator for the beta window**, close all 18, and run
   one consolidated triage commit that folds their items into
   `docs/follow-ups/`. The queue then shows only real work.
2. Land them oldest-first in one sitting (doc-only, low risk, but ~18 serial
   rebases).

Either way, the PR list should read as *"here is what's in flight"* — not as a
wall that hides the six fixes that matter.

---

## 4. Track B — the beta blockers

Short by design. Each one is here because it breaks the exit bar in §1.

| # | Blocker | Evidence | Why it blocks |
|---|---|---|---|
| B1 | **Failed generation wedges creation permanently** | FU-93; not on `main`; fix sits in #129/#132 | One failed generation and that tester can never create another message. Unrecoverable without DB access. The single worst beta outcome. |
| B2 | **Cost-limit 429 renders as "Something slipped / Try again"** | `2026-09-04-cost-limit-block-renders-as-a-transient-failure.md` | A permanent wall dressed as a transient blip. The tester retries forever. Needs honest copy + a way out. |
| B3 | **`retry_audio` renders paid audio with no cost cap** — ⚠️ **ALREADY WRITTEN in PR #112** (2026-07-12, unmerged 10 weeks). Salvage, don't rebuild. | Verified: `api/messages/regenerate/route.ts` calls `generateAndStoreAudio` with no gate, hourly limit, or ledger | Your ElevenLabs bill, unbounded, driven by a retry path. 15 testers bounds it by luck, not by design. |
| B4 | **Teardown erases audio before the DB/auth delete** | FU-86, PR #121 | A mid-teardown failure destroys recordings under a "Nothing was lost" screen. Direct violation of the product's one promise. |
| B5 | **Phantom scroll on full-height screens** | ⚠️ **SCOPE CORRECTED 2026-09-21 — 2 files, not ~15.** Only `.app-main` children have the 40px padding, and `AppShell` wraps **only** `/app/*`, `/home`, `/onboarding`. | Real, but small: `SettingsScreen.css.ts` and `HomeBScreen.css.ts`. |
| B6 | **No top safe-area inset on `/app` pages without TabNav** | `2026-07-12-app-main-missing-safe-area-inset.md`; only 3 `safe-area-inset-top` uses in the whole app | Content under the notch on real iPhones. Same category as B5. |
| B9 | **Open redirect on every `next`/`returnPath` site** — 4 sites, 4 different levels of rigour, 2 with no check at all | ✅ **FIXED — PR #157** (`safeNextPath`, 497/497) | Every beta tester signs in through this path. Surfaced only because the triage backlog was collapsed; had been filed 3× and never landed. |
| B7 | **`VOICE_CONSENT_REQUIRED` is off** | Wired and inert in `feature-flags.ts`; the invite checklist already demands it | One env flip. Already coded. No excuse to ship without it. |

**B8 was cut by owner call, 2026-09-21.** The proposed item was fixing the
onboarding copy that claims "end-to-end encryption" / "not even our team can
access" while audio is stored plaintext
(`2026-07-12-privacy-copy-claims-e2e-encryption-but-audio-is-plaintext.md`).
Recorded here rather than deleted so the decision is legible later: the claim
ships as-is to the closed beta. It remains open in the ledger and should be
settled before any beta wider than hand-picked invitees.

---

## 5. Track C — the launch gate (owner, on prod)

From `docs/legal/BETA_INVITE_EMAIL.md`, expanded into something checkable.

### C1. Production environment matrix

| Variable | Value | Consequence if wrong |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | the prod https URL | Testers redirected to localhost after paying |
| `VAULT_STRIPE_ENABLED` | `true` | Otherwise the mock path runs and the money path stays unexercised |
| `STRIPE_BETA_COUPON_ID` | `ESSENCE_BETA_100` | Missing coupon id = checkout fails outright. **Unset before ever charging real money.** |
| `STRIPE_SECRET_KEY` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `sk_test_…` / `pk_test_…`, same account | Mode mismatch = checkout fails |
| `STRIPE_PRICE_ID_VAULT_MONTHLY` / `_ANNUAL` | test-mode ids, same mode as keys | " |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the prod endpoint | Without it every lifecycle event after the first is silently dropped |
| `VOICE_CONSENT_REQUIRED` | `true` | B7 |
| `VOICE_CREATION_REQUIRES_PAYMENT` | off | Beta is free |
| `DEFERRED_AUDIO_ENABLED` | **absent** | Setting it to `"false"` re-breaks message creation (the Sept 4 blocker) |

Confirm `ESSENCE_BETA_100` exists in whichever Stripe account prod points at.

### C1a. ⚠️ The beta coupon has no live-mode guard

Verified on `main` 2026-09-21: `create-checkout-session.ts` carries a comment
reading *"UNSET THIS BEFORE CHARGING REAL MONEY. Leaving it set in a live-mode
environment comps every subscriber, forever."* — and **no code enforcing it**.
The coupon is applied whenever the env var is set, regardless of whether the
Stripe key is `sk_live_`.

A comment is not a guard. This is not a beta blocker (the beta is comped on
purpose) but it is a **launch landmine**: one stale env var at cutover silently
comps every real subscriber $0 forever, and nothing in the system would say so.

**Fix shape:** refuse to attach the coupon when the secret key starts with
`sk_live_`, or fail the build/boot on that combination. Cheap, and it converts
an invisible failure into a loud one.

### C2. Webhook
Stripe Dashboard (test mode) → Developers → Webhooks → add
`https://<prod-url>/api/stripe/webhook`, copy the signing secret into
`STRIPE_WEBHOOK_SECRET`.

### C3. Sign-in, proven on prod
Per `project_auth_signin`, sign-in is a 6-digit email code (`verifyOtp`), not a
magic link. Confirm the Supabase Magic Link template contains `{{ .Token }}`,
then actually sign in on a real phone from a real email. Not locally.

### C4. Backups
`node scripts/backup-snapshot.mjs` before the first invite, then on a schedule
for the beta window. Supabase Storage — the actual voice audio — is **not**
covered by the Pro DB backups. This is a mitigation, not a fix (see §7).

### C5. The physical-feel pass
Walk the full §1 exit bar on a **real iPhone** and a **real mid-range Android**.
This is the irreducible one — no agent, no emulator, no throttle setting
substitutes. It is also literally the question this beta exists to answer, so
it gets done *before* the invites, not after.

### C6. Deploy
Per `project_vercel_deploy`: auto-deploy from main is broken (Git reconnect
needed), and the manual deploy hook dedups unchanged commits — an env-var-only
change needs a new commit to take. Budget for this; it has bitten before.

---

## 6. Explicitly frozen

These are real, they are filed, and they are **not** in the next two weeks.
Naming them is the point — an unnamed backlog competes for attention forever.

**Not frozen: the Home A retrofit.** Owner call, 2026-09-21 — it continues on
its own branch and rebases onto `main` later. It is a parallel track, not part
of the beta gate: nothing in §1 or §4 waits on it, and it does not enter the
merge queue until the blockers are through. The one thing to watch is §9 rule 2
— Home A plus the beta track is already two branches, so a third is the point
where #129/#132 happens again.

- **Home A retrofit** — mid-flight on `feat/home-a-retrofit` right now, with
  deleted files staged. Either land what's coherent or stash the branch, but it
  does not continue during the beta window.
- Record-screen animation at 42fps @4× throttle
- First Breath ceremony canvas at 30fps @4×
- Breath Stone state-grid indistinguishability
- Dark-stage tokens with no consumers
- Back-chevron consolidation (5 definitions)
- Legacy `FOLLOW_UPS.md` monolith migration
- Every remaining P3/P4 not listed in §4

---

## 7. Mitigate, don't fix

Known gaps that get a *named mitigation* instead of engineering time, because
5–15 known people changes the math:

| Gap | Mitigation |
|---|---|
| Supabase Storage isn't backed up | Scheduled `backup-snapshot.mjs` + the invite already says "it may lose data." Honest, and true. |
| Account deletion never deletes the ElevenLabs clone | 5–15 named people. Delete by hand, keep a log. Fix before any open beta. |
| Pending-generation rows have no sweeper | Entry-point reclaim is enough at this volume. |
| FU-85 (closed account keeps billing) | Comped to $0 — nothing to bill. Land #126 anyway, but it isn't a gate. |
| No self-serve support surface | You're hand-holding fifteen people. `help@essencevault.app` + a personal reply is the support surface. |

---

## 8. Sequence

Owner availability is bursty, so this is ordered, not calendared.

**Phase 1 — stop the leak (Track A).**
Land #149, #146, #151. Resolve the #129/#132 duplicate and land one. Rebase and
land #121. Collapse or pause the 18 triage PRs. *Exit: the PR list shows only
live work, and FU-93 is dead on main.*

**Phase 2 — the blockers (Track B).**
B2, B3, B5, B6, B8 — the ones without an existing PR. B5 is the largest (33
call sites) and the most directly on-question. *Exit: §4 is empty.*

**Phase 3 — prove it (Track C).**
Env matrix, webhook, prod sign-in, backup, deploy. Then the real-device walk on
iPhone + Android against the §1 exit bar, written up as a pass/fail table like
`session-step5-first-playback/MANUAL_TEST_PLAN.md`. *Exit: every row passes on
real hardware.*

**Phase 4 — invite.**
Send `BETA_INVITE_EMAIL.md` individually. Keep the link off public channels.

---

## 9. Keeping it from re-rotting

The two-week plan is worthless if the queue refills. Three rules for the beta
window:

1. **A fix isn't done when it's written. It's done when it's on `main`.**
   No new fix branch opens while a finished one sits unmerged.
2. **One branch at a time.** Three parallel feature branches is how #129 and
   #132 both came to exist.
3. **Triage generation pauses during the window.** The ledger can catch up
   after the invites go out; it cannot compete with them.

---

## 10. Run log

**2026-09-21**
- Plan written.
- Owner calls: Home A retrofit **not** frozen (own branch, rebase later); **B8 cut**.
- **#149 merged** (storage buckets in version control). First item off the queue.
- **#151** — conflicted with #149 on the generated `docs/follow-ups/INDEX.md`
  (the known collision cascade). Resolved by merging `origin/main` into the
  branch and regenerating the index with `npm run followups:build` — a merge,
  not a rebase, so no force-push was needed. Awaiting `ci`.
- **#151 merged.** Rebase-merge is enforced by `required_linear_history: true`
  on `main` — the repo-level `allow_merge_commit: true` is misleading. Only
  `ci` is a required context; `types-drift` is informational.
- Three merge-queue traps hit and recorded in memory (`project_merge_queue`):
  `update-branch` creates a merge commit that breaks rebase-merge; a force-push
  leaves a stale green `ci` so you must gate on `mergeStateStatus == CLEAN`;
  and `--delete-branch` fails (non-zero exit) while a scratch worktree holds
  the branch even though the merge itself succeeded.
- **FU-93 recommendation: keep #132, close #129** — #132 folds the
  `text_status: "failed"` mark into the same write as the retire, so the common
  failure branch is one atomic write instead of two. Awaiting owner go-ahead
  before closing #129.
- **#146 is a duplicate of already-merged #144** (`eafa50a`). The rebase
  skipped its only commit as "previously applied" (patch-id match), and main
  already carries $119.99 in `src/lib/vault.ts`, the ToS draft, and
  `src/content/legal/generated.ts`. Nothing lost; the branch was restored to
  its original head so the closed PR still reads. **Close, don't merge.**
- **That is the second duplicate found today.** #129/#132 are two fixes for
  FU-93; #146 duplicates #144. **Two of the six "real fix" PRs were redundant** —
  the queue isn't merely slow, it is *manufacturing repeat work*, because a
  fix that never lands looks exactly like a bug that was never fixed. Track A's
  real remainder is three items, not six: FU-93 (#132), FU-86 (#121),
  FU-85 (#126).
- **FU-93 re-verified as genuinely open on main** after the #146 surprise: no
  `retireFailedGeneration`/`discardFailedGeneration` helper exists, the only
  `superseded_at` write in the generate route is the edit-note lineage one, and
  the follow-up file is still `status: open`.
- **FU-93 turned out to have FOUR PRs**: #112 (2026-07-12), #113 (07-13),
  #129 (08-24), #132 (08-31) — three written independently, each re-discovering
  the same wedge because the previous fix never landed. #129 closed, #132
  rebased and merging, #113 to close, #112 to salvage.
- **Blocker B3 is already written.** PR #112's second half fixes FU-92: no-ops
  a succeeded render, gates on `countGenerationsThisHour >= maxGenerationsPerHour`,
  and ledgers a `started` usage event. Unbounded → bounded. It has sat unmerged
  since 2026-07-12. **Salvage the FU-92 half onto main and drop its now-redundant
  FU-93 half** (the "salvage the delta, don't force the conflict" pattern).
- Running duplicate tally: **#146**=dup of merged #144; **#129/#113/#112**=dups
  of #132. Of the original six "real fix" PRs plus the two found since, **four
  were redundant work**. This is the cost of a stalled queue, measured.
- **#132 MERGED — FU-93 is dead on `main`** (`97421c1`). The worst beta
  blocker is gone. 477/477 tests.
- **#113 closed** (third FU-93 duplicate).
- **Blocker B3 shipped as PR #152** — the FU-92 `retry_audio` cost cap,
  salvaged out of #112 rather than rebasing a now-half-redundant branch.
  480/480 tests, typecheck clean. Close #112 when #152 lands.
- **`PR_INVENTORY.md` written** — every open PR audited against `main`, so
  nothing can be closed without a recorded reason. Headline: of 25 open PRs
  only **5 carry source code**; 17 are doc-only triage, 3 are valuable docs.
- Two **stale-open** ledger items found (already fixed, never marked): the
  ElevenLabs clone deletion (main's teardown step 2 does it) and the P1 First
  Playback build (shipped 2026-09-15). The open count is inflated.
- **Collapsed the triage backlog (PR #156).** Seventeen `triage:` PRs had been
  stacking since 2026-07-14, none landing, because each regenerates the
  *generated* `INDEX.md` and so collides with every other PR. Restored the 15
  per-file branches into one commit: **76 follow-ups that had never reached
  `main`.** Ledger 47 → 123 items, 33 → 108 open.
- **The backlog everyone was reading was missing two-thirds of what triage had
  found — including 13 unseen P2s.** Two verified against `main` on the spot:
  the **auth open redirect** (now blocker **B9**) and the **beta coupon having
  no live-mode guard** (now §C1a). A third ("no legal pages exist") was stale.
- Still unverified but restored and worth triaging next: a failed clip upload
  dead-ending the record ceremony; voice-creation's 3-min staleness threshold
  being shorter than the route's own 5-min budget (orphans a paid clone);
  Stripe `incomplete` → terminal `lapsed` stranding a paying subscriber; and
  the daily cost cap counting an action key nothing writes, so the 20/day
  vendor backstop never trips.
- **All five source-code PRs in the beta queue are now merged** (#132, #152,
  #121, #126, #118). Track A's code work is done.
- **B9 fixed (PR #157) — and it was bigger than the triage note said.** The
  note named the auth callback; a sweep found **four** sites taking an
  attacker-controlled destination, at four different levels of rigour:
  `auth/callback` (`startsWith("/")`), `auth/sign-in` ×2 (**no check at all**),
  and `api/stripe/portal-session` (`startsWith("/") && !startsWith("//")`,
  bypassed by the backslash form). One shared `safeNextPath()` now guards all
  four. Resolves 4 follow-ups; ledger 108 → 104 open.
- The `next` bug had been **filed three times** (08-28, 09-04, 09-11) because
  none of those triage PRs landed — the same duplication engine that produced
  four PRs for FU-93. The fix landed once the ledger could be seen.
- **B5 scope CORRECTED — and my earlier estimate was wrong.** I first counted
  raw `100dvh` occurrences (~15 "live screens") without checking which are
  actually inside the shell. The 40px padding belongs to `.app-main`, and
  `AppShell` wraps **only** `/app/*`, `/home` and `/onboarding`. `/messages/*`
  has no layout, so its 8 screens render under the root layout with no padding
  — their `100dvh` is correct. Same for the legal pages, sign-in,
  `loading.tsx`, `global-error.tsx` and `SystemScreen` (root `error.tsx` /
  `not-found.tsx` render outside `AppShell`).

  **True B5 scope: 2 files** — `SettingsScreen.css.ts` and `HomeBScreen.css.ts`.
  Excluded deliberately: `.app-shell` itself (the container, not a child);
  `.onboarding-wrapper` (documented `flex: 1` floor); `HomeAScreen.tsx`
  (retrofit track, §0). `vault-screen` and `FirstPlaybackScreen` already carry
  the fix and are the reference pattern.
