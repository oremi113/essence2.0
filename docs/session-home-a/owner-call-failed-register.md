# Owner call — does the `failed` register keep the settings gear and sign-out?

**Asked in:** `thread-02-non-happy-paths.md` §5.1
**Call: keep the GEAR. It is not decoration on this screen, it is the exit.**
*(Originally "keep both" — the sign-out half was revised on 2026-09-16 by
`owner-calls-2-4-5.md` §4. The gear call stands unchanged.)*
**Taken:** 2026-09-16. Not overrulable on taste grounds; see §3.

---

## 1. Three facts that decide it

**A `failed` user has already paid.** Voice creation only runs after Card
Capture (MASTER_SPEC §4.4; `/app/voice/processing` guards on subscription before
triggering `/start`). There is no unpaid path into this register.

**Retry is capped, and the cap is permanent.**
`src/lib/voice-training/backoff.ts`:

```
VOICE_PROFILE_MAX_ATTEMPTS = 3
VOICE_PROFILE_BACKOFF_MS   = [0, 5min, 30min, 2h]
```

`isVoiceProfileRetryAllowed()` returns `false` forever once
`attempt_count >= 3`. The start route then answers **429
`retry_available: false`** (`api/voice-profiles/[id]/start/route.ts:104-110`).

**Settings is the only route to cancelling or deleting.** `onCancelSubscription`
and `onDeleteAccount` live on the settings screen. Home A is the only screen a
broken account reliably lands on.

## 2. The state those facts produce

A user who has been charged, whose voice failed three times, on a screen whose
only button now returns 429. Remove the gear and sign-out and that user has
**zero available actions**, permanently, on the only screen they can reach.

They cannot retry. They cannot cancel. They cannot delete their account. They
cannot sign out. They have paid for a product that does not work and the
interface offers them nothing.

## 3. Why this isn't a design trade-off

Cancellation and deletion are the two controls behind that gear. Making them
unreachable specifically for users whose paid product has failed is not a
minimalism call — it is the wrong answer on consumer-protection grounds, and it
sits badly against the DSAR runbook and the ESSENCE APP LLC legal work already
shipped (`project_legal_implementation`).

Copy Guide §8 requires failure copy to "offer one easy next step." When the
primary step is exhausted, a next step must still exist. The gear *is* that step.

**Keep the gear.**

> **Revised 2026-09-16 by `owner-calls-2-4-5.md` §4.** This section originally
> read "Keep the gear. Keep sign-out." The **gear call is unchanged and
> settled**. The sign-out half is withdrawn: Home B has no sign-out, Settings
> owns it (`SettingsScreen.tsx:155`), and Home A only carried one because the
> interim stopgap had no gear at all. The retrofit adds the gear, so the reason
> is gone. **Gear on every register, sign-out on none.**

---

## 4. The larger thing this exposes

§5.1 asks whether `failed` is one register or two. Both framings are wrong.

**It is one register with three sub-states, and the CTA is currently a lie in
two of them.**

| # | condition | `Try again` does | screen must offer |
|---|---|---|---|
| 1 | `retry_available: true` | works | Try again |
| 2 | `failed`, inside the backoff window (5min / 30min / 2h) | **429** | when to come back, not a dead button |
| 3 | `attempt_count >= 3` | **429, permanently** | a human |

Sub-state 3 is reachable, terminal, and belongs to a paying customer. It needs a
route to a person — and this codebase already has the pattern:
`src/app/messages/new/MessagesNewPageClient.tsx:53`, *"mailto so a stuck user
reaches a human without leaving the app."* The address in the shipped legal
content is `help@essencevault.app` (note FOLLOW_UPS #75 on the placeholder).

The status GET route already returns `retry_available`
(`api/voice-profiles/[id]/route.ts:46`), so the screen can branch on it without
new backend work.

**This is scope growth on the `failed` register — flagging rather than absorbing
it.** It is small (one boolean and one fallback), and the alternative is shipping
a button that lies to a paying customer.

---

## 5. Two sub-calls from the same §5.1

**Remove the stone on `failed` — agreed.** The architect's reasoning holds, and
there's a second reason they didn't have: FOLLOW_UPS #35 records that the canvas
`BreathStone` renders **pale-taupe on light grounds** and the owner has already
agreed it reads "quite dull." A dull grey disc above an apology is the weakest
rendering of the stone in its worst possible context. It goes.

**"What clip count does `failed` render at?" — the premise dissolves.** Creation
requires payment and all 25 clips, so `failed` is always a *build* failure at 25,
never a recording failure. Consequences:

- `Try again` has exactly one meaning: **retry the build**. It never means resume
  recording, and §2's "the only correct verb is re-enter" genuinely does not
  bind this register — the architect was right about that.
- It should route to `/app/voice/processing`, which already owns the `/start`
  trigger and the poll. Home A does not call `/start` itself. Same principle as
  `home-a-critique.md` §2.1: the home states one rule and doesn't restate logic
  it would have to keep in sync.
- *"Every clip you've recorded is kept."* is true and load-bearing at 25. Keep
  it. The worry about it reading vacuous at 0 clips dissolves with the premise.
- Any other status/clip combination reaching this register is a **bug to guard,
  not a state to design for** — and see FOLLOW_UPS #105, which is exactly how a
  wrong-row read could manufacture one.
