# Step 6 · A4 (Personal Note) — Screen build, Chunk 4

Chunk 4 of the per-screen spine plan (A7 ✅ → **A4** → A5 → A3 → C1–C3).
A4 is "the user's only creative input — treat it accordingly" (inventory
§A4): one optional 200-char field with a category-aware prompt. Building
it retires the second FOLLOW_UPS #38 stop-gap: A6's "Reshape your note"
and back chevron currently restart the flow; they should land here with
the note pre-filled, returning to A6 as a fresh generation.

**Authoritative prototype:** `prototypes/message creation/essence-step6-a4.html`
(Directions 1 + 5: stone-as-prompt input stage + honoring moment), plus
`ESSENCE_Step6_Message_Creation_Screen_Inventory.md` §A4.

## Scope (this chunk)

1. **Pure screen** — `src/components/screens/messages/PersonalNoteScreen.tsx`
   (+ `.types.ts`, `.css.ts`). Props-driven; `onSubmit(note | null)` and
   `onBack` bubble out.
2. **Dev sandbox** — `/dev/messages-note` (permanent): stage presets,
   category chips, reshape pre-fill, replay.
3. *After design sign-off:* the reshape wiring — A6's "Reshape" / back
   chevron → A4 (with `fromGenerationId` + prior note), submit →
   `POST /api/messages/generate` with `fromGenerationId` (new generation,
   `edit_note_depth + 1`, prior superseded on success per
   `API_CONTRACTS.md`) → route to the new generation's A6. Live verify.

Out of scope: slotting A4 into the `/messages/new` forward flow — that
needs A3 (Category) which doesn't exist; `MessageCreationFlow` keeps its
placeholder until A3's chunk. The reshape entry is independent and ships
now.

## Design contract (from the prototype)

- **Two stages.** Stage A (input): small ready stone (120px) → italic
  category-aware question → recessed honey textarea. Stage B (honoring
  moment): the user's note quoted in italic Spectral with smart quotes,
  quiet ack line, three pulsing dots; footer hidden. Skip bypasses the
  honoring moment entirely (inventory A4.c).
- **Morphing CTA (Direction 4):** empty field → ghost-link "Use a generic
  message"; any content → solid "Shape it from this". One button, two
  postures.
- **Living input field:** question recedes (opacity 0.35, −4px) while
  writing and returns when empty + blurred; ambient glow behind the
  textarea intensifies with content (stronger at 80+ chars).
- **Counter discipline:** hidden until 150 chars, warning color at 180,
  hard cap 200 (`maxLength`).
- **Entrance:** stone 100ms → question 300ms → textarea 500ms, each
  fade + 8px drift.
- **Chrome:** backbar chevron + 5 progress pips (A4 = third, first two
  done); display-only crumb "FOR {NAME} · {CATEGORY}" (locked: crumbs are
  tappable only through A3).
- **Stone stays `ready` throughout** — `working` belongs to A5.
- Reduced motion: entrance instant, recede/glow transitions instant,
  stone frozen via the canvas prop.

## Open copy decisions (prototype header; pending the validation task)

- **Category-aware question** — 7 strings needed (birthday, encouragement,
  daily, future, comfort, holiday, checkin). Until the validation task
  lands, all categories use the placeholder "What do you want them to
  know?" — the screen takes the category and maps through one table so
  the copy drop is a single-file change.
- **Honoring ack line** — placeholder "We'll bring this into your voice."
  (may become category-aware; same single-table shape).

## Decisions made in build (flag for design pass)

- **Failure return:** if `onSubmit` resolves not-ok during the honoring
  moment, the screen returns to the input stage with the note intact
  (generation failure UI is A5.b's territory; this just avoids a dead
  end before A5 exists).
- **Honoring hold:** the screen holds Stage B until the parent navigates
  (the `/generate` round-trip runs behind it — the pulsing dots read as
  work). A minimum 2.4s hold matches the prototype's intent.

## Build notes (first pass, 2026-06-12)

