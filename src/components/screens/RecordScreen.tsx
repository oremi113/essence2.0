'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BreathStone } from '@/components/breath-stone';
import { PageTransition, PrimaryButton, SecondaryButton } from '@/components/ui';
import { RecordingUpload, type Status as UploadStatus } from '@/components/audio/RecordingUpload';
import { voiceTrainingScript, TOTAL_PROMPT_COUNT } from '@/lib/voice-training/script';
import { resolvePrompt } from '@/lib/voice-training/resolver';
import type { ResolverContext } from '@/lib/voice-training/types';
import type { RecordScreenData } from './RecordScreen.types';

// ─── FLAT PROMPT LIST ──────────────────────────────────────────────────────
const ALL_PROMPTS = voiceTrainingScript.flatMap((stage) => stage.prompts);

// ─── CONSTANTS ─────────────────────────────────────────────────────────────
// Celebrations fire after completing these prompt indices (0-based)
const CELEBRATION_INDICES = new Set([0, 4, 11, 16, 24]);

function getStageForPrompt(promptIndex: number): 1 | 2 | 3 {
  if (promptIndex <= 4) return 1;
  if (promptIndex <= 16) return 2;
  return 3;
}

function getStageStartIndex(stage: 1 | 2 | 3): number {
  if (stage === 1) return 0;
  if (stage === 2) return 5;
  return 17;
}

// ─── VIEW MODE ─────────────────────────────────────────────────────────────
type ViewMode =
  | { type: 'entry' }
  | { type: 'grounding' }
  | { type: 'mic-permission' }
  | { type: 'checklist' }
  | { type: 'environment' }
  | { type: 'stage-intro'; stage: 1 | 2 | 3 }
  | { type: 'prompt'; promptIndex: number }
  | { type: 'celebration'; afterPromptIndex: number }
  | { type: 'working' }
  | { type: 'ready' };

function deriveInitialView(data: RecordScreenData): ViewMode {
  if (data.voiceProfileStatus === 'processing' || data.voiceProfileStatus === 'queued')
    return { type: 'working' };
  if (data.voiceProfileStatus === 'ready')
    return { type: 'ready' };
  if (data.clipsRecorded === 0)
    return { type: 'entry' };
  if (data.clipsRecorded === 5)
    return { type: 'stage-intro', stage: 2 };
  if (data.clipsRecorded === 17)
    return { type: 'stage-intro', stage: 3 };
  return { type: 'prompt', promptIndex: Math.min(data.clipsRecorded, TOTAL_PROMPT_COUNT - 1) };
}

// ─── STAGE MAP ─────────────────────────────────────────────────────────────
const STAGE_LABELS = ['Everyday', 'Emotional', 'Personal'] as const;

