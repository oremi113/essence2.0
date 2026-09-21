# Open-PR inventory — nothing gets lost

**Snapshot:** 2026-09-21. 25 open PRs at the start of the sweep; the owner has
since opened #153–#155 on the retrofit track (see §0 — out of scope).
**Purpose:** an audited list of every open PR, what *unique* code it carries,
and whether that code is already on `main`. Nothing here gets closed without a
line in this table saying why it was safe to close.

Regenerate the raw list with:
```
gh pr list --limit 100 --json number,title,createdAt,files
```

---

## The headline

**Of the 25 beta-queue PRs, only 5 contain source code** (excluding the three
retrofit PRs in §0, which are the owner's). The other 20 are documentation.
So the surface where real work could be lost is small and fully enumerated
below — this is a much better position than "30 open PRs" suggested.

| Bucket | Count | Risk of losing work |
|---|---|---|
| Source-code PRs | 5 | **The real inventory. Every one audited below.** |
| Valuable docs (not triage) | 3 | Preserve deliberately — see §3 |
| Auto-generated `triage:` PRs | 17 | None. Doc-only ledger entries, all reconstructible |

---

## 0. OUT OF SCOPE — the Home A retrofit track

**Owner call, 2026-09-21: hands off.** These are the owner's parallel retrofit
work, on their own branches, to be rebased onto `main` by the owner when ready.
They are **not** part of the beta merge queue, they are **not** audited here,
and this session does not rebase, merge, comment on, or close them.

| PR | Branch |
|---|---|
| **#153** | `fix/voice-profile-selection` |
| **#154** | `chore/home-a-groundwork` |
| **#155** | `feat/home-a-retrofit` |

If the beta queue ever conflicts with these, the beta queue yields and the owner
resolves it on the retrofit side — that is the point of keeping the track
separate. See [[project_home_a_retrofit]].

---

## 1. Source-code PRs — audited one by one

Each was checked against `origin/main` today. "Still open on main" means the bug
is **real and unfixed** — the code in that PR is worth keeping.

| PR | Opened | Carries | Already on main? | Disposition |
|---|---|---|---|---|
| **#112** | 07-12 | **(a)** FU-93 wedge fix · **(b)** **FU-92 `retry_audio` cost cap** | (a) ✅ superseded by #132 · (b) ✅ **salvaged → PR #152** | ✅ **SALVAGED.** FU-92 half lifted into #152 (merging). **Close #112 once #152 lands.** |
| **#113** | 07-13 | FU-93 wedge fix (3rd duplicate) | ✅ fixed on main by #132 | ✅ **CLOSED 2026-09-21** with a note; `stage` logging idea preserved here. |
| **#118** | 07-20 | FU-89 — `useCheckout` doesn't guard `res.json()` / missing `checkoutUrl`, so the CTA can stick | ❌ follow-up still `status: open` | **KEEP → rebase + land.** Touches `src/lib/stripe/useCheckout.ts` only. No conflict with the others. |
| **#121** | 07-27 | FU-86 — teardown wipes audio *before* the row deletes | ❌ was still `open` | ✅ **MERGED 2026-09-21** (`f90d54d`). Union resolution with `main`'s ElevenLabs step — see §7. 484/484. |
| **#126** | 08-10 | FU-85 — teardown swallows the `subscriptions` read | ❌ was still `open` | ✅ **rebased + merging 2026-09-21.** Code applied cleanly (disjoint from #121). 486/486. |

### #121 and #126 both edit `src/app/app/settings/actions.ts` — but disjointly
Corrected after reading both diffs: **#126 touches step 1** (the `subscriptions`
read fail-closed guard) while **#121 reorders steps 2–5**. Disjoint regions, so
the code hunks should merge cleanly — #126's author noted this at the time.
Only `docs/REFACTORING_LOG.md` and the generated `INDEX.md` will collide, as
they do on every PR here.

Still land **#121 first** and rebase #126 onto the result — serial is required
by branch protection anyway, and it keeps the one file's history legible.

### The four-way duplicate, for the record
FU-93 attracted **four** independent PRs — #112 (07-12), #113 (07-13),
#129 (08-24), #132 (08-31) — because each fix sat unmerged long enough for the
next triage pass to re-find the bug as new. **#132 is merged; the bug is dead.**
#129 closed with a note; #113 to close; #112's FU-93 half is now redundant.

