---
id: 2026-07-28-record-upload-error-dead-ends-the-ceremony
priority: P2
status: open
opened: 2026-07-28
resolved:
owner_paired: false
summary: A failed clip upload on the record screen dead-ends the ceremony — the label says "Save failed — try again" but the mic tap is blocked and the only real retry lives in a visually-hidden engine, so the user must reload and loses their place *(triage 2026-07-28)*
---

# A failed clip upload strands the user on the record prompt — "try again" has no working control behind it

*(triage 2026-07-28)*

`src/components/screens/RecordScreen.tsx:487` sets `hasStopped = isSaving || isUploaded || hasError`,
and `handleRecordClick` (`:516-522`) early-returns `if (hasStopped) return`. So once a clip upload
fails (`uploadStatus === 'error'` / `'permission_denied'`), tapping the mic button does nothing. The
label at `:583-586` still tells the user **"Save failed — try again"**, but:

- The mic button — the only visible control — is inert (blocked by `hasStopped`).
- Auto-advance only fires on `isUploaded` (`:506-510`), never on error, so the flow doesn't move on either.
- The actual retry lives inside `<RecordingUpload>`'s own `status === "error"` branch, which is
  rendered inside `.record-upload-engine` — a `width:1px; clip: rect(0,0,0,0); overflow:hidden`
  visually-hidden, `aria-hidden="true"` container (`src/app/globals.css:2847`). Its retry button is
  unreachable by sight or by assistive tech.

**Why it matters:** a flaky mobile upload (the record flow's expected failure mode on the 45–70
audience's mid-range phones) drops the user into a hard dead-end mid-ceremony. Their only recovery is
a full page reload, which restarts them and loses their place in the prompt sequence — a poor moment
in a core, emotionally-loaded flow, made worse because the copy promises a retry that isn't wired to
anything. (Distinct from FU-2/FU-5, which fixed the `useUploadPipeline` *hook's* internal status; this
is the RecordScreen *UI* offering no working retry affordance.)

**Fix shape:** exclude `hasError` from `hasStopped` (or add a dedicated visible Retry control) so the
mic button re-arms after a failed upload and calls `engine.startRecording()` again; confirm the
engine resets its pipeline state on re-arm. UI change — verify in-browser at 4× throttle by forcing an
upload failure (per house rules).

**Pick up when:** next record-flow / Step-6 pass, or the pre-launch QA sweep — whichever comes first.
It's a shipping-path dead-end, so ahead of the P3s below.
