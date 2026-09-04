---
id: 2026-09-04-cost-limit-block-renders-as-a-transient-failure
priority: P3
status: open
opened: 2026-09-04
resolved:
summary: "A 429 cost-limit block shows A5's \"Something slipped on our end / Try again\" — a permanent wall dressed as a transient blip *(found in beta, 2026-09-04)*"
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
