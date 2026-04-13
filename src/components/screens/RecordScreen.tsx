'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BreathStone } from '@/components/breath-stone';
import { PageTransition, PrimaryButton, LinkButton } from '@/components/ui';
import { MicIcon, MicStopIcon } from '@/components/icons';
import { RecordingUpload, type Status as UploadStatus } from '@/components/audio/RecordingUpload';
import { voiceTrainingScript, TOTAL_PROMPT_COUNT } from '@/lib/voice-training/script';
import { resolvePrompt } from '@/lib/voice-training/resolver';
import type { ResolverContext, PromptCelebration } from '@/lib/voice-training/types';
import { TIMING } from '@/lib/config/timing';
import type { RecordScreenData } from './RecordScreen.types';

// ─── FLAT PROMPT LIST ──────────────────────────────────────────────────────
const ALL_PROMPTS = voiceTrainingScript.flatMap((stage) => stage.prompts);

// Whether the prompt at this index has an attached celebration is now
// driven by the script itself — see VoicePrompt.celebration. Adding a
// celebration = attach the metadata object; removing = delete it.
// No more parallel lookup table to keep in sync.

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
  | { type: 'paused' }
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
    const interval = setInterval(() => router.refresh(), TIMING.WORKING_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [view.type, router]);

  // React to server-side status changes (from router.refresh).
  // Functional update + guard avoids the setState-in-effect lint and
  // also prevents a stale transition if view moved away before the
  // server-ready propagated.
  useEffect(() => {
    if (data.voiceProfileStatus !== 'ready') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView((v) => (v.type === 'working' ? { type: 'ready' } : v));
  }, [data.voiceProfileStatus]);

  // Fallback: if backend doesn't flip status within 8s, advance anyway.
  // Matches prototype's 6s auto-advance and prevents users from being
  // stranded on the working screen if processing is slow or stubbed.
  useEffect(() => {
    if (view.type !== 'working') return;
    const timeout = setTimeout(() => {
      setView((v) => (v.type === 'working' ? { type: 'ready' } : v));
    }, TIMING.WORKING_FALLBACK_ADVANCE_MS);
    return () => clearTimeout(timeout);
  }, [view.type]);

  // ─── Navigation helpers ─────────────────────────────────────

  const advanceFromPrompt = useCallback((promptIndex: number) => {
    if (ALL_PROMPTS[promptIndex]?.celebration) {
      setView({ type: 'celebration', afterPromptIndex: promptIndex });
    } else {
      setView({ type: 'prompt', promptIndex: promptIndex + 1 });
    }
  }, []);

  const advanceFromCelebration = useCallback((afterPromptIndex: number) => {
    const next = ALL_PROMPTS[afterPromptIndex]?.celebration?.next;
    if (!next) return;
    switch (next.kind) {
      case 'next-prompt':
        setView({ type: 'prompt', promptIndex: afterPromptIndex + 1 });
        return;
      case 'stage-intro':
        setView({ type: 'stage-intro', stage: next.stage });
        return;
      case 'working':
        setView({ type: 'working' });
        return;
    }
  }, []);

  // ─── Render ─────────────────────────────────────────────────

  if (view.type === 'entry')
    return (
      <PageTransition>
        <EntryView
          onContinue={() => setView({ type: 'grounding' })}
          onDoLater={() => router.push('/home')}
        />
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
          onSkip={() => router.push('/home')}
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
          onPause={() => setView({ type: 'paused' })}
        />
      </PageTransition>
    );

  if (view.type === 'celebration')
    return (
      <PageTransition>
        <CelebrationView
          afterPromptIndex={view.afterPromptIndex}
          onContinue={() => advanceFromCelebration(view.afterPromptIndex)}
          onPause={() => setView({ type: 'paused' })}
        />
      </PageTransition>
    );

  if (view.type === 'paused')
    return (
      <PageTransition>
        <PausedView onReturnHome={() => router.push('/home')} />
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
    <PageTransition key={`prompt-${promptIndex}`}>
      <PromptView
        key={promptIndex}
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

function EntryView({
  onContinue,
  onDoLater,
}: {
  onContinue: () => void;
  onDoLater: () => void;
}) {
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
        <LinkButton onClick={onDoLater}>
          I&apos;ll do this later
        </LinkButton>
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
          <MicIcon size={28} stroke="var(--color-mineral)" />
        </div>
      </div>

      {error && (
        <p className="record-microcopy" style={{ color: 'var(--color-status-error)' }}>
          {error}
        </p>
      )}

      <div className="record-ctas">
        <PrimaryButton onClick={handleAllow}>Allow microphone</PrimaryButton>
        <LinkButton onClick={onSkip}>Not now</LinkButton>
        <p className="record-mic-hint">
          You&apos;ll need microphone access to record your voice.
        </p>
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
  return (
    <div className="record-step">
      <div className="record-eyebrow">QUICK CHECK</div>
      <h1 className="record-title">You&apos;re all set</h1>

      <div className="record-stone">
        <BreathStone state="guidance" size={200} />
      </div>

      <div className="record-checklist">
        {CHECKLIST_ITEMS.map((text, i) => (
          <div key={i} className="record-checklist__item">
            <div className="record-checklist__icon">✓</div>
            <div className="record-checklist__text">{text}</div>
          </div>
        ))}
      </div>

      <div className="record-ctas">
        <PrimaryButton onClick={onContinue}>Begin</PrimaryButton>
      </div>
    </div>
  );
}

// ─── Environment Capture ──────────────────────────────────────────────��────

function EnvironmentView({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onReady, TIMING.ENVIRONMENT_AUTO_READY_MS);
    return () => clearTimeout(timer);
  }, [onReady]);

  return (
    <div className="record-step record-step--centered">
      <div className="record-eyebrow">PREPARING</div>
      <h1 className="record-title">Setting up your session</h1>

      <div className="record-stone">
        <BreathStone state="working" size={200} />
      </div>

      <p className="record-microcopy">This will only take a moment</p>
    </div>
  );
}

