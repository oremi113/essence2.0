---
id: 2026-08-04-voice-profile-lookup-missing-order
priority: P3
status: open
opened: 2026-08-04
resolved:
owner_paired: false
summary: `getOrCreateVoiceProfile` reads an arbitrary voice-profile row (`.limit(1)` with no `.order()`) while every other guard reads the newest — for a user with more than one profile the processing→reveal→record-complete chain can desync *(triage 2026-08-04)*
---

# `getOrCreateVoiceProfile` picks a non-deterministic row — diverges from the other guards' "newest"

*(triage 2026-08-04 — spine integration read)*

`src/lib/profile/voice.ts:34-39`

```js
const { data: existing } = await supabase
  .from("voice_profiles")
  .select("*")
  .eq("user_id", user.id)
  .limit(1)          // <-- no .order()
  .maybeSingle();
```

There is **no `.order()`**, so with more than one `voice_profiles` row for a user the result is
whichever row Postgres returns first — arbitrary. Every sibling lookup reads the *newest* explicitly:
the First-Breath guard `src/app/app/record/complete/page.tsx:16-22` uses
`.order("created_at", { ascending: false })`, and Home resolves its profile the same way. The
Processing page decides its Reveal redirect from this helper
(`src/app/app/voice/processing/page.tsx:68-69`: `if (voiceProfile.status === 'ready') redirect(vaultReveal)`).

**Why it matters:** for a returning user who ends up with more than one profile (e.g. an archived old
voice plus a fresh one), `getOrCreateVoiceProfile` can resolve an *old* `ready` profile and jump
straight to the Reveal, while `record/complete` — reading the newest — sees the new one still
`processing` and bounces them back. That's a silent state desync across the processing → reveal →
record-complete chain. Latent today (first-run users have exactly one profile), but a real
correctness defect the moment a second profile can exist, and the fix is one line.

**Fix shape:** add `.order("created_at", { ascending: false })` before `.limit(1)` so every caller
agrees on "the current profile." Cheap and removes the divergence from the sibling guards.

**Pick up when:** next voice-profile / guard touch, or before any feature that lets a user hold more
than one voice profile (re-creation, archival + new).
