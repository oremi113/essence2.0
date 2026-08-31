'use client';

import { useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { BreathStone, type BreathStoneState } from '@/components/breath-stone';
import { track } from '@/lib/analytics/client';
import {
  createFirstBreathAudio,
  type FirstBreathAudioEngine,
} from '@/lib/audio/firstBreathAudio';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';
import { useCopyCrossfade } from '@/lib/animation/useCopyCrossfade';
import { ROUTES } from '@/lib/routes';
import {
  useFirstBreathPhases,
  type FirstBreathPhase,
  RING_DISSIPATE_MS,
  RING_FIRE_AT_MS,
  STONE_ENTRANCE_MS,
  TEXT_REVEAL_DELAY_MS,
} from './FirstBreathSequence.phases';

type Phase = FirstBreathPhase;

interface PhaseConfig {
  state: BreathStoneState;
  size: number;
}

const PHASE_CONFIG: Record<Phase, PhaseConfig> = {
  forming:     { state: 'working', size: 140 },
  crystallize: { state: 'infused', size: 140 },
  preserved:   { state: 'archive', size: 140 },
  detail:      { state: 'shimmer', size: 200 },
};

// Crystallize caption fades in "late" — observational whisper rather than
// label — roughly one beat after fragments start converging.
const CRYSTALLIZE_CAPTION_DELAY_MS = 900;
const FORMING_CAPTION_DELAY_MS = 300;

// ─── Warm-on-dark text colors — unique to this screen, not global tokens ────
const TEXT_WARM = '#F5F0EA';
const TEXT_WARM_SECONDARY = 'rgba(245,240,234,0.75)';
const TEXT_WARM_MUTED = 'rgba(245,240,234,0.55)';

// 3-stop gradient with hue shift between stops — top cooler + darker,
// middle warm, bottom warmer + deeper. Gives the screen an actual color
// journey top-to-bottom so it reads as a volumetric space rather than a
// flat dark surface with a warm highlight pasted over it.
const BG_DARK =
  'linear-gradient(180deg, #15120F 0%, #1E1915 50%, #2A241E 100%)';

interface FirstBreathSequenceProps {
  voiceProfileId: string;
}

export function FirstBreathSequence({ voiceProfileId }: FirstBreathSequenceProps) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  // ─── Ceremony audio ─────────────────────────────────────────────────
  // Three procedurally-synthesised layers (no asset files) — ambient bed on
  // mount, a harmonic swell on the crystallize beat, a resonant bell on the
  // reveal peak. See src/lib/audio/firstBreathAudio.ts. The engine gates itself
  // behind the first gesture for iOS autoplay and fades out on unmount. Skipped
  // entirely under reduced motion (the timed beats it syncs to don't fire).
  const audioRef = useRef<FirstBreathAudioEngine | null>(null);

  useEffect(() => {
    if (prefersReducedMotion) return;
    // The audio enhances a visual-primary ceremony; a failure to create or start
    // it must degrade to silence, never interrupt the sacred beat. createFirstBreath
    // Audio already returns null on failure, but guard start() too so nothing can
    // throw into this mount effect. (S10-C: silent graceful degradation.)
    let engine: FirstBreathAudioEngine | null = null;
    try {
      engine = createFirstBreathAudio();
      engine?.start();
    } catch {
      // start() failed after the engine was created — dispose the half-built
      // graph so we don't leak an AudioContext, then run silent.
      try {
        engine?.dispose();
      } catch {
        /* already unwinding — nothing to clean up */
      }
      engine = null;
    }
    audioRef.current = engine;
    return () => {
      audioRef.current = null;
      engine?.dispose();
    };
  }, [prefersReducedMotion]);

  // Beat one-shots are fire-and-forget enhancements — a mid-ceremony failure
  // must not break the timed beat that triggers it, so swallow silently.
  const handleCrystallizeBeat = useCallback(() => {
    try {
      audioRef.current?.playCrystallize();
    } catch {
      /* silent — see S10-C degradation note above */
    }
  }, []);
  const handleRevealBeat = useCallback(() => {
    try {
      audioRef.current?.playReveal();
    } catch {
      /* silent — see S10-C degradation note above */
    }
  }, []);

  const {
    phase,
    skipVisible,
    ctaVisible,
    detailRevealed,
    preservedReady,
    entranceActive,
    skipToPreserved,
    goToDetail,
  } = useFirstBreathPhases({
    voiceProfileId,
    prefersReducedMotion,
    onCrystallizeBeat: handleCrystallizeBeat,
    onRevealBeat: handleRevealBeat,
  });

  const { entering: enteringCopyPhase, exiting: exitingCopyPhase } =
    useCopyCrossfade<Phase>(phase, { disabled: prefersReducedMotion });

  const handleExit = useCallback(() => {
    track('breath_stone_cta_tapped', { voiceProfileId, phase: 'detail' });
    // Spine-wiring S3: First Breath hands off to first message creation
    // (MASTER_SPEC §4.4 immutable rule 4: playback before first message). This
    // replaces the old "coming soon" placeholder (recordCompleteStub,
    // FOLLOW_UPS #25), which is now orphaned and retired in S4.
    router.push(ROUTES.messagesNew);
  }, [router, voiceProfileId]);

  const stone = PHASE_CONFIG[phase];

  const rootStyle: CSSProperties = {
    minHeight: '100vh',
    background: BG_DARK,
    color: TEXT_WARM,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
  };

  // Copy fades in per-phase. Delays match the beat intent: forming copy
  // "settles in" shortly after mount, crystallize caption fades in "late"
  // as a whispered observation, preserved holds until the stone's bloom
  // completes.
  const copyFadeDelayMs = prefersReducedMotion
    ? 0
    : enteringCopyPhase === 'forming'
    ? FORMING_CAPTION_DELAY_MS
    : enteringCopyPhase === 'crystallize'
    ? CRYSTALLIZE_CAPTION_DELAY_MS
    : enteringCopyPhase === 'preserved'
    ? TEXT_REVEAL_DELAY_MS
    : 0;

  // Container is relative + fixed min-height so the two stacked slots
  // (exiting absolute, entering in flow) don't collapse the page.
  const copyDynamicStyle: CSSProperties = {
    ...copyStyle,
    minHeight: 100,
  };

  const enteringSlotStyle: CSSProperties = {
    animation: prefersReducedMotion
      ? undefined
      : `copyFadeIn 700ms ease ${copyFadeDelayMs}ms both`,
  };

  const exitingSlotStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    animation: 'copyFadeOut 400ms ease forwards',
    pointerEvents: 'none',
  };

  const stoneWrapperStyle: CSSProperties = entranceActive
    ? {
        animation: `stoneEntrance ${STONE_ENTRANCE_MS}ms var(--ease-page) both`,
        transformOrigin: 'center',
        willChange: 'transform, opacity',
      }
    : {};

  return (
    <main style={rootStyle}>
      <style>{screenKeyframes}</style>

      <div aria-hidden style={sanctuaryGlowStyle} />
      <div aria-hidden style={vignetteStyle} />

      <div style={stageStyle}>
        <div aria-hidden style={haloStyle(phase)} />
        <Particles visible={phase === 'forming'} />
        <Fragments visible={phase === 'crystallize'} />
        {entranceActive && <div aria-hidden style={goldRingStyle} />}
        <div style={stoneWrapperStyle}>
          <BreathStone state={stone.state} size={stone.size} />
        </div>
        {entranceActive && <div aria-hidden style={stoneBloomStyle} />}
        {phase === 'detail' && !prefersReducedMotion && (
          <div aria-hidden style={stoneGlimmerStyle}>
            <div style={stoneGlimmerBandStyle} />
          </div>
        )}
      </div>

      <div style={copyDynamicStyle}>
        {exitingCopyPhase !== null && (
          <div key={`exit-${exitingCopyPhase}`} style={exitingSlotStyle}>
            {renderCopy(exitingCopyPhase)}
          </div>
        )}
        <div key={`enter-${enteringCopyPhase}`} style={enteringSlotStyle}>
          {renderCopy(enteringCopyPhase)}
        </div>
      </div>

      {phase === 'detail' && <MetadataChips />}

      <div style={ctaAreaStyle}>
        {ctaVisible && phase === 'preserved' && preservedReady && (
          <HoneyButton onClick={goToDetail}>See My Stone</HoneyButton>
        )}
        {phase === 'detail' && detailRevealed && (
          <HoneyButton onClick={handleExit}>Continue</HoneyButton>
        )}
      </div>

      {skipVisible && (phase === 'forming' || phase === 'crystallize') && (
        <button
          type="button"
          onClick={skipToPreserved}
          aria-label="Skip to Breath Stone reveal"
          style={skipLinkStyle}
        >
          Skip
        </button>
      )}
    </main>
  );
}

