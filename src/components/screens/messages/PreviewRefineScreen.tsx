'use client';

/**
 * A6 — Preview & Refine (Deferred-Audio variant).
 *
 * Production implementation of prototypes/message creation/
 * essence-step6-a6-deferred.html. Pure and props-driven per CLAUDE.md:
 * owns the candidate/committed VIEW state + all motion; every server
 * action bubbles out through an async callback prop (the page owns the
 * fetch + navigation). See PreviewRefineScreen.types.ts for the contract
 * and the design memo in the prototype header for the "why".
 *
 * Two footer shapes:
 *   committed → Save · Make a change · Discard
 *   candidate → Hear this in your voice (dots) · See another way · Back to
 *               the take you heard
 *
 * The stone is the shared canvas BreathStone (ready / playback / working) —
 * the prototype's CSS-gradient stone re-expressed in the codebase's stone
 * grammar. The atmosphere glow, scrubber, candidate card, and both sheets
 * are ported CSS, scoped under `.preview-refine` so nothing leaks global.
 */

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import { BreathStone } from '@/components/breath-stone';
import { ChevronLeftIcon } from '@/components/icons';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';
import {
  initPreviewState,
  isLastReroll,
  isRecordingCap,
  isTextCap,
  previewReducer,
  TOTAL_RECORDINGS,
} from './PreviewRefineScreen.reducer';
import type { PreviewRefineScreenProps } from './PreviewRefineScreen.types';
import { PREVIEW_REFINE_CSS } from './PreviewRefineScreen.css';

const REC_WORDS: Record<number, string> = { 3: 'Three', 2: 'Two', 1: 'One', 0: 'No' };

/** Scrubber tick — visual clock, 200ms cadence (matches the prototype). */
const TICK_SEC = 0.2;
const TICK_MS = TICK_SEC * 1000;

function fmtTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

