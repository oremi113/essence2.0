/**
 * Scoped stylesheet for A4 — Personal Note.
 *
 * Ported near-verbatim from prototypes/message creation/essence-step6-a4.html
 * (Directions 1 + 5), with the established departures (A6/A7 precedent):
 *   • Phone frame, dev rail, and variant label dropped — full-bleed.
 *   • The CSS-gradient stone + its keyframes dropped — shared canvas
 *     BreathStone in `ready` (stays ready throughout; `working` is A5's).
 *   • Selectors scoped under `.personal-note`, keyframes `pn-` prefixed.
 *   • Background is `--color-bg-warm-phase` to match its production flow
 *     siblings (A2, A6) — the prototype's local `--color-bg-warm-2`
 *     (#F6F0E5) predates the 2026-04-18 ramp widening and now equals
 *     `--color-surface-card`; flow consistency wins over the stale hex.
 *
 * Entrance: stone 100ms → question 300ms → textarea 500ms, each a fade +
 * 8px drift. The question recedes while writing; the glow behind the
 * textarea deepens with content (stronger at 80+ chars). The honoring
 * moment (Stage B) fades + lifts over --duration-medium.
 */
export const PERSONAL_NOTE_CSS = `
.personal-note {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-bg-warm-phase);
  font-family: var(--font-body);
  color: var(--color-text-primary);
}

/* ── Backbar — chevron + 5 progress pips (A4 = third) ── */
.personal-note .backbar {
  padding: var(--space-md) var(--space-xl);
  display: flex; align-items: center; justify-content: space-between;
  min-height: 52px; flex-shrink: 0;
}
.personal-note .backbar__btn {
  background: transparent; border: 0;
  padding: var(--space-sm); margin: calc(-1 * var(--space-sm));
  color: var(--color-text-secondary); cursor: pointer;
  display: flex; min-height: 44px; align-items: center;
  border-radius: var(--radius-md);
  transition: color var(--duration-micro) var(--ease-essence);
}
.personal-note .backbar__btn:hover { color: var(--color-text-primary); }
.personal-note .backbar__pips { display: flex; gap: 6px; }
.personal-note .backbar__pip {
  width: 6px; height: 6px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-warm);
  transition: width var(--duration-medium) var(--ease-essence),
              background var(--duration-medium) var(--ease-essence);
}
.personal-note .backbar__pip.is-current { width: 20px; background: var(--color-bg-gold); }
.personal-note .backbar__pip.is-done { background: var(--color-bg-gold); }
.personal-note .backbar__spacer { width: 22px; }

/* ── Crumb — display-only on A4+ (tappable only through A3, locked) ── */
.personal-note .crumb-row {
  padding: 0 var(--space-xl);
  margin-bottom: var(--space-md);
  flex-shrink: 0;
}
.personal-note .crumb-display {
  display: inline-flex; align-items: center; gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  background: var(--color-surface-card);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
}
.personal-note .crumb-display__divider {
  width: 3px; height: 3px;
  border-radius: var(--radius-full);
  background: currentColor;
  opacity: 0.4;
}

/* ── Body ── */
.personal-note .body {
  padding: var(--space-xs) var(--space-xl) var(--space-lg);
  flex: 1; display: flex; flex-direction: column;
  overflow-y: auto; -webkit-overflow-scrolling: touch;
}

/* ════════ STAGE A — input (Direction 1: stone as prompt) ════════ */
.personal-note .stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: var(--space-lg);
  text-align: center;
}

/* Entrance choreography — stone → question → textarea, 200ms apart.
   Uses a backwards fill, not forwards + opacity-0 base: a forwards fill
   would keep the keyframe's opacity:1 applied forever, overriding the
   class-driven recede (.is-writing) below — animation fill beats the
   normal cascade. With backwards, elements hide through their delay and
   release to natural styles once the entrance completes. */
@keyframes pn-stageReveal {
  from { opacity: 0; transform: translateY(8px); }
}
.personal-note .stone-wrap {
  animation: pn-stageReveal var(--duration-small) var(--ease-essence) 100ms backwards;
}
.personal-note .prompt-question {
  animation: pn-stageReveal var(--duration-small) var(--ease-essence) 300ms backwards;
}
.personal-note .note-wrap {
  animation: pn-stageReveal var(--duration-medium) var(--ease-essence) 500ms backwards;
}

/* The question — the emotional anchor. Recedes while writing, returns
   when the field is empty + blurred. */
.personal-note .prompt-question {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-title);
  line-height: var(--line-height-title);
  color: var(--color-text-primary);
  max-width: 280px;
  margin-top: var(--space-xl);
  text-wrap: pretty;
  transition:
    opacity var(--duration-medium) var(--ease-essence),
    transform var(--duration-medium) var(--ease-essence),
    color var(--duration-medium) var(--ease-essence);
}
.personal-note .stage.is-writing .prompt-question {
  opacity: 0.35;
  transform: translateY(-4px);
}

/* Subtitle — the plain-language helper that explains the mechanic + that
   blank is allowed. Body (not display italic): this line is for comprehension,
   so it stays legible and unfussy. Recedes with the question while writing. */
.personal-note .prompt-subtitle {
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--color-text-secondary);
  max-width: 300px;
  margin-top: var(--space-sm);
  text-wrap: pretty;
  animation: pn-stageReveal var(--duration-small) var(--ease-essence) 420ms backwards;
  transition:
    opacity var(--duration-medium) var(--ease-essence),
    transform var(--duration-medium) var(--ease-essence);
}
.personal-note .stage.is-writing .prompt-subtitle {
  opacity: 0.2;
  transform: translateY(-4px);
}

/* Writing area — ambient warmth that answers the user's effort. */
.personal-note .note-wrap {
  position: relative;
  width: 100%;
  margin-top: var(--space-xl);
}
.personal-note .note-wrap::before {
  content: '';
  position: absolute;
  inset: -20px -16px;
  border-radius: var(--radius-2xl);
  background: radial-gradient(ellipse at 50% 40%, rgba(242, 232, 214, 0.5), transparent 70%);
  pointer-events: none;
  z-index: 0;
  transition: opacity var(--duration-large) var(--ease-essence);
}
.personal-note .stage.has-content .note-wrap::before {
  opacity: 1;
  background: radial-gradient(ellipse at 50% 40%, rgba(242, 232, 214, 0.7), transparent 65%);
}
.personal-note .stage.has-long-content .note-wrap::before {
  background: radial-gradient(ellipse at 50% 40%, rgba(237, 227, 208, 0.85), transparent 60%);
}

/* Textarea — recessed, warm, inviting. Serif: this is the user's voice. */
.personal-note .note-field {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: var(--space-lg) var(--space-lg) var(--space-xl);
  background: var(--color-surface-honey);
  border: 1.5px solid rgba(0, 0, 0, 0.04);
  border-radius: var(--radius-2xl);
  font-family: var(--font-display);
  font-size: var(--text-body-lg);
  line-height: 1.55;
  color: var(--color-text-primary);
  outline: none;
  resize: none;
  min-height: 130px;
  text-align: left;
  transition:
    border-color var(--duration-small) var(--ease-essence),
    box-shadow var(--duration-small) var(--ease-essence);
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.04),
    0 1px 3px rgba(0, 0, 0, 0.03);
}
.personal-note .note-field::placeholder {
  color: var(--color-text-tertiary);
  font-style: italic;
}
.personal-note .note-field:focus {
  border-color: var(--color-mineral);
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.04),
    0 0 0 4px rgba(122, 128, 136, 0.18);
}

/* Char counter — appears at 150, warns at 180 (cap 200). */
.personal-note .note-counter {
  position: relative;
  z-index: 1;
  margin-top: var(--space-sm);
  align-self: flex-end;
  font-family: var(--font-body);
  font-size: var(--text-caption);
  color: var(--color-text-tertiary);
  letter-spacing: 0.04em;
  opacity: 0;
  transition: opacity var(--duration-small) var(--ease-essence);
}
.personal-note .note-counter.is-visible { opacity: 1; }
.personal-note .note-counter.is-warning { color: var(--color-status-warning); }

/* ════════ STAGE B — honoring moment (Direction 5) ════════ */
.personal-note .honoring {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-xl);
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity var(--duration-medium) var(--ease-essence),
    transform var(--duration-medium) var(--ease-essence);
}
.personal-note .honoring.is-visible {
  opacity: 1;
  transform: translateY(0);
}
.personal-note .honoring__quote {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-title);
  line-height: var(--line-height-title);
  color: var(--color-text-primary);
  max-width: 300px;
  position: relative;
  letter-spacing: -0.005em;
  text-wrap: pretty;
}
/* Long notes (80+ chars) step down so a near-cap quote still composes
   in the centered column instead of running 7+ lines at display size. */
.personal-note .honoring__quote--long {
  font-size: var(--text-h3);
  line-height: 1.5;
}
.personal-note .honoring__quote::before,
.personal-note .honoring__quote::after {
  font-family: var(--font-display);
  color: var(--color-text-tertiary);
  font-size: 1.2em;
  position: relative;
  top: 4px;
}
.personal-note .honoring__quote::before { content: '\\201C'; margin-right: 4px; }
.personal-note .honoring__quote::after  { content: '\\201D'; margin-left: 4px; }

.personal-note .honoring__ack {
  margin-top: var(--space-2xl);
  font-family: var(--font-body);
  font-size: var(--text-body);
  color: var(--color-text-secondary);
  max-width: 280px;
}

.personal-note .honoring__pulse {
  margin-top: var(--space-2xl);
  display: flex;
  gap: var(--space-sm);
}
.personal-note .honoring__pulse-dot {
  width: 6px; height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-mineral);
  opacity: 0.4;
  animation: pn-pulseDot 1.6s var(--ease-essence) infinite;
}
.personal-note .honoring__pulse-dot:nth-child(2) { animation-delay: 200ms; }
.personal-note .honoring__pulse-dot:nth-child(3) { animation-delay: 400ms; }
@keyframes pn-pulseDot {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.3); }
}

/* ── Footer — morphing CTA (Direction 4) ── */
.personal-note .footer {
  padding: var(--space-md) var(--space-xl) var(--space-2xl);
  /* Flat fill — body and footer are non-overlapping siblings, so a
     scroll-under scrim gradient would imply an occlusion that can't
     happen (architect pass 2026-06-12). */
  background: var(--color-bg-warm-phase);
  flex-shrink: 0;
  display: flex; flex-direction: column; gap: var(--space-sm);
  transition: opacity var(--duration-small) var(--ease-essence);
}
.personal-note .footer.is-hidden { opacity: 0; pointer-events: none; }

.personal-note .btn {
  width: 100%; min-height: 52px;
  padding: var(--space-md) var(--space-xl);
  background: var(--color-mineral); color: #fff;
  font-family: var(--font-body); font-weight: 600;
  font-size: var(--text-body-lg);
  border: 0; border-radius: var(--radius-lg);
  /* --shadow-mineral matches A2/A6's flow buttons; its stale teal key is
     re-keyed for all consumers at once in FOLLOW_UPS #40. */
  box-shadow: var(--shadow-mineral); cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: var(--space-sm);
  transition: background var(--duration-micro) var(--ease-essence),
              transform var(--duration-small) var(--ease-press),
              opacity var(--duration-small) var(--ease-essence);
}
.personal-note .btn:not(:disabled):hover { background: var(--color-mineral-dark); }
.personal-note .btn:not(:disabled):active { transform: scale(0.98); }
.personal-note .btn:disabled { opacity: 0.6; cursor: default; }
.personal-note .btn:focus-visible {
  outline: none;
  box-shadow: var(--shadow-mineral), 0 0 0 4px rgba(122, 128, 136, 0.18);
}

/* Ghost posture — the skip path when the field is empty. */
.personal-note .btn--ghost {
  background: transparent;
  color: var(--color-text-secondary);
  box-shadow: none;
  font-weight: 500;
  font-size: var(--text-body);
  min-height: 44px;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--color-text-tertiary);
  text-decoration-thickness: 1px;
}
.personal-note .btn--ghost:not(:disabled):hover {
  background: transparent;
  color: var(--color-text-primary);
  text-decoration-color: var(--color-text-secondary);
}
.personal-note .btn--ghost:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(122, 128, 136, 0.18);
  border-radius: var(--radius-sm);
}

/* ── Reduced motion — entrance and stage transitions arrive complete;
      pulse dots pin to a static mid-value (their base opacity is 0.4).
      Pinned explicitly, never paused (A7 amendment precedent). ── */
@media (prefers-reduced-motion: reduce) {
  /* Entrance arrives complete (base styles are the natural end state). */
  .personal-note .stone-wrap,
  .personal-note .prompt-question,
  .personal-note .note-wrap {
    animation: none;
  }
  .personal-note .prompt-question,
  .personal-note .note-wrap::before,
  .personal-note .honoring,
  .personal-note .footer {
    transition: none;
  }
  .personal-note .honoring__pulse-dot {
    animation: none;
    opacity: 0.65;
  }
}
`;
