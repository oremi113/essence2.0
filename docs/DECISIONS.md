# Decisions (Phase 0)

This file locks foundational choices so we don’t re-decide them mid-build.

## Architecture locks
- Next.js App Router on Vercel
- Supabase Auth + Postgres + Storage
- ElevenLabs API key is server-only (never exposed to browser)
- SQL direct, no ORM
- Synchronous processing for MVP (no job system yet)
- Audio files never stored in DB (only references/paths)
- Server decides, client requests
- If a PR violates a lock, it does not merge
- If unsure, open a draft PR and ask before coding further
- Messages are immutable (edits create a new version or new message)
- MVP first, no scope creep beyond MVP

# ElevenLabs + service role rule**
- ElevenLabs API key is **server-only env var** (never `NEXT_PUBLIC_*`)
- All ElevenLabs calls go through `app/api/*`
- Any file touching service role or ElevenLabs key must begin with `import "server-only"`
- Client components may call only your own API routes, never third-party directly

- `app/api/*` = privileged actions (auth, storage, ElevenLabs)
- `src/lib/server/*` = privileged helpers (must be server-only)
- `src/lib/supabase/client.ts` = browser-safe only
- `src/components/*` = UI only, no business logic, no secrets

## Where decisions live
- This file is the source of truth.
- Any change requires a PR that updates this file.

## Non-goals for Phase 0
- No product UI polish
- No feature logic
- No background processing
- No production secrets in repo
