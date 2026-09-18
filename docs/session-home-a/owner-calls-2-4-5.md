# Owner calls 2, 4, 5 — taken

**From:** `thread-02-non-happy-paths.md` §7
**Taken:** 2026-09-16
**Companion:** `owner-call-failed-register.md` (calls 0, 1, 3) — **call 4 revises
part of it; see §2.3.**

---

## Call 2 — banner at 130% text: collapse, or scroll?

### Neither. Scroll the content; pin the action block.

Both options as posed give something up that this screen cannot give up.

**Collapsing is worse than it looks.** The body is where Copy Guide §8's
pacing-of-consequence lives, and variant 3's body ends *"Your messages are safe
either way."* — the sentence the guide singles out: *"This sentence does the most
work in the whole product. Lead with it whenever loss anxiety is possible."*

Collapsing hides that sentence **specifically from large-text users** — who skew
older and lower-vision, i.e. the centre of the 45–70 audience — in the highest-
anxiety state the screen has. That is the wrong group to withhold reassurance
from. Rejected.

**Scrolling is also wrong, but only for one reason:** Home A's whole job is one
tap, and a CTA below the fold breaks that premise.

**So separate the two.** Make the scroll region everything from the top through
card 5, and keep the action block as a pinned footer:

- At default text nothing overflows, so the footer sits at the bottom exactly as
  it does today — no visual change at 100%.
- At 130% with a banner, the user scrolls to read the banner and the button has
  never moved.
- Full banner copy survives at every text size.
- It degrades in the right direction: the thing that must never be unreachable is
  the primary action.

**Implementation note:** the action block is already `margin-top: auto`. This is
a scroll container on the content region plus a non-shrinking footer, not a new
layout. Do not reach for `position: fixed`; the device frame is the containing
block.

**What still needs measuring:** the action block's own height at 130% (CTA +
card 7 + gear-reachable spacing). If *it* overflows, card 7 is the least
load-bearing line on the screen and is the one that gives — never the CTA, never
the banner body.

---

## Call 4 — quiet exit, or sign-out as the single exit?

### Neither. There is no exit affordance, because Home A is not a demand — and sign-out comes off the screen entirely.

**Part 1: no dismissal affordance.**

A "not now" control belongs on a screen that is asking for something and standing
in the way. `/app/record`'s EntryView has *"do later"* precisely because record is
a flow that traps you.

**Home A is where "later" lands.** Adding *"Maybe later"* to the resting state
manufactures a decision the user does not have to make — later than what? They
are already home. The exit from Home A is closing the app, and that is a
legitimate, complete ending that needs no button.

**The quiet exit already exists, and it is card 7:** *"Everything you've
recorded is kept. There's no rush."* That line is the permission to leave. It
does the job a dismissal button would do, without asking for a tap. Recorded as
the deliberate answer so §5.5's concern is closed, not re-raised.

**Part 2: sign-out comes off Home A.**

The framing "sign-out is the deliberate single exit" is what generated this
question, and it rests on something I should have checked earlier and didn't:

- **Home B has no sign-out.** Only the gear.
- **Sign-out lives in Settings** (`SettingsScreen.tsx:155`, `onSignOut`).
- Home A carries one *only* because the interim stopgap (`HomeAScreen.tsx`) had
  **no settings gear at all** — `src/app/home/page.tsx` passes
  `footer={<SignOutButton />}` on the Home A branch and nothing on Home B's.

It was a workaround for a missing gear. **The retrofit adds the gear, so the
reason for it is gone.** Keeping it would break the brief's central structural
principle — that Home A reads as the same room as Home B, one chapter earlier —
in order to duplicate a control that is one tap away.

**Remove card 8 from every register.** `HomeAScreenProps.footer` comes out of
the contract (`home-a-critique.md` Task B).

Secondary benefit: it resolves review 02 §B's cramped-spacing note by deleting
the thing that was cramped.

### 2.3 — this revises `owner-call-failed-register.md`

That document said *"keep the gear and sign-out"* on `failed`. **The gear call is
unchanged and remains settled** — a paid, permanently-out-of-retries user must
have a route to cancel, delete, and support, and the gear is it.

The sign-out half was belt-and-braces, and it loses to the Home B consistency
argument. The gear reaches Settings; Settings owns sign-out, cancel, and delete.
One tap, one home for account actions, no divergence from Home B.

The closing line of that doc — *"if anything sign-out should be more present
here"* — is withdrawn. **Gear on every register, sign-out on none.**

---

## Call 5 — can offline and past-due render together?

### No. One banner slot. Offline wins for its duration; past-due returns with connectivity.

Three reasons, and the second is the load-bearing one:

**1. Transience.** Offline is self-resolving and short; past-due persists for
days across a Stripe retry cycle. Suppressing the persistent thing for the
duration of the transient one loses nothing — it will still be there in a minute.

**2. Offline makes past-due's only action impossible.** `Update card` calls
`fetch('/api/stripe/portal-session')` (`RecordPageBannerWrapper.tsx:11`). Offline
that throws, is caught, and the button silently does nothing. Rendering it would
ship **a dead primary action to a user who cannot fix anything** — the exact
failure just ruled against in the `failed` register's sub-states 2 and 3. The
rule the two share: *when an action cannot work, the screen must not offer it as
though it can.*

**3. Layout.** Two stacked full-bleed banners is the 130% overflow with a bigger
number.

Note that reason 2 stands on its own **even after call 2 makes the layout
survivable**. That is deliberate: the call should not depend on the fix that
happens to make the symptom go away.

### Implication, not a new call

If the device is offline, the primary CTA cannot work either — `/app/record`'s
preamble and clip upload both need the network. The offline banner is therefore
the right owner of the CTA's unavailable state, rather than a second, separate
treatment. That is `thread-02` §5.3's work to design, not a call to take here,
but the two should not be built independently.

---

## Summary for §7

| # | call | answer |
|---|---|---|
| 2 | banner at 130% | Neither. Content scrolls, action block pins. Banner copy never collapses. |
| 4 | quiet exit | Neither. No dismissal affordance; card 7 is the quiet exit. **Sign-out removed from all registers.** |
| 5 | offline + past-due | Cannot co-occur. Offline suppresses past-due for its duration. |

No deferrals.

---

## Provenance (2026-09-18)

This file **never reached the design project.** The `uploads/` copy staged on
disk went into a downloaded snapshot, which does not sync upward.

Calls 2, 4 and 5 therefore reached `thread-02-non-happy-paths.md` by
transcription from chat, and its §7 records them that way with an instruction to
reconcile rather than assume agreement if this file later appears. The two sides
agree as of this date; the difference is only in how the text travelled.

Where the calls landed in thread 2:

| call | landed in |
|---|---|
| 2 — banner at 130% | §4 action-block row (pinned), §7 closed |
| 4 — quiet exit / sign-out | §4, §5.1 (split so the gear argument stands untouched), §5.5 closing as *neither*, §7 closed. Line 362's stale "yes, both" corrected in place, not deleted, so the change of answer stays visible. |
| 5 — offline + past-due | §5.3 with all three reasons and the standalone-reason-2 note; the shared rule written as a rule; offline owning the CTA's unavailable state; the gear surviving suppression. §2.1 gained the mailto-offline constraint. |

§7 closes five of five, no deferrals.

**Mechanical note for future drops:** `~/Downloads/<drop>/uploads/` is a
download, not a mount. Anything produced here has to be uploaded by the owner to
reach the architect. Do not assume a file copied there has been delivered.
