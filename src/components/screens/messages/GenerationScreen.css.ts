/**
 * Scoped stylesheet for A5 — Generation.
 *
 * Ported from prototypes/message creation/essence-step6-a5.html with the
 * established Step 6 departures (A4/A6/A7 precedent):
 *   • Phone frame, dev rail, status bar, and variant label dropped —
 *     full-bleed.
 *   • The CSS-gradient stone + its working/ready keyframes dropped — the
 *     shared canvas BreathStone carries the stone (working tone while
 *     generating, ready tone on failure; size swaps large↔small). Only
 *     the *atmosphere around* the stone is CSS here.
 *   • Selectors scoped under `.gen`, keyframes `gen-` prefixed.
 *   • Entrance animations use a `backwards` fill, not forwards: a
 *     forwards fill pins the keyframe's end opacity forever and would
 *     beat the class-driven beat-swap fade on the title/aside (the
 *     footgun the token-reconciliation sweep flagged for A5). With
 *     backwards, elements hide through their delay, then release to
 *     natural styles so the `.is-fading` cross-fade can take over.
 *
 * The atmosphere stack is the point of this screen — A5 is a held,
 * ceremonial wait, not an input surface — so unlike A4 (flat warm-phase)
 * it keeps the prototype's three-layer warmth: a 3-stop gradient ground,
 * a slow ambient glow centred on the stone, and a static corner
 * vignette. The two bespoke gradient stops and the glow/vignette rgba
 * values are designer-tuned atmosphere, not semantic ramp tokens, so
 * they stay literal (same treatment as A4's ambient-glow rgba).
 */
