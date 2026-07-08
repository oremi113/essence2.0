# Step 10 · Offline & Connection-Lost — Design Brief (S10-B)

> **Format mirror:** `docs/C3_Vault_Limit_Design_Handoff.md`. Same shape, same
> rules. **Scope parent:** `docs/Step10_Error_Chapters_Scope.md`.
>
> **Status going in:** greenfield. There is **no** offline detection, UI,
> telemetry, prototype, or adopted copy anywhere in the app (verified sweep).
> This is the one genuinely design-gated Step 10 chapter — you're inventing the
> connectivity grammar, not re-skinning an existing screen.

---

## 0. The why (read once, then work from §1)

Every network action in the app today — generate, save, checkout, load the
shelf, play audio — assumes it can reach the server. When it can't (subway,
dead zone, flaky hotel wifi), the app fails as a generic caught error with no
sense that *"you're offline, this isn't your fault, nothing is lost."* The
audience skews 45–70 on mid-range phones and patchy connections; this matters.

MASTER_SPEC marks *"Network/connection states (offline, lost connection,
reconnected)"* as **Ships** for V1 (`:135`) and requires *"CCY must resume
correctly after any interruption"* (Immutable Rule 3, `:2053`). But it gives no
standalone offline section and **no copy** — §12.8 only folds offline into
"resume where left off" (`:2023`). So the behavior bar is fixed; the *feeling*
and the *surface* are yours to design.

**The intent in one line:** *offline should feel like the app calmly waiting
with you, not breaking.* Never alarm, never blame the user, never imply loss —
their work is held locally and resumes the moment they're back.

---

## 1. What to design (the scope checklist)

A small, cross-cutting connectivity system — not one screen. Deliver a
self-contained prototype (`prototypes/essence-step10-offline.html`) covering:

- [ ] **The offline indicator (transient).** A quiet, persistent-while-offline
      banner/pill that appears when connection drops and retreats on reconnect.
      Non-blocking — the user can still read, navigate, and view already-loaded
      content. Where does it live (top inset? above the CTA?), and how loud?
- [ ] **The blocked-action treatment.** When the user taps something that
      *needs* the network while offline (Generate, Save, Checkout), what
      happens? The action should be gently prevented with a reason, not fail
      after a spinner. Design the disabled/prevented affordance + its message.
- [ ] **The reconnect moment.** When connectivity returns: the indicator
      retreats, and anything that was waiting resumes or becomes tappable
      again. A brief, warm "back online" acknowledgement (or silent?) — your
      call, but design the transition, not just the two end states.
- [ ] **The hard-blocked full state (optional).** If a route simply can't
      render offline (e.g. first load with no cache), the fallback is the
      existing `SystemScreen` family — design the offline copy/variant for it.
- [ ] **Reduced-motion + the indicator's entrance/exit** (see §9).

**Out of scope (locked — see §2):** any offline **write-queue** or
"send-when-back" buffering. V1 is **detect → inform → degrade → resume**, full
stop. No local draft-queue, no background sync.

---

## 2. What offline is (the intent to protect) — and the lock

The feeling to leave the user with:

> *"I'm offline, the app knows, nothing I did is lost, and it'll pick right
> back up when I'm connected. I don't need to do anything."*

**The hard constraint (DECISIONS lock, do not design around it):** the app is
**synchronous-MVP, no job system** (`DECISIONS.md:10`). So offline **must not**
promise anything asynchronous — no "we'll send this when you're back," no
queued saves, no "we'll email you." The honest model is: *hold the user where
they are, prevent the doomed action, resume when live.* If a design starts to
need a queue or a background promise, it's crossing the lock — stop and flag.

**DO-NOT-ADD (locked):**
- No blame ("check your connection" is borderline — prefer "you're offline").
- No alarm, no red error chrome, no "!" — offline is a *condition*, not a
  failure. Register = **Calm** (`Copy_Voice_Guide.md:40`).
- No countdowns, no auto-retry spinners the user watches.
- No banned words ("Error," "Failed," "Something went wrong" —
  `Copy_Voice_Guide.md:53-56`).
- No queue / send-later / email-later promise (the lock, above).

---

## 3. States the prototype should cover (switch via the dev rail)

1. **Online (baseline)** — indicator absent; everything normal.
2. **Offline — passive** — connection dropped while the user is just reading/
   navigating. Indicator present; content stays usable.
3. **Offline — blocked action** — user taps a network-required CTA (Generate /
   Save / Checkout) while offline; the prevented-action affordance + message.
4. **Reconnecting → online** — the transition: indicator retreats, blocked
   actions re-enable, optional "back online" beat.
5. **Hard-blocked full route** (optional) — offline `SystemScreen` variant for
   a route that can't render at all.
6. **Reduced motion** — indicator appears/retreats without motion.

---

## 4. How users hit it, and what must hold

**Triggers:** `navigator.onLine` flips false; a `fetch` throws a network error
(offline mid-request). Both should resolve to the same "offline" surface.

**Behavior that must hold (spec-fixed):**
- **No dead ends; progress preserved** (`MASTER_SPEC:2049-2052`). Whatever the
  user typed (a note, a form) stays in place through an offline blip — never
  cleared.
- **Resume correctly after interruption** (Rule 3, `:2053`) — coming back
  online returns the user to exactly where they were, action re-tappable.
- **In-flight silent retries stay invisible** (Rule 6, `:2056`) — the indicator
  is the only user-visible connectivity signal; don't surface retry churn.

---

## 5. The visual language

Source from the app, not the stale token doc (Appendix A is canonical).

- **The system-state family** is your nearest neighbor:
  `src/components/system/SystemScreen.tsx` (the calm full-screen message behind
  `app/error.tsx`) — reuse its calm for the hard-blocked full state, and let the
  transient indicator feel like a quieter sibling of it.