export function PreviewRefineScreen(props: PreviewRefineScreenProps) {
  const {
    committed,
    initialCandidateText,
    recordingsRemaining,
    rerollsRemaining,
    reshapeExhausted,
    playHintLearned,
    isFirstArrival,
    onFreeDraft,
    onCommit,
    onKeepCurrent,
    onSave,
    onDiscard,
    onReshape,
    onRequestPlayback,
    onBack,
    onPlayHintLearned,
    onSaved,
    onDiscarded,
  } = props;

  const reducedMotion = useReducedMotion();

  const [state, dispatch] = useReducer(
    previewReducer,
    {
      committed,
      initialCandidateText,
      recordingsRemaining,
      rerollsRemaining,
      reshapeExhausted,
      playHintLearned,
    },
    initPreviewState,
  );

  // ─── Scrubber engine (component-local; high-frequency) ────────────────
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false); // first-listen latch
  const [pos, setPos] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const dur = state.committedDurationSec || 28;

  // ─── Audio-load failure affordance (committed clip fails to LOAD) ─────
  const [audioFailed, setAudioFailed] = useState(false);
  const [audioRecovered, setAudioRecovered] = useState(false);

  // ─── Candidate arrival choreography ───────────────────────────────────
  const [isExiting, setIsExiting] = useState(false);
  const [arrivalKey, setArrivalKey] = useState(0);

  // ─── Save / discard pending ───────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopPlayback = useCallback(
    (reset: boolean) => {
      clearTimer();
      setPlaying(false);
      if (audioRef.current) audioRef.current.pause();
      if (reset) setPos(0);
    },
    [clearTimer],
  );

  const runVisualClock = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      setPos((prev) => {
        const next = prev + TICK_SEC;
        if (next >= dur) {
          clearTimer();
          setPlaying(false);
          // Don't let real audio dangle past the visual end (the clock may
          // run on an estimated duration until metadata loads).
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          return 0; // return to Ready at the end
        }
        return next;
      });
    }, TICK_MS);
  }, [clearTimer, dur]);

  const startPlayback = useCallback(() => {
    setPlayed(true);
    setPlaying(true);
    runVisualClock();
    // Best-effort real audio; the visual scrubber is the source of truth.
    const el = audioRef.current;
    if (el && el.src) el.play().catch(() => {});
  }, [runVisualClock]);

  const learnHint = useCallback(() => {
    if (!state.playHintLearned) {
      dispatch({ type: 'PLAY_HINT_LEARNED' });
      onPlayHintLearned?.();
    }
  }, [state.playHintLearned, onPlayHintLearned]);

  const handlePlayPause = useCallback(async () => {
    learnHint(); // gesture learned on the tap, whatever happens next

    // Audio-load failure path: a committed clip failing to LOAD.
    if (audioFailed) return; // retry button drives recovery

    if (playing) {
      stopPlayback(false); // pause, keep position
      return;
    }

    // Fresh start (pos 0) → resolve a playback URL; resume keeps playing.
    if (pos === 0 && !audioRecovered) {
      const result = await onRequestPlayback();
      if (!result.ok) {
        setAudioFailed(true);
        return;
      }
      if (audioRef.current) audioRef.current.src = result.url;
    }
    startPlayback();
  }, [
    learnHint,
    audioFailed,
    playing,
    pos,
    audioRecovered,
    onRequestPlayback,
    stopPlayback,
    startPlayback,
  ]);

  const handleAudioRetry = useCallback(async () => {
    const result = await onRequestPlayback();
    if (!result.ok) return; // stay failed; let them try again
    setAudioFailed(false);
    setAudioRecovered(true);
    if (audioRef.current) audioRef.current.src = result.url;
    startPlayback();
  }, [onRequestPlayback, startPlayback]);

  // ─── Free draft ("See another way to say it") ─────────────────────────
  const handleFreeDraft = useCallback(async () => {
    if (state.pending || state.rerollsRemaining <= 0) return;
    stopPlayback(true);
    if (state.mode === 'candidate') setIsExiting(true); // old text fades while stone works
    dispatch({ type: 'FREE_DRAFT_START' });

    const result = await onFreeDraft();
    if (!result.ok) {
      setIsExiting(false);
      dispatch({ type: 'FREE_DRAFT_FAIL' });
      return;
    }
    dispatch({
      type: 'FREE_DRAFT_SUCCESS',
      candidateText: result.candidateText,
      rerollsRemaining: result.rerollsRemaining,
    });
    setIsExiting(false);
    setArrivalKey((k) => k + 1); // retrigger entrance + warm wash
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [state.pending, state.rerollsRemaining, state.mode, stopPlayback, onFreeDraft]);

  // ─── Commit ("Hear this in your voice") ───────────────────────────────
  const handleCommit = useCallback(async () => {
    if (state.pending || state.mode !== 'candidate' || state.recordingsRemaining <= 0) return;
    stopPlayback(true);
    dispatch({ type: 'COMMIT_START' });

    const result = await onCommit();
    if (!result.ok) {
      dispatch({ type: 'COMMIT_FAIL' }); // dot refills, draft preserved
      return;
    }
    dispatch({
      type: 'COMMIT_SUCCESS',
      recordingsRemaining: result.recordingsRemaining,
      durationSec: result.durationSec,
    });
    // Slides into Playback (decision #5 — no reveal beat). The element still
    // holds the PRIOR take's clip — drop it and resolve a fresh URL for the
    // newly committed one before starting, so the audio matches the words.
    setAudioRecovered(false);
    setAudioFailed(false);
    setPos(0);
    if (audioRef.current) {
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    const playback = await onRequestPlayback();
    if (playback.ok && audioRef.current) audioRef.current.src = playback.url;
    // Defer to the next frame so the committed layout is mounted first.
    // Visual playback proceeds even if the URL fetch failed (best-effort
    // audio; the retry affordance covers the next explicit play).
    requestAnimationFrame(() => startPlayback());
  }, [
    state.pending,
    state.mode,
    state.recordingsRemaining,
    stopPlayback,
    onCommit,
    onRequestPlayback,
    startPlayback,
  ]);

  // ─── Keep the current one ─────────────────────────────────────────────
  const handleKeepCurrent = useCallback(async () => {
    if (state.pending) return;
    stopPlayback(true);
    dispatch({ type: 'KEEP' });
    await onKeepCurrent(); // server clears the candidate; fire-and-settle
  }, [state.pending, stopPlayback, onKeepCurrent]);

  // ─── Save ─────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    const result = await onSave();
    if (result.ok) {
      onSaved?.(result.messageId);
      return; // navigation owns the unmount; leave the button in its saving state
    }
    setSaving(false);
    // vault_limit / subscription_lapsed routing is the page's call (chunk 2);
    // a retryable failure simply re-enables the button.
  }, [saving, onSave, onSaved]);

  // ─── Discard ──────────────────────────────────────────────────────────
  const handleConfirmDiscard = useCallback(async () => {
    await onDiscard();
    onDiscarded?.();
  }, [onDiscard, onDiscarded]);

  // ─── Sheets ───────────────────────────────────────────────────────────
  const [changeOpen, setChangeOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);

  // Cleanup the interval on unmount.
  useEffect(() => clearTimer, [clearTimer]);

  // ─── Derived view flags ───────────────────────────────────────────────
  const candidate = state.mode === 'candidate';
  const recCap = isRecordingCap(state);
  const lastReroll = isLastReroll(state);
  const textCap = isTextCap(state);

  const stoneState = state.pending ? 'working' : playing ? 'playback' : 'ready';
  const showHint = !state.playHintLearned && !playing && !played && !audioFailed;

  const rootClasses = [
    'preview-refine',
    candidate && 'is-candidate',
    (playing || played) && 'is-played',
    playing && 'is-playing',
    state.commitFail && 'is-commitfail',
    recCap && 'is-cap',
    lastReroll && 'is-lastreroll',
    textCap && 'is-textcap',
    state.playHintLearned && 'is-hint-learned',
    audioFailed && 'is-audiofailed',
  ]
    .filter(Boolean)
    .join(' ');

  const pendingDotIndex = state.pending === 'commit' ? state.recordingsRemaining - 1 : -1;
  const recWord = REC_WORDS[state.recordingsRemaining] ?? String(state.recordingsRemaining);

  return (
    <main className={rootClasses}>
      <style>{PREVIEW_REFINE_CSS}</style>
      <audio
        ref={audioRef}
        preload="none"
        aria-hidden="true"
        onLoadedMetadata={() => {
          // The real clip length is authoritative over the wpm estimate
          // that painted the scrubber before load.
          const sec = audioRef.current?.duration;
          if (sec && Number.isFinite(sec)) {
            dispatch({ type: 'AUDIO_DURATION', durationSec: Math.round(sec) });
          }
        }}
      />

      <div className="atmosphere" aria-hidden="true">
        <div className="atmosphere__glow" />
        <div className="atmosphere__vignette" />
      </div>

      {/* Backbar — A6 is step 4 of 5 (preview). */}
      <div className="backbar">
        <button
          type="button"
          className="backbar__btn"
          onClick={onBack}
          aria-label="Back"
          tabIndex={discardOpen || changeOpen ? -1 : 0}
        >
          <ChevronLeftIcon />
        </button>
        <div className="backbar__pips" aria-hidden="true">
          <span className="backbar__pip is-done" />
          <span className="backbar__pip is-done" />
          <span className="backbar__pip is-done" />
          <span className="backbar__pip is-current" />
          <span className="backbar__pip" />
        </div>
        <span className="backbar__spacer" />
      </div>

      <div className="body" ref={bodyRef}>
        <div className="stage">
          <div className="stone-wrap" aria-hidden="true">
            <BreathStone
              state={stoneState}
              size={candidate ? 112 : 160}
              reducedMotion={reducedMotion}
            />
          </div>

          <h1 className="prompt-question">
            {candidate ? "Here's another way to say it." : 'Here it is, in your voice.'}
          </h1>

          {isFirstArrival && !candidate && !played && (
            <p className="arrival-line">
              Listen. If it&apos;s not quite right, you can change it.
            </p>
          )}

          {/* Player — committed mode only (nothing to scrub in candidate). */}
          <div className="player">
            {showHint && <span className="play-hint">Tap to hear it.</span>}
            {audioFailed ? (
              <div className="audio-retry">
                <span className="audio-retry__msg">Couldn&apos;t load it.</span>
                <button type="button" className="audio-retry__btn" onClick={handleAudioRetry}>
                  Try again
                </button>
              </div>
            ) : (
              <div className="player__bar">
                <button
                  type="button"
                  className="player__toggle"
                  onClick={handlePlayPause}
                  aria-label={playing ? 'Pause' : 'Play'}
                  tabIndex={discardOpen || changeOpen ? -1 : 0}
                >
                  {playing ? <PauseIcon /> : <PlayIcon />}
                </button>
                <div className="player__track">
                  <div
                    className="player__fill"
                    style={{ width: `${Math.min(100, (pos / dur) * 100)}%` }}
                  />
                  <div
                    className="player__thumb"
                    style={{ left: `${Math.min(100, (pos / dur) * 100)}%` }}
                  />
                </div>
                <span className="player__time">
                  {fmtTime(pos)} / {fmtTime(dur)}
                </span>
              </div>
            )}
          </div>

          {/* Candidate block — the un-heard draft on a card. */}
          <div className="candidate-block">
            <p className="candidate-marker">Just the words, for now.</p>
            <div className={`candidate-card${arrivalKey > 0 && !reducedMotion ? ' is-fresh' : ''}`} key={arrivalKey}>
              <p
                className={`candidate-card__text${isExiting ? ' is-exiting' : ''}${
                  arrivalKey > 0 && !reducedMotion ? ' is-arriving' : ''
                }`}
              >
                {state.candidateText}
              </p>
            </div>
          </div>

          {/* Committed transcript — open on the page, no card. */}
          <div className="transcript">
            <div className="transcript-inner">{state.committedText}</div>
          </div>
        </div>
      </div>

      <div className="footer">
        {/* Committed stack */}
        <div className="stack stack-committed">
          <button
            type="button"
            className="btn"
            onClick={handleSave}
            disabled={saving}
            tabIndex={discardOpen || changeOpen ? -1 : 0}
          >
            {saving ? 'Saving…' : 'Save this message'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setChangeOpen(true)}
            tabIndex={discardOpen || changeOpen ? -1 : 0}
          >
            Make a change
          </button>
          <p className="cap-note cap-note--rec">
            That&apos;s all the recordings for this one. When it feels right, keep the one you heard.
          </p>
          <div className="link-group">
            <button
              type="button"
              className="btn-link"
              onClick={() => setDiscardOpen(true)}
              tabIndex={discardOpen || changeOpen ? -1 : 0}
            >
              Discard
            </button>
          </div>
        </div>

        {/* Candidate stack */}
        <div className="stack stack-candidate">
          <p className="commit-fail" aria-live="polite">
            That didn&apos;t come through. Your draft is safe, and nothing was spent.
          </p>
          <button
            type="button"
            className="btn btn--commit"
            onClick={handleCommit}
            disabled={state.pending !== null || recCap}
            tabIndex={discardOpen || changeOpen ? -1 : 0}
          >
            Hear this in your voice
            <span className="rec-dots" aria-hidden="true">
              {Array.from({ length: TOTAL_RECORDINGS }).map((_, i) => (
                <span
                  key={i}
                  className={[
                    'rec-dot',
                    i >= state.recordingsRemaining && 'is-spent',
                    i === pendingDotIndex && 'is-pending',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
              ))}
            </span>
            <span className="sr-only">{recWord} recordings remaining</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleFreeDraft}
            disabled={state.pending !== null}
            tabIndex={discardOpen || changeOpen ? -1 : 0}
          >
            See another way to say it
          </button>
          <p className="reroll-whisper">One more after this.</p>
          <p className="cap-note cap-note--text">
            That&apos;s all the new wordings for now. When one feels close, hear it in your voice.
          </p>
          <div className="link-group">
            <button
              type="button"
              className="btn-link"
              onClick={handleKeepCurrent}
              disabled={state.pending !== null}
              tabIndex={discardOpen || changeOpen ? -1 : 0}
            >
              Back to the take you heard
            </button>
          </div>
        </div>
      </div>

      {changeOpen && (
        <ChangeSheet
          textCapped={textCap}
          lastReroll={lastReroll}
          reshapeExhausted={state.reshapeExhausted}
          reducedMotion={reducedMotion}
          onReword={() => {
            setChangeOpen(false);
            // Let the sheet dismiss before the stone starts working.
            window.setTimeout(() => handleFreeDraft(), 220);
          }}
          onReshape={() => {
            setChangeOpen(false);
            onReshape();
          }}
          onDismiss={() => setChangeOpen(false)}
        />
      )}

      {discardOpen && (
        <DiscardSheet
          reducedMotion={reducedMotion}
          onConfirm={() => {
            setDiscardOpen(false);
            handleConfirmDiscard();
          }}
          onKeep={() => setDiscardOpen(false)}
        />
      )}
    </main>
  );
}

