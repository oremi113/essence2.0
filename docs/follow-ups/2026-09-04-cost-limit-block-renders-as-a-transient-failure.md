---
id: 2026-09-04-cost-limit-block-renders-as-a-transient-failure
priority: P3
status: resolved
opened: 2026-09-04
resolved: 2026-09-21
summary: "RESOLVED 2026-09-21 — A 429 cost-limit block shows A5's \"Something slipped on our end / Try again\" — a permanent wall dressed as a transient blip *(found in beta, 2026-09-04)*"
---

# A permanent cost-limit block is rendered as a retryable failure

*(observed live in the beta, 2026-09-04)*

`src/app/messages/new/MessagesNewPageClient.tsx` (`handleGenerate`) ·
`src/components/screens/messages/GenerationScreen.tsx:60-72`

`handleGenerate` treats only `status === 200 && generationId` as success;
everything else collapses to `{ ok: false }`. So a `429
{ code: 'cost_limit_blocked', limit_kind }` renders A5's generic failure:

> **Couldn't quite land it.** Something slipped on our end. Nothing is lost.
> — *Try again*

For a cap that is genuinely permanent until state changes, all three lines are
wrong. Nothing slipped, it wasn't our end, and "Try again" cannot succeed. The
owner hit exactly this: a `pending_max` block from a generation stranded by the
A6 404, retried, and got the same warm apology every time.

The route already sends `limit_kind` precisely so the client can distinguish
these (it also drives the `step6.cost_limit_blocked` analytics event, #14) — the
client just drops it.

**Why it matters:** the failure that most needs a different next step is the one
that looks identical to a network blip. It costs the user a retry loop and costs
support a ticket that reads as "generation is broken".

**Reduced, not removed, by the 2026-09-04 fix:** `/messages/new` now clears an
abandoned pending row on entry, so `pending_max` is near-unreachable from the
UI. `hourly_max` (20/rolling hour) still is, and would read exactly the same.

**Fix shape:** thread the parsed `{ code, limit_kind }` back through
`PersonalNoteSubmitResult` and give A5 a distinct beat for a cap — plainly
stating the limit and when it lifts, with a next step that is real (wait /
return home), not "Try again". Keep the warm register; only the diagnosis and
the CTA change.

**Pick up when:** next touching A5, or the first support ticket that describes a
retry loop on message generation.


---

## Resolved — 2026-09-21

A5 gained a third status, `blocked`, distinct from `failed`. The 429's
`limit_kind` is parsed in `MessagesNewPageClient.handleGenerate`, threaded
through `PersonalNoteSubmitResult` as `{ ok: false, blocked }`, mapped by
`MessageCreationFlow` to the new status, and rendered by `GenerationScreen`
from a per-kind copy table.

What changed for the user: no retry is offered at all, because none can
succeed. The one CTA is **Back to Home** — the existing string from
`ThreeShapedScreen` / `WaitlistScreen`, not a new one. The copy follows the
guide's failure shape (state it plainly without blame, reassure what is safe,
one real next step) and keeps the warm register; only the diagnosis and the
CTA changed, as this item asked.

Per-kind copy: `hourly_max` names the hour; `pending_max` says another message
is still being shaped; the reshape caps say the version count is spent. An
unrecognised `limit_kind` falls back to calm generic copy rather than blank or
a confident wrong reason — so a cap added server-side later cannot render
nonsense here.

`failCount` is deliberately **not** incremented on a cap. Hitting a rate limit
three times must never push the user into the 3-attempt contact-as-care beat:
support cannot lift a rate limit, and offering help there would waste both
people's time.

Covered by `tests/unit/messages-new-cost-limit-parse.test.ts` (the parse — 6
cases including a plain 500 and a non-cap 429, both of which must keep their
retry) and the blocked block of `tests/unit/generation-screen.test.tsx` (the
render — 7 cases including the unknown-kind fallback). Dev variants added to
`/dev/messages-generation` per the permanent-scaffolding rule.

**Not covered by a test:** the three-line mapping inside
`MessageCreationFlow.runGenerate`. Driving A2 → A3 → A4 in jsdom to reach A5
proved brittle, so it was abandoned rather than shipped flaky; the mapping is
typechecked and was verified by hand in `/dev/messages-generation`.