function StageMap({ currentStage }: { currentStage: 1 | 2 | 3 }) {
  return (
    <div className="record-stage-map">
      {[1, 2, 3].map((s) => {
        let modifier = 'upcoming';
        if (s < currentStage) modifier = 'completed';
        else if (s === currentStage) modifier = 'current';

        return (
          <div
            key={s}
            className={`record-stage-map__segment record-stage-map__segment--${modifier}`}
          >
            <div className={`record-stage-map__node record-stage-map__node--${modifier}`}>
              {s}
            </div>
            <div className="record-stage-map__label">{STAGE_LABELS[s - 1]}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

interface RecordScreenProps {
  data: RecordScreenData;
}

export function RecordScreen({ data }: RecordScreenProps) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>(() => deriveInitialView(data));

  // Build resolver context client-side
  const resolverContext: ResolverContext = useMemo(
    () => ({
      userName: data.displayName ?? undefined,
      city: data.city ?? undefined,
      birthYear: data.birthYear ?? undefined,
      relationship: data.relationship ?? undefined,
    }),
    [data.displayName, data.city, data.birthYear, data.relationship]
  );

  // Poll for ready status when processing
  useEffect(() => {
    if (view.type !== 'working') return;
    const interval = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(interval);
  }, [view.type, router]);

  // React to server-side status changes (from router.refresh)
  useEffect(() => {
    if (data.voiceProfileStatus === 'ready' && view.type === 'working') {
      setView({ type: 'ready' });
    }
  }, [data.voiceProfileStatus, view.type]);

  // ─── Navigation helpers ─────────────────────────────────────

  const advanceFromPrompt = useCallback((promptIndex: number) => {
    if (CELEBRATION_INDICES.has(promptIndex)) {
      setView({ type: 'celebration', afterPromptIndex: promptIndex });
    } else {
      setView({ type: 'prompt', promptIndex: promptIndex + 1 });
    }
  }, []);

  const advanceFromCelebration = useCallback((afterPromptIndex: number) => {
    if (afterPromptIndex === 0) setView({ type: 'prompt', promptIndex: 1 });
    else if (afterPromptIndex === 4) setView({ type: 'stage-intro', stage: 2 });
    else if (afterPromptIndex === 11) setView({ type: 'prompt', promptIndex: 12 });
    else if (afterPromptIndex === 16) setView({ type: 'stage-intro', stage: 3 });
    else if (afterPromptIndex === 24) setView({ type: 'working' });
  }, []);

  // ─── Render ─────────────────────────────────────────────────

  if (view.type === 'entry')
    return (
      <PageTransition>
        <EntryView onContinue={() => setView({ type: 'grounding' })} />
      </PageTransition>
    );

  if (view.type === 'grounding')
    return (
      <PageTransition>
        <GroundingView onContinue={() => setView({ type: 'mic-permission' })} />
      </PageTransition>
    );

  if (view.type === 'mic-permission')
    return (
      <PageTransition>
        <MicPermissionView
          onGranted={() => setView({ type: 'checklist' })}
          onSkip={() => setView({ type: 'checklist' })}
        />
      </PageTransition>
    );

  if (view.type === 'checklist')
    return (
      <PageTransition>
        <ChecklistView onContinue={() => setView({ type: 'environment' })} />
      </PageTransition>
    );

  if (view.type === 'environment')
    return (
      <PageTransition>
        <EnvironmentView
          onReady={() => setView({ type: 'stage-intro', stage: 1 })}
        />
      </PageTransition>
    );

  if (view.type === 'stage-intro')
    return (
      <PageTransition>
        <StageIntroView
          stage={view.stage}
          onContinue={() =>
            setView({ type: 'prompt', promptIndex: getStageStartIndex(view.stage) })
          }
          onPause={() => router.push('/home')}
        />
      </PageTransition>
    );

  if (view.type === 'celebration')
    return (
      <PageTransition>
        <CelebrationView
          afterPromptIndex={view.afterPromptIndex}
          onContinue={() => advanceFromCelebration(view.afterPromptIndex)}
          onPause={() => router.push('/home')}
        />
      </PageTransition>
    );

  if (view.type === 'working')
    return (
      <PageTransition>
        <WorkingView />
      </PageTransition>
    );

  if (view.type === 'ready')
    return (
      <PageTransition>
        <ReadyView onContinue={() => router.push('/app/voice/create')} />
      </PageTransition>
    );

  // Default: prompt view
  const { promptIndex } = view;
  const prompt = ALL_PROMPTS[promptIndex];
  const resolved = prompt ? resolvePrompt(prompt, resolverContext) : null;

  return (
    <PageTransition>
      <PromptView
        promptIndex={promptIndex}
        promptText={resolved?.resolvedText ?? ''}
        instruction={prompt?.instruction ?? ''}
        voiceProfileId={data.voiceProfileId}
        onAdvance={() => advanceFromPrompt(promptIndex)}
      />
    </PageTransition>
  );
}

export default RecordScreen;

// ═══════════════════════════════════════════════════════════════════════════
// SUB-VIEWS
// ═══════════════════════════════════════════════════════════════════════════

// ─── Entry ─────────────────────────────────────────────────────────────────

function EntryView({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="record-step">
      <div className="record-eyebrow">STEP 2</div>
      <h1 className="record-title">Your Voice Journey</h1>
      <p className="record-subtitle">25 moments that capture your full range</p>

      <StageMap currentStage={1} />

      <div className="record-stone">
        <BreathStone state="ready" size={200} />
      </div>

      <div className="record-ctas">
        <PrimaryButton onClick={onContinue}>Begin voice training</PrimaryButton>
        <SecondaryButton onClick={() => window.history.back()}>
          I&apos;ll do this later
        </SecondaryButton>
      </div>
    </div>
  );
}

// ─── Grounding ─────────────────────────────────────────────────────────────

function GroundingView({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="record-step record-step--centered">
      <div className="record-eyebrow">BEFORE WE BEGIN</div>
      <h1 className="record-title">25 Moments</h1>
      <p className="record-subtitle">Each captures a different facet of who you are</p>

      <div className="record-stone">
        <BreathStone state="idle" size={200} />
      </div>

      <p className="record-microcopy">11–14 minutes</p>

      <div className="record-ctas">
        <PrimaryButton onClick={onContinue}>I&apos;m ready</PrimaryButton>
      </div>
    </div>
  );
}

// ─── Mic Permission ────────────────────────────────────────────────────────

function MicPermissionView({
  onGranted,
  onSkip,
}: {
  onGranted: () => void;
  onSkip: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  async function handleAllow() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately close — we just needed permission
      stream.getTracks().forEach((t) => t.stop());
      onGranted();
    } catch {
      setError('Microphone access was blocked. Enable it in your browser settings, then try again.');
    }
  }

  return (
    <div className="record-step record-step--centered">
      <div className="record-eyebrow">SETUP</div>
      <h1 className="record-title">Microphone Access</h1>
      <p className="record-subtitle">We need permission to record your voice</p>

      <div className="record-stone">
        <div className="record-mic-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-mineral)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
      </div>

      {error && (
        <p className="record-microcopy" style={{ color: 'var(--color-status-error)' }}>
          {error}
        </p>
      )}

      <div className="record-ctas">
        <PrimaryButton onClick={handleAllow}>Allow microphone</PrimaryButton>
        <SecondaryButton onClick={onSkip}>Not now</SecondaryButton>
      </div>
    </div>
  );
}

// ─── Checklist ─────────────────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  'Quiet environment',
  'Phone at comfortable distance',
  'Speak naturally, like telling a story',
];

function ChecklistView({ onContinue }: { onContinue: () => void }) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [ctaVisible, setCtaVisible] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    CHECKLIST_ITEMS.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleCount((c) => Math.max(c, i + 1)), 300 + i * 400));
    });
    timers.push(setTimeout(() => setCtaVisible(true), 300 + CHECKLIST_ITEMS.length * 400 + 600));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="record-step">
      <div className="record-eyebrow">QUICK CHECK</div>
      <h1 className="record-title">You&apos;re all set</h1>

      <div className="record-stone">
        <BreathStone state="guidance" size={200} />
      </div>

      <div className="record-checklist">
        {CHECKLIST_ITEMS.map((text, i) => (
          <div
            key={i}
            className={`record-checklist__item ${i < visibleCount ? 'record-checklist__item--visible' : ''}`}
          >
            <div className="record-checklist__icon">✓</div>
            <div className="record-checklist__text">{text}</div>
          </div>
        ))}
      </div>

      <div className={`record-ctas ${ctaVisible ? 'record-ctas--visible' : 'record-ctas--hidden'}`}>
        <PrimaryButton onClick={onContinue}>Begin</PrimaryButton>
      </div>
    </div>
  );
}

