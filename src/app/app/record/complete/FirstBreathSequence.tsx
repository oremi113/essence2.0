'use client';

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from 'react';
import { useRouter } from 'next/navigation';
import { BreathStone, type BreathStoneState } from '@/components/breath-stone';

type Phase = 'forming' | 'crystallize' | 'preserved' | 'detail' | 'validation';

interface PhaseConfig {
  state: BreathStoneState;
  size: number;
}

const PHASE_CONFIG: Record<Phase, PhaseConfig> = {
  forming:     { state: 'working', size: 140 },
  crystallize: { state: 'infused', size: 140 },
  preserved:   { state: 'archive', size: 140 },
  detail:      { state: 'shimmer', size: 200 },
  validation:  { state: 'idle',    size: 80  },
};

const CRYSTALLIZE_AT_MS = 3500;
const PRESERVED_AT_MS = 5500;
const SKIP_VISIBLE_AT_MS = 1000;

// ─── Warm-on-dark text colors — unique to this screen, not global tokens ────
const TEXT_WARM = '#F5F0EA';
const TEXT_WARM_SECONDARY = 'rgba(245,240,234,0.75)';
const TEXT_WARM_MUTED = 'rgba(245,240,234,0.55)';

const BG_DARK = 'linear-gradient(180deg, #1A1715 0%, #26221F 100%)';
const BG_VALIDATION =
  'linear-gradient(180deg, #262220 0%, #2E2924 40%, #34302A 100%)';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
}

interface FirstBreathSequenceProps {
  voiceProfileId: string;
}

export function FirstBreathSequence({ voiceProfileId }: FirstBreathSequenceProps) {
  void voiceProfileId; // reserved for analytics events wired in a later session
  const router = useRouter();
  const prefersReducedMotion = usePrefersReducedMotion();

  const [autoPhase, setAutoPhase] = useState<Phase>('forming');
  const [userPhase, setUserPhase] = useState<Phase | null>(null);
  const [ctaRevealed, setCtaRevealed] = useState<boolean>(false);
  const [skipRevealed, setSkipRevealed] = useState<boolean>(false);

  const phase: Phase = userPhase ?? (prefersReducedMotion ? 'preserved' : autoPhase);
  const ctaVisible = ctaRevealed || prefersReducedMotion || phase !== 'forming';
  const skipVisible = skipRevealed || prefersReducedMotion;

  // TODO: analytics — breath_stone_sequence_started

  useEffect(() => {
    if (prefersReducedMotion) return;

    const tSkip = setTimeout(() => setSkipRevealed(true), SKIP_VISIBLE_AT_MS);
    const tCrystal = setTimeout(
      () => setAutoPhase('crystallize'),
      CRYSTALLIZE_AT_MS
    );
    const tPreserved = setTimeout(() => {
      setAutoPhase('preserved');
      setCtaRevealed(true);
      // TODO: analytics — breath_stone_sequence_completed
    }, PRESERVED_AT_MS);

    return () => {
      clearTimeout(tSkip);
      clearTimeout(tCrystal);
      clearTimeout(tPreserved);
    };
  }, [prefersReducedMotion]);

  const skipToPreserved = useCallback(() => {
    // TODO: analytics — breath_stone_skip_tapped
    setAutoPhase('preserved');
    setCtaRevealed(true);
  }, []);

  const goToDetail = useCallback(() => {
    // TODO: analytics — breath_stone_cta_tapped (phase: preserved)
    setUserPhase('detail');
  }, []);

  const goToValidation = useCallback(() => {
    // TODO: analytics — breath_stone_cta_tapped (phase: detail)
    setUserPhase('validation');
  }, []);

  const handleExit = useCallback(() => {
    // TODO: analytics — breath_stone_cta_tapped (phase: validation)
    // TODO: replace with router.push('/app/checkout') when Session 7 is complete
    router.push('/app/record/complete/stub');
  }, [router]);

  const stone = PHASE_CONFIG[phase];
  const isValidation = phase === 'validation';

  const rootStyle: CSSProperties = {
    minHeight: '100vh',
    background: isValidation ? BG_VALIDATION : BG_DARK,
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

  return (
    <main style={rootStyle}>
      <div aria-hidden style={vignetteStyle} />

      <div style={stageStyle}>
        <div aria-hidden style={haloStyle(stone.size)} />
        {phase === 'forming' && <Particles />}
        <BreathStone state={stone.state} size={stone.size} />
      </div>

      <div style={copyStyle}>{renderCopy(phase)}</div>

      {phase === 'detail' && <MetadataChips />}

      <div style={ctaAreaStyle}>
        {ctaVisible && phase === 'preserved' && (
          <HoneyButton onClick={goToDetail}>See My Stone</HoneyButton>
        )}
        {phase === 'detail' && (
          <HoneyButton onClick={goToValidation}>Continue</HoneyButton>
        )}
        {phase === 'validation' && (
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
          <h1 style={headlineStyle}>Your voice is being honored.</h1>
        </>
      );
    case 'crystallize':
      return (
        <>
          <h1 style={headlineStyle}>We&rsquo;re carefully preserving your voice.</h1>
        </>
      );
    case 'preserved':
      return (
        <>
          <h1 style={headlineStyle}>Your voice has been preserved.</h1>
          <p style={subtextStyle}>This is your first Breath Stone.</p>
        </>
      );
    case 'detail':
      return (
        <>
          <h1 style={headlineStyle}>Breath Stone Details</h1>
        </>
      );
    case 'validation':
      return (
        <>
          <h1 style={headlineStyle}>What you said matters.</h1>
          <p style={subtextStyle}>
            You&rsquo;re creating something meaningful for the people you love.
          </p>
        </>
      );
  }
}

// ─── Metadata chips ─────────────────────────────────────────────────────────

function MetadataChips() {
  return (
    <div style={chipsRowStyle}>
      <Chip label="Recorded Warmup">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={16} height={16}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </Chip>
      <Chip label="Emotion Capture">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={16} height={16}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </Chip>
      <Chip label="Saved Securely">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={16} height={16}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </Chip>
    </div>
  );
}

function Chip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={chipStyle}>
      <span aria-hidden style={{ display: 'inline-flex', opacity: 0.6 }}>
        {children}
      </span>
      <span>{label}</span>
    </div>
  );
}

