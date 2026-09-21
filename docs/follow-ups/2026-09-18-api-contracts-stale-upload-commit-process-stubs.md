---
id: 2026-09-18-api-contracts-stale-upload-commit-process-stubs
priority: P4
status: open
opened: 2026-09-18
resolved:
summary: docs/API_CONTRACTS.md §7's first three endpoint stubs (sign-upload / training-clips-commit / voice-profiles-process) describe routes, a bucket, and path formats that don't exist in the shipped code — the doc drifted from the actual upload/commit/process routes and was never updated *(triage 2026-09-18)*
---

# API_CONTRACTS.md §7: the upload / commit / process stubs describe an API surface that no longer exists

*(triage 2026-09-18 — doc-vs-code drift check)*

`docs/API_CONTRACTS.md` is titled "API Contract Stubs (MVP)" and is the canonical
reference for the server API. Its first three endpoint sections describe routes,
a storage bucket, and path formats that the shipped code does not have:

- **`POST /api/storage/training-clips/sign-upload`** (`API_CONTRACTS.md:13-37`) —
  no such route exists (`src/app/api/storage/` is absent). The real signed-upload
  route is `POST /api/audio/init-upload`. The doc also names a **`training-clips`
  bucket** and a `training-clips/{userId}/{voiceProfileId}/{trainingClipId}.webm`
  path; the code has a single **`essence-audio`** bucket and writes clips to
  `users/{userId}/voice-profiles/{voiceProfileId}/training-clips/{trainingClipId}/source.webm`
  (`src/lib/audio/storage-paths.ts:10-17`). No `"training-clips"` bucket string
  exists anywhere in `src/`.
- **`POST /api/training-clips/commit`** (`API_CONTRACTS.md:41-64`) — no such
  route; `src/app/api/training-clips/` only has `list/`. The real commit route is
  `POST /api/audio/commit`.
- **`POST /api/voice-profiles/process`** (`API_CONTRACTS.md:67-87`) — no such
  route; the real trigger is `POST /api/voice-profiles/{id}/start`.

The later sections in the same file (`/api/messages/generate`, `/regenerate`,
`/save`, `/discard`, `/{messageId}/play`) *were* updated and match the code — so
the drift is confined to these three original Phase-4 stubs, which were
superseded by the `audio/*` + `voice-profiles/[id]/start` routes but never
rewritten.

This is distinct from FU-28 (`2026-06-19`, still open), which flags only the
narrow **pending-audio** path/bucket wording (`messages/` bucket vs `essence-audio`
`pending/` prefix). These three whole endpoint stubs — wrong route paths, a
non-existent bucket, and stale path formats — are not covered by that entry.

**Why it matters:** no user impact and no code path is affected — this is a
documentation-accuracy issue, which is why it is P4. But API_CONTRACTS.md is what
a future contributor or agent consults to understand the upload → commit →
process flow, and today it would point them at three routes that 404, a bucket
that doesn't exist, and path formats that don't match — quietly misleading exactly
the person who trusts the contract doc.

**Fix shape:** rewrite the three sections to the shipped reality —
`POST /api/audio/init-upload`, `POST /api/audio/commit`,
`POST /api/voice-profiles/{id}/start` — with the `essence-audio` bucket and the
`storage-paths.ts` path formats; or, if these stubs are wanted as historical
record, move them under a clearly-marked "superseded / historical" heading so
they aren't read as the current contract. Fold the FU-28 pending-path wording
into the same pass while the file is open.

**Pick up when:** next time API_CONTRACTS.md is touched, or any doc-accuracy /
onboarding-docs pass. Cheap; do it opportunistically.
