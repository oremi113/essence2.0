/**
 * Scoped stylesheet for A3 — Category Selector.
 *
 * Ported near-verbatim from prototypes/message creation/essence-step6-a3.html,
 * with the established flow departures (A4/A6/A7 precedent):
 *   • Phone frame, dev rail, and variant label dropped — full-bleed.
 *   • Selectors scoped under `.category-selector`; keyframes `cs-` prefixed.
 *   • Background is `--color-bg-warm-phase` to match its production flow
 *     siblings (A2, A4); the warm-2 "last of three" tone shifts to
 *     `--color-surface-honey`.
 *
 * Token reconciliation (Step6_Prototype_Token_Reconciliation.md — map by
 * VALUE, not by same-name): the prototype paints selected cards, the
 * warm-2 tone, and the warm footer with its local `--color-bg-gold`
 * (#F2E8D6), which in the widened production ramp is `--color-surface-honey`
 * — NOT prod `--color-bg-gold` (#E8D8B3, deeper). The progress pips keep
 * prod `--color-bg-gold` to stay pixel-identical to A4's shared backbar.
 * The ceiling note's `--color-bg-rich` (#EDE3D0) maps to `--color-surface-warm`.
 *
 * Entrance: anchor-head fades in, then the cards stagger in (fade + 8px
 * drift, ~60ms apart). GPU-only (opacity + transform) per the locked
 * motion rule; reduced motion pins every element to its resting frame.
 */