// ─── Environment Capture ──────────────────────────────────────────────��────

function EnvironmentView({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onReady, 2500);
    return () => clearTimeout(timer);
  }, [onReady]);

  return (
    <div className="record-step record-step--centered">
      <div className="record-eyebrow">PREPARING</div>
      <h1 className="record-title">Setting up your session</h1>

      <div className="record-stone">
        <div className="record-working__sweep" />
        <BreathStone state="working" size={200} />
      </div>

      <p className="record-microcopy">This will only take a moment</p>
    </div>
  );
}

// ─── Stage Intro ───────────────────────────────────────────────────────────

const STAGE_INTRO_CONFIG = {
  1: {
    title: 'We will begin with simple moments.',
    subtitle: 'These five prompts establish your natural speaking rhythm.',
    body: ['Speak naturally.', 'There are no wrong answers.'],
    cta: 'Begin Stage 1',
  },
  2: {
    title: 'Now we will explore deeper moments.',
    subtitle: 'These twelve prompts capture emotional range and personal stories.',
    body: ['Take your time with each response.', 'These moments hold more of who you are.'],
    cta: 'Continue',
  },
  3: {
    title: 'These final moments add richness.',
    subtitle: 'Eight prompts that capture expression, care, and continuity.',
    body: ['These are the moments that give your voice its character.'],
    cta: 'Continue',
  },
} as const;

