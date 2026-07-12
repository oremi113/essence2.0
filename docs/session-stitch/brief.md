# Session: Stitch — full-journey wiring prep

**Started:** 2026-07-10
**Goal:** Get all prep work done so the 10-step journey can be wired into one
navigable app (roadmap M4, "Full-journey wiring 1→10"). This session is the
*prep*, not the wiring itself.

## Why now

Per the reconciled status (2026-07-10), **every journey node exists in the repo**
— the "genuine unbuilt requirements" the 2026-07-06 scan feared are essentially
gone:

- Step 10 S10-A gen-failure ✅ (#88), S10-B offline ✅ (#89)
- C3 Vault Limit built **and** wired to the 3-message cap ✅ (#87; FU #38 resolved)
- First Breath audio (FU #41) resolved via a procedural Web Audio engine
  (`src/lib/audio/firstBreathAudio.ts`) — owner ear-review still pending, and
  stale `// TODO: audio` comments still sit in `FirstBreathSequence`
- `/home` already renders **Home B** (Home A is a roadmap ghost, not code)

So prep is small and splits three ways.

## ⚠️ Corrections after code-level verification (2026-07-10)

The cleanup agent verified the above against actual code on `main` (b99a9e4) and
found the docs overstated completeness. **Corrected reality:**

- **First Breath audio is NOT resolved.** FOLLOW_UPS #41 is marked ✅ RESOLVED but
  `src/lib/audio/firstBreathAudio.ts` **does not exist** (zero repo-wide hits). The
  `<audio>` elements in `FirstBreathSequence.tsx:171–173` are inert placeholders
  with no `src`; nothing ever `.play()`s. The `// TODO: audio` comments
  (`FirstBreathSequence.phases.ts:95/104`) are accurate. → **FU #41 needs
  re-opening; the ceremony audio is genuinely unbuilt, and S10-C (First-Breath
  playback error) is still blocked by it.**
- **`record/complete/stub` is NOT dead — it's a live seam.** `FirstBreathSequence.tsx:103`
  pushes the user to `ROUTES.recordCompleteStub` at the END of the ceremony, i.e.
  First Breath currently terminates on a static "Voice Vault coming soon"
  placeholder. This is a **wiring gap, not a cleanup** — the ceremony's exit edge
  needs a real destination. `record/complete/page.tsx` is the ceremony host page,
  also live. Nothing was deleted.
- **Home A** — no distinct component/route, but there's a live inline placeholder
  branch at `home/page.tsx:63–79` for `voiceProfile.status !== "ready"`. A real
  decision (build its brief vs. fold into Home B), not just a roadmap ghost.
- **Checkout path is clean:** single entry `POST /api/stripe/create-checkout-session`,
  reached only from vault seal/protect/restore actions. No stray checkout routes.

## The three prep buckets

**1. Close the last journey beats** *(real code — main agent)*
- S10-C First-Breath playback-error state — was blocked on FU #41; now unblocked,
  likely still unbuilt. Verify + build.
- Consolidated warm-voice error-copy pass (Step 10 X) across all error surfaces
  (Ch2 + A5 + gen-fail + offline) now that they've settled.
- Confirm First Breath audio is actually wired into the consumer + owner ear-review.

**2. Cheap cleanups** *(delegated to a background agent, 2026-07-10)*
- Remove dead `src/app/app/record/complete/stub/` (verify-before-delete);
  confirm Card Capture is the only live checkout path.
- Confirm `/home` = Home B in code, close the Home A ghost.
- Verify First Breath audio wiring; fix stale TODO comments if the audio is live.

**3. The integration map** *(the actual precondition for wiring — main agent)*
- `integration-map.md`: every screen → route → entry/exit edges → guard matrix
  (auth / subscription status / 3-message cap / onboarding-complete / voice-profile
  gates) → shared-state model → orphan/seam findings.
- This subsumes discovery for buckets 1 & 2: naming every node and edge is what
  surfaces missing edges, orphan routes, and un-enforced guards.

## Deliverables

- [ ] `docs/session-stitch/integration-map.md` — the nav graph + guard matrix
- [ ] Cleanup agent report folded in (stubs removed, checkout path confirmed)
- [ ] A concrete, verified punch-list for the wiring itself (edges to build,
      seams to harden, guards to enforce)

## Constraints

- No commits without owner consent (per CLAUDE.md § How we work together).
- URLs are backend — never renamed during this work (DECISIONS lock).
- Root-cause over band-aid on any bug the map surfaces.
