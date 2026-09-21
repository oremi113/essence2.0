# Home A — critique of the external proposal, and the build brief

**Status:** brief. Ready to hand to the design architect.
**Decision taken (2026-09-16):** the external proposal is **not adopted**.
Home A is built by **retrofitting the in-repo `Strata` direction** to the
structure in Part 2. `Threshold` is deleted.

Sits alongside `design-directions.md` (which this supersedes on the "pick one"
question) and `design-handoff.md` (which still governs palette, type, shell, and
the stone — unchanged).

**What's critiqued:** `Essence Home A Design Proposal.html` — three Turn-1
directions (1a "The room warms", 1b "The next question, already open", 1c "The
reward, held in view") plus a Turn-2 revision (2a "Thirteen to go").

The proposal was made without the rest of the journey in view. Its instincts
about *pacing* are good and two of its ideas survive. Its model of *what this
screen is* is wrong, and most of its specific content is invented rather than
drawn from the shipped script.

> **Copy in this document is placeholder.** Every quoted line below —
> "Your voice is half gathered", "Five more and the longest stretch is done" —
> is an illustration of *shape*, not approved copy. Real copy is a named task
> (Part 3, task C).

---

## Part 1 — the critique

---

## The journey Home A actually sits in

Traced from source, not memory:

```
/onboarding
   ↓ (profile.onboarding_completed_at)
/home  ── voiceProfile.status !== 'ready' ──▶  HOME A        ← this screen
   │
   ▼
/app/record            RecordScreen state machine (RecordScreen.reducer.ts):
                       entry → grounding → mic-permission → checklist →
                       environment → stage-intro → prompt ⇄ celebration → paused
                       Resume point = deriveInitialView(clipsRecorded)
   ↓ 25 clips in, ReadyView
/app/vault/protect     Card Capture — the paywall
   ↓
/app/voice/processing  Voice creation is triggered HERE, after payment
                       (MASTER_SPEC §4.4). Polls, then hands off.
   ↓
/app/vault/reveal  →  First Breath  →  /messages/new  →  /home (HOME B)
```

Two facts from that trace do most of the damage to the proposal:

1. **Recording has a five-screen preamble** (grounding, mic permission,
   checklist, environment) before a single prompt appears.
2. **Processing happens after payment and has its own dedicated screen.**

---

## What's wrong

### 1. It builds a second recording flow on the home screen

2a and 1b put the next prompt card, a "Record this clip" button, and "Choose a
different question" directly on Home A. That is `/app/record`'s job, and the
record flow gates it deliberately: mic permission, a room/environment check, and
a grounding beat all sit between "I want to continue" and "a prompt is on
screen."

So the prompt-on-home card is one of two things, both bad:

- it genuinely records from home → it has skipped the mic and room gates, and
  the clips get worse or fail outright; or
- it's a picture of a record button that actually deep-links into a five-screen
  preamble → the screen lied about its cost.

**Home A's only correct verb is *re-enter*.** It is a door, not a booth.

### 2. The prompts are scripts to read, not questions to answer

The proposal's prompt text is *"Tell me about the house you grew up in. Start
with what it sounded like."* The real prompt at that position
(`src/lib/voice-training/script.ts`) is a written paragraph the user reads
aloud — *"You know what I secretly love? A big thunderstorm. When the sky goes
dark in the middle of the afternoon…"*

That is a different product. Everything the proposal builds on the
interview framing — the open question as hero, "About a minute of speaking",
and especially **"Choose a different question"** — doesn't map. The 25 are a
fixed, ordered sequence; `deriveInitialView()` resumes by *index*. Letting a
user pick a different one breaks resume.

### 3. Half the design is a state the user shouldn't be standing in

Every direction is built as a two-state toggle: mid-recording / processing. But
voice creation only starts after Card Capture, and the wait has a real screen at
`/app/voice/processing` that polls the profile and hands off to the Reveal.

Home A only ever shows `processing` if someone wanders to `/home` while the
build runs — a recovery case. Designing it as a co-equal half spends half the
design budget on an edge case *and* strands the user outside the poll/handoff
that gets them to First Breath.

**The fix is routing, not pixels:** `processing`/`queued` at `/home` should
redirect to `/app/voice/processing`.

### 4. "Write your first message" is a dead link

`src/app/messages/new/page.tsx` redirects to `/app/voice/create` unless the
voice profile is `ready`. Both processing panels lead with that CTA. It bounces.

### 5. "Hear the clips you've kept" gives away the payoff — and there's nothing to hear

There is no training-clip playback surface (only `/api/training-clips/list`).
Building one would be wrong twice over:

- A training clip is the user reading a scripted paragraph about a thunderstorm.
  It is raw material, not a keepsake. Framing it as saved work ("Clips you've
  kept", "A room you remember · Tuesday · 1 min 8 sec") sells the wrong object.
- Hearing your own voice back is **First Breath** — the ceremony after payment.
  Home A must not pre-empt it.

Same objection kills 1c's dimmed player ("The reward, held in view"). It
promises the payoff on the free side of the paywall.

### 6. The three-stage grouping is the right instinct with fabricated numbers

Proposal: **Warmup 8 · Depth 9 · Range 8**.
Shipped script: **5 · 12 · 8**, and a `StageMap` component already renders them
with the labels **Everyday · Emotional · Personal**
(`RecordScreen.tsx:31`), plus the script's own titles ("Quick Start — Let's Meet
Your Voice", "Build Emotion — Capture Your Range", "Final Touch — Complete Your
Voice").

Keep the chunking — it's the best idea in the proposal. But if Home A says
"Depth 4 of 9" and the record flow says stage 2 of "Emotional", they are two
apps.

Note what the real numbers expose: **stage 2 is 12 prompts long.** That's the
actual pacing problem, and the proposal's "errand for today" is reaching for it.
The app already has the answer — celebration beats fire after prompts **1, 5,
12, 17, 25**. Those are its natural resting points, and they're content that
already exists. Point at the next one instead of inventing a two-clip errand.

### 7. The background ramp is invisible in production

Already flagged by the owner as duplicating onboarding. It's also structurally
broken here: Home A is seen maybe three to five times, days apart. A ramp that
reads *across visits* never shows the user two temperatures at once — it only
works on a design canvas where both phones sit side by side.

It also fights Home B. If Home A is honey at 24/25 and Home B is cream, arriving
at Home B reads as a step backwards.

### 8. Smaller things

- **Three names for one screen** across three directions: "VOICE TRAINING",
  "Voice training", "Your voice". Home B's topbar carries no title at all, just
  a settings gear.
- **"About fourteen minutes of speaking left"** — the script's stages are
  3-4 / 5-6 / 3-4 minutes across 5 / 12 / 8 prompts, so clips are wildly uneven
  in length. Any remaining-time figure from clips × average will be wrong.
- **"Thirteen to go" / "None to go"** — the app counts *up* and names a
  condition: "You're halfway there", "That's the longest stretch done. Eight
  shorter prompts ahead." A countdown headline is a register this product
  doesn't use.

### 9. What's missing entirely

- **Zero clips.** Someone who finished onboarding and tapped "do this later" at
  the record entry has 0 clips. All four screens assume 12/25.
- **25 clips, unpaid.** Finish the 25, close the tab, reopen at `/home` →
  today's Home A says "pick up where you left off" with nothing left to record.
  A dead end. The next beat is Card Capture.
- **`failed`.** A real enum value (`voice_profile_status`). Today it renders
  "Your voice is on its way," which is false.
- **`past_due`.** `/app/record` renders a Stripe-retry banner for these users;
  `/home` is the one door that doesn't.
- **Sign-out.** Carried by the interim `HomeAScreen.tsx`, dropped by all four
  proposal screens.

---

---

## Part 2 — the structure to build

### 2.1 — resolve states at the route layer, not in the design

`src/app/home/page.tsx` sends everything that isn't `ready` into one component.
Split it there and Home A collapses from "two states × three directions" to
**one screen with three registers, only one of which is common.**

| voice status | clips | `/home` does |
|---|---|---|
| `created` / `collecting` | 0 | Home A — **not started** |
| `created` / `collecting` | 1–24 | Home A — **paused** ← the screen worth designing |
| `created` / `collecting` | 25 | redirect → `/app/voice/processing` |
| `processing` / `queued` | — | redirect → `/app/voice/processing` |
| `failed` | — | Home A — **something went wrong**, one retry CTA |
| `ready` | — | Home B (already) |

**Why both redirects point at `/app/voice/processing` and not at Card Capture.**
An earlier draft of this memo sent "25 clips, unpaid" to `/app/vault/protect`.
That is a **redirect loop**: `protect/page.tsx:30` bounces any `trial` / `active`
/ `past_due` user straight back to `/home`, and such a user *can* sit at 25 clips
with a `collecting` profile (`/app/record` renders a past-due banner precisely
because those users appear mid-training). `/home` → `protect` → `/home` → …

`/app/voice/processing` is the correct single target because its guard already
fans out correctly and never returns to `/home`:

| subscription | processing page does |
|---|---|
| `none` | → `/app/vault/protect` (they genuinely need to pay) |
| `lapsed` / `cancelled` | → `/app/vault/restore` |
| `trial` / `active` / `past_due` | renders `ProcessingActions`, which triggers `/start` |
| (voice already `ready`) | → `/app/vault/reveal` |

So the home page states one rule — *"nothing left to record → hand off to the
build"* — and does not restate paywall logic it would then have to keep in sync.

### 2.2 — one blocking prerequisite (a real defect, not a design gap)

**`getOrCreateVoiceProfile()` selects the wrong row, and `/home` is its worst
caller.** `src/lib/profile/voice.ts:34-39`:

```ts
.from("voice_profiles").select("*").eq("user_id", user.id).limit(1).maybeSingle()
```

No `.neq("status", "archived")`. No `.order("created_at", …)`. Compare the
record page (`src/app/app/record/page.tsx:47-51`), which has both.

Two consequences, and the state table above is unbuildable until they're fixed:

1. **An archived profile is returned as live.** `/home` then renders Home A
   saying *"Your voice is on its way"* for a voice that was thrown away. The
   `failed` register in the table has the same root cause — today both
   `archived` and `failed` fall into Home A's `else` branch and get the
   collecting copy.
2. **`/home` and `/app/record` can disagree about which profile the user is
   on.** With no `ORDER BY`, Postgres returns an arbitrary row; record
   deterministically takes the newest non-archived. For any user with more than
   one profile (`/app/record?new=1` creates them) the home screen's status,
   clip count, and stage band can describe a different profile than the one the
   CTA resumes into. `/app/voice/processing:68` uses the same helper, so the
   redirect target inherits the bug.

**Fix shape:** add the two clauses to `getOrCreateVoiceProfile` so it mirrors
the record page's selection, and have it create a fresh profile when the only
rows are archived. Filed as FOLLOW_UPS #105. **Do this before the Home A
retrofit**, or the retrofit gets built against a status value that isn't the
user's real one.

### 2.3 — cards, top to bottom

The order deliberately rhymes with Home B's spine (topbar → stone → status →
CTA → list → tertiary) so arriving at Home B later reads as *the same room, one
chapter on*.

| # | Card | Content | Shown when |
|---|---|---|---|
| 0 | **Past-due banner** | Reuse `RecordPageBannerWrapper` | `subscription.status === 'past_due'` |
| 1 | **Topbar** | Settings gear, right. No title. | always |
| 2 | **Stone** | `BreathStone state="idle"`. Subordinate, not a progress meter. | always |
| 3 | **Status line** | One sentence naming a *condition*, in Home B's pill slot. "Your voice is half gathered." | always |
| 4 | **Stage band** | Three segments at the real seams — Everyday (5) · Emotional (12) · Personal (8). Reuse `StageMap`'s labels and visual language. filled / current / upcoming. | clips ≥ 1 |
| 5 | **Next-stop line** | One line pointing at the next real celebration beat (1, 5, 12, 17, 25). At 12 clips: "Five more and the longest stretch is done." | clips ≥ 1 |
| 6 | **Primary CTA** | "Continue recording" → `/app/record`; resumes at the exact index. "Start recording" at 0 clips. | always |
| 7 | **Reassurance** | Small, under the CTA: "Your clips are kept. You can stop any time." | always |
| 8 | **Footer** | Sign-out | always |

Cards 4 and 5 are the owner's two good takeaways from the proposal — saved
progress, grouped in threes — rebuilt on the script's real numbers and the app's
real resting points.

### 2.4 — explicitly not on this screen

- the next prompt's text, a record button, "choose a different question"
- any playback — of training clips or of the generated voice
- "Write your first message" (route-guarded until `ready`)
- the background temperature ramp
- a countdown headline
- a remaining-time figure derived from a per-clip average

### 2.5 — notes for the designer

- **Card 4 is the whole screen's risk.** `design-directions.md` already names it:
  a progress display motivates some people and shames others, and someone at
  3/25 sees mostly empty. Three chunks is a better answer than 25 dots because
  stage 1 (5 prompts) completes fast — a user who did 5 sees one whole segment
  filled, not "20 to go."
- **Card 5 is what makes the 12-prompt middle survivable.** It's the highest-value
  line on the screen and it costs no new content.
- **The register is `design-handoff.md`'s**, not the proposal's. The Copy &
  Voice Guide rations the elevated register; Home A is a returning-user utility
  screen and should mostly sit in the plain one.

---

## Part 3 — the brief

**Deliverable:** one `HomeAScreen` covering three registers (not started /
paused / failed), built by retrofitting `HomeAScreen.strata.tsx`. One chunk, one
review surface, one commit-stack. Production stays on the interim
`HomeAScreen.tsx` until the whole chunk is verified.

### Task A — page layer (`src/app/home/page.tsx`)

Prerequisite: **FOLLOW_UPS #105 first** (§2.2). Then implement the §2.1 table.
The page needs the clip count, which it doesn't fetch today — the same
`training_clips … status='uploaded'` count query the record page already runs
(`src/app/app/record/page.tsx:106-110`). Extract it rather than copying it; two
call sites is the point at which this repo consolidates.

### Task B — props contract (`HomeAScreen.types.ts`)

The current interface can't express the screen. Both existing directions
implement it, so this is the first edit.

| field | change | why |
|---|---|---|
| `isProcessing` | **remove** | §2.1 redirects that state away; keeping it invites the two-state design back |
| `clipsRecorded` | keep | now genuinely 0–24, never 25 |
| `register` | **add** — `'not-started' \| 'paused' \| 'failed'` | the real branch; replaces the `isProcessing` boolean |
| `pastDue` | **add** — `boolean` | card 0 |
| `onRetry` | **add** — `() => void` | `failed` register's single CTA |
| `onContinue`, `onSettings`, `footer`, `reducedMotionOverride` | keep | unchanged |

`STAGE_BOUNDS`, `stageForCount`, `numberWord`, `capitalize` all stay — they
already encode the real 5/12/8 seams and Strata already consumes them.

### Task C — copy (unwritten, governed by `docs/ESSENCE_Copy_Voice_Guide.md`)

Nothing in this document is approved copy. What's needed:

- **Card 3 (status line)** — a rule covering counts 1–24, naming a *condition*
  rather than a score. Strata's existing `You're ${numberWord(done)} moments in.`
  is the right shape and may survive as-is.
- **Card 5 (next-stop line)** — one line per beat-segment, pointing at the next
  celebration (after prompts 1, 5, 12, 17, 25). Five lines total:
  clips 1–4 → next stop 5 · 5–11 → 12 · 12–16 → 17 · 17–24 → 25 · (25 redirects
  away). The existing celebration copy is the register to match — *"That's the
  longest stretch done. Eight shorter prompts ahead."*
- **Not-started register** — headline + CTA for 0 clips.
- **Failed register** — plain, non-alarming, one retry. The money/error voice
  section of the guide governs.

Home A is a returning-user utility screen: mostly plain register. The guide
rations the elevated register to four lifetime moments and **this is not one of
them** — First Breath and the Reveal are.

### Task D — the Strata retrofit

`HomeAScreenStrata` already carries cards 1, 2, 3, 4 and 6, and already imports
`STAGE_BOUNDS`, so its band is drawn on the real seams. The diff:

| Strata today | becomes |
|---|---|
| 25 uniform marks with stage-seam gaps | 3 segments (5 · 12 · 8), `StageMap`'s labels — Everyday / Emotional / Personal |
| `homea-st__stage-line` (per-stage) | card 5, the per-beat next-stop line |
| `You're twelve moments in.` | keep — card 3 |
| gear topbar, stone, CTA | keep — cards 1, 2, 6 |
| — | add card 0 (past-due banner, reuse `RecordPageBannerWrapper`) |
| — | add card 7 (reassurance) and card 8 (sign-out) |
| — | add the not-started and failed registers |
| ink-in motion, 26ms stagger × 25 | re-time to 3 segments |

Then delete `HomeAScreen.threshold.tsx` + `.css.ts`, and the interim
`HomeAScreen.tsx` once the page renders the retrofit. Rename the survivor to
`HomeAScreen.tsx` — the `.strata` suffix was only there to hold two directions.

**The six calls recorded in `design-directions.md` §"What the frontend-design
skill changed" still bind** — no caps eyebrow, no card around the band, count in
the sentence not a stat, uniform mark height, no spaced em dash. They were live
judgements, not preferences, and the retrofit must not quietly undo them.

### Task E — open design axes

Genuinely free, and the architect should lead rather than ask:

- **Motion.** `design-handoff.md` pins the stone and its states; it says nothing
  about the band. Strata's ink-in needs re-timing for 3 segments — whether it
  stays a left-to-right cascade or becomes something else is open.
- **How the three registers relate.** Three separate compositions, or one
  composition that loses cards? Card 4 and 5 are already conditional on
  `clips ≥ 1`, which suggests the latter.
- **The 0-clip problem.** A not-started user has no band, no count, and no
  next-stop line — cards 3–5 all go quiet at once, leaving stone + CTA. That's
  either elegantly bare or empty. It needs a deliberate answer.

### Task F — dev page and verification

- **`/dev/home-a` must cover every register** — not started, paused at several
  counts (1, 5, 12, 24), failed, past-due, and reduced motion. CLAUDE.md makes
  dev pages permanent scaffolding; this one is the review surface for the chunk.
- **4× CPU throttle on a 390×844 mobile sim is the shippability bar.** The
  existing harness is `.tmp/verify-home-a.mjs` (see `design-directions.md`
  §Verification) — extend it to the new registers rather than writing a new one.
- **Reduced motion must collapse to the destination state** with no mid-flight
  pose. Verified by sampling mid-choreography, as the last pass did at 360ms.
- No console errors in any register.

### Not in this chunk

Deliberately out of scope — name them if they come up, don't absorb them:

- any change to `/app/record` or the 25-prompt script
- a training-clip playback surface (§5 — it shouldn't exist)
- the `/app/voice/processing` screen's own design
- analytics on Home A. If the retrofit adds or moves an event, that needs a
  `docs/analytics/YYYY-MM-DD-slug.md` note in the same PR.
