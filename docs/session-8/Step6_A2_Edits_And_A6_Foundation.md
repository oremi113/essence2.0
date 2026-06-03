# Step 6 — A2 Edits + A6 Foundation

For the design architect agent. Two parts:

- **Part 1** — surgical edits to the A2 draft to lock alignment with the existing Step 6 prototype family.
- **Part 2** — foundation decisions for A6 (Preview & Refine) so you start with a clear floor and only spend creative energy on the parts that need it.

Where the original A2/A6 brief had open questions, this doc resolves the ones I can resolve and explicitly marks what's still yours. Treat this as superseding the brief's "open questions" where overlap exists.

---

# PART 1 — A2 EDITS

The A2 draft (`essence-step6-a2.html`) is structurally sound. Token set, phone frame, backbar shell, footer, primary button, dev-rail, reduced-motion fallback — all aligned with a3. The fixes below are surgical, not a rebuild.

## A2.1 — Lock the screen family

**Decision: A2 belongs to the intimate / tone-setting family (a4's pattern), not a3's selection-screen pattern.**

Reasoning: A2 is the front door, no prior context exists, the stone is setting tone. a4 has the same shape (stone + italic question + form below). a3 has prior context ("For Sarah") and uses upright `.title` + eyebrow because the screen is denser. This is a deliberate two-family taxonomy across the flow:

- **Intimate family (A2, A4, A6, A7):** stone present, italic Spectral prompt, centered head, left-aligned content below.
- **Selection family (A3):** no stone, eyebrow context, upright `.title`, full left-aligned head, selectable list.

**Action:** keep A2's italic `.prompt-question` + centered stone. Do not switch to a3's eyebrow + upright title pattern.

## A2.2 — Pip count: 3 → 5

The backbar pips represent the user-input steps of the flow, not the loading states.

**Locked count: 5 pips.** Order: recipient · category · note · preview · save.

**Apply to every A2 variation (a, b, c):**

```html
<div class="backbar__pips">
  <span class="backbar__pip is-current"></span>  <!-- 1: recipient (you are here) -->
  <span class="backbar__pip"></span>              <!-- 2: category -->
  <span class="backbar__pip"></span>              <!-- 3: note -->
  <span class="backbar__pip"></span>              <!-- 4: preview -->
  <span class="backbar__pip"></span>              <!-- 5: save -->
</div>
```

This matches a3's pip count exactly. a3's first pip uses `is-done` (completed gold) and second pip uses `is-current` — that pattern will hold for A3 onward.

## A2.3 — Class rename: `.recipient-card` → `.selectable-card`

A2's `.recipient-card` is structurally and visually identical to a3's `.selectable-card`. Same surface color, same radius, same selection treatment (gold bg + mineral border + check icon), same hover/active. Different name, same component.

**Action:** rename A2's `.recipient-card` class to `.selectable-card` and reuse a3's existing CSS. The avatar circle on the left becomes a generic icon slot — `.selectable-card__icon` — which a3 already uses for category icons and A2 uses for the recipient initial.

Exact mapping:

| A2 (current) | Rename to (a3 canonical) |
|---|---|
| `.recipient-card` | `.selectable-card` |
| `.recipient-card__avatar` | `.selectable-card__icon` |
| `.recipient-card__main` | `.selectable-card__main` |
| `.recipient-card__name` | `.selectable-card__name` |
| `.recipient-card__rel` | `.selectable-card__sub` |
| `.recipient-card__check` | `.selectable-card__check` |

`.recipient-add` keeps its name (it's a distinct quieter ghost-card variant).

Strip A2's `.recipient-card` block from the stylesheet entirely after renaming — its rules duplicate a3's `.selectable-card` definitions verbatim. The single shared definition reads as one component used in two contexts.

## A2.4 — Stone scale: lock at 140px

**Locked: `--stone-md` (140px) on A2, Ready state.** Reasoning matches the architect's original memo — A2 is the tone-setter, the stone is the visual anchor, no competing input dominates the screen.

(Note: a4 uses `--stone-sm` because the textarea is the star there. A2's slightly larger stone is intentional, not inconsistent.)

Stage tokens for the stone, locked across A2:
- Width / height: `var(--stone-md)` (140px)
- Body gradient: `radial-gradient(circle at 30% 28%, #FBF2DC 0%, #E8CF9A 28%, #C9A665 60%, #8A6F3E 90%)`
- Halo: `radial-gradient(circle, rgba(255,220,160,0.22), transparent 62%)`, inset −28%
- Breath: `@keyframes stoneBreath` 4s with scale 1 → 1.025
- Halo pulse: `@keyframes stoneHalo` 4s with opacity 0.12 → 0.18

Confirm these match a4's stone definitions exactly. If they drift, align to a4 (the canonical Ready stone).

## A2.5 — Sub-text format on `.selectable-card__sub`

A2.b shows the two-Sarah disambiguator with `·` separator: *"Your daughter · last message, Birthday"*.

**Lock: the `·` separator pattern is allowed inside `.selectable-card__sub`.** When sub-content has two parts, separate with ` · ` (space + middle dot + space). When it has one part, no separator. This rule extends to a3's `.selectable-card__sub` too — it's a shared component.

If a3 doesn't currently render a multi-part sub-line, that's fine; the pattern is opt-in. The CSS for `.selectable-card__sub` doesn't need any change — it's already a single text line; the separator is a copy detail.

## A2.6 — Label casing

A2's chip labels are title case ("Spouse / Partner", "Someone else"). Option labels (chips, cards) stay title case. Form prompts ("How would you describe them?") stay sentence case. This matches a3 ("Birthday", "Just checking in" — title case; "Pick the shape. The words come next." — sentence case). No change needed; just confirming the rule for A6.

## A2.7 — Trust-line copy

The architect already flagged "This only helps shape this message" as a copy-pass candidate. Leave as-is. Final wording belongs to a separate copy/legal pass. Mark with the existing `<!-- DESIGN OPEN -->` comment.

## A2.8 — Sample data in A2.b

Three recipients (Sarah, Sarah, Mateo) demonstrate the duplicate-name disambiguator and hit the 3-recipient lifetime cap. Keep as is. The "+ Add someone new" ghost card sits at the bottom. Architect's instinct that this stacks cleanly at 1 / 2 / 3 is correct.

---

# PART 2 — A6 FOUNDATION

A6 (Preview & Refine) is the emotional climax of the flow — the user hears the message in their own voice for the first time. The original brief surfaced 9 open questions. This part locks 6 of them, gives a lean on 2, and leaves 1 fully open.

## A6.1 — Screen family: intimate (same as A2 / A4)

**Locked.** A6 uses the intimate family treatment:
- Stone present and prominent (it animates during playback — see A6.4 below)
- Italic Spectral question/affirmation as the prompt anchor, NOT upright `.title`
- Centered head, left-aligned content below
- No eyebrow

The prompt-question wording is a copy decision (architect can propose). A working example: *"Here it is, in your voice."*

## A6.2 — Pip state

5 pips, pip 4 (`preview`) is `is-current`, pips 1–3 (`recipient`, `category`, `note`) are `is-done` (gold), pip 5 (`save`) is rest.

```html
<div class="backbar__pips">
  <span class="backbar__pip is-done"></span>
  <span class="backbar__pip is-done"></span>
  <span class="backbar__pip is-done"></span>
  <span class="backbar__pip is-current"></span>
  <span class="backbar__pip"></span>
</div>
```

a3's `.backbar__pip.is-done` style already exists (gold fill, rest width). Reuse it.

## A6.3 — Variations to render in the dev-rail

**Locked: 4 variations.** All share one phone frame; only one visible at a time. Mirror the A2 / pass2-c-screens dev-rail pattern.

| Code | State | Notes |
|---|---|---|
| A6.a | First listen | Untouched. Audio playing. Stone in Playback. 3 regenerations remaining. |
| A6.b | After regenerate | New content. Stone in Playback. 2 regenerations remaining. |
| A6.c | Cap reached | Stone in Playback. Regenerate CTA softened (see A6.7). No regenerations remaining. |
| A6.d | Discard confirmation | Bottom sheet over the A6.a layout. (See A6.10.) |

`<!-- DESIGN OPEN -->` if depth-2 reshape-cap reached (architect's earlier proposal stands — quiet inline disable of the reshape link, no separate panel).

## A6.4 — Breath Stone behavior

**Locked: stone scales with playback state.**

- At rest (audio loaded, not yet playing OR paused): `--stone-md` (140px), Ready state — same as A2.
- During active playback: `--stone-lg` (180px), Playback state — slightly larger, slower breath cadence (5s instead of 4s), gentle warm halo intensifies.
- During regenerate transition: Working state (mineral-tinted, slow shimmer) at `--stone-md` until new audio is ready.

**Locked Playback-state stone tokens:**
- Body: same gradient as Ready (warm honey), no color change. The change is *scale and breath cadence*, not hue.
- Halo: `radial-gradient(circle, rgba(255,220,160,0.32), transparent 64%)` — slightly more visible (`0.22 → 0.32`).
- Breath animation: `transform: scale(1) → scale(1.04)` over 5s (vs 4s @ 1.025 at rest). Slightly bigger, slightly slower — reads as "the stone is alive in this moment."
- Reduced-motion: stone stays at `--stone-lg`, no animation.

**Working-state stone tokens** (for regenerate transition):
- Body gradient adds a cool sweep: `radial-gradient(circle at 30% 28%, #FBF2DC 0%, #E8CF9A 28%, #A8A89A 70%, #6B6B6B 95%)`.
- No breath; replace with a slow shimmer rotation 8s linear infinite.
- Reverts to Playback state when audio is ready.

## A6.5 — Audio playback control

**Locked: visible scrubber + play/pause toggle, sitting below the stone, above the transcript.**

Component shape:

```
[ ⏵ / ⏸ ]  ━━━━━━━━━━━●━━━━━━━━  0:12 / 0:28
```

Tokens:
- Play/pause button: 52px round, `background: var(--color-surface-honey)`, color `var(--color-text-primary)`. On press, `transform: scale(var(--scale-press))`.
- Scrubber track: 4px height, `background: rgba(122,128,136,0.20)`, `border-radius: var(--radius-full)`.
- Scrubber fill: same height, `background: var(--color-mineral)`.
- Scrubber thumb: 14px circle, `background: var(--color-mineral)`, drop shadow `0 2px 6px rgba(0,0,0,0.18)`.
- Time labels: `font-family: var(--font-body)`, `font-size: var(--text-small)`, `color: var(--color-text-secondary)`, tabular-nums.

## A6.6 — Transcript display

**Locked: full transcript visible at once, no scroll under playback bar.** Messages are 10–30 seconds spoken (~50–120 words), which fits a phone viewport. If a specific generation overflows, the body scrolls naturally (existing `.body { overflow-y: auto }`).

Treatment:
- `font-family: var(--font-display)` (Spectral)
- `font-size: var(--text-body-lg)` (18px)
- `line-height: 1.55`
- `color: var(--color-text-primary)`
- No background, no border, no quote marks — let it breathe.
- Padding: `var(--space-lg) 0 var(--space-xl)` (top sits below the scrubber, bottom sits above the action buttons).
- Max-width to keep line length comfortable: full inner width is fine on a 390px phone (≈ 342px content area). No max-width override.

## A6.7 — Action button hierarchy

**Locked: three actions, distinct visual weight.**

| Action | Visual | Tokens |
|---|---|---|
| **Save** | Primary — same as a3's `.btn` (mineral fill, white text, full width, 52px) | `background: var(--color-mineral) #7A8088`, `color: #fff`, `box-shadow: var(--shadow-mineral)` |
| **Regenerate** | Secondary — full width, surface fill, no shadow | New class `.btn-secondary`: `background: var(--color-surface-honey) #F2E8D6`, `color: var(--color-text-primary)`, `border: 1.5px solid rgba(122,128,136,0.30)`, same 52px height, same `--radius-lg` |
| **Discard** | Tertiary — text-only, no fill | `background: transparent`, `color: var(--color-text-secondary) #6B6B6B`, `font-size: var(--text-body)`, `font-weight: 500`, underline on hover. Centered. |

**Stacking order (top to bottom in the footer):**
1. Save (primary)
2. Regenerate (secondary)  
3. *"Reshape your note"* (text link — see A6.8)
4. Discard (text link)

Gap between buttons: `var(--space-md)` (12px). Gap between buttons and text links: `var(--space-lg)` (16px). Gap between the two text links: `var(--space-sm)` (8px).

**A6.7 cap-reached (variation A6.c):**
When regenerations are exhausted, replace the Regenerate button with quiet inline copy:

```html
<p class="cap-note">You've regenerated three times — save, reshape your note, or discard.</p>
```

Tokens for `.cap-note`:
- `font-family: var(--font-body)`
- `font-size: var(--text-body)` (16px)
- `color: var(--color-text-secondary)` (#6B6B6B)
- `text-align: center`
- `line-height: 1.5`
- Padding: `var(--space-md) 0`
- No background, no border.

The Save button remains. "Reshape your note" link remains (unless reshape-depth is also at cap — see A6.9). Discard remains.

## A6.8 — "Reshape your note" placement

**Locked: text link, third from top in the footer stack, below Regenerate, above Discard.**

Tokens for `.btn-link` (reuse for both Reshape and Discard):
- `background: transparent`
- `color: var(--color-text-secondary) #6B6B6B`
- `font-family: var(--font-body)`
- `font-size: var(--text-body)` (16px)
- `font-weight: 500`
- `border: 0`
- `padding: var(--space-sm) var(--space-md)`
- `text-align: center`
- Hover: `color: var(--color-text-primary) #1C1A18`, underline.

## A6.9 — Regenerations-remaining indicator

**Lean (not locked):** three small dots beside the Regenerate button, in the button's content area.

- Filled dots = regenerations available
- Empty dots = regenerations spent
- Hue: filled `var(--color-mineral) #7A8088`, empty `rgba(122,128,136,0.25)`
- Size: 5px circles, 4px gap
- Position: trailing the "Regenerate" label, separated by `var(--space-sm)` (8px)

This is a lean because I want the architect to test alternatives in the prototype before locking. The brief's other candidates (radial indicator on the button, breath-stone hue shift) are also viable. **Pick one in the build, document the reasoning in the inline memo, mark as `DESIGN OPEN`.**

Avoid: numeric ("2 of 3 left") — feels like a credit counter, undercuts the calm register.

## A6.10 — Discard confirmation (A6.d)

**Locked: bottom sheet.** Not center modal, not full overlay.

Reasoning: bottom sheet preserves the A6 context behind it (user still sees the stone, scrubber, transcript) — keeps the discard from feeling like a hard departure. Center modal would visually evict the whole screen. Full overlay is overkill for a soft confirmation.

Component shape:

```
┌─────────────────────────────────────┐
│ (A6.a backdrop dimmed to ~40%)      │
│                                     │
│                                     │
│ ╭─────────────────────────────────╮ │
│ │ ━━━ (drag handle)              │ │
│ │                                 │ │
│ │ Discard this message?           │ │
│ │ Your voice will remain          │ │
│ │ preserved.                      │ │
│ │                                 │ │
│ │ [   Discard   ]                 │ │
│ │   Keep it                       │ │
│ ╰─────────────────────────────────╯ │
└─────────────────────────────────────┘
```

Tokens:
- Sheet background: `var(--color-bg-warm-phase) #F2EDE4`
- Sheet radius: `var(--radius-2xl)` (16px) on top corners only
- Backdrop: `rgba(28,26,24,0.40)` (the body text color at 40% alpha)
- Drag handle: 36×4px pill, `background: rgba(28,26,24,0.20)`, centered, `var(--space-md)` from top of sheet
- Discard button: same primary `.btn` treatment (mineral fill) — this is the action being confirmed, give it weight
- "Keep it" button: `.btn-link` style (transparent, secondary-color text)
- Sheet padding: `var(--space-xl)` on all sides except the drag handle area
- Animation in: `transform: translateY(100%) → translateY(0)` over `var(--duration-medium)` (800ms), `var(--ease-essence)`. Backdrop fades from `0` to `0.40` over same duration.

The text in the sheet uses:
- Headline: `.prompt-question` style (italic Spectral 28px, weight 500) — but smaller, `var(--text-body-lg)` (18px). Same family, sized down.
- Reassurance: `var(--font-body)`, `var(--text-body)` (16px), `color: var(--color-text-secondary)`.

## A6.11 — Edit-note depth exhausted (architect's earlier proposal — locked)

When `edit_note_depth` cap reached (depth 2): quietly disable the "Reshape your note" link with soft inline copy. No separate dev-rail panel.

Tokens for the disabled state:
- `color: var(--color-text-tertiary) #ADA9A5`
- `cursor: default`
- No hover treatment
- No underline
- Replace the label "Reshape your note" with: *"You've reshaped this twice — save, regenerate, or discard."*

`<!-- DESIGN OPEN -->` to flag that the exact wording belongs to the System States doc and the copy pass.

## A6.12 — Autoplay handling (open — architect picks the primary visual)

The browser may or may not allow audio to autoplay. Two UIs are possible:
- **Autoplay primary:** stone is already in Playback state, scrubber is moving, transcript fades in.
- **Tap-to-play primary:** stone is in Ready state, a soft "Tap to hear it" prompt sits above the scrubber, transcript is visible but pre-active.

**Architect decision:** pick one as the primary, document the other as a fallback state in the dev-rail or via an `<!-- DESIGN OPEN -->` comment. My slight lean: tap-to-play primary, since iOS Safari blocks autoplay aggressively and you don't want the first-listen moment to silently fail. But that's an engineering reality check — if you have reason to think autoplay will work, design for that.

## A6.13 — Stage entrance choreography

A2 introduced a stage-reveal pattern: stone fades in at 100ms, question at 300ms, content at 500ms. **Reuse this on A6.** Same `@keyframes stageReveal`, same delays. The transcript should fade in last (700ms delay) so the user's eye lands on stone → question → scrubber → transcript in that order.

## A6.14 — Variant label

Top-left corner of the phone screen, A2 pattern:

```html
<div class="variant-label">A6.a · First listen</div>
```

Reuse A2's `.variant-label` tokens exactly.

---

# OUTPUT EXPECTATIONS

For both A2 (revised) and A6 (new):

1. Single self-contained HTML files in `prototypes/message creation/`.
2. Inline `<style>` and Google Fonts import at the top, no external scripts.
3. Inline comment block at the top documenting:
   - Positioning intent
   - Tone targets
   - The resolutions chosen for each remaining open question
   - Reasoning where a judgment call was made
4. `dev-rail` for variation switching, matching the A2 / pass2-c-screens pattern.
5. Any unresolved question gets a `<!-- DESIGN OPEN -->` comment near the relevant code.
6. Reduced-motion media query covering all animations.

For A2 specifically: ship the revisions as a single edit pass, then the file is ready for production handoff.

For A6: focus visual energy on the playback moment, the action hierarchy, and the discard bottom sheet. The architectural decisions above mean you should not be re-litigating the screen family, pip count, button stack, or stone scale — those are settled. Spend the time on the regen indicator, the autoplay choice, and the discard sheet motion.

---

# WHAT'S OUT OF SCOPE

Don't redesign:
- Token set (colors, type scale, spacing, radius, motion)
- Phone frame, status bar, island, home indicator
- Dev-rail structure
- Footer primary `.btn` (Save reuses it)
- Backbar shell or pip animation
- Reduced-motion fallback pattern

Don't write copy:
- Final prompt-question wording (architect proposes, final lands in copy pass)
- Final trust-line wording on A2
- Final cap-reached and discard-modal copy

Don't instrument:
- Telemetry events (handled in production wiring, not the prototype)
- URL routing (handled in production wiring per Step6_OpenContracts Q7)
