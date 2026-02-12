
# ESSENCE
Clean Rebuild – Migration Architecture


## Phase 0: Decision Locks + Repo Foundation

This repository represents a clean rebuild of ESSENCE.

Phase 0 exists to:
- Lock architectural decisions
- Establish infrastructure
- Create documentation
- Prepare for implementation

There is intentionally **no product logic in this phase**.


---


## Architecture (Locked)

- Next.js App Router (Vercel)
- Supabase Auth
- Supabase Postgres
- Supabase Storage (direct uploads via signed URLs)
- ElevenLabs (server-side only)
- Direct SQL (no ORM abstraction layer)
- Synchronous processing for MVP


---


## Core Primitives (Locked)

- User
- VoiceProfile
- TrainingClip
- Message
- Recipient


---


## Non-Negotiables

- Audio is never stored in the database
- Server decides, client requests
- Messages are immutable
- No scope creep beyond MVP


---


## MVP Definition

Onboarding  
→ Voice Training  
→ Voice Creation  
→ Generate 1 Message  
→ Playback  
→ Basic Memory Shelf  

Anything outside this flow is out of scope for MVP.


---


## Phase 0 Scope

Included in Phase 0:

- Repository setup
- CI configuration
- Environment structure
- Supabase project setup
- Storage bucket creation
- Decision documentation
- API contract definition

Not included in Phase 0:

- Feature UI
- Business logic
- ElevenLabs integration
- Database implementation beyond structure planning


---


## Local Development

1. Clone the repository

2. Install dependencies

```

npm install

```

3. Create local environment file

```

cp .env.example .env.local

```

Fill in required keys:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- ELEVENLABS_API_KEY

4. Start development server

```

npm run dev

```

App runs at:
http://localhost:3000

Health check endpoint:
http://localhost:3000/health


---


## Environment Rules

- Service role key is server-only
- ElevenLabs key is server-only
- No secrets in client code
- No secrets committed to Git


---


## Documentation

All architectural decisions live in:

/docs

Key files:
- DECISIONS.md
- STORAGE_PATHS.md
- API_CONTRACTS.md
- SECURITY.md
- RUNBOOK.md

These documents are part of the architecture.


---


## Phase 0 Exit Criteria

Phase 0 is complete when:

- Repo builds and deploys
- CI passes
- Supabase project is configured
- Storage buckets are created
- Environment variables are validated
- All architectural decisions are documented

Only then does feature development begin.