export const GENERATION_CSS = `
.gen {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--font-body);
  color: var(--color-text-primary);
  /* Layer 1 — 3-stop warm ground. Mid stop is the production flow token;
     the end stops are bespoke atmosphere (lighter oat ↔ light gold). */
  background: linear-gradient(
    180deg,
    #EDE4D4 0%,
    var(--color-bg-warm-phase) 45%,
    #F5ECD8 100%
  );
}
/* Layer 2 — ambient warm glow, centred on the stone, slow breathing. */
.gen::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 70% 55% at 50% 42%,
    rgba(232, 200, 140, 0.28) 0%,
    rgba(232, 200, 140, 0.10) 40%,
    transparent 75%
  );
  pointer-events: none;
  z-index: 0;
  animation: gen-ambientGlow 13s var(--ease-essence) infinite;
}
/* Layer 3 — corner vignette, static. */
.gen::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse 120% 90% at 50% 50%,
    transparent 50%,
    rgba(60, 45, 25, 0.08) 85%,
    rgba(60, 45, 25, 0.16) 100%
  );
  pointer-events: none;
  z-index: 0;
}
@keyframes gen-ambientGlow {
  0%, 100% { opacity: 0.85; transform: scale(1); }
  50%      { opacity: 1;    transform: scale(1.04); }
}

/* ── Crumb — display-only, pinned at the top above the atmosphere ── */
.gen__crumb-row {
  position: absolute;
  top: var(--space-md);
  left: 0; right: 0;
  display: flex;
  justify-content: center;
  z-index: 4;
  animation: gen-fadeIn var(--duration-medium) var(--ease-essence) 100ms backwards;
}
.gen__crumb {
  display: inline-flex; align-items: center; gap: var(--space-sm);
  padding: var(--space-xs) var(--space-md);
  background: var(--color-surface-honey);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-family: var(--font-body);
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 600;
}
.gen__crumb-divider {
  width: 3px; height: 3px;
  border-radius: var(--radius-full);
  background: currentColor;
  opacity: 0.4;
}

/* ── Stage — stone + copy, centred. Sits above the atmosphere layers. ── */
.gen__stage {
  position: relative;
  z-index: 3;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
  text-align: center;
}

.gen__stone-wrap {
  margin-bottom: var(--space-3xl);
  /* Scale-bloom (0.94 → 1) rather than a slide — the stone reads as
     materialising into the wait, not sliding in (architect polish). */
  animation: gen-bloom var(--duration-medium) var(--ease-essence) 300ms backwards;
}

@keyframes gen-rise {
  from { opacity: 0; transform: translateY(8px); }
}
@keyframes gen-bloom {
  from { opacity: 0; transform: scale(0.94); }
}
@keyframes gen-fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
}

/* Working copy — display serif headline + italic aside. Each enters on a
   stagger, then the beat-swap cross-fade (.is-fading) takes over. */
.gen__title {
  font-family: var(--font-display);
  font-size: var(--text-h1);
  font-weight: 600;
  line-height: 1.25; /* hero leading — no production token, prototype value */
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
  max-width: 300px;
  margin: 0 auto var(--space-md);
  text-wrap: pretty;
  /* Reserve the two-line footprint (36px × 1.25 × 2) and centre within it,
     so a shorter beat doesn't collapse the block and jump the centred group
     upward mid-swap. One-off, not tokenised — specific to this 2-line
     title. */
  min-height: 90px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* Dim-out completes exactly at the 400ms text swap (BEAT_FADE_MS), so
     the copy changes at the trough, not mid-fade (was --duration-medium,
     which left it swapping at half opacity). */
  transition: opacity var(--duration-small) var(--ease-essence);
  animation: gen-rise var(--duration-medium) var(--ease-essence) 500ms backwards;
}
.gen__aside {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body-lg);
  line-height: 1.55;
  color: var(--color-text-secondary);
  max-width: 280px;
  margin: 0 auto;
  text-wrap: pretty;
  transition: opacity var(--duration-small) var(--ease-essence);
  animation: gen-rise var(--duration-medium) var(--ease-essence) 700ms backwards;
}
/* Mid-swap dim — the entrance animation has released (backwards fill), so
   this class-driven opacity wins and transitions smoothly. Trough at 0.2
   (not 0.3) so the text is hidden enough to swap cleanly behind the fade. */
.gen__title.is-fading,
.gen__aside.is-fading {
  opacity: 0.2;
}

/* ════════ FAILED — task mode: content higher, actions above fold ════════ */
.gen__stage--failed {
  justify-content: flex-start;
  padding-top: var(--space-4xl);
}
.gen__stage--failed .gen__stone-wrap {
  margin-bottom: var(--space-xl);
}
.gen__failed-title {
  font-family: var(--font-display);
  font-size: var(--text-title);
  font-weight: 600;
  line-height: var(--line-height-title);
  color: var(--color-text-primary);
  max-width: 300px;
  margin: 0 auto var(--space-md);
  text-wrap: pretty;
}
.gen__failed-aside {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body-lg);
  line-height: 1.55;
  color: var(--color-text-secondary);
  max-width: 280px;
  margin: 0 auto var(--space-sm);
  text-wrap: pretty;
}
.gen__failed-reassurance {
  font-family: var(--font-body);
  /* The anxiety-reducer ("Your note is kept.") must not be the faintest
     line in the frame: 16px floor + secondary ink, not 14px tertiary,
     which fell below the 45–70 contrast floor on the cream ground. */
  font-size: var(--text-body);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2xl);
  letter-spacing: 0.01em;
}
.gen__actions {
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-md);
  width: 100%; max-width: 280px;
  /* Stone + copy stay top-anchored (task mode); the recovery tap drops
     into the lower-third thumb zone instead of floating mid-frame. */
  margin-top: auto;
  margin-bottom: var(--space-3xl);
}

/* ── Buttons — mineral primary, ghost-link secondary (A4/A6 parity) ── */
.gen__btn {
  width: 100%; min-height: 52px;
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
.gen__btn:not(:disabled):hover { background: var(--color-mineral-darker); }
.gen__btn:not(:disabled):active { transform: scale(0.98); }
.gen__btn:focus-visible {
  /* Literal ring, not var(--shadow-focus-ring): that token lives only in
     the prototypes' :root, not production @theme (reconciliation drift) —
     a var() ref would collapse to no ring. */
  outline: none;
  box-shadow: var(--shadow-mineral), 0 0 0 4px rgba(122, 128, 136, 0.18);
}
.gen__btn--link {
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
.gen__btn--link:not(:disabled):hover {
  background: transparent;
  color: var(--color-text-primary);
  text-decoration-color: var(--color-text-secondary);
}
.gen__btn--link:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(122, 128, 136, 0.18);
  border-radius: var(--radius-sm);
}

/* ── Reduced motion — entrance arrives complete (base styles are the end
      state); the slow ambient glow pins to a mid-frame value rather than
      pausing (paused during a delay falls back to base — overshoot, the
      A7 halo lesson). Beat cross-fades stay (softened) so the screen
      doesn't freeze silent mid-wait — the prototype's explicit choice. ── */
@media (prefers-reduced-motion: reduce) {
  .gen__crumb-row,
  .gen__stone-wrap,
  .gen__title,
  .gen__aside {
    animation: none;
  }
  .gen::before {
    /* Pin the glow to its 50% peak (the fullest, most-alive frame), not a
       trough — reduced-motion users get the intended still composition,
       not the washed-out bottom of the breath. */
    animation: none;
    opacity: 1;
    transform: scale(1.04);
  }
  .gen__title,
  .gen__aside {
    transition-duration: 800ms;
  }
}

/* Visually hidden but announced — the single working-stage status line. */
.gen .sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
`;
