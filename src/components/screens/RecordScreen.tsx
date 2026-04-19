'use client';

import { useState, useEffect, useRef, useMemo, useCallback, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { BreathStone } from '@/components/breath-stone';
import { PageTransition, PrimaryButton, LinkButton } from '@/components/ui';
import { MicIcon, MicStopIcon } from '@/components/icons';
import { RecordingUpload, type Status as UploadStatus, type RecordingUploadHandle } from '@/components/audio/RecordingUpload';
import { TOTAL_PROMPT_COUNT, ALL_PROMPTS, getStageForPrompt } from '@/lib/voice-training/script';
import { resolvePrompt } from '@/lib/voice-training/resolver';
import type { ResolverContext, PromptCelebration } from '@/lib/voice-training/types';
import { TIMING } from '@/lib/config/timing';
import type { RecordScreenData } from './RecordScreen.types';
import { recordReducer, deriveInitialView } from './RecordScreen.reducer';

// Whether the prompt at this index has an attached celebration is now
// driven by the script itself — see VoicePrompt.celebration. Adding a
// celebration = attach the metadata object; removing = delete it.
// No more parallel lookup table to keep in sync.

/** Compute the progress-bar fill percent (0–100) for a given prompt.
 *  The current prompt contributes a full step only once the upload has
 *  actually committed, so the bar never runs ahead of the server. */
function progressPercent(promptIndex: number, isUploaded: boolean): number {
  const completed = promptIndex + (isUploaded ? 1 : 0);
  return (completed / TOTAL_PROMPT_COUNT) * 100;
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
  const [view, dispatch] = useReducer(recordReducer, data, deriveInitialView);

  // Build resolver context client-side. timeZone is the user's IANA
  // zone so the timeOfDayName resolver picks morning/afternoon/etc.
  // from the user's wall-clock rather than the server's.
  const resolverContext: ResolverContext = useMemo(
    () => ({
      userName: data.displayName ?? undefined,
      city: data.city ?? undefined,
      birthYear: data.birthYear ?? undefined,
      relationship: data.relationship ?? undefined,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
    [data.displayName, data.city, data.birthYear, data.relationship]
  );

  // Poll for ready status while we're on the working screen AND the
  // server hasn't yet flagged the profile as ready. Including
  // voiceProfileStatus in the deps ensures the interval tears down
  // the moment the server flips, rather than running one more tick.
  useEffect(() => {
    if (view.type !== 'working') return;
    if (data.voiceProfileStatus === 'ready') return;
    const interval = setInterval(() => router.refresh(), TIMING.WORKING_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [view.type, router, data.voiceProfileStatus]);

  // React to server-side status changes (from router.refresh).
  useEffect(() => {
    dispatch({ type: 'VOICE_PROFILE_STATUS_CHANGED', status: data.voiceProfileStatus });
  }, [data.voiceProfileStatus]);

  // Fallback: if backend doesn't flip status within 8s, advance anyway.
  // Matches prototype's 6s auto-advance and prevents users from being
  // stranded on the working screen if processing is slow or stubbed.
  useEffect(() => {
    if (view.type !== 'working') return;
    const timeout = setTimeout(() => {
      dispatch({ type: 'WORKING_TIMEOUT_ELAPSED' });
    }, TIMING.WORKING_FALLBACK_ADVANCE_MS);
    return () => clearTimeout(timeout);
  }, [view.type]);

  // ─── Render ─────────────────────────────────────────────────

  if (view.type === 'entry')
    return (
      <PageTransition>
        <EntryView
          onContinue={() => dispatch({ type: 'ENTRY_CONTINUED' })}
          onDoLater={() => router.push('/home')}
        />
      </PageTransition>
    );

  if (view.type === 'grounding')
    return (
      <PageTransition>
        <GroundingView onContinue={() => dispatch({ type: 'GROUNDING_CONTINUED' })} />
      </PageTransition>
    );

  if (view.type === 'mic-permission')
    return (
      <PageTransition>
        <MicPermissionView
          onGranted={() => dispatch({ type: 'MIC_PERMISSION_GRANTED' })}
          onSkip={() => router.push('/home')}
        />
      </PageTransition>
    );

  if (view.type === 'checklist')
    return (
      <PageTransition>
        <ChecklistView onContinue={() => dispatch({ type: 'CHECKLIST_CONTINUED' })} />
      </PageTransition>
    );

  if (view.type === 'environment')
    return (
      <PageTransition>
        <EnvironmentView
          onReady={() => dispatch({ type: 'ENVIRONMENT_READY' })}
        />
      </PageTransition>
    );

  if (view.type === 'stage-intro')
    return (
      <PageTransition>
        <StageIntroView
          stage={view.stage}
          onContinue={() => dispatch({ type: 'STAGE_INTRO_CONTINUED' })}
          onPause={() => dispatch({ type: 'PAUSE_REQUESTED' })}
        />
      </PageTransition>
    );

  if (view.type === 'celebration')
    return (
      <PageTransition>
        <CelebrationView
          afterPromptIndex={view.afterPromptIndex}
          onContinue={() => dispatch({ type: 'CELEBRATION_CONTINUED' })}
          onPause={() => dispatch({ type: 'PAUSE_REQUESTED' })}
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
        onAdvance={() => dispatch({ type: 'PROMPT_ADVANCED' })}
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
      <div className="record-eyebrow">VOICE KEEPSAKE · 25 MOMENTS</div>
      <h1 className="record-title">Save your voice.</h1>
      <p className="record-subtitle">
        Save something only you can give. This is for the people who love you.
      </p>

      <StageMap currentStage={1} />

      <div className="record-stone">
        <BreathStone state="ready" size={200} />
      </div>

      <p className="record-microcopy" style={{ marginTop: 0 }}>
        Twenty-five prompts · 10–15 minutes
      </p>

      <div className="record-ctas">
        <PrimaryButton onClick={onContinue}>Begin</PrimaryButton>
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
      <div className="record-eyebrow">VOICE KEEPSAKE · BEFORE YOU BEGIN</div>
      <h1 className="record-title">This is for them.</h1>
      <p className="record-subtitle">Speak as you would to someone who knows you.</p>

      <div className="record-stone">
        <BreathStone state="idle" size={200} />
      </div>

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
      <div className="record-eyebrow">VOICE KEEPSAKE · SETUP</div>
      <h1 className="record-title">Your phone needs to hear you.</h1>
      <p className="record-subtitle">We only record when you tap.</p>

      <div className="record-stone">
        <div className="record-mic-icon">
          <MicIcon size={28} stroke="var(--color-mineral)" />
        </div>
      </div>

      <p className="record-microcopy" style={{ marginTop: 0 }}>
        Your voice stays yours.
      </p>

      {error && (
        <p className="record-microcopy" style={{ color: 'var(--color-status-error)' }}>
          {error}
        </p>
      )}

      <div className="record-ctas">
        <PrimaryButton onClick={handleAllow}>Allow microphone</PrimaryButton>
        <LinkButton onClick={onSkip}>Not now</LinkButton>
      </div>
    </div>
  );
}

// ─── Checklist ─────────────────────────────────────────────────────────────

const CHECKLIST_ITEMS = [
  'Quiet environment',
  'Phone at comfortable distance',
  'Speak naturally, at your own pace',
];

function ChecklistView({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="record-step">
      <div className="record-eyebrow">VOICE KEEPSAKE · SETUP</div>
      <h1 className="record-title">Before you begin.</h1>

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

      <p className="record-checklist-anchor">Someone you love, in mind.</p>

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
    body: 'Take a breath. Nothing here needs to be rehearsed.',
    bodyAside: true,
    cta: 'Begin Stage 1',
  },
  2: {
    title: 'Some of these might stay with you.',
    body: 'Think of someone as you read. The words will find them.',
    bodyAside: false,
    cta: 'Begin Stage 2',
  },
  3: {
    title: 'These last ones are yours.',
    body: 'Read like you mean it. What you say here stays.',
    bodyAside: false,
    cta: 'Begin Stage 3',
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
  const bodyClass = config.bodyAside ? 'record-body record-body--aside' : 'record-body';

  return (
    <div className="record-step">
      <div className="record-eyebrow">
        STAGE {stage} OF 3 · {STAGE_LABELS[stage - 1].toUpperCase()}
      </div>
      <h1 className="record-title">{config.title}</h1>

      <StageMap currentStage={stage} />

      <div className="record-stone">
        <BreathStone state="ready" size={200} />
      </div>

      <div className={bodyClass}>
        <p>{config.body}</p>
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
  const engineRef = useRef<RecordingUploadHandle>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onAdvanceRef = useRef(onAdvance);
  useEffect(() => {
    onAdvanceRef.current = onAdvance;
  }, [onAdvance]);

  const isFinal = promptIndex === TOTAL_PROMPT_COUNT - 1;
  const stage = getStageForPrompt(promptIndex);

  const isRecording = uploadStatus === 'recording';
  const isSaving = uploadStatus === 'uploading' || uploadStatus === 'committing';
  const isUploaded = uploadStatus === 'ready';
  const hasError = uploadStatus === 'error' || uploadStatus === 'permission_denied';
  // Anything after a successful stop blocks the button from re-starting
  // recording (re-record happens via the engine's reset path). "Finished"
  // here means "no longer in the initial idle/recording state".
  const hasStopped = isSaving || isUploaded || hasError;

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

  // Auto-advance 2s after the upload has actually committed — not after
  // the stop click. Advancing before commit unmounts RecordingUpload
  // mid-flight and tends to race the /api/audio/commit request.
  useEffect(() => {
    if (!isUploaded) return;
    const timer = setTimeout(() => onAdvanceRef.current(), TIMING.PROMPT_AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [isUploaded]);

  const handleStatusChange = useCallback((status: UploadStatus) => {
    setUploadStatus(status);
  }, []);

  function handleRecordClick() {
    if (hasStopped) return;
    const engine = engineRef.current;
    if (!engine) return;
    if (isRecording) engine.stopAndUpload();
    else engine.startRecording();
  }

  const buttonClass = hasStopped
    ? 'record-button record-button--finished'
    : isRecording
      ? 'record-button record-button--recording'
      : 'record-button';

  return (
    <div className={`record-step record-step--prompt-stage-${stage}`}>
      <div className="record-eyebrow">
        {isFinal
          ? 'FINAL MOMENT'
          : `MOMENT ${promptIndex + 1} OF ${TOTAL_PROMPT_COUNT} · ${STAGE_LABELS[stage - 1].toUpperCase()}`}
      </div>

      {instruction && (
        <p className="record-instruction">{instruction}</p>
      )}

      <div
        className={[
          'record-prompt-card',
          `record-prompt-card--stage-${stage}`,
          promptText.trim().split(/\s+/).length > 60 && 'record-prompt-card--long',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="record-prompt-card__scroll">
          <p className="record-prompt-card__text">{promptText}</p>
        </div>
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

      <p
        className={`record-label ${isRecording ? 'record-label--recording' : ''} ${
          isSaving ? 'record-label--saving' : ''
        } ${isUploaded ? 'record-label--saved' : ''} ${hasError ? 'record-label--error' : ''}`}
      >
        {hasError
          ? uploadStatus === 'permission_denied'
            ? 'Microphone blocked'
            : 'Save failed — try again'
          : isUploaded
            ? 'Saved'
            : isSaving
              ? 'Saving…'
              : isRecording
                ? 'Recording...'
                : 'Tap to record'}
      </p>

      <div
        className={[
          'record-timer',
          (isRecording || hasStopped) && 'record-timer--visible',
          isRecording && 'record-timer--active',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
        {String(recordingSeconds % 60).padStart(2, '0')}
      </div>

      <p className="record-rerecord-hint">You can re-record anytime</p>

      {/* Hidden RecordingUpload engine — handles actual audio pipeline.
          The visible record button above drives it via the imperative
          ref handle (start/stop), no DOM peeking needed. */}
      <div className="record-upload-engine" aria-hidden="true">
        {voiceProfileId && (
          <RecordingUpload
            ref={engineRef}
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
          style={{ width: `${progressPercent(promptIndex, isUploaded)}%` }}
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
      <h1 className="record-title">Your voice is waiting.</h1>
      <p className="record-subtitle">Continue whenever you&apos;re ready.</p>

      {/* Stone state: guidance because the system is holding space for
          the user, not resting. idle reads as "nothing happening" — wrong
          for a screen where progress is sitting there waiting. */}
      <div className="record-stone">
        <BreathStone state="guidance" size={200} />
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
      <h1 className="record-title">This part takes care.</h1>
      <p className="record-subtitle">Your voice is being made into something that lasts.</p>

      <div className="record-stone">
        <BreathStone state="working" size={200} />
      </div>

      <p className="record-microcopy" style={{ margin: 0 }}>
        This takes a moment
      </p>
    </div>
  );
}

// ─── Ready ─────────────────────────────────────────────────────────────────

function ReadyView({ onContinue }: { onContinue: () => void }) {
  // Session 5 enhancement: one-shot shimmer on mount — a subtle light-pass
  // across the stone the first time this screen loads, marking the
  // transition from "shaping" to "preserved." Fires once per ready-state
  // entry. Treat as arrival moment, not ambient animation.
  return (
    <div className="record-step record-step--centered record-step--ready">
      <div className="record-eyebrow">YOUR VOICE</div>
      <h1 className="record-title record-title--weight-500">Your voice is yours.</h1>
      <p className="record-subtitle">Ready to be kept.</p>

      <div className="record-stone">
        <BreathStone state="ready" size={200} />
      </div>

      <div className="record-ctas">
        <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
      </div>
    </div>
  );
}