export const CATEGORY_SELECTOR_CSS = `
.category-selector {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-bg-warm-phase);
  font-family: var(--font-body);
  color: var(--color-text-primary);
  transition: background var(--duration-medium) var(--ease-essence);
}
.category-selector.is-final { background: var(--color-surface-honey); }

/* ── Backbar — chevron + 5 progress pips (A3 = second) ── */
.category-selector .backbar {
  padding: var(--space-md) var(--space-xl);
  display: flex; align-items: center; justify-content: space-between;
  min-height: 52px; flex-shrink: 0;
}
.category-selector .backbar__btn {
  background: transparent; border: 0;
  padding: var(--space-sm); margin: calc(-1 * var(--space-sm));
  color: var(--color-text-secondary); cursor: pointer;
  display: flex; min-height: 44px; min-width: 44px; align-items: center;
  border-radius: var(--radius-md);
  transition: color var(--duration-micro) var(--ease-essence);
}
.category-selector .backbar__btn:hover { color: var(--color-text-primary); }
.category-selector .backbar__pips { display: flex; gap: 6px; }
.category-selector .backbar__pip {
  width: 6px; height: 6px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-warm);
  transition: width var(--duration-medium) var(--ease-essence),
              background var(--duration-medium) var(--ease-essence);
}
.category-selector .backbar__pip.is-current { width: 20px; background: var(--color-bg-gold); }
.category-selector .backbar__pip.is-done { background: var(--color-bg-gold); }
.category-selector .backbar__spacer { width: 22px; }

/* ── Body ── */
.category-selector .body {
  padding: var(--space-xs) var(--space-xl) var(--space-3xl);
  flex: 1; display: flex; flex-direction: column;
  overflow-y: auto; -webkit-overflow-scrolling: touch;
}

/* ── Anchor head — context crumb, title, aside ── */
.category-selector .anchor-head {
  margin-bottom: var(--space-lg);
  animation: cs-head-in var(--duration-medium) var(--ease-essence) both;
}

/* Context crumb — tappable pill, returns to A2 (recipient) */
.category-selector .crumb {
  display: inline-flex; align-items: center; gap: var(--space-xs);
  padding: var(--space-xs) var(--space-md) var(--space-xs) var(--space-sm);
  background: var(--color-surface-card);
  border-radius: var(--radius-full);
  border: 0;
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
  cursor: pointer;
  min-height: 28px;
  transition: background var(--duration-micro) var(--ease-essence),
              transform 100ms var(--ease-press);
}
.category-selector .crumb:hover { background: var(--color-surface-honey); }
.category-selector .crumb:active { transform: scale(var(--scale-press-subtle, 0.99)); }
.category-selector .crumb svg { opacity: 0.6; }

.category-selector .title {
  font-family: var(--font-display); font-size: var(--text-title); font-weight: 600;
  line-height: var(--line-height-title); color: var(--color-text-primary);
  margin: var(--space-md) 0 var(--space-md); letter-spacing: -0.01em; text-wrap: pretty;
}
.category-selector .aside {
  font-family: var(--font-display); font-style: italic;
  font-size: var(--text-body); color: var(--color-text-secondary);
  margin: 0; line-height: 1.55; text-wrap: pretty;
}

/* ── Position-2 ceiling note — last-of-three only ── */
.category-selector .ceiling-note {
  display: flex;
  align-items: flex-start;
  gap: var(--space-md);
  margin-top: var(--space-md);
  margin-bottom: var(--space-lg);
  padding: var(--space-md) var(--space-lg);
  background: var(--color-surface-warm);
  border-left: 2px solid var(--color-mineral);
  border-radius: var(--radius-sm) var(--radius-md) var(--radius-md) var(--radius-sm);
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: 1.55;
  color: var(--color-text-secondary);
  animation: cs-head-in var(--duration-medium) var(--ease-essence) both;
}
.category-selector .ceiling-note__icon { flex-shrink: 0; margin-top: 2px; color: var(--color-mineral); }
.category-selector .ceiling-note strong { color: var(--color-text-primary); font-weight: 600; }

/* ── Category list ── */
.category-selector .selectable-list { display: flex; flex-direction: column; gap: var(--space-md); }

.category-selector .selectable-card {
  background: var(--color-surface-card);
  border: 1.5px solid transparent;
  border-radius: var(--radius-2xl);
  padding: var(--space-lg);
  display: flex; align-items: center;
  gap: var(--space-lg);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  width: 100%; text-align: left;
  font-family: inherit;
  animation: cs-card-in var(--duration-medium) var(--ease-essence) both;
  transition:
    background var(--duration-small) var(--ease-essence),
    border-color var(--duration-small) var(--ease-essence),
    box-shadow var(--duration-small) var(--ease-essence),
    transform 100ms var(--ease-press);
}
.category-selector .selectable-card:nth-child(1) { animation-delay: 120ms; }
.category-selector .selectable-card:nth-child(2) { animation-delay: 180ms; }
.category-selector .selectable-card:nth-child(3) { animation-delay: 240ms; }
.category-selector .selectable-card:nth-child(4) { animation-delay: 300ms; }
.category-selector .selectable-card:nth-child(5) { animation-delay: 360ms; }
.category-selector .selectable-card:nth-child(6) { animation-delay: 420ms; }
.category-selector .selectable-card:nth-child(7) { animation-delay: 480ms; }
.category-selector .selectable-card:hover { background: var(--color-surface-honey); }
.category-selector .selectable-card:active { transform: scale(var(--scale-press-subtle, 0.99)); }
.category-selector .selectable-card.is-selected {
  background: var(--color-surface-honey);
  border: 2px solid var(--color-mineral);
  box-shadow: var(--shadow-sm);
}

.category-selector .selectable-card__icon {
  width: var(--size-avatar, 44px); height: var(--size-avatar, 44px);
  flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--color-bg-warm-phase);
  display: flex; align-items: center; justify-content: center;
  color: var(--color-mineral);
  transition: background var(--duration-small) var(--ease-essence),
              color var(--duration-small) var(--ease-essence);
}
.category-selector .selectable-card.is-selected .selectable-card__icon {
  background: var(--color-mineral);
  color: var(--color-bg-neutral);
}

.category-selector .selectable-card__main {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column;
}
.category-selector .selectable-card__name {
  font-family: var(--font-display);
  font-size: var(--text-body-lg); font-weight: 600;
  line-height: 1.25;
  color: var(--color-text-primary);
}
.category-selector .selectable-card__sub {
  font-family: var(--font-display); font-style: italic;
  font-size: var(--text-body);
  color: var(--color-text-secondary);
  margin-top: var(--space-xs); line-height: 1.45;
}

.category-selector .selectable-card__check {
  width: 22px; height: 22px;
  flex-shrink: 0;
  color: var(--color-mineral);
  opacity: 0;
  transform: scale(0.6);
  transition: opacity var(--duration-small) var(--ease-essence),
              transform var(--duration-small) var(--ease-essence);
}
.category-selector .selectable-card.is-selected .selectable-card__check {
  opacity: 1;
  transform: scale(1);
}

/* ── Footer ── */
.category-selector .footer {
  padding: var(--space-md) var(--space-xl) var(--space-2xl);
  border-top: 0;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--color-bg-warm-phase) 24px,
    var(--color-bg-warm-phase) 100%
  );
  flex-shrink: 0;
  transition: background var(--duration-medium) var(--ease-essence);
}
.category-selector.is-final .footer {
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--color-surface-honey) 24px,
    var(--color-surface-honey) 100%
  );
}
.category-selector .btn {
  width: 100%; min-height: var(--size-control-md, 52px);
  padding: var(--space-md) var(--space-xl);
  background: var(--color-mineral-dark); color: #fff;
  font-family: var(--font-body); font-weight: 600;
  font-size: var(--text-body-lg);
  border: 0; border-radius: var(--radius-lg);
  box-shadow: var(--shadow-mineral); cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: var(--space-sm);
  transition: background var(--duration-micro) var(--ease-essence),
              transform var(--duration-small) var(--ease-press);
}
.category-selector .btn:not(:disabled):hover { background: var(--color-mineral-darker); }
.category-selector .btn:not(:disabled):active { transform: scale(var(--scale-press, 0.98)); }
.category-selector .btn:disabled {
  background: var(--color-surface-warm);
  color: var(--color-text-tertiary);
  box-shadow: none; cursor: default;
}

@keyframes cs-head-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes cs-card-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .category-selector .anchor-head,
  .category-selector .ceiling-note,
  .category-selector .selectable-card {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .category-selector .selectable-card__check { transition: none; }
}
`;
