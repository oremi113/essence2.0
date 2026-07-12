# Step 10 · Error Chapters — Scope

**Purpose:** scope the remaining Step 10 error/recovery work before building.
**Date:** 2026-07-07
**Method:** three read-only sweeps — MASTER_SPEC Ch.12 + Step 10 stub; the
shipped payment/restore chunk (commit `c9ecf04`, PR #79) + repo error infra;
prototypes / session docs / copy-voice. Citations inline.

---

## 0. The reframe (read this first)

The roadmap reads *"Step 10 error states are ~1/4 done… generation-failure,
audio-can't-play, and offline are unbuilt"* (`Roadmap:49-51, 99-101`). That
mischaracterizes the work. The three "unbuilt chapters" are **not equal, and
two are largely built.** The real distribution:

| Chapter (spec home) | True state | The actual gap | Design-gated? |
|---|---|---|---|
| **Generation-failure** (§12.4 `MASTER_SPEC:2004-2007`) | **~70% built** | Screen + prototype + telemetry already exist. Needs a copy pass + the undefined "alternative path after 3 attempts" + the post-seal notify clock | No (copy + 1 decision) |
| **Playback** (§12.3 `:2000-2002`) | **Shelf done; First-Breath is the only gap** | Shelf fully handles audio-error + retry. First-Breath playback-error is unbuilt **and coupled to unwired First-Breath audio (FU #41)** | Partly (blocked) |
| **Offline / connection-lost** (§12.8 `:2022-2025` + V1.6 `:135`) | **Greenfield** | No detection, no UI, no telemetry, no prototype, no adopted copy. The real lift, and it carries a DECISIONS-lock question | **Yes** |

**So the work is front-loaded onto offline**, not spread evenly. A "finish
generation-failure" chunk is a fast win; offline is the genuine design+build
chunk.

**Numbering note:** *"Ch2" is an orphan label* — the roadmap only ever numbers
the shipped payment chunk "Ch2"; there is no Ch1/Ch3/Ch4 anywhere
(`Roadmap:99-101` are unnumbered bullets). Recommend we **drop the chapter
numbers** and name surfaces by their §12 category (below). Don't infer a 1–4
order.

**Spec cross-ref bug:** Step 10 says *"All error handling per Chapter 10"*
(`MASTER_SPEC:770`) — there is no Chapter 10; the headings jump 9 → 11 → 12.
**Chapter 12 is authoritative.** (Worth a one-line spec fix.)

---

## 1. The global spine (what every chapter inherits)

### 1a. The shipped pattern to mirror — payment/restore recovery (`c9ecf04`)

A "return-a-handled-boolean, gate-and-surface-inline" recovery, five parts:

1. **Hook returns `Promise<boolean>`** not `void` — `true` = navigating away,
   `false` = recover here. `fetch` wrapped in try/catch so an offline drop
   returns `false` instead of throwing (`src/lib/stripe/useCheckout.ts:29-48`).
2. **Action layer** holds `isProcessing` + `xFailed`, gates double-submit,
   sets the failure flag on `!handled` (`src/app/app/vault/*/actions.tsx`).
3. **Pure screen** takes optional `isProcessing?` / `xFailed?` props, disables
   the CTA, renders an inline `<p role="alert" class="vault-error">` with a
   module-level provisional copy constant (`VaultSealScreen.tsx:56-61`).
4. **A shared CSS token, not a component** — `.vault-error`
   (`globals.css ~3327`, terracotta `--color-status-error`, 6.72:1).
5. **Dev-page toggle** for the error state + unit tests on the boolean
   contract (`tests/unit/useCheckout.test.tsx`).

**What Ch2 did NOT add:** any error taxonomy or telemetry — it's `console.error`
+ inline `<p>` only. That's fine for a single-action flow; it's a **limitation
for offline** (cross-cutting) — see §4.2.

### 1b. Reusable infra already in the repo

- **Server taxonomy:** `src/lib/errors.ts` — `AppError {code, userMessage,
  status, retryable}`, `ErrorCode` map (TTS_FAILED, TTS_TIMEOUT,
  STORAGE_FAILED, VOICE_NOT_READY…), `handleRouteError`. Uniform body
  `{error, code, retryable}` via `src/lib/api/defineRoute.ts`.
- **Richest client consumer** (the model for code-driven recovery):
  `PreviewRefinePageClient.tsx:166,224-236` branches on `data.code` and computes
  `retryable`.
- **Full-screen/terminal surface:** `src/components/system/SystemScreen.tsx`
  behind `app/error.tsx` + `global-error.tsx` (app-wide boundaries — shipped).
- **Write safety / recovery:** `checkedWrite` / `bestEffortWrite`
  (`src/lib/supabase/checked-write.ts`); `markVoiceProfileFailed`
  (`src/lib/voice-creation/mark-failed.ts`); `useResource.refetch()`.
- **Client error telemetry precedent:** `trackStep6('..._failed',
  {failure_phase, error_code})` (`src/lib/analytics/step6.ts`). The analytics
  client never throws.
- **Offline detection:** **none.** Zero hits for `navigator.onLine` /
  `useOnline` / `online`/`offline` listeners across `src/`.

### 1c. The copy spine (applies to all)

- **3-part error structure** (`ESSENCE_Copy_Voice_Guide.md:116-120`): (1) what
  happened, no blame; (2) **reassure what's safe** — *"Your messages are safe
  either way"* ("the sentence that does the most work in the whole product");
  (3) one easy next step, single CTA.
- **Banned words** (`:53-56`, mirrored `MASTER_SPEC:1978-1981`): "Error,"
  "Failed," "Something went wrong," "Critical issue," "System malfunction,"
  version/patch language. Register = **Calm**.
- **Silent-retry mandate** (`MASTER_SPEC:2056`): "API retries must be silent and
  invisible." **No dead ends; auto-save progress** (`:2049-2058`).
- Ch2's shipped copy is explicitly **"provisional pending the Step 10 copy
  pass"** — so a consolidated copy pass is owed across *all* error surfaces,
  including the ones already built.

---

## 2. Chapter detail

### 2A. Generation-failure — §12.4 (`MASTER_SPEC:2004-2007`)

**Already built:**
- A5 message-generation **failed state exists**: `GenerationScreen.tsx:114-146`
  — `role="alert"`, "Couldn't quite land it.", **Try again** (`onRetry`) +
  `hasNote`-branched "Adjust your note". Dev page with variants:
  `src/app/dev/messages-generation/page.tsx`.
- **Prototype exists:** `prototypes/message creation/essence-step6-a5.html:670-708`
  (`stage--failed`, `failed-with-note` / `failed-no-note`).
- **Telemetry live:** `step6.generation_failed {failure_phase (text|audio),
  error_code, duration_ms, retry_counts}` (`analytics/2026-06-01-step6-events.md:94`).
- Voice-*profile* creation failure also handled: `VoiceCreationView.tsx` full
  `failure` ViewState with code branches + `markVoiceProfileFailed`.

**The gaps:**
1. **Copy pass** — A5's copy predates the money-voice/Step-10 pass; align to §1c.
2. **"Alternative path after 3 attempts"** — spec mandates one (`:2007`) but
   **never defines it** (silent). Owner decision (§4.4).
3. **Post-seal processing failure is invisible by design** (degrades by elapsed
   time, `Processing.tsx:33-59`); the bounded-hold **"notify handoff" clock is
   unbuilt** (FOLLOW_UPS #72). Arguably belongs to Processing wait-states, not
   Step 10 — scope call (§4.5).

**Effort:** copy + alt-path ≈ **4–8h**. + notify clock (#72) ≈ +6–10h if
included.

### 2B. Playback — §12.3 (`MASTER_SPEC:2000-2002`)

**Already built (Shelf — done):** `usePlaybackController.ts` sets `audioError`
on the `<audio>` error listener + play catch, exposes `retry()`;
`MessageList.tsx:63-90` renders per-card "◌ Unavailable" + retry;
`ShelfPageClient.tsx:44-64` tracks `unavailableIds`. Playback URLs via
`src/lib/audio/playback.ts` (`STORAGE_FAILED`, retryable).

**The gaps:**
1. **First-Breath playback-error is unbuilt** — `FirstBreathSequence.tsx:58-82`
   audio refs are **placeholder scaffolding, no `onError`, no `.play()` catch**;
   a failure is silent. **Coupled to FU #41** (First-Breath ceremony audio isn't
   wired at all) — you can't meaningfully build a playback-error state for audio
   that doesn't play yet. Sequence with the First-Breath audio item.
2. **Waveform-fails-but-audio-ok split** (`:2002`) — nicety, unhandled; small.

**Effort:** first-breath onError/catch + waveform split ≈ **3–6h**, but
**blocked/sequenced behind FU #41** (audio wiring).

### 2C. Offline / connection-lost — §12.8 (`:2022-2025`) + V1.6 (`:135`)

**Built:** nothing dedicated. Offline surfaces only as a caught `fetch` throw
folded into a generic recoverable error. No detection, UI, telemetry,
prototype, or adopted copy.

**Spec:** V1.6 marks "Network/connection states (offline, lost connection,
reconnected)" as **Ships** (`:135`); §12.8 folds it into "resume where left
off" (`:2023`); Immutable Rule 3 "CCY must resume correctly after any
interruption" (`:2053`). No standalone offline section, **no adopted copy** (the
FU #11 line is speculative + photo-scoped).

**DECISIONS-lock tension (must resolve — §4.3):** "Synchronous processing for
MVP, no job system" (`DECISIONS.md:10`) + deferred "Storage full / upload
queued" (`MASTER_SPEC:139`). **An offline write-queue would violate a lock.**
V1 offline should be **detect → inform → graceful-degrade → resume**, NOT queue.

**This is the design-gated chunk** — it warrants a prototype + a design-architect
pass the way C3 did (net-new visual/behavioral grammar: a connectivity banner,
disabled-action affordances, a reconnect toast).

**Effort:** `useOnline` hook + shared offline treatment + resume-safety audit +
telemetry event + design/prototype ≈ **10–18h**.

---

## 3. Cross-cutting decisions (owner)

> **Owner decisions locked 2026-07-07:** start **both tracks in parallel**
> (S10-A build + S10-B offline design handoff — brief:
> `docs/Step10_Offline_Design_Handoff.md`); offline = **detect / degrade /
> resume, no write-queue** (stays inside the sync-MVP lock); gen-fail
> alternative path = **contact-as-care** (`mailto:` support link).
>
> *Re-decision note:* the first pick (notify-handoff email) was reversed after
> an infra check — there is **no email sender and no background-retry/readiness
> mechanism**, so "we'll email you when it's ready" would either be a false
> promise or require crossing the sync-MVP lock we just chose to hold. The
> seal-wait "email you" copy (`CardCapture.tsx:242`) is likewise mock-only.
> Contact-as-care is spec-endorsed (§12.2 "escalate to support — framed as
> care") and also gives FOLLOW_UPS #69 a real support destination.

1. **Naming/numbering** — drop "Ch2/Ch3/Ch4"; name surfaces by §12 category?
   *(Recommend: yes.)*
2. **Shared offline primitive vs Ch2's per-screen inline** — offline is
   cross-cutting; recommend a small shared piece (`useOnline` hook + a
   connectivity banner / `SystemScreen` for hard-blocked actions) rather than an
   inline `<p>` per screen. Flow-specific errors stay inline (mirror Ch2).
   *(Recommend: shared for offline, inline for the rest.)*
3. **Offline scope under the sync-MVP lock** — confirm **detect/inform/degrade/
   resume only, no write-queue** (a queue needs a DECISIONS update first).
   *(Recommend: no queue for V1.)*
4. **Generation-failure "alternative path after 3 attempts"** — undefined by
   spec. Options: (a) "keep your note, we'll email you when it's ready"
   (notify-handoff, reuses existing copy grammar); (b) contact-as-care
   ("reach us and we'll shape it with you"); (c) text-only fallback. Needs a
   pick. *(Lean: (a) — cheapest, on-brand, reuses the seal-wait notify pattern.)*
5. **Post-seal notify clock (#72)** — is it Step 10 (error) or Processing
   (wait-state polish)? *(Recommend: treat as Processing; keep it out of the
   Step 10 error scope so gen-fail stays a fast win.)*
6. **Copy pass** — one consolidated Step 10 error-copy pass across all surfaces
   (incl. re-doing Ch2's + A5's provisional copy) vs per-chunk. *(Recommend: one
   pass, after the surfaces exist, with the copy owner.)*

---

## 4. Recommended chunking & sequence

Reframed to the real distribution (not "3 equal chapters"):

| Chunk | Scope | Effort | Design-gated | Depends on |
|---|---|---|---|---|
| **S10-A · Generation-failure finish** | Copy-align the existing A5 failed state; build the "alternative path" (decision §4.4). Screen/proto/telemetry already exist. | 4–8h | No | §4.4 decision |
| **S10-B · Offline & connection-lost** | `useOnline` hook + shared connectivity treatment + resume-safety audit + telemetry + **prototype/design pass**. The real lift. | 10–18h | **Yes** | §4.2/4.3 decisions |
| **S10-C · Playback completion** | First-Breath `onError`/catch + waveform-fail-audio-ok split. | 3–6h | No | **FU #41 (audio wiring)** |
| **X · Step 10 error-copy pass** | One consolidated warm-voice pass across all error surfaces (Ch2 + A5 + new). | 2–4h | (copy) | surfaces exist |

**Total ≈ 19–36h** (vs roadmap's 15–30h) — redistributed heavily toward
offline.

**Suggested order:**
1. **S10-A first** — fastest visible win, unblocks by one small decision, no
   design gate.
2. **S10-B next** — start with the design/prototype handoff (like C3) while
   S10-A builds; it's the long pole.
3. **S10-C when FU #41 lands** — don't build a playback-error state for audio
   that isn't wired.
4. **Copy pass** folded in as each surface settles, or one sweep at the end.

---

## References
- Spec: `docs/MASTER_SPEC.md` §Step 10 (`:761-774`), Ch.12 (`:1965-2058`),
  V1.6 table (`:129-141`). Cross-ref bug: `:770` cites nonexistent "Chapter 10".
- Shipped pattern: commit `c9ecf04` (PR #79); `src/lib/stripe/useCheckout.ts`,
  `src/app/app/vault/*/actions.tsx`, `VaultSealScreen.tsx`, `.vault-error`
  (`globals.css`).
- Infra: `src/lib/errors.ts`, `src/lib/api/defineRoute.ts`,
  `src/components/system/SystemScreen.tsx`, `src/lib/supabase/checked-write.ts`,
  `src/lib/analytics/step6.ts`.
- Gen-fail: `GenerationScreen.tsx:114-146`, `prototypes/message creation/
  essence-step6-a5.html:670-708`, `analytics/2026-06-01-step6-events.md:94`.
- Playback: `shelf/usePlaybackController.ts`, `MessageList.tsx:63-90`,
  `FirstBreathSequence.tsx:58-82`; FOLLOW_UPS #41 (audio unwired).
- Offline: none in code; `MASTER_SPEC:135, 2022-2025`; `DECISIONS.md:10`
  (sync-MVP lock); FOLLOW_UPS #72 (#post-seal clock).
- Copy: `docs/ESSENCE_Copy_Voice_Guide.md` §8 (`:112-128`).