function renderCopy(phase: Phase) {
  switch (phase) {
    case 'forming':
      return (
        <>
          <h1 style={headlineStyle}>Your first Breath Stone is forming.</h1>
          <p style={subtextStyle}>Something from your voice is taking shape.</p>
        </>
      );
    case 'crystallize':
      return (
        <h1 style={headlineStyle}>Your voice is becoming stone.</h1>
      );
    case 'preserved':
      return (
        <>
          <h1 style={headlineSmallItalicStyle}>Your first Breath Stone.</h1>
          <p style={subtextStyle}>A piece of you, held.</p>
        </>
      );
    case 'detail':
      // Title removed per copy audit — let the stone speak. Chips render below.
      return null;
  }
}

// ─── Metadata chips ─────────────────────────────────────────────────────────

function MetadataChips() {
  return (
    <div style={chipsRowStyle}>
      <Chip delay={0} label="Born from your voice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={16} height={16}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </Chip>
      <Chip delay={120} label="Shaped by what you felt">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={16} height={16}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </Chip>
      <Chip delay={240} label="Safeguarded for you">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={16} height={16}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </Chip>
    </div>
  );
}

function Chip({
  label,
  delay,
  children,
}: {
  label: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        ...chipStyle,
        animation: `chipIn 600ms ease ${delay}ms both`,
      }}
    >
      <span aria-hidden style={{ display: 'inline-flex', opacity: 0.6 }}>
        {children}
      </span>
      <span>{label}</span>
    </div>
  );
}