// ─── Particles (CSS-only, forming phase) ────────────────────────────────────

function Particles() {
  const particles = Array.from({ length: 26 });
  return (
    <div aria-hidden style={particlesContainerStyle}>
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

const vignetteStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background:
    'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.08) 100%)',
  pointerEvents: 'none',
  zIndex: 5,
};

const stageStyle: CSSProperties = {
  position: 'relative',
  width: 300,
  height: 300,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 32,
};

const haloStyle = (stoneSize: number): CSSProperties => ({
  position: 'absolute',
  width: Math.max(300, stoneSize + 120),
  height: Math.max(300, stoneSize + 120),
  borderRadius: '50%',
  background:
    'radial-gradient(circle, rgba(232, 220, 200, 0.12) 0%, rgba(232, 220, 200, 0.06) 40%, transparent 70%)',
  pointerEvents: 'none',
});

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

const subtextStyle: CSSProperties = {
  fontFamily: 'var(--font-body, sans-serif)',
  fontSize: 16,
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
  minHeight: 60,
};

const honeyButtonStyle: CSSProperties = {
  background: '#E8DCC8',
  color: '#1C1A18',
  borderRadius: 16,
  padding: '18px 24px',
  fontSize: 16,
  fontWeight: 600,
  width: '100%',
  border: 'none',
  cursor: 'pointer',
  boxShadow: '0 4px 20px rgba(232, 220, 200, 0.20)',
};

const skipLinkStyle: CSSProperties = {
  position: 'absolute',
  bottom: 16,
  background: 'transparent',
  border: 'none',
  color: TEXT_WARM_MUTED,
  fontSize: 14,
  opacity: 0.6,
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