function StageIntroView({
  stage,
  onContinue,
  onPause,
}: {
  stage: 1 | 2 | 3;
  onContinue: () => void;
  onPause: () => void;
}) {
  const config = STAGE_INTRO_CONFIG[stage];

  return (
    <div className="record-step">
      <div className="record-eyebrow">STAGE {stage} OF 3</div>
      <h1 className="record-title">{config.title}</h1>
      <p className="record-subtitle">{config.subtitle}</p>

      <StageMap currentStage={stage} />

      <div className="record-stone">
        <BreathStone state="ready" size={200} />
      </div>

      <div className="record-body">
        {config.body.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      <div className="record-ctas">
        <PrimaryButton onClick={onContinue}>{config.cta}</PrimaryButton>
        {stage > 1 && (
          <SecondaryButton onClick={onPause}>Pause for now</SecondaryButton>
        )}
      </div>
    </div>
  );
}

// ─── Prompt View ───────────────────────────────────────────────────────────

function PromptView({
  promptIndex,
  promptText,
  instruction,
  voiceProfileId,
  onAdvance,
}: {
  promptIndex: number;
  promptText: string;
  instruction: string;
  voiceProfileId: string | null;
  onAdvance: () => void;
}) {
  const engineRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [hasStopped, setHasStopped] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onAdvanceRef = useRef(onAdvance);
  onAdvanceRef.current = onAdvance;

  const isFinal = promptIndex === TOTAL_PROMPT_COUNT - 1;
  const stage = getStageForPrompt(promptIndex);
  const progressPct = Math.round(((promptIndex + 1) / TOTAL_PROMPT_COUNT) * 100);

  // Recording timer
  useEffect(() => {
    if (!isRecording) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setRecordingSeconds(0);
    timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Auto-advance 2s after user stops recording — use ref to avoid dependency issues
  useEffect(() => {
    if (!hasStopped) return;
    const timer = setTimeout(() => onAdvanceRef.current(), 2000);
    return () => clearTimeout(timer);
  }, [hasStopped]);

  const handleStatusChange = useCallback((status: UploadStatus) => {
    if (status === 'recording') {
      setIsRecording(true);
    } else if (status !== 'idle') {
      // Any non-idle, non-recording status = user stopped recording
      setIsRecording((prev) => {
        if (prev) setHasStopped(true);
        return false;
      });
    }
  }, []);

  function handleRecordClick() {
    if (hasStopped) return;

    const container = engineRef.current;
    if (!container) return;

    const btn = container.querySelector('button');
    btn?.click();
  }

  const buttonClass = hasStopped
    ? 'record-button record-button--finished'
    : isRecording
      ? 'record-button record-button--recording'
      : 'record-button';

  return (
    <div className="record-step">
      <div className="record-eyebrow">
        {isFinal ? 'FINAL MOMENT' : `MOMENT ${promptIndex + 1} OF ${TOTAL_PROMPT_COUNT}`}
      </div>

      <div className={`record-prompt-card record-prompt-card--stage-${stage}`}>
        <p className="record-prompt-card__text">{promptText}</p>
        {instruction && (
          <p className="record-prompt-card__guidance">{instruction}</p>
        )}
      </div>

      <div className="record-timer">
        {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
        {String(recordingSeconds % 60).padStart(2, '0')}
      </div>

      <div className={`record-waveform ${isRecording ? 'record-waveform--active' : ''}`}>
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="record-waveform__bar"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>

      <button
        className={buttonClass}
        onClick={handleRecordClick}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      />

      <p className={`record-label ${isRecording ? 'record-label--recording' : ''} ${hasStopped ? 'record-label--saved' : ''}`}>
        {hasStopped ? 'Saved' : isRecording ? 'Recording...' : 'Tap to begin'}
      </p>

      {/* Hidden RecordingUpload engine — handles actual audio pipeline */}
      <div ref={engineRef} className="record-upload-engine" aria-hidden="true">
        {voiceProfileId && (
          <RecordingUpload
            voiceProfileId={voiceProfileId}
            promptIndex={promptIndex + 1}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>
    </div>
  );
}

// ─── Celebration ───────────────────────────────────────────────────────────

// Celebration screens — matched 1:1 to prototype
// Mini-celebrations (prompt 1, midpoint): light title, subtitle, stone, Continue
// Stage completions (5, 17): MILESTONE eyebrow, stage map, stone, Begin Stage N + Pause
// All complete (25): YOUR JOURNEY eyebrow, stage map (all done), stone, Continue

function CelebrationView({
  afterPromptIndex,
  onContinue,
  onPause,
}: {
  afterPromptIndex: number;
  onContinue: () => void;
  onPause: () => void;
}) {
  // ─── Prompt 1: "Beautiful" ─────────────────────────────────
  if (afterPromptIndex === 0) {
    return (
      <div className="record-step record-step--centered">
        <h1 className="record-title" style={{ fontWeight: 400 }}>Beautiful</h1>
        <p className="record-subtitle">You opened the door. Your voice is here.</p>

        <div className="record-stone">
          <BreathStone state="celebrate" size={200} />
        </div>

        <div className="record-ctas">
          <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
        </div>
      </div>
    );
  }

  // ─── Midpoint: "You're halfway there" ──────────────────────
  if (afterPromptIndex === 11) {
    return (
      <div className="record-step record-step--centered">
        <h1 className="record-title" style={{ fontWeight: 400 }}>You&apos;re halfway there</h1>
        <p className="record-subtitle">Your voice is unfolding beautifully</p>

        <div className="record-stone">
          <BreathStone state="celebrate" size={200} />
        </div>

        <div className="record-ctas">
          <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
        </div>
      </div>
    );
  }

  // ─── Stage 1 Complete ──────────────────────────────────────
  if (afterPromptIndex === 4) {
    return (
      <div className="record-step record-step--centered">
        <div className="record-eyebrow">MILESTONE</div>
        <h1 className="record-title" style={{ fontWeight: 500 }}>Stage 1 Complete</h1>
        <p className="record-subtitle">
          You shaped the first five moments. Your voice record is beginning to form.
        </p>

        <StageMap currentStage={2} />

        <div className="record-stone">
          <BreathStone state="celebrate" size={200} />
        </div>

        <div className="record-ctas">
          <PrimaryButton onClick={onContinue}>Begin Stage 2</PrimaryButton>
          <SecondaryButton onClick={onPause}>Pause for now</SecondaryButton>
        </div>
      </div>
    );
  }

  // ─── Stage 2 Complete ──────────────────────────────────────
  if (afterPromptIndex === 16) {
    return (
      <div className="record-step record-step--centered">
        <div className="record-eyebrow">MILESTONE</div>
        <h1 className="record-title" style={{ fontWeight: 400 }}>Stage 2 Complete</h1>
        <p className="record-subtitle">
          Your voice has gained depth and warmth. The final stage awaits.
        </p>

        <StageMap currentStage={3} />

        <div className="record-stone">
          <BreathStone state="celebrate" size={200} />
        </div>

        <div className="record-ctas">
          <PrimaryButton onClick={onContinue}>Begin Stage 3</PrimaryButton>
          <SecondaryButton onClick={onPause}>Pause for now</SecondaryButton>
        </div>
      </div>
    );
  }

  // ─── All 25 Complete ───────────────────────────────────────
  if (afterPromptIndex === 24) {
    return (
      <div className="record-step record-step--centered">
        <div className="record-eyebrow">YOUR JOURNEY</div>
        <h1 className="record-title">All 25 Moments Complete</h1>
        <p className="record-subtitle" style={{ fontStyle: 'italic' }}>
          You have shaped something that will endure
        </p>

        <StageMap currentStage={3} />

        <div className="record-stone">
          <BreathStone state="celebrate" size={200} />
        </div>

        <div className="record-ctas">
          <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
        </div>
      </div>
    );
  }

  // Fallback (should not reach)
  return null;
}

// ─── Working ───────────────────────────────────────────────────────────────

function WorkingView() {
  return (
    <div className="record-step record-step--centered">
      <div className="record-eyebrow">SHAPING YOUR VOICE</div>
      <h1 className="record-title">Creating your voice record</h1>

      <div className="record-stone">
        <div className="record-working__sweep" />
        <BreathStone state="working" size={200} />
      </div>

      <div className="record-body">
        <p>Your 25 moments are being woven together</p>
        <p className="record-microcopy">This will take about 6 seconds</p>
      </div>
    </div>
  );
}

// ─── Ready ─────────────────────────────────────────────────────────────────

function ReadyView({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="record-step record-step--centered">
      <div className="record-eyebrow">YOUR VOICE</div>
      <h1 className="record-title">Your voice is ready</h1>
      <p className="record-subtitle">Listen to what you have created</p>

      <div className="record-stone">
        <BreathStone state="ready" size={200} />
      </div>

      <div className="record-ctas">
        <PrimaryButton onClick={onContinue}>Hear your voice</PrimaryButton>
      </div>
    </div>
  );
}
