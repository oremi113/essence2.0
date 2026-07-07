/**
 * Scoped stylesheet for C3 — Vault Limit Reached.
 *
 * Ported from prototypes/essence-c3-vault-limit.html (the 2026-07 design pass),
 * with the established Step-6 production departures:
 *   • Phone frame, dev rail, and variant label dropped — full-bleed render.
 *   • Selectors scoped under `.vault-limit`; keyframes `vl-` prefixed so
 *     nothing leaks global. Tokens resolve from globals.css @theme.
 *
 * Hero object (the design gate): the warm-amber archive Stone is replaced by
 * the canonical Vault object at rest — sealed, ignited, still. It is rendered
 * on a <canvas> by the shared engine (`src/lib/vault-render`, drive {1,1}) in
 * the component; this stylesheet only sizes the box, runs the one-shot arrival
 * settle, and paints the still rest-ground beneath it.
 *
 * Rest-ground: a single still warm radial in `--color-glow-warm-rgb`, its
 * strength driven by `--shimmer-intensity` (the canonical opacity-driven
 * shimmer primitive — same model as Step 3's `.step3__ground-shimmer`, pinned
 * to a rest value here, never looped). No page-wide amber wash: the ground is
 * plain cream and all warmth is emitted around the object, matching the Memory
 * Shelf's room (cream), where the primary CTA lands.
 *
 * Tone (prototype header): "the calmest of the three… not an event, a gentle
 * fact." Faster entrance than the ceremony screens; no animated ambient glow.
 *
 * Entrance choreography (prototype timings — a state, not a moment):
 *   0ms vault settle → 700ms eyebrow → 900ms title → 1100ms aside →
 *   1300ms primary CTA → 1500ms secondary link. Focus lands at 1400ms via
 *   the component.
 */
export const VAULT_LIMIT_CSS = `
.vault-limit {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--font-body);
  color: var(--color-text-primary);
  background: var(--color-bg-neutral);

  /* Rest-state ground strength. Canonical opacity-driven shimmer primitive,
     pinned still (C3 never breathes). Rest value only. */
  --shimmer-intensity: 0.06;
}

/* ── Content stage — anchored toward the top (grounded, not floating).
      No backbar: the cap is a fact, there's nothing to go "back" within. ── */
.vault-limit .confirm {
  position: relative; z-index: 1;
  flex: 1;
  display: flex; flex-direction: column;
  align-items: center; justify-content: flex-start;
  text-align: center;
  padding: var(--space-4xl) var(--space-xl) var(--space-xl);
}

/* ── The Vault at rest. Square box; the reliquary case fills the middle of
      the engine's blit, so negative margins tighten the transparent apron
      without clipping the halo. Arrives with a single settle (no bounce,
      no swell) and is then dead-still. ── */
.vault-limit .vault-wrap {
  position: relative;
  width: 340px; height: 340px;
  max-width: 88vw;
  margin: -30px 0 -44px;
  opacity: 0;
  transform: scale(0.97);
  animation: vl-vaultSettle var(--duration-page) var(--ease-page) forwards;
  /* NOT --ease-breath. That curve belongs to the living Breath Stone only. */
}
.vault-limit .vault-limit__canvas {
  position: relative; z-index: 1;
  width: 100%; height: 100%;
  display: block;
}
/* Still warm rest-ground beneath the object. Radial in the glow-warm token;
   layer strength is --shimmer-intensity (pinned). Never animates. */
.vault-limit .vault-limit__ground {
  position: absolute; inset: 0; z-index: 0;
  pointer-events: none;
  opacity: var(--shimmer-intensity);
  background: radial-gradient(
    circle at 50% 50%,
    rgba(var(--color-glow-warm-rgb), 1) 0%,
    rgba(var(--color-glow-warm-rgb), 0.4) 52%,
    transparent 72%
  );
}
@keyframes vl-vaultSettle {
  to { opacity: 1; transform: scale(1); }
}

/* ── Copy — staggered reveals; faster cadence than the ceremony screens ── */
.vault-limit .reveal {
  opacity: 0;
  transform: translateY(8px);
  animation: vl-copyReveal var(--duration-medium) var(--ease-essence) forwards;
}
.vault-limit .vl-eyebrow { animation-delay: 700ms; }
.vault-limit .vl-title   { animation-delay: 900ms; }
.vault-limit .vl-aside   { animation-delay: 1100ms; }
@keyframes vl-copyReveal {
  to { opacity: 1; transform: translateY(0); }
}

.vault-limit .vl-eyebrow {
  font-family: var(--font-body);
  font-size: var(--text-caption);
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--color-mineral);
  margin-bottom: var(--space-sm);
}
.vault-limit .vl-title {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 600;
  line-height: var(--line-height-title);
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
  margin-bottom: var(--space-md);
  max-width: 320px;
  text-wrap: balance;
}
.vault-limit .vl-aside {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body-lg);
  line-height: 1.55;
  color: var(--color-text-secondary);
  max-width: 290px;
  text-wrap: balance;
}

/* ── Footer — two-tier reveal, faster than the ceremony screens ── */
.vault-limit .footer {
  position: relative; z-index: 1;
  padding: var(--space-md) var(--space-xl) var(--space-2xl);
  flex-shrink: 0;
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-sm);
}
.vault-limit .footer .btn,
.vault-limit .footer .btn--link {
  opacity: 0;
  animation: vl-copyReveal var(--duration-medium) var(--ease-essence) forwards;
}
.vault-limit .footer .btn      { animation-delay: 1300ms; }
.vault-limit .footer .btn--link { animation-delay: 1500ms; }

.vault-limit .btn {
  width: 100%; min-height: 52px;
  padding: var(--space-md) var(--space-xl);
  background: var(--color-mineral-dark); color: #fff;
  font-family: var(--font-body); font-weight: 600;
  font-size: var(--text-body-lg);
  border: 0; border-radius: var(--radius-lg);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: var(--space-sm);
  box-shadow: var(--shadow-mineral);
  transition: background var(--duration-micro) var(--ease-essence),
              transform var(--duration-small) var(--ease-press);
}
.vault-limit .btn:not(:disabled):hover { background: var(--color-mineral-darker); }
.vault-limit .btn:not(:disabled):active { transform: scale(0.98); }
.vault-limit .btn:focus-visible {
  outline: none;
  box-shadow: var(--shadow-mineral),
              0 0 0 4px rgba(122, 128, 136, 0.18);
}

.vault-limit .btn--link {
  background: transparent;
  color: var(--color-text-secondary);
  border: 0;
  font-family: var(--font-body);
  font-weight: 500;
  font-size: var(--text-body);
  min-height: 44px;
  width: auto;
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--color-text-tertiary);
  text-decoration-thickness: 1px;
  transition: color var(--duration-micro) var(--ease-essence),
              text-decoration-color var(--duration-micro) var(--ease-essence);
}
.vault-limit .btn--link:hover {
  color: var(--color-text-primary);
  text-decoration-color: var(--color-text-secondary);
}
.vault-limit .btn--link:focus-visible {
  outline: none;
  border-radius: var(--radius-sm);
  box-shadow: 0 0 0 4px rgba(122, 128, 136, 0.18);
}

/* ── Reduced motion — entrance collapses to instant; the vault is already
      static (painted once, no loop), so there is nothing to pin. The screen
      arrives complete. ── */
@media (prefers-reduced-motion: reduce) {
  .vault-limit .vault-wrap,
  .vault-limit .reveal,
  .vault-limit .footer .btn,
  .vault-limit .footer .btn--link {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
`;
