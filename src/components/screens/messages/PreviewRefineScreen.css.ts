/**
 * Scoped stylesheet for A6 — Preview & Refine (Deferred-Audio variant).
 *
 * Ported near-verbatim from prototypes/message creation/
 * essence-step6-a6-deferred.html, with three deliberate departures:
 *   • The phone frame, dev rail, and variant label are dropped (prototype
 *     scaffolding — production renders full-bleed).
 *   • The CSS-gradient stone + its keyframes are dropped — the screen uses
 *     the shared canvas BreathStone (ready / playback / working).
 *   • Every selector is scoped under `.preview-refine` so nothing leaks
 *     into the global sheet, and keyframes are `pr-` prefixed for the same
 *     reason. All design tokens resolve from globals.css @theme.
 *
 * Held as a string + injected via a co-located <style> (the FirstBreath-
 * Sequence precedent) so the screen sidecar stays self-contained and
 * globals.css doesn't balloon.
 */
export const PREVIEW_REFINE_CSS = `
.preview-refine {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-bg-warm-phase);
  font-family: var(--font-body);
  color: var(--color-text-primary);
}

/* ── Atmosphere — warm-light glow + vignette behind content ── */
.preview-refine .atmosphere {
  position: absolute; inset: 0; z-index: 0; pointer-events: none; overflow: hidden;
}
.preview-refine .atmosphere__glow {
  position: absolute; inset: 0;
  background: radial-gradient(
    ellipse 70% 55% at 50% 40%,
    rgba(214, 162, 92, 0.18) 0%,
    rgba(214, 162, 92, 0.07) 42%,
    transparent 75%
  );
  opacity: 0.85;
  animation: pr-ambientGlow 13s var(--ease-essence) infinite;
  transition: background var(--duration-large) var(--ease-page),
              opacity var(--duration-large) var(--ease-page);
}
.preview-refine.is-playing .atmosphere__glow {
  background: radial-gradient(
    ellipse 78% 60% at 50% 38%,
    rgba(214, 162, 92, 0.30) 0%,
    rgba(214, 162, 92, 0.12) 45%,
    transparent 78%
  );
  animation: pr-ambientGlow 16s var(--ease-essence) infinite;
}
/* Candidate — warmth withdraws; nothing is alive yet. */
.preview-refine.is-candidate .atmosphere__glow {
  background: radial-gradient(
    ellipse 70% 55% at 50% 40%,
    rgba(214, 162, 92, 0.09) 0%,
    rgba(214, 162, 92, 0.035) 42%,
    transparent 75%
  );
  opacity: 0.7;
}
.preview-refine .atmosphere__vignette {
  position: absolute; inset: 0;
  background: radial-gradient(
    ellipse 120% 90% at 50% 50%,
    transparent 50%,
    rgba(60, 45, 25, 0.07) 85%,
    rgba(60, 45, 25, 0.14) 100%
  );
}
@keyframes pr-ambientGlow {
  0%, 100% { opacity: 0.82; transform: scale(1); }
  50%      { opacity: 1;    transform: scale(1.04); }
}

.preview-refine .backbar,
.preview-refine .body,
.preview-refine .footer { position: relative; z-index: 1; }

/* ── Backbar — back affordance + 5 step pips (step 4 current) ── */
.preview-refine .backbar {
  padding: var(--space-md) var(--space-xl);
  display: flex; align-items: center; justify-content: space-between;
  min-height: 52px; flex-shrink: 0;
}
.preview-refine .backbar__btn {
  background: transparent; border: 0;
  padding: var(--space-sm); margin: calc(-1 * var(--space-sm));
  color: var(--color-text-secondary); cursor: pointer;
  display: flex; min-height: 44px; align-items: center;
  border-radius: var(--radius-md);
  transition: color var(--duration-micro) var(--ease-essence);
}
.preview-refine .backbar__btn:hover { color: var(--color-text-primary); }
.preview-refine .backbar__pips { display: flex; gap: 6px; }
.preview-refine .backbar__pip {
  width: 6px; height: 6px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-warm);
  transition: width var(--duration-medium) var(--ease-essence), background var(--duration-medium) var(--ease-essence);
}
.preview-refine .backbar__pip.is-done { background: var(--color-bg-gold); }
.preview-refine .backbar__pip.is-current { width: 20px; background: var(--color-bg-gold); }
.preview-refine .backbar__spacer { width: 22px; }

/* ── Body + stage ── */
.preview-refine .body {
  padding: var(--space-xs) var(--space-xl) var(--space-2xl);
  flex: 1; display: flex; flex-direction: column;
  overflow-y: auto; -webkit-overflow-scrolling: touch;
}
.preview-refine .stage {
  flex: 1;
  display: flex; flex-direction: column; align-items: center;
  padding-top: var(--space-lg);
  text-align: center;
}

/* Entrance choreography — stone → question → player → words, staggered. */
@keyframes pr-stageReveal {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.preview-refine .stone-wrap {
  opacity: 0;
  animation: pr-stageReveal var(--duration-small) var(--ease-essence) forwards;
  animation-delay: 100ms;
  display: flex; align-items: center; justify-content: center;
  margin: 12px 0;
}
.preview-refine .prompt-question {
  opacity: 0;
  animation: pr-stageReveal var(--duration-small) var(--ease-essence) forwards;
  animation-delay: 300ms;
}
.preview-refine .player {
  opacity: 0;
  animation: pr-stageReveal var(--duration-small) var(--ease-essence) forwards;
  animation-delay: 500ms;
}
.preview-refine .transcript {
  opacity: 0;
  animation: pr-stageReveal var(--duration-medium) var(--ease-essence) forwards;
  animation-delay: 700ms;
}
.preview-refine .candidate-block {
  opacity: 0;
  animation: pr-stageReveal var(--duration-small) var(--ease-essence) forwards;
  animation-delay: 500ms;
}

/* Candidate — the words are the hero; stone steps back, spacing tightens. */
.preview-refine.is-candidate .stone-wrap { margin: var(--space-xs) 0; }
.preview-refine.is-candidate .stage { padding-top: var(--space-xs); }
.preview-refine.is-candidate .prompt-question { margin-top: var(--space-sm); }
.preview-refine.is-candidate .footer { padding-bottom: var(--space-lg); }

.preview-refine .prompt-question {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-title);
  font-weight: 500;
  line-height: var(--line-height-title);
  color: var(--color-text-primary);
  max-width: 290px;
  margin-top: var(--space-xl);
  text-wrap: pretty;
}
.preview-refine .arrival-line {
  margin-top: var(--space-sm);
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body);
  line-height: 1.5;
  color: var(--color-text-secondary);
  text-align: center;
}

/* ── Player — tap-to-play + scrubber ── */
.preview-refine .player {
  width: 100%;
  margin-top: var(--space-2xl);
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-md);
}
.preview-refine .play-hint {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--text-body);
  color: var(--color-text-secondary);
}
.preview-refine .player__bar { width: 100%; display: flex; align-items: center; gap: var(--space-md); }
.preview-refine .player__toggle {
  width: 52px; height: 52px; flex-shrink: 0;
  border-radius: var(--radius-full);
  background: var(--color-mineral); border: 0; color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; box-shadow: var(--shadow-md);
  transition: transform var(--duration-small) var(--ease-press),
              background var(--duration-micro) var(--ease-essence);
}
.preview-refine .player__toggle:active { transform: scale(0.98); }
.preview-refine .player__toggle:focus-visible { outline: 2px solid var(--color-text-primary); outline-offset: 2px; }
.preview-refine .player__track {
  flex: 1; height: 4px;
  background: rgba(122,128,136,0.32);
  border-radius: var(--radius-full); position: relative;
}
.preview-refine .player__fill {
  position: absolute; left: 0; top: 0; height: 100%; width: 0%;
  background: var(--color-mineral); border-radius: var(--radius-full);
  transition: width var(--duration-small) linear;
}
.preview-refine .player__thumb {
  position: absolute; top: 50%; left: 0%;
  width: 14px; height: 14px; margin-left: -7px;
  transform: translateY(-50%);
  background: var(--color-mineral); border-radius: var(--radius-full);
  box-shadow: 0 2px 6px rgba(0,0,0,0.18);
  opacity: 0;
  transition: opacity var(--duration-micro) var(--ease-essence), left var(--duration-small) linear;
}
.preview-refine.is-playing .player__thumb,
.preview-refine.is-played .player__thumb { opacity: 1; }
.preview-refine .player__time {
  font-family: var(--font-body); font-size: var(--text-small);
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0; min-width: 76px; text-align: right;
}

/* Audio-load failure — quiet retry in place of the scrubber. */
.preview-refine .audio-retry {
  width: 100%;
  display: flex; flex-direction: column; align-items: center; gap: var(--space-sm);
  padding: var(--space-md) 0;
}
.preview-refine .audio-retry__msg { font-family: var(--font-body); font-size: var(--text-body); color: var(--color-text-secondary); }
.preview-refine .audio-retry__btn {
  background: transparent; border: 1.5px solid var(--color-mineral);
  color: var(--color-text-primary);
  font-family: var(--font-body); font-weight: 500; font-size: var(--text-body);
  border-radius: var(--radius-lg);
  padding: var(--space-sm) var(--space-lg); min-height: 44px; cursor: pointer;
  transition: background var(--duration-micro) var(--ease-essence), transform var(--duration-small) var(--ease-press);
}
.preview-refine .audio-retry__btn:hover { background: var(--color-bg-rich); }
.preview-refine .audio-retry__btn:active { transform: scale(0.98); }
.preview-refine .audio-retry__btn:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 2px; }

/* ── Transcript — full message, dimmed until first play ── */
.preview-refine .transcript {
  width: 100%; margin-top: var(--space-xl);
  font-family: var(--font-display); font-size: var(--text-body-lg);
  line-height: 1.55; color: var(--color-text-primary); text-align: left;
}
.preview-refine .transcript-inner {
  opacity: 0.35;
  transition: opacity var(--duration-medium) var(--ease-page);
}
.preview-refine.is-playing .transcript-inner,
.preview-refine.is-played .transcript-inner { opacity: 1; }

/* ── Candidate block — un-heard draft on a card ── */
.preview-refine .candidate-block { display: none; }
.preview-refine.is-candidate .candidate-block {
  display: flex; flex-direction: column; align-items: center; width: 100%;
}
.preview-refine.is-candidate .player { display: none; }
.preview-refine.is-candidate .transcript { display: none; }

.preview-refine .candidate-marker {
  font-family: var(--font-display); font-style: italic;
  font-size: var(--text-body); color: var(--color-text-secondary);
  margin-top: var(--space-md);
}
.preview-refine .candidate-card {
  width: 100%; margin-top: var(--space-sm);
  background: var(--color-surface-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-sm);
  padding: var(--space-lg) var(--space-xl);
  text-align: left;
}
.preview-refine .candidate-card__text {
  font-family: var(--font-display); font-size: var(--text-body-lg);
  line-height: 1.55; color: var(--color-text-primary);
  transition: opacity 150ms var(--ease-essence);
}
.preview-refine .candidate-card__text.is-exiting { opacity: 0; }
.preview-refine .candidate-card__text.is-arriving { animation: pr-candidateTextIn 260ms var(--ease-essence) both; }
@keyframes pr-candidateTextIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.preview-refine .candidate-card.is-fresh { animation: pr-candidateWash 1600ms var(--ease-essence) both; }
@keyframes pr-candidateWash {
  from { background-color: var(--color-surface-warm); }
  to   { background-color: var(--color-surface-card); }
}

/* ── Footer + stacks ── */
.preview-refine .footer {
  padding: var(--space-md) var(--space-xl) var(--space-xl);
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--color-bg-warm-phase) 24px,
    var(--color-bg-warm-phase) 100%
  );
  flex-shrink: 0; display: flex; flex-direction: column; gap: var(--space-md);
}
.preview-refine .stack { display: none; flex-direction: column; gap: var(--space-md); }
.preview-refine:not(.is-candidate) .stack-committed { display: flex; }
.preview-refine.is-candidate .stack-candidate { display: flex; }

.preview-refine .btn {
  width: 100%; min-height: 52px;
  padding: var(--space-md) var(--space-xl);
  background: var(--color-mineral); color: #fff;
  font-family: var(--font-body); font-weight: 600; font-size: var(--text-body-lg);
  border: 0; border-radius: var(--radius-lg);
  box-shadow: var(--shadow-mineral); cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: var(--space-sm);
  transition: background var(--duration-micro) var(--ease-essence), transform var(--duration-small) var(--ease-press);
}
.preview-refine .btn:not(:disabled):hover { background: var(--color-mineral-dark); }
.preview-refine .btn:not(:disabled):active { transform: scale(0.98); }
.preview-refine .btn:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 2px; }
.preview-refine .btn:disabled {
  background: var(--color-surface-warm); color: var(--color-text-tertiary);
  box-shadow: none; cursor: default;
}

.preview-refine .btn-secondary {
  width: 100%; min-height: 52px;
  padding: var(--space-md) var(--space-xl);
  background: var(--color-surface-honey); color: var(--color-text-primary);
  font-family: var(--font-body); font-weight: 600; font-size: var(--text-body-lg);
  border: 1.5px solid var(--color-mineral); border-radius: var(--radius-lg);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: var(--space-sm);
  transition: background var(--duration-micro) var(--ease-essence), transform var(--duration-small) var(--ease-press);
}
.preview-refine .btn-secondary:not(:disabled):hover { background: var(--color-bg-rich); }
.preview-refine .btn-secondary:not(:disabled):active { transform: scale(0.98); }
.preview-refine .btn-secondary:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 2px; }
.preview-refine .btn-secondary:disabled { opacity: 0.6; cursor: default; }

/* Recording dots — white family on the mineral commit button. */
.preview-refine .rec-dots { display: inline-flex; align-items: center; gap: 5px; margin-left: var(--space-sm); }
.preview-refine .rec-dot {
  width: 7px; height: 7px; border-radius: var(--radius-full);
  background: rgba(255,255,255,0.95);
  transition: background var(--duration-small) var(--ease-essence), opacity var(--duration-small) var(--ease-essence);
}
.preview-refine .rec-dot.is-spent { background: rgba(255,255,255,0.35); }
.preview-refine .rec-dot.is-pending { opacity: 0.45; }

/* Cap note — replaces a retired button. */
.preview-refine .cap-note {
  font-family: var(--font-body); font-size: var(--text-body);
  color: var(--color-text-secondary); text-align: center;
  line-height: 1.5; padding: var(--space-md) 0;
  display: none;
}

/* Text links — Discard / Back to the take you heard. */
.preview-refine .link-group {
  display: flex; flex-direction: column; align-items: center;
  gap: var(--space-sm); margin-top: var(--space-xs);
}
.preview-refine .btn-link {
  background: transparent; border: 0;
  color: var(--color-text-secondary);
  font-family: var(--font-body); font-size: var(--text-body); font-weight: 500;
  padding: var(--space-sm) var(--space-md); min-height: 44px;
  text-align: center; cursor: pointer;
  transition: color var(--duration-micro) var(--ease-essence);
}
.preview-refine .btn-link:not(:disabled):hover { color: var(--color-text-primary); text-decoration: underline; }
.preview-refine .btn-link:focus-visible { outline: 2px solid var(--color-mineral); outline-offset: 2px; }
.preview-refine .btn-link:disabled { opacity: 0.5; cursor: default; }

/* Commit failure — calm inline line above the commit button. */
.preview-refine .commit-fail {
  display: none;
  font-family: var(--font-body); font-size: var(--text-body);
  color: var(--color-text-secondary); text-align: center;
  line-height: 1.5; padding: 0 var(--space-md);
}
.preview-refine.is-commitfail .commit-fail { display: block; }

/* Text soft-cap whisper. */
.preview-refine .reroll-whisper {
  display: none;
  font-family: var(--font-body); font-size: var(--text-body);
  color: var(--color-text-secondary); text-align: center;
  margin-top: calc(-1 * var(--space-xs));
}
.preview-refine.is-lastreroll .reroll-whisper { display: block; }

/* ── Caps ── */
/* Recording cap: commit done, "Make a change" + free-draft retire. */
.preview-refine.is-cap .stack-committed .btn-secondary { display: none; }
.preview-refine.is-cap .stack-committed .cap-note--rec { display: block; }
.preview-refine.is-cap .stack-candidate .btn-secondary { display: none; }
.preview-refine.is-cap .reroll-whisper { display: none; }
.preview-refine.is-cap .btn--commit {
  pointer-events: none; cursor: default;
  background: var(--color-surface-warm); color: var(--color-text-tertiary);
  box-shadow: none;
}
.preview-refine.is-cap .btn--commit .rec-dot { background: rgba(28,26,24,0.18); }
/* Text cap (candidate context): free-draft swaps for the keep-pointing note. */
.preview-refine.is-textcap .stack-candidate .btn-secondary { display: none; }
.preview-refine.is-textcap .reroll-whisper { display: none; }
.preview-refine.is-textcap .stack-candidate .cap-note--text { display: block; }

/* ── Bottom sheets (discard + change) ── */
.preview-refine .sheet-layer { position: absolute; inset: 0; z-index: 20; }
.preview-refine .sheet-backdrop {
  position: absolute; inset: 0;
  background: rgba(28,26,24,0.45); opacity: 0;
  transition: opacity var(--duration-small) var(--ease-essence);
}
.preview-refine .sheet-layer.is-open .sheet-backdrop { opacity: 1; }
.preview-refine .sheet {
  position: absolute; left: 0; right: 0; bottom: 0;
  background: var(--color-bg-warm-1);
  border-top: 1px solid rgba(255,255,255,0.65);
  border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
  padding: var(--space-xl); padding-top: var(--space-md);
  box-shadow: 0 -12px 40px rgba(0,0,0,0.22);
  display: flex; flex-direction: column; align-items: center; text-align: center;
  transform: translateY(100%);
  transition: transform var(--duration-medium) var(--ease-essence);
  will-change: transform;
}
.preview-refine .sheet-layer.is-open .sheet { transform: translateY(0); }
.preview-refine .sheet__handle {
  width: 40px; height: 4px; border-radius: var(--radius-full);
  background: rgba(28,26,24,0.28); margin-bottom: var(--space-xl);
}
.preview-refine .sheet__title {
  font-family: var(--font-display); font-style: italic;
  font-size: var(--text-body-lg); font-weight: 500;
  line-height: var(--line-height-title); color: var(--color-text-primary);
}
.preview-refine .sheet__body {
  font-family: var(--font-body); font-size: var(--text-body);
  color: var(--color-text-secondary); line-height: 1.5;
  margin-top: var(--space-sm); max-width: 280px;
}
.preview-refine .sheet .btn { margin-top: var(--space-xl); }
.preview-refine .sheet .btn-link { margin-top: var(--space-sm); }
.preview-refine .sheet-layer--change .btn-link { margin-top: var(--space-lg); }

.preview-refine .sheet-opt {
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  width: 100%; text-align: left;
  margin-top: var(--space-md);
  padding: var(--space-lg) var(--space-lg);
  background: var(--color-surface-honey);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm); cursor: pointer; min-height: 44px;
  font-family: var(--font-body);
  transition: box-shadow var(--duration-small) var(--ease-essence),
              transform var(--duration-small) var(--ease-essence);
}
.preview-refine .sheet-opt:hover { box-shadow: var(--shadow-md); }
.preview-refine .sheet-opt:active { transform: translateY(1px); box-shadow: var(--shadow-sm); }
.preview-refine .sheet-opt:focus-visible { outline: none; box-shadow: 0 0 0 4px rgba(122, 128, 136, 0.18); }
.preview-refine .sheet-opt__title { font-size: var(--text-body); font-weight: 600; color: var(--color-text-primary); }
.preview-refine .sheet-opt__sub { font-size: var(--text-body); color: var(--color-text-secondary); line-height: 1.4; }
.preview-refine .sheet__note {
  margin-top: var(--space-md);
  font-family: var(--font-display); font-style: italic;
  font-size: var(--text-body); line-height: 1.5;
  color: var(--color-text-secondary); text-align: left;
}

.preview-refine .sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .preview-refine .atmosphere__glow,
  .preview-refine .stone-wrap,
  .preview-refine .prompt-question,
  .preview-refine .player,
  .preview-refine .transcript,
  .preview-refine .candidate-block { animation: none; opacity: 1; }
  .preview-refine .candidate-card__text { transition: none; }
  .preview-refine .candidate-card__text.is-exiting { opacity: 1; }
  .preview-refine .candidate-card__text.is-arriving { animation: none; }
  .preview-refine .candidate-card.is-fresh { animation: none; }
  .preview-refine .sheet { transition: none; }
}
`;