---

## 2. What is already fixed and just not marked

Housekeeping, not work. Found while auditing:

- **`2026-07-12-account-deletion-never-deletes-the-elevenlabs-voice-clone`** is
  `status: open`, but `main`'s teardown **does** delete the clone — it is step 2
  of `deleteAccountAction`, deliberately placed before any local data loss so a
  vendor failure aborts while the account is intact. **Stale-open: verify and
  mark resolved.** It is listed as a P2 and is inflating the backlog.
- **`2026-09-08-first-playback-beat-was-never-built`** is the ledger's only P1,
  but Step 5 First Playback shipped and closed on a real iPhone (2026-09-15,
  `66775b3`). **Also stale-open.**

Two P-level items that are already done. Worth a pass over the whole ledger for
more of these before treating the count as real.

---

## 3. Documentation PRs — preserve, don't bulk-close

Not triage noise. These carry thinking that isn't in the repo anywhere else:

| PR | Opened | What it is |
|---|---|---|
| **#78** | 06-30 | Step 9 Settings handoff + breath decision memo + FOLLOW_UPS #68/#69 |
| **#115** | 07-14 | **Canonical Pricing Architecture V3.0** |
| **#116** | 07-14 | ESSENCE company brief for preliminary conversations |

**#115 especially.** Pricing has already bitten once this cycle (the $119 vs
$119.99 mismatch, fixed in #144). A canonical pricing doc sitting unmerged for
ten weeks while the app's prices drift is exactly the failure mode. Land it or
fold it into `docs/`, but do not let it expire in a PR.

---

## 4. The 17 `triage:` PRs — safe to collapse

`114, 117, 119, 120, 122, 123, 124, 125, 127, 128, 130, 131, 141, 143, 147, 148, 150`

Doc-only. Each adds files under `docs/follow-ups/` and regenerates the
**generated** `INDEX.md` — which is why they collide with each other and with
every real PR, and why none of them has ever landed.

**No code is at risk in any of them**, but the *items* are worth keeping. Safe
procedure:

1. Collect the follow-up `.md` files from all 17 branches into one branch.
2. Run `npm run followups:build` once.
3. One commit, one merge.
4. Close the 17 with a comment pointing at that commit.

Then **pause the triage generator for the beta window** (§9 of `PLAN.md`) so it
stops out-running the merge queue.

---

## 5. Landed today (2026-09-21)

| PR | What |
|---|---|
| #149 | Storage buckets in version control |
| #151 | FU-87 — iOS Safari restore-portal dead-end |
| #132 | **FU-93 — failed generation no longer wedges creation.** The worst beta blocker. |
| #152 | **FU-92 — `retry_audio` vendor-spend cap** (blocker B3), salvaged from #112 |
| #121 | **FU-86 — teardown wipes recordings LAST** (blocker B4) |
| #126 | FU-85 — fail-closed on the delete-account subscriptions read |

Closed as duplicates, with explanations on the PR: **#129** and **#113** (dups
of #132), **#146** (dup of already-merged #144), **#112** (both halves landed via #132 + #152).

---

## 6. Standing rule

Before working *any* item from the follow-up ledger, check whether a PR already
fixes it and whether `main` already carries it. Four of the items audited today
turned out to be duplicate or already-landed work. The ledger describes bugs; it
does not know what is in flight.


---

## 7. The merged teardown order (for reference)

`deleteAccountAction` after #121, since this took a real merge rather than a
mechanical rebase:

| Step | What | Why there |
|---|---|---|
| 1 | Cancel Stripe subscription | A hard failure aborts before any data loss |
| 2 | Delete the ElevenLabs clone | Must run before the local `vendor_voice_id` is deleted, or the clone becomes unaddressable |
| 3 | FK-safe row deletes | A throw here still leaves recordings on disk, so the failure screen stays truthful |
| 4 | Delete the auth user | **Point of no return** |
| 5 | **Wipe storage LAST — best-effort** | Once the account is provably gone, a storage failure can't un-close it. Logged as orphans, never fatal — which is what stops "nothing was lost" appearing over a closed account. |

Steps 2 and 5 came from opposite sides of the conflict. Taking either side alone
would have lost one of them.
