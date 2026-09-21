---
id: 2026-07-17-audio-commit-downloads-whole-clip-just-to-read-its-size
priority: P3
status: open
opened: 2026-07-17
resolved:
owner_paired: false
summary: audio/commit downloads the entire uploaded clip into function memory only to read blob.size, paying full storage egress and holding the whole file in RAM on every recording *(triage 2026-07-17)*
---

# The commit endpoint downloads the whole audio file just to check its byte size

*(triage 2026-07-17)*

`src/app/api/audio/commit/route.ts:52` — to verify the just-uploaded object exists and is at least
`MIN_BYTES` (5KB), the route calls `service.storage.from(bucket).download(objectPath)` — which pulls
the **entire** audio object into function memory — and then only reads `blob.size` (l.59). The full
file body is never used for anything else.

**Why it matters:** every training-clip commit pays full storage egress to download a file it
immediately discards, and holds the whole clip in the serverless function's memory while doing so. It's
wasted money on the storage bill for every recording, and a memory-pressure / OOM risk on a
constrained function if clip sizes grow. The existence + size check it's doing can be answered by
metadata alone.

**Fix shape:** replace the `.download()` with a metadata-only check —
`service.storage.from(bucket).list(dir, { search: filename })` and read the returned object's
`metadata.size` (or a signed HEAD request) — keeping the existing `< MIN_BYTES` guard against that
size and the 404 when the object is missing.

**Pick up when:** the next audio-pipeline or cost pass, or whenever `audio/commit` is next touched.
Agent-fixable (swap one storage call; no schema, no contract change).