// ─── Fragments (CSS-only, crystallize phase) ───────────────────────────────
// Small warm motes starting on a ring around the stone and converging to
// center. This is what makes Beat 2 actually read as "fragments converge"
// rather than just "the stone gets warmer." Each fragment's start position
// is a per-element CSS custom property (--fx, --fy); the keyframe
// interpolates from that to (0, 0) + a shrink.

function Fragments({ visible }: { visible: boolean }) {
  const count = 20;
  return (
    <div
      aria-hidden
      style={{
        ...fragmentsContainerStyle,
        opacity: visible ? 1 : 0,
        transition: 'opacity 500ms ease',
      }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i * 0.213);
        const radius = 160 + ((i * 11) % 55);
        const fx = Math.cos(angle) * radius;
        const fy = Math.sin(angle) * radius;
        const delay = (i * 97) % 1400;
        const duration = 1500 + ((i * 13) % 500);
        const size = 3 + (i % 3);
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: size,
              height: size,
              marginLeft: -size / 2,
              marginTop: -size / 2,
              borderRadius: '50%',
              background: 'rgba(232, 200, 150, 0.9)',
              boxShadow: '0 0 8px rgba(232, 200, 150, 0.55)',
              opacity: 0,
              animation: `fragmentConverge ${duration}ms cubic-bezier(0.3, 0, 0.5, 1) ${delay}ms infinite`,
              ['--fx' as string]: `${fx}px`,
              ['--fy' as string]: `${fy}px`,
            } as CSSProperties}
          />
        );
      })}
    </div>
  );
}

const fragmentsContainerStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 3,
};

// ─── Particles (CSS-only, forming phase) ────────────────────────────────────