// ─── Inline play/pause glyphs (the icons barrel has no transport icons) ──
function PlayIcon() {
  return (
    <svg className="icon-play" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg className="icon-pause" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

// ─── Shared focus-trapped bottom sheet ───────────────────────────────────
interface SheetShellProps {
  labelledBy: string;
  className?: string;
  reducedMotion: boolean;
  onDismiss: () => void;
  /** The element to focus first; defaults to the first focusable. */
  initialFocusSelector?: string;
  children: React.ReactNode;
}

function SheetShell({
  labelledBy,
  className,
  onDismiss,
  initialFocusSelector,
  children,
}: SheetShellProps) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const returnFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    returnFocusRef.current = document.activeElement;
    // Slide in on the next frame so the transform transition runs.
    const raf = requestAnimationFrame(() => setOpen(true));

    const layer = layerRef.current;
    const focusables = layer
      ? Array.from(layer.querySelectorAll<HTMLElement>('button:not([tabindex="-1"])'))
      : [];
    const initial = initialFocusSelector
      ? layer?.querySelector<HTMLElement>(initialFocusSelector)
      : focusables[0];
    initial?.focus();

    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onDismiss();
        return;
      }
      if (e.key === 'Tab' && focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeydown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeydown);
      const back = returnFocusRef.current;
      if (back instanceof HTMLElement) back.focus();
    };
    // Mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={layerRef}
      className={`sheet-layer${className ? ` ${className}` : ''}${open ? ' is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div className="sheet-backdrop" onClick={onDismiss} />
      <div className="sheet">
        <div className="sheet__handle" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

// ─── Discard sheet (inherited from the control arm) ──────────────────────
function DiscardSheet({
  reducedMotion,
  onConfirm,
  onKeep,
}: {
  reducedMotion: boolean;
  onConfirm: () => void;
  onKeep: () => void;
}) {
  return (
    <SheetShell
      labelledBy="discardSheetTitle"
      reducedMotion={reducedMotion}
      onDismiss={onKeep}
      initialFocusSelector='[data-action="keep"]'
    >
      <h2 className="sheet__title" id="discardSheetTitle">
        Discard this message?
      </h2>
      <p className="sheet__body">Your voice stays preserved. Only this message goes.</p>
      <button type="button" className="btn" onClick={onConfirm}>
        Discard
      </button>
      <button type="button" className="btn-link" data-action="keep" onClick={onKeep}>
        Keep it
      </button>
    </SheetShell>
  );
}

// ─── Change sheet (the door — reword vs reshape, caps fold in) ────────────
function ChangeSheet({
  textCapped,
  lastReroll,
  reshapeExhausted,
  reducedMotion,
  onReword,
  onReshape,
  onDismiss,
}: {
  textCapped: boolean;
  lastReroll: boolean;
  reshapeExhausted: boolean;
  reducedMotion: boolean;
  onReword: () => void;
  onReshape: () => void;
  onDismiss: () => void;
}) {
  return (
    <SheetShell
      labelledBy="changeSheetTitle"
      className="sheet-layer--change"
      reducedMotion={reducedMotion}
      onDismiss={onDismiss}
    >
      <h2 className="sheet__title" id="changeSheetTitle">
        What would you like to change?
      </h2>

      {textCapped ? (
        <p className="sheet__note">
          That&apos;s all the new wordings for now. When it feels right, keep it.
        </p>
      ) : (
        <>
          <button type="button" className="sheet-opt" onClick={onReword}>
            <span className="sheet-opt__title">The way it&apos;s said</span>
            <span className="sheet-opt__sub">Same note, new words.</span>
          </button>
          {lastReroll && <p className="sheet__note">One more after this.</p>}
        </>
      )}

      {reshapeExhausted ? (
        <p className="sheet__note">This note&apos;s been reshaped as far as it goes.</p>
      ) : (
        <button type="button" className="sheet-opt" onClick={onReshape}>
          <span className="sheet-opt__title">What it says</span>
          <span className="sheet-opt__sub">Go back and change your note.</span>
        </button>
      )}

      <button type="button" className="btn-link" onClick={onDismiss}>
        Never mind
      </button>
    </SheetShell>
  );
}
