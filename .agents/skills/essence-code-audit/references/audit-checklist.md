# Audit checklist, exact commands and grep patterns

Companion to `SKILL.md`. These are the precise incantations. Run from the repo
root. Replace `RANGE` with the diff range under audit (default
`origin/main...HEAD`). Everything here is read-only.

## 0 · Scope and gates

```bash
git fetch origin main --quiet
git diff --stat RANGE
CHANGED=$(git diff --name-only RANGE)
echo "$CHANGED"

npm run typecheck
npm run lint            # includes no-unchecked-supabase-write + check-em-dashes
npm run test:unit
```

To restrict greps to changed files only:

```bash
git diff --name-only RANGE | grep -E '\.(ts|tsx|css)$'
```

## Lens 1 · Token drift

```bash
# Canonical token names (the source of truth)
awk '/@theme[[:space:]]*\{/{f=1} f{print} f&&/^\}/{exit}' src/app/globals.css \
  | grep -oE -- '--[a-z0-9-]+:' | sort -u

# Raw hex / rgba inside layer-3 components (should be zero, except prototype-local)
grep -rnE '#[0-9a-fA-F]{3,8}\b|rgba?\(' src/components/screens src/components/ui \
  | grep -vi 'prototype-local'

# Every var(--x) referenced in screens/ui, cross-check against the @theme list above
grep -rhoE 'var\(--[a-z0-9-]+' src/components/screens src/components/ui \
  | sed 's/var(//' | sort -u

# Banned: brightness filter, and ease-breath outside Stone
grep -rnE 'filter:\s*brightness' src/
grep -rn 'ease-breath' src/components/screens   # should only appear in Stone code

# Mirror drift: does design-tokens.md still match the source?
grep -n 'Last synced' docs/design-tokens.md
# spot-check a few hexes by hand; the mirror is allowed to be stale, the
# source is not. If they differ, the fix is to regenerate the mirror.
```

Find tokens referenced but never declared (cheap drift catch):

```bash
comm -23 \
  <(grep -rhoE 'var\(--[a-z0-9-]+' src/components/screens src/components/ui | sed 's/var(//' | sort -u) \
  <(awk '/@theme[[:space:]]*\{/{f=1} f{print} f&&/^\}/{exit}' src/app/globals.css | grep -oE -- '--[a-z0-9-]+' | sort -u)
# any line printed = a var() with no matching @theme declaration.
# Expect some legitimate noise: vars set locally via inline style or a
# component-scoped block (e.g. --fx, --scale-press, .shelf effect values)
# are fine. The ones that matter are stray COLOR or SHADOW tokens that
# should have been declared in @theme.
```

## Lens 2 · Three-layer / spec

```bash
# Supabase, fetch, redirect, or server actions leaking into screens (should be zero)
grep -rnE "from ['\"]@/lib/supabase|\bfetch\(|from ['\"]next/navigation['\"].*redirect|use server" \
  src/components/screens

# Pages that grew fat (rough heuristic: page.tsx with lots of JSX branching)
for f in $(git diff --name-only RANGE | grep 'page\.tsx$'); do
  echo "$f: $(grep -cE '\? .*:|&&|map\(' "$f") branch-ish lines"
done

# URL/route renames in this change (backend surface, should be deliberate)
git diff RANGE -- 'src/app/**/route.ts' 'src/app/**/page.tsx' | grep -E '^\+\+\+|^---|rename'
git diff --summary RANGE | grep -i rename

# New screen without a /dev page
for s in $(git diff --name-only RANGE | grep 'components/screens/.*Screen\.tsx$'); do
  name=$(basename "$s" .tsx)
  ls src/app/dev/ | grep -iq "${name%Screen}" || echo "MISSING /dev page for $name"
done
```

## Lens 3 · Bug classes

```bash
# Unchecked Supabase writes, the ESLint rule is authoritative, but a quick grep:
grep -rnE '\.(insert|update|upsert|delete)\(' src/app/api src/lib \
  | grep -vE 'checkedWrite|bestEffortWrite|const \{ ?error'
# then read each hit: is { error } captured, or is it a bare discarded statement?

# Success / usage recorded, check it sits BELOW the fallible work, not above
grep -rnE 'logUsage|recordUsage|\bready\b|played_count|markReady' src/app/api src/lib

# localStorage used for something that should be account-durable
grep -rnE 'localStorage|sessionStorage' src/

# Dead / orphaned API POSTs that still spend ElevenLabs
grep -rln 'elevenlabs\|ElevenLabs\|xi-api-key' src/app/api
# cross-check each route is still reached by a caller in the current nav/spine
```

The write helpers, for reference:

- `checkedWrite(...)` and `bestEffortWrite(...)`, `src/lib/supabase/checked-write.ts`
- The ESLint rule, `eslint-rules/no-unchecked-supabase-write.mjs`

## Lens 4 · Process locks and ledger

```bash
# server-only guard on anything touching the ElevenLabs key or service role
grep -rLn 'import ["'\'']server-only["'\'']' \
  $(grep -rlnE 'xi-api-key|SERVICE_ROLE|service_role|elevenlabs' src/lib/server src/app/api 2>/dev/null)
# files listed = touch a secret but lack the server-only import

# NEXT_PUBLIC_ leaking a secret
grep -rnE 'NEXT_PUBLIC_.*(ELEVEN|SERVICE_ROLE|SECRET|API_KEY)' src/

# TODOs without a FOLLOW_UPS entry
grep -rnE '//\s*TODO' src/ | grep -v node_modules

# Telemetry changed but no analytics note in the same change
git diff --name-only RANGE | grep -qE 'analytics|track|event' \
  && (git diff --name-only RANGE | grep -q 'docs/analytics/' \
      || echo "Telemetry touched but no docs/analytics/ note in this change")

# Em dashes in prompt copy (guard covers script.ts; check new copy files too)
grep -rn '—' src/lib/voice-training/ src/components/screens/ 2>/dev/null
```

## DECISIONS locks (quick reference)

Cross any of these only with an explicit owner decision and a DECISIONS update:

- ElevenLabs / service-role keys are server-only; client never calls third
  parties directly.
- SQL direct, no ORM.
- Synchronous processing for MVP, no job/cron system.
- Audio stored as paths/references only, never in the DB.
- Messages are immutable (edit = new version/message).
- URL paths are stable across redesigns.
- MVP scope holds; new features update `docs/DECISIONS.md` first.