- **The inline error token** `.vault-error` (`globals.css`, terracotta
  `--color-status-error`) is the *money/error* accent — **offline is not an
  error**, so lean away from terracotta for the passive indicator; reserve any
  status color for genuinely blocked actions, and even then keep it soft. A
  neutral/mineral-keyed indicator likely reads calmer than a red one. Your call
  — argue it in the prototype.
- **Tonal target:** the indicator should feel like it belongs to the same quiet
  world as the Memory Shelf and C3 — a condition the app is calmly holding, not
  an interruption.

---

## 6. The data you can design around

- **Signal:** `navigator.onLine` + `online`/`offline` window events (no such
  hook exists yet; engineering will add a `useOnline` — §7). Design for a
  boolean "online/offline," plus a transient "just reconnected" pulse if your
  reconnect beat needs it.
- **Per-action:** each network CTA knows whether it needs the network; offline
  → prevented with a reason. No per-user data; the state is purely
  connectivity.
- There is **nothing to fetch** — offline is a client condition.

---

## 7. Notes for engineering — *not your job, just so you know it's handled*

- **A shared `useOnline` hook** (new, `src/lib/*`) will own `navigator.onLine` +
  the window listeners and feed the indicator + the blocked-action gates. One
  primitive, many consumers.
- **No write-queue** (the lock). Blocked actions are *prevented*, not buffered.
- **Resume** is "the action is re-enabled and the user re-taps," not a replay
  engine — the note/form state simply persists in component state through the
  blip.
- **Telemetry:** a new `offline` event (e.g. `system.offline_encountered` with
  `surface`/`blocked_action`) will be added — this is a **new analytics event**,
  so it gets a `docs/analytics/YYYY-MM-DD-*.md` note in the build PR. Design
  doesn't need to carry it; just know a "blocked action while offline" is worth
  a datapoint.
- **URLs/routes** unchanged; this is a cross-cutting overlay + gates, not new
  routes. A `/dev/offline` page will host the state rail (permanent).

---

## 8. Copy candidates (carry these over; we'll do a clarity pass after)

Warm, plain, never alarmed. Lead with the safe fact. (Voice guide §8.)

- **Passive indicator:** "You're offline." / "You're offline — everything here
  is still yours." *(short pill vs one-liner — your call)*
- **Blocked action (Generate/Save):** "You're offline right now. Your note is
  kept — try again once you're back online." *(reassure-what's-safe first, one
  next step)*
- **Blocked checkout:** "You're offline right now. Nothing was charged — try
  again when you're back online."
- **Reconnect beat (if any):** "You're back online." *(or silent — argue it)*
- **Hard-blocked full route:** "You're offline. This page will be here the
  moment you're back." *(SystemScreen variant)*

Locked out: "Error / Failed / check your connection / something went wrong,"
any "we'll send/save/email this later," any countdown.

## 9. The motion bar

Mobile-first, 390×844; hold at **4× CPU throttle** (`throttle-dev.mjs`). Check
at 4×: the indicator's **entrance and retreat** (a calm settle/slide, not a
snap or a pulse), and the blocked-action affordance (immediate, no spinner
that resolves to failure). Honor `prefers-reduced-motion` — indicator appears/
retreats instantly, no motion. The indicator must **never** animate on a loop
while offline (it's a state, not an alert demanding attention).

---

### Reference index
- **Scope parent:** `docs/Step10_Error_Chapters_Scope.md`.
- **Spec:** `MASTER_SPEC.md:135` (V1.6 network states = Ships), `:2022-2025`
  (§12.8 session/return), `:2049-2058` (immutable rules), `:1978-1981` (language
  rules). **Lock:** `DECISIONS.md:10` (sync-MVP, no job system).
- **System-state neighbor:** `src/components/system/SystemScreen.tsx`,
  `src/app/{error,global-error}.tsx`.
- **Copy voice:** `docs/ESSENCE_Copy_Voice_Guide.md` §8 (`:112-128`).
- **Tokens (canonical):** `src/app/globals.css` `@theme`. `docs/design-tokens.md`
  is a guide but has drifted.
- **Format mirror:** `docs/C3_Vault_Limit_Design_Handoff.md`.

---

# Appendix A · Token starter kit (design from these — they're canonical)

**Source: `src/app/globals.css` `@theme`.**

- **Grounds:** `--color-bg-neutral #FBF8F4` (cream). Surfaces:
  `--color-surface-card`, `--color-surface-warm`.
- **Neutral/calm accent (lean here for the passive indicator):**
  `--color-mineral #7A8088` (text/accent), `--color-mineral-dark #656B73`
  (AA-safe white-text fill). Text: `--color-text-primary #1C1A18`,
  `--color-text-secondary #6B6B6B`. **Never** `--color-text-tertiary` on small
  text (fails AA; audience 45–70).
- **Status (reserve for genuinely blocked actions, used softly):**
  `--color-status-error #9C3528` (terracotta, 6.72:1) — but see §5: offline is
  not an error; prefer neutral for the passive state.
- **Motion:** `--ease-essence` (state transitions), `--ease-page`
  (`--duration-page 700ms`, arrivals), `--ease-press`. Durations: `--duration-
  micro 200ms`, `--duration-small 400ms`, `--duration-medium 800ms`.
- **Type/targets:** `--font-body 'Inter'`, `--font-display 'Spectral'`. Floor
  `--text-small 14px`. Touch targets 44px. Honor `prefers-reduced-motion`.

> Values from `src/app/globals.css` `@theme`. Where `design-tokens.md`
> disagrees, `globals.css` wins.
