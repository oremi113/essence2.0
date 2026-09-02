---
id: 2026-07-12-record-animation-frame-pressure-under-cpu-throttle
priority: P3
status: open
opened: 2026-07-12
resolved:
summary: Record screen animation is a frame-rate outlier under CPU throttle — 42fps @4×, 26fps @6× vs ~120 on idle screens — the one screen that visibly misses the motion bar *(qa-scout full-sweep 2026-07-12)*
---

# Record screen shows real frame pressure under CPU throttle

*(qa-scout full-sweep 2026-07-12)*
Measured on `/dev/record` at the repo's motion bar (iPhone 13 390×844, CDP CPU
throttling). The Record animation is a clear outlier: **42fps at 4× throttle,
26fps at 6×**, against a ~120fps baseline on idle screens (onboarding 85/54,
processing 120, first-breath 120). At 6× it visibly drops toward 25fps — i.e.
meaningful main-thread work is happening during its animation loop rather than
the compositor handling it.

Measured on the `/dev/record` surface because the real `/app/record` route
redirects to `/app/vault/protect` for the QA test account's current state, so
the production route couldn't be driven directly this pass.

**Why it matters:** CLAUDE.md names *4× CPU throttle on a mobile sim* as the
shippability bar for motion — "if it feels off at 4× here, it feels off on a
real mid-range Android at 1×." Record is the one core screen that misses it. The
record moment is a first-impression, high-emotion beat; jank there is
disproportionately damaging.

**Fix shape:** profile the waveform/orb animation (likely a `<canvas>` rAF loop —
the same continuously-animating canvas that hangs Playwright's screenshot
stability wait). Push motion onto GPU-only `transform`/`opacity`, throttle or
coalesce canvas redraws, and avoid per-frame layout reads/writes. Re-measure at
4× and 6× on `/dev/record` after.

**Pick up when:** next time the record/voice UI is touched, or before a launch
motion pass. Confidence: medium — dev surface + a relative FPS counter, not the
production route; confirm on `/app/record` once an account state can reach it.
