# 8. Operational Runbook (MVP)

This repo is a clean rebuild.
Do not add features outside MVP scope without updating `docs/DECISIONS.md`.

## Local setup

### Prereqs
- Node.js (LTS)
- Package manager used by repo (see `package.json`)
- Supabase project created

### Env
- Copy `.env.example` to `.env.local`
- Never commit `.env.local`

Public:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

Server-only:
- SUPABASE_SERVICE_ROLE_KEY
- ELEVENLABS_API_KEY
- APP_URL (or NEXT_PUBLIC_APP_URL if chosen)

Rules:
- Never use `NEXT_PUBLIC_*` for secrets
- Privileged modules must include `import "server-only"`

## Commands

Use scripts defined in `package.json`:
- install
- dev
- lint
- typecheck
- build

## Database

- `db/migrations/*` are ordered migrations
- `db/schema.sql` is canonical snapshot
- RLS enabled on all app tables
- Messages are immutable (no update policy)

## Storage

Buckets (private):
- training-clips
- messages

Access:
- Signed URLs only (server issues)
- No broad storage policies

Paths:
- See `docs/STORAGE_PATHS.md`

## Key rotation

Supabase:
- Rotate keys in Supabase dashboard if exposed
- Update Vercel env + local `.env.local`

ElevenLabs:
- Rotate key in ElevenLabs dashboard
- Update Vercel env + local `.env.local`

## Common failure modes

Auth redirect:
- Verify redirect URLs in Supabase
- Confirm callback route matches app

Signed URL 403/expired:
- Buckets must be private
- Server must issue fresh signed URLs
- Check expiration window

Secret leaked to client:
- No `NEXT_PUBLIC_*` secrets
- Add `import "server-only"` to privileged modules
