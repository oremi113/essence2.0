---
id: 2026-09-18-a6-preview-playback-silent-on-commit-url-failure
priority: P3
status: open
opened: 2026-09-18
resolved:
summary: A6 Preview & Refine's home-grown playback engine has three robustness gaps — after a paid commit the auto-play animates the scrubber in silence with no "try again" affordance when the fresh signed-URL fetch fails; a one-time audio recovery permanently disables the per-play URL refetch (reintroducing expiry); and the play control has no in-flight guard so a rapid double-tap fires two signed-URL fetches *(triage 2026-09-18)*
---

# A6 Preview & Refine playback path: silent-on-failure after commit + two smaller robustness gaps

*(triage 2026-09-18 — Step 6 A6 deferred-audio review; the DEFAULT message-creation path since 2026-09-04)*

`src/components/screens/messages/PreviewRefineScreen.tsx` drives audio with a
home-grown visual clock (`setInterval`) plus a bare `<audio>` element, rather
than off the element's own events. Three separate gaps live on that path. They
share one root — the engine treats the visual scrubber as the source of truth and
the real audio as best-effort — and would all be closed by one "harden the A6
playback path" pass, so they are filed together (as FU-99 bundled the Memory
Shelf playback bugs).

**A. Post-commit auto-play goes silent with no recovery affordance when the URL
fetch fails.** `PreviewRefineScreen.tsx:260-265` — after a successful commit (a
*paid* ElevenLabs render), the code drops the prior take's `src`
(`:256-258`), awaits a fresh `onRequestPlayback()`, sets the new `src` only
`if (playback.ok)`, then unconditionally `requestAnimationFrame(() =>
startPlayback())`. `startPlayback` (`:154-161`) starts the visual clock but skips
`el.play()` when there is no `src`, and — unlike the manual play path
(`:184-185`) — never sets `audioFailed`. So on a failed fetch the user watches
the stone and scrubber "play" the moment they land on *"Here it is, in your
voice,"* hears nothing, and sees no "Couldn't load it / Try again" line. (They
can recover by tapping play again, which does refetch — but nothing tells them to,
on the one beat that is the whole point of the paid render.)

**B. A single audio recovery permanently disables the per-play URL refetch.**
`PreviewRefineScreen.tsx:182` gates the fresh-play refetch on `!audioRecovered`;
`handleAudioRetry` latches `setAudioRecovered(true)` at `:206` and never clears
it (only a *new* commit resets it, `:253`). After the user hits "Try again" once
for a given committed take, every later fresh play (`pos === 0`) reuses the
existing `src` instead of minting a new signed URL. Supabase signed URLs are
short-lived, so a later listen can silently fail on an expired URL — the exact
expiry the per-play refetch exists to prevent.

**C. The play control has no in-flight guard.** `handlePlayPause` (`:170-200`)
sets no "playing" state until *after* `await onRequestPlayback()` resolves, so two
quick taps from Ready both enter the fetch branch — two signed-URL requests (each
consuming the DB-backed signed-URL budget) and two `startPlayback()` calls. This
is the same *class* as the already-logged "double-tap guards read render-state not
a ref," but that entry is a different component and this control has **no** guard
at all, so it is not covered there.

**Why it matters:** A6 (deferred-audio) is the default, shipping message-creation
flow, and playback here is the moment the user first hears a message they just
paid a render for. Gap A turns a fetch hiccup into a silent, unexplained beat on
that moment; gap B reintroduces signed-URL expiry after any recovery; gap C burns
signed-URL budget on a double-tap. None loses data or money, which is why this is
P3 — but all three degrade the one flow the paid render exists to deliver.

**Fix shape:** drive end-of-clip and error state off the `<audio>` element's own
`ended`/`error`/`timeupdate` events rather than a free-running interval, so a
failed load is observable wherever it happens; in `handleCommit`, set
`audioFailed(true)` (and don't start the clock) when `!playback.ok`, matching the
manual path; stop using `audioRecovered` to gate the refetch (refetch on every
fresh `pos === 0` start, or clear the latch when a play completes); and add an
in-flight ref that bails out of `handlePlayPause` while a fetch is pending.

**Pick up when:** next Step 6 / A6 reliability pass, or whenever the A6 playback
engine is next touched. Not urgent — no data or money at risk — but it sits on the
default paid-render flow.