- **Prototype bug found and amended:** the entrance animation's
  `forwards` fill kept the keyframe's opacity pinned forever, so the
  prototype's own documented "question recedes while typing" behavior
  never fired (animation fill beats the normal cascade — the same family
  of bug as A7's reduced-motion pause). Both production and the prototype
  now use a `backwards` fill releasing to natural styles; recede verified
  at 0.35 in-browser.
- Background is `--color-bg-warm-phase` (A2/A6 parity), not the
  prototype's stale local warm-2 hex; CTA keeps `--shadow-mineral` to
  match its flow siblings (#40 re-keys them together).
- 4× CPU throttle: 8.3ms avg / 10.3ms worst frame across entrance and
  live typing (glow + recede are opacity/transform only).
- Reduced motion arrives complete; counter discipline verified
  (visible at 150, warning at 180, hard cap 200).

## Design-architect amendments (2026-06-12, approved + applied)

Six notes + omissions from the architect's prototype review. Production
was already clean on the ones that were prototype-scaffold bugs (canvas
stone has no CSS body loop; production used literal pip/dot sizes and
already had `aria-labelledby`); the rest applied to both. Recorded in the
prototype's AMENDMENTS header block.

1. **Pip / pulse-dot tokens** — `--pip-w-rest/--pip-w-active` were
   referenced but never declared in the prototype `:root`, collapsing
   both dot rows to zero. Defined. (Production unaffected — literal sizes.)
2. **Empty-skip fabricated a quote** — the prototype's empty path entered
   the honoring moment with a demo string the user never wrote. Gated:
   empty → a "skips to A5" placeholder, never the honoring moment; demo
   hydration is dev-rail-only. (Production already gated — `onSubmit(null)`
   never sets `submittedNote`.)
3. **Brightness filter on the stone breath** — dropped (prototype-only;
   production's canvas stone has no CSS loop).
4. **`aria-labelledby` on the textarea** — prototype-only (production had
   it from the first pass).
5. **Stale `--shadow-mineral`** — escalated from a per-screen note to the
   app-wide fix: re-keyed warm in `globals.css` (`rgba(110,80,40,.2)`),
   A7's local override graduated into the token. Verified the warm value
   now renders on A4, A7, A6 (Save + Hear), and the vault CTAs in one
   pass. **FOLLOW_UPS #40 resolved.**
6. **Honoring quote long-content sizing** — both files: steps to 20px past
   80 chars so a near-cap note composes instead of running 7+ lines.

Omissions also addressed (prototype): `--color-status-warning` promoted to
`:root`; halo offset to 5.5s (de-lockstepped from the 4s body); footer
scrim flattened in BOTH files (non-overlapping siblings — no scroll-under
to imply); reviewable "→ A5" seam note after the 2.4s hold.

The architect's **meta note** (no canonical prototype `:root`; the blocks
have drifted) is taken as the next cross-cutting pass: a token
reconciliation of all seven Step 6 prototypes against production
`@theme`, to run before A5 — pre-paying A5/A3/C1–C3.

## Live wiring — reshape path (#38), 2026-06-12

**Route:** `/messages/new/g/[generationId]/reshape` (`[generationId]` is
the row being reshaped == `fromGenerationId`). Deferred-only, mirroring
A6's flag gate.

- `page.tsx` — thin: auth, fetch prior row, derive A4 props (prior note
  pre-filled; recipient name + category label for the crumb; the
  recipient branch + `voiceProfileId` threaded through so the /generate
  schema's "exactly one recipient" + required fields hold even on the
  edit-note path). Guards: bad UUID / flag-off → 404; foreign row → 404;
  saved → its A7; superseded → flow start; **at the edit-note depth cap →
  back to A6** (the reshape door is already folded there).
- `ReshapeNotePageClient.tsx` — submit → `POST /api/messages/generate`
  with `fromGenerationId`. **The deferred reshape writes the reshaped
  text as a candidate back onto the SAME row** (no new generation,
  `edit_note_depth + 1`) and returns `{ candidate: true }`; on success the
  client routes to that row's A6, which opens in the candidate state.
- **A6 repoint:** `handleReshape` ("What it says") and `handleBack` now go
  to the reshape route (were the interim flow-start).

**Live-verified** (real server + DB, seeded row, magic-link login,
`DEFERRED_AUDIO_ENABLED=true`):
- A6 → "Make a change" → "What it says" → A4 reshape, crumb "For Maya ·
  Birthday", note pre-filled, CTA solid.
- Edited the note → "Shape it from this" → honoring moment → **real LLM
  reshape** → returned to the SAME A6 in the candidate state ("Here's
  another way to say it.").
- DB: still ONE row, `note` updated, real `candidate_text` written,
  `edit_note_depth: 1`, not superseded, no new lineage row — exactly the
  deferred contract.
- `step6_reshape_candidate` logged server-side (`success`, depth 1).
- Guards: depth-cap (set to 2) → redirect to A6; bad UUID 404; unknown
  UUID 404.
- Test data cleaned to zero; dev server stopped.

No unit test added: A4's logic is view-state (CTA morph, counter
thresholds, recede) with no extractable pure helper like A7's timestamp
formatter — those behaviors are covered by the Playwright pass.

## Status

- [x] Pure screen + dev page built — first design pass done
  (`/dev/messages-note`; screenshots in `.tmp/a4-*.png`)
- [x] Design-architect amendments applied (prototype + production); #40 resolved
- [x] Reshape wiring (#38) + live verify
- [ ] Commit (awaiting go-ahead)
- [ ] Design sign-off
- [ ] Reshape wiring (#38) + live verify
- [ ] Commit
