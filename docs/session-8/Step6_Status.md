# Step 6 (Message Creation) — Status & What's Pending

**Living doc. Last updated: 2026-06-10.**

This is the plain-language map of where the message-creation feature stands —
what's done, what's half-done, what still needs building, what needs a decision
from you, and what's blocking progress. It's written to be read without diving
into code. Deeper detail lives in the docs linked at the bottom.

> **How to read this:** skim the status legend, then the "Big picture" section.
> The two sections that need *you* are **"Decisions still needed"** and
> **"Blockers."** Everything else is for awareness.

---

## Status legend

| Symbol | Meaning |
|---|---|
| ✅ Done | Built **and** committed. Doesn't mean proven to work end-to-end (see "verified?"). |
| 🟡 Built, not proven | Code exists and passes its own checks, but has never run against the real app/services. |
| ⬜ Not started | Designed or specced, but no code yet. |
| 🟣 Needs a decision | Waiting on a product/design/you call before it can be built. |
| ⛔ Blocked | Something concrete is stopping it. See Blockers. |

---

## Big picture (the one thing to hold onto)

There are **two versions** of how message creation works, and we are
deliberately building both:

1. **The baseline ("control arm").** Every time you change a message — regenerate
   or reshape — it re-records the audio. Simple, works, but spends money on audio
   for takes you might throw away. **The backend for this is built.**

2. **The cost-saving upgrade ("Deferred Audio").** You can shuffle through *text*
   drafts for free, and only spend an audio recording when you tap "Hear this in
   your voice." Cheaper, snappier. **This is fully designed and decided, but not
   built yet.** It will ship behind an on/off switch so we can compare it against
   the baseline before making it the default.

Everything below is colored by which of these two it belongs to.

**Where we honestly are:** the *plumbing* (backend) for the baseline is written,
but the *screens* a person actually taps through are mostly not built yet, and
nothing has been run end-to-end. So we are further along on the inside than the
outside.

---

## The screens (what a person taps through)

The flow is a sequence of screens. Internal names A2–A7 are the creation steps;
C1–C3 are the "ceiling" screens (limits, waitlist).

| Screen | What it is | Status | Notes |
|---|---|---|---|
| **A2** Recipient | Who's this message for? | 🟡 Built, not proven | The only screen with production code so far. |
| **A3** Category | Birthday / comfort / etc. | ⬜ Not started | Designed in the spec; no code. |
| **A4** Note | Optional personal note | ⬜ Not started | |
| **A5** Generating | The "shaping your message" wait | ⬜ Not started | |
| **A6** Preview & Refine | Hear it, regenerate, reshape, save | ⬜ Not started | **Designed in detail** (brief done); biggest screen; where Deferred Audio lives. |
| **A7** Saved | The saved message | ⬜ Not started | |
| **C1** Ceremony | One-time moment after the 3rd save | ⬜ Not started | |
| **C2** Waitlist | "See what's coming" | ⬜ Not started | |
| **C3** Vault Limit | "You've used all 3 messages" | ⬜ Not started | The Save backend already routes here when you're at the limit. |

**Plain takeaway:** of 9 screens, **1 is built** (A2), **1 is fully designed but
not built** (A6), and **7 are not started**. The screens are the bulk of the
remaining visible work.

---

## The backend (the engine behind the screens)

These are the server endpoints — the parts that talk to the AI (text), the
voice service (audio), and the database. A person never sees these directly.

| Endpoint | What it does | Status | Track |
|---|---|---|---|
| `generate` | Make a fresh message (text + audio) | ✅ Proven (smoke) | baseline |
| `regenerate` | Re-roll a message | ✅ Proven (smoke) | baseline |
| `save` | Keep a message permanently | ✅ Proven (smoke) | baseline |
| `discard` | Throw an in-progress message away | ✅ Proven (smoke) | baseline |
| `commit` | "Hear this in your voice" (render on demand) | ⬜ Not started | Deferred Audio |

**Proven how (2026-06-10):** `tests/smoke/messages.spec.ts` — 18 tests against
the **real server + real database** (no mocks). Covers every gate, all three
cost caps (pending/edit-note-depth/regenerate), the save 404/409/403 paths, the
full happy-save pipeline end-to-end (subscription gate → vault quota → recipient
promotion → audio copy → immutable message row → pending marked), idempotency,
and discard. **Zero vendor spend** — every path returns before the ElevenLabs
render, or copies a seeded fake audio object.

**The one bit still owed:** the full `/generate` → *real* ElevenLabs voice render
path. It needs a real cloned voice, so it's a separate manual check (the render
call itself, `generateSpeech`, is already live in production via the older
`/api/messages` route). Everything *around* the render is proven.

There's also a layer of shared logic underneath (turning a template + your note
into final words via Claude Haiku, then into audio via ElevenLabs). That's built
and unit-tested — it's the most proven part of the whole feature.

