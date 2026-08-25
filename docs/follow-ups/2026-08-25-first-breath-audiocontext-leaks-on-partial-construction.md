---
id: 2026-08-25-first-breath-audiocontext-leaks-on-partial-construction
priority: P3
status: open
opened: 2026-08-25
resolved:
owner_paired: false
summary: First-Breath audio: a throw *after* `new AudioContext()` leaks the open context (never closed), accelerating the exhaustion S10-C was written to prevent *(triage 2026-08-25)*
---

# First-Breath audio leaks an AudioContext when graph construction throws partway

*(triage 2026-08-25)*
`src/lib/audio/firstBreathAudio.ts:299-323` — the S10-C guard wraps graph construction in a `try`
that returns `null` on any throw (so callers no-op and the ceremony degrades to silence). But `ctx`
is declared **inside** the `try` (l.300: `const ctx = new Ctor()`). If `new Ctor()` succeeds —
consuming one of the browser's ~6 concurrent-AudioContext slots — and a *later* line throws
(`ctx.createConvolver()` at l.313, `makeImpulseResponse`'s `createBuffer`, or any `connect()`), the
`catch` at l.320 returns `null` with no reference to the already-open context and no `ctx.close()`.
The slot is abandoned open.

**Why it matters:** this is a resource leak on the exact error path S10-C added to *defend against*
context exhaustion ("the browser's concurrent-context cap (~6) is reached by repeated navigation").
On a device already near the cap, repeated navigation through First Breath can open a context, fail
partway through wiring, and abandon it — each such failure permanently consumes a slot, accelerating
the exhaustion rather than degrading gracefully. Low-to-moderate likelihood (the dominant thrower,
`new Ctor()` itself, leaves nothing to leak; the leak only bites when construction succeeds but a
subsequent graph call throws), and the ceremony still degrades to silence — so it's a correctness
ticket, not a blocker.

**Fix shape:** declare `ctx` before the `try` (or restructure so the `catch` can see it), and
`ctx.close()` on any post-construction throw before returning `null`. Keep the null-return contract
callers already rely on.

**Pick up when:** next First-Breath / audio-engine touch, or a device-QA pass on lower-end hardware
where the context cap is realistic. Landed with S10-C (commit 974c5d4).