function Particles({ visible }: { visible: boolean }) {
  const particles = Array.from({ length: 26 });
  return (
    <div
      aria-hidden
      style={{
        ...particlesContainerStyle,
        opacity: visible ? 1 : 0,
        transition: 'opacity 500ms ease',
      }}
    >
      {particles.map((_, i) => {
        const delay = (i * 0.37) % 6;
        const duration = 6 + (i % 5) * 0.8;
        const left = (i * 53) % 100;
        const opacity = 0.08 + ((i * 7) % 36) / 100;
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${left}%`,
              bottom: -8,
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: 'rgba(232, 220, 200, 0.6)',
              opacity,
              animation: `firstBreathParticle ${duration}s linear ${delay}s infinite`,
            }}
          />
        );
      })}
      <style>{particlesKeyframes}</style>
    </div>
  );
}

const particlesKeyframes = `
@keyframes firstBreathParticle {
  0%   { transform: translateY(0) scale(0.8); opacity: 0; }
  10%  { opacity: var(--p-opacity, 0.2); }
  100% { transform: translateY(-320px) scale(1.1); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes firstBreathParticle {
    0%, 100% { opacity: 0; transform: none; }
  }
}
`;

// ─── Honey CTA ──────────────────────────────────────────────────────────────

function HoneyButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={honeyButtonStyle}>
      {children}
    </button>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

// Cinematic vignette — deeper than the original 0.08 at corners so the
// frame actively draws the eye to the stone. 0.22 at the four corners,
// ramping in from 35% radius outward.
const vignetteStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.10) 70%, rgba(0,0,0,0.22) 100%)',
  pointerEvents: 'none',
  zIndex: 5,
};

// Sanctuary glow — warm amber radial positioned at ~50% 30% so the light
// source sits above the stone like candlelight in a chapel rather than a
// flat vertical gradient. Breathes on a 13s loop (see keyframes below),
// intentionally longer than the stone's ~5s breath so they drift in and
// out of phase naturally — "the room inhales while the stone exhales."
const sanctuaryGlowStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(210, 160, 110, 0.14) 0%, rgba(180, 130, 90, 0.06) 35%, transparent 72%)',
  pointerEvents: 'none',
  zIndex: 1,
  animation: 'sanctuaryBreath 13s ease-in-out infinite',
  transformOrigin: '50% 30%',
  willChange: 'opacity, transform',
};

// Bloom overlay — sibling to the stone, sits on top with mix-blend-mode:
// screen so it reads as emitted warm light, not a tint. Opacity-only
// animation (0 → 1 → 0 peaking at 50%) is GPU-accelerated. The whole
// point of this beat is the brightness spike on arrival; the stone should
// appear to emit light, settle, then breathe.
const stoneBloomStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  width: 280,
  height: 280,
  borderRadius: '50%',
  // Inner color aligned to the sanctuary amber family (245,210,160) so
  // bloom, sanctuary-glow, and halo all sing in the same key. Peach at
  // rgba(255,225,180) reads as color noise against the deeper ambers.
  background:
    'radial-gradient(circle, rgba(245, 210, 160, 0.55) 0%, rgba(232, 195, 140, 0.28) 30%, rgba(232, 195, 140, 0.10) 55%, transparent 75%)',
  pointerEvents: 'none',
  opacity: 0,
  transform: 'translate(-50%, -50%)',
  animation: `stoneBloom ${STONE_ENTRANCE_MS}ms ease-in-out both`,
  zIndex: 5,
  mixBlendMode: 'screen',
  willChange: 'opacity, transform',
};

// Gold ring that fires at the bloom peak. No border and no inset shadow —
// a traceable edge reads as UI, not atmosphere. The effect is a radial
// gradient fill + a single outer bloom, so it feels like a pulse of light
// rather than a hoop expanding.
const goldRingStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  width: 160,
  height: 160,
  borderRadius: '50%',
  border: 'none',
  background:
    'radial-gradient(circle, rgba(232, 180, 110, 0.35) 0%, rgba(232, 180, 110, 0.15) 40%, transparent 65%)',
  boxShadow: '0 0 60px rgba(232, 180, 110, 0.25)',
  pointerEvents: 'none',
  opacity: 0,
  transform: 'translate(-50%, -50%) scale(0.55)',
  animation: `goldRing ${RING_DISSIPATE_MS}ms ease-out ${RING_FIRE_AT_MS}ms both`,
  zIndex: 4,
};

// Slow drift of warm light across the stone surface during the detail
// beat. Sits on top of the canvas with mix-blend-mode: screen + overflow
// clipped to a circle so the sweep reads as light grazing the surface,
// not a rectangle floating in front. Opacity-gated at the edges so the
// loop wraps cleanly — no visible snap back to start.
const stoneGlimmerStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  width: 220,
  height: 220,
  marginLeft: -110,
  marginTop: -110,
  borderRadius: '50%',
  overflow: 'hidden',
  pointerEvents: 'none',
  mixBlendMode: 'screen',
  zIndex: 6,
};

const stoneGlimmerBandStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'linear-gradient(110deg, transparent 35%, rgba(255, 235, 200, 0.18) 48%, rgba(255, 245, 220, 0.28) 52%, rgba(255, 235, 200, 0.18) 56%, transparent 70%)',
  animation: 'lightDrift 6s ease-in-out infinite',
  willChange: 'transform',
};

const screenKeyframes = `
@keyframes sanctuaryBreath {
  0%, 100% { opacity: 0.80; transform: scale(0.97); }
  50%      { opacity: 1.00; transform: scale(1.03); }
}
@keyframes haloPulse {
  0%, 100% { opacity: 0.78; transform: scale(0.97); }
  50%      { opacity: 1.00; transform: scale(1.04); }
}
@keyframes haloPulseCalm {
  0%, 100% { opacity: 0.92; transform: scale(0.99); }
  50%      { opacity: 1.00; transform: scale(1.01); }
}
@keyframes stoneEntrance {
  0%   { opacity: 0.60; transform: scale(0.80); }
  100% { opacity: 1.00; transform: scale(1.00); }
}
@keyframes stoneBloom {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.60); }
  50%  { opacity: 1; transform: translate(-50%, -50%) scale(1.00); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.15); }
}
@keyframes goldRing {
  0%   { opacity: 0;    transform: translate(-50%, -50%) scale(0.55); }
  12%  { opacity: 0.65; transform: translate(-50%, -50%) scale(0.85); }
  100% { opacity: 0;    transform: translate(-50%, -50%) scale(3.20); }
}
@keyframes fragmentConverge {
  0%   { opacity: 0;    transform: translate(var(--fx), var(--fy)) scale(1); }
  12%  { opacity: 0.95; }
  85%  { opacity: 0.55; }
  100% { opacity: 0;    transform: translate(0, 0) scale(0); }
}
@keyframes copyFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes copyFadeOut {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-4px); }
}
@keyframes chipIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes lightDrift {
  0%   { transform: translateX(-120%); opacity: 0; }
  20%  { opacity: 1; }
  80%  { opacity: 1; }
  100% { transform: translateX(120%); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  @keyframes sanctuaryBreath {
    0%, 100% { opacity: 0.9; transform: none; }
  }
  @keyframes haloPulse {
    0%, 100% { opacity: 1; transform: none; }
  }
  @keyframes haloPulseCalm {
    0%, 100% { opacity: 1; transform: none; }
  }
  @keyframes stoneEntrance {
    0%, 100% { opacity: 1; transform: none; }
  }
  @keyframes stoneBloom {
    0%, 100% { opacity: 0; transform: translate(-50%, -50%); }
  }
  @keyframes goldRing {
    0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
  }
  @keyframes fragmentConverge {
    0%, 100% { opacity: 0; transform: none; }
  }
  @keyframes copyFadeIn {
    from, to { opacity: 1; transform: none; }
  }
  @keyframes copyFadeOut {
    from, to { opacity: 0; transform: none; }
  }
  @keyframes chipIn {
    from, to { opacity: 1; transform: none; }
  }
  @keyframes lightDrift {
    0%, 100% { opacity: 0; transform: none; }
  }
}
`;

const stageStyle: CSSProperties = {
  position: 'relative',
  width: 300,
  height: 300,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 32,
};

// Halo responds to phase with three breathing frequencies so the scene
// is never visually silent:
//   • forming     — active pulse, 4.5s loop, ~7% scale range
//   • crystallize — calm pulse, 7s loop, ~2% range (middle harmonic
//     between the stone's ~5s breath and the sanctuary's 13s drift)
//   • preserved   — calm pulse, same 7s rhythm
//   • detail      — fades to 0 ("no spotlight boundary" — stone sits in
//     atmosphere), leaving only the sanctuary glow as context
// Size is fixed — animating width/height triggers layout reflow on
// phone hardware. Use transform: scale() if resizing is ever needed.
const haloStyle = (phase: Phase): CSSProperties => {
  const animation =
    phase === 'forming'
      ? 'haloPulse 4500ms ease-in-out infinite'
      : phase === 'crystallize' || phase === 'preserved'
      ? 'haloPulseCalm 7000ms ease-in-out infinite'
      : undefined;
  return {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: '50%',
    background:
      'radial-gradient(circle, rgba(232, 220, 200, 0.12) 0%, rgba(232, 220, 200, 0.06) 40%, transparent 70%)',
    pointerEvents: 'none',
    transformOrigin: 'center',
    opacity: phase === 'detail' ? 0 : 1,
    // Transform transition eases the halo back to rest when the pulse
    // animation is removed (leaving forming), so the scale doesn't snap.
    transition: 'opacity 1200ms ease, transform 800ms ease',
    animation,
  };
};

const particlesContainerStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
};

const copyStyle: CSSProperties = {
  maxWidth: 420,
  marginBottom: 24,
  position: 'relative',
  zIndex: 10,
};

const headlineStyle: CSSProperties = {
  fontFamily: 'var(--font-display, serif)',
  fontSize: 26,
  fontWeight: 400,
  lineHeight: 1.35,
  color: TEXT_WARM,
  margin: 0,
};

// Screen 3 reveal uses a quieter, smaller italic line — "Your first Breath
// Stone." — so the subtitle "A piece of you, held." can sit as the emotional
// weight beat rather than the name of the object.
const headlineSmallItalicStyle: CSSProperties = {
  ...headlineStyle,
  fontSize: 22,
  fontStyle: 'italic',
};

// Subtitle is serif italic (Spectral) at 15px — the editorial-book move.
// Pairing italic serif headline with italic serif subtitle reads as one
// continuous thought in two weights, rather than "literary" title above
// "functional" caption. On forming, it turns the subtitle into a
// whispered aside; on preserved, it keeps "A piece of you, held." in
// the same register as the line above it.
const subtextStyle: CSSProperties = {
  fontFamily: 'var(--font-display, serif)',
  fontSize: 15,
  fontStyle: 'italic',
  fontWeight: 400,
  lineHeight: 1.65,
  letterSpacing: '0.01em',
  color: TEXT_WARM_SECONDARY,
  marginTop: 12,
};

const ctaAreaStyle: CSSProperties = {
  width: '100%',
  maxWidth: 360,
  position: 'relative',
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  // Matches the button's measured height (52px) so there's no dead
  // space below it in CTA-present phases, and no layout jump when the
  // CTA appears in earlier phases (space was already reserved).
  minHeight: 52,
};

const honeyButtonStyle: CSSProperties = {
  background: '#E8DCC8',
  color: '#1C1A18',
  borderRadius: 16,
  padding: '18px 24px',
  fontSize: 16,
  // Explicit line-height so the button's rendered height is predictable
  // (16 × 1 + 18 + 18 = 52px). Lets the CTA slot's min-height match exactly.
  lineHeight: 1,
  fontWeight: 600,
  width: '100%',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 4px 20px rgba(232, 220, 200, 0.20)',
};

// Skip lives bottom-right at 40% opacity. Top-right put it in the warmest
// part of the sanctuary glow (centered around 50% × 30%), competing with
// the stone. Bottom-right is the frame of escape — findable but not
// present. Offset to the side so it doesn't collide with the centered CTA.
const skipLinkStyle: CSSProperties = {
  position: 'absolute',
  bottom: 20,
  right: 20,
  background: 'transparent',
  border: 'none',
  color: TEXT_WARM_MUTED,
  fontSize: 13,
  letterSpacing: '0.04em',
  padding: '6px 10px',
  opacity: 0.4,
  cursor: 'pointer',
  zIndex: 10,
};

const chipsRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  justifyContent: 'center',
  marginBottom: 24,
  position: 'relative',
  zIndex: 10,
};

const chipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  background: 'rgba(245, 240, 234, 0.06)',
  border: '1px solid rgba(245, 240, 234, 0.08)',
  borderRadius: 24,
  padding: '10px 16px',
  fontSize: 13,
  color: TEXT_WARM_SECONDARY,
};

export default FirstBreathSequence;