---

## What's left to build (the work, roughly in order)

1. **The remaining screens** — A3, A4, A5, A6, A7, then C1–C3. (Biggest chunk of
   visible work.) A6 has a design brief; the rest need design-to-code.
2. **Wire the screens to the backend** — right now the backend exists but the
   screens don't call it yet. This is the "make it actually work end-to-end" step.
3. **Run it for real & test it** — first true end-to-end run, plus route-level
   tests for the endpoints (currently only the pure logic is tested).
4. **The Deferred Audio upgrade** (its own chunk, only after the baseline runs):
   a small database change, the new `commit` endpoint, the on/off switch, the
   split limits, and a few new tracking events. All of this is **designed and
   decided** — see Amendment A1.

---

## Decisions — what's settled vs. what still needs you

### ✅ Settled (you decided these on 2026-06-10)

The six big Deferred-Audio questions are all answered and written into Amendment
A1 (in `Step6_OpenContracts.md`):

1. Limits: **3** audio recordings + **10** free text re-rolls per message.
2. The dots show **audio recordings left**, not text re-rolls.
3. If you Save while looking at an un-heard draft, we keep the **last one you
   heard** (the draft is dropped).
4. Reshape behaves like regenerate — **text first, audio only on commit**.
5. **No special "reveal" animation** when you commit a draft — it just plays.
6. The "you've hit a limit" signal now points at **audio recordings**.

### 🟣 Still needs a decision (mostly design/copy, not urgent yet)

| What | Who | Why it matters | Blocks what? |
|---|---|---|---|
| Visual treatment: how a "current take" vs an "un-heard draft" look different on A6 | design | So users can tell what's saved vs. exploratory | A6 build |
| Copy (wording) for: "Hear this", "Try another", the limit note, and the "audio failed, retry?" message | copy/you | These are user-facing words | A6 build |
| A6 "regen indicator" final form + autoplay vs. tap-to-play on first listen | design | Marked "DESIGN OPEN" in the A6 brief | A6 build |
| Formally accept the amendment + update the master spec (8.7.2 / 8.7.3 / 8.9) | you | Makes Deferred Audio official, not just decided | Deferred Audio build (soft) |

None of these block the *baseline*; they block the A6 screen and the Deferred
Audio upgrade.

---

## Blockers (concrete things stopping progress)

| ⛔ Blocker | Impact | Fix |
|---|---|---|
| ~~No `ANTHROPIC_API_KEY` in `.env.local`~~ — ✅ **Resolved 2026-06-10** | (was: AI text step wouldn't run locally) | Key added to `.env.local` and verified live (authenticates, Haiku reachable). |
| **Most screens aren't built** | The flow can't be clicked through or tested end-to-end yet. | Build A3–A7 (the work above). |
| Supabase CLI — ✅ **mostly resolved 2026-06-10** | (was: "auth broken") | Login works; type-gen fixed via `--project-id`; DB connection fixed by adding `SUPABASE_DB_PASSWORD` to `.env.local` (`migration list` / `db pull` / dry-run all work). **Still open:** `db push` trips on a *pre-existing* migration-history collision in early migrations — see FOLLOW_UPS #30. Use the Dashboard SQL bundle for new migrations until that's reconciled. |
| ~~Database migrations not applied to the live database~~ — ✅ **Resolved 2026-06-10** | (was: backend tables might not exist on the server) | The 4 missing Step-6 migrations were applied via the Dashboard SQL Editor; verified live (`pending_generations` etc. now exist). |

---

## Known gaps we've already written down (so they're not forgotten)

These live in `docs/FOLLOW_UPS.md` with full detail:

- **#27** — Each category has tuned voice settings (e.g. comfort steadier,
  birthday livelier), but the audio step isn't sending them yet. Quality gap, not
  a breakage.
- **#28** — Where the in-progress audio is stored deviates slightly from the
  original contract wording (a storage-location naming choice). Documented;
  harmless; needs ratifying or repointing.
- **#29** — The four endpoints have no full "pretend to be a user" tests yet, only
  small logic tests.

---

## If you want to slow down and understand a piece

- **The whole flow contract & the Deferred Audio decisions:**
  `docs/session-8/Step6_OpenContracts.md` (Q1–Q7 = baseline; Amendment A1 = the
  upgrade).
- **The exact API behavior:** `docs/API_CONTRACTS.md`.
- **The original amendment proposal (the "why"):**
  `ESSENCE_Spec_Amendment_Deferred_Audio_Render.md` (in your Downloads).
- **The deferred items list:** `docs/FOLLOW_UPS.md` (#26–#29).

**Good next conversation to have** (no code, just understanding): walk through
A6 — the Preview & Refine screen — since it's the heart of the feature, it's where
Deferred Audio lives, and it's the screen with the most design decisions still
open. Everything else (A3, A4, A7) is comparatively simple.