// ─── Stage Intro ───────────────────────────────────────────────────────────

const STAGE_INTRO_CONFIG = {
  1: {
    title: 'Let’s start with simple moments.',
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
          <LinkButton onClick={onPause}>Pause for now</LinkButton>
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
  useEffect(() => {
    onAdvanceRef.current = onAdvance;
  }, [onAdvance]);

  const isFinal = promptIndex === TOTAL_PROMPT_COUNT - 1;
  const stage = getStageForPrompt(promptIndex);

  // Recording timer
  useEffect(() => {
    if (!isRecording) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecordingSeconds(0);
    timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), TIMING.RECORDING_TIMER_TICK_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Auto-advance 2s after user stops recording — use ref to avoid dependency issues
  useEffect(() => {
    if (!hasStopped) return;
    const timer = setTimeout(() => onAdvanceRef.current(), TIMING.PROMPT_AUTO_ADVANCE_MS);
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

      {instruction && (
        <p className="record-instruction">{instruction}</p>
      )}

      <div className={`record-prompt-card record-prompt-card--stage-${stage}`}>
        <p className="record-prompt-card__text">{promptText}</p>
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
      >
        {isRecording ? (
          <MicStopIcon className="record-button__icon" size={22} />
        ) : (
          <MicIcon className="record-button__icon" size={26} />
        )}
      </button>

      <p className={`record-label ${isRecording ? 'record-label--recording' : ''} ${hasStopped ? 'record-label--saved' : ''}`}>
        {hasStopped ? 'Saved' : isRecording ? 'Recording...' : 'Tap to record'}
      </p>

      <div className={`record-timer ${isRecording || hasStopped ? 'record-timer--visible' : ''}`}>
        {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
        {String(recordingSeconds % 60).padStart(2, '0')}
      </div>

      <p className="record-rerecord-hint">You can re-record anytime</p>

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

      {/* Fixed progress bar at bottom of viewport */}
      <div className="record-progress-bar" aria-hidden="true">
        <div
          className="record-progress-bar__fill"
          style={{ width: `${((promptIndex + (hasStopped ? 1 : 0)) / TOTAL_PROMPT_COUNT) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── Celebration ───────────────────────────────────────────────────────────

function CelebrateStone() {
  return (
    <div className="record-stone record-stone--celebrate">
      <span className="celebrate-shimmer" />
      <span className="celebrate-specks" />
      <BreathStone state="celebrate" size={200} />
    </div>
  );
}

// Single CelebrationView, fully data-driven from the script's
// celebration metadata. Adding a new celebration = attach a
// PromptCelebration to the script entry; nothing here changes.
function CelebrationView({
  afterPromptIndex,
  onContinue,
  onPause,
}: {
  afterPromptIndex: number;
  onContinue: () => void;
  onPause: () => void;
}) {
  const celebration: PromptCelebration | undefined =
    ALL_PROMPTS[afterPromptIndex]?.celebration;
  if (!celebration) return null;

  const titleClass = celebration.titleWeight
    ? `record-title record-title--weight-${celebration.titleWeight}`
    : 'record-title';
  const subtitleClass = celebration.italicSubtitle
    ? 'record-subtitle record-subtitle--italic'
    : 'record-subtitle';

  return (
    <div className="record-step record-step--centered">
      {celebration.eyebrow && (
        <div className="record-eyebrow">{celebration.eyebrow}</div>
      )}
      <h1 className={titleClass}>
        {celebration.title}
      </h1>
      <p className={subtitleClass}>
        {celebration.subtitle}
      </p>

      {celebration.showStageMap && celebration.stageMapCurrent && (
        <StageMap currentStage={celebration.stageMapCurrent} />
      )}

      <CelebrateStone />

      <div className="record-ctas">
        <PrimaryButton onClick={onContinue}>{celebration.cta}</PrimaryButton>
        {celebration.showPauseLink && (
          <LinkButton onClick={onPause}>Pause for now</LinkButton>
        )}
      </div>
    </div>
  );
}

// ─── Paused ────────────────────────────────────────────────────────────────

function PausedView({ onReturnHome }: { onReturnHome: () => void }) {
  // Auto-navigate home after 4 seconds, giving the user a beat to read the
  // reassurance without imposing a visible countdown. The cleanup guard
  // prevents double-navigation if they tap "Return home" first.
  useEffect(() => {
    const timer = setTimeout(onReturnHome, TIMING.PAUSED_RETURN_HOME_MS);
    return () => clearTimeout(timer);
  }, [onReturnHome]);

  return (
    <div className="record-step record-step--centered">
      <div className="record-eyebrow">PAUSED</div>
      <h1 className="record-title">Your progress is saved.</h1>
      <p className="record-subtitle">Continue whenever you&apos;re ready.</p>

      <div className="record-stone">
        <BreathStone state="idle" size={200} />
      </div>

      <div className="record-ctas">
        <PrimaryButton onClick={onReturnHome}>Return home</PrimaryButton>
      </div>
    </div>
  );
}

// ─── Working ───────────────────────────────────────────────────────────────

function WorkingView() {
  return (
    <div className="record-step record-step--centered">
      <div className="record-eyebrow">SHAPING YOUR VOICE</div>
      <h1 className="record-title">Creating your voice record</h1>

      <div className="record-stone">
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
