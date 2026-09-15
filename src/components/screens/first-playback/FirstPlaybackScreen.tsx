'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';
import { FIRST_PLAYBACK_CSS } from './FirstPlaybackScreen.css';
import {
  ASIDE_AFTER_LINE_MS,
  BREATH_STOP_BEFORE_PLAY_MS,
  cadence,
  CTA_AFTER_LINE_MS,
  EYEBROW_AT_MS,
  FIRST_FRAME_DELTA_MS,
  LEDE_1_AT_MS,
  LEDE_2_AT_MS,
  LINE_VISIBLE_BEFORE_PLAY_MS,
  lineEndMs,
  LUM_ATTACK,
  LUM_DECAY_MS,
  LUM_RELEASE,
  MAX_FRAME_DELTA_MS,
  PAYOFF_AFTER_LINE_MS,
  PLAY_AT_MS,
  REDUCED,
  REPLAY_AFTER_LINE_MS,
  reducedLuminanceFor,
  SUS_COEFFICIENT,
  SUS_RAMP_MS,
  targetAmplitude,
  WORD_REST_MS,
  type WordBeat,
} from './FirstPlaybackScreen.cadence';

/**
 * Where the stone's amplitude comes from.
 *
 * `audio` is production: the screen plays the URL and reads RMS off an
 * AnalyserNode. `cadence` is the dev/preview path — it derives the same
 * envelope from the line's own measured cadence and plays nothing, because a
 * synthetic voice would mislead a review. Every timing is identical either way.
 */
export type AmplitudeSource =
  | { kind: 'audio'; url: string }
  | { kind: 'cadence' };

export interface FirstPlaybackScreenProps {
  /** The sentence spoken in the user's own preserved voice. */
  line: string;
  /** Lede above the stone — names the investment before the proof arrives. */
  ledeLines: readonly [string, string];
  /** The payoff, after 2.5s of nothing. */
  payoff: string;
  /** Observational aside under the payoff. */
  aside: string;
  amplitude: AmplitudeSource;
  /** The committed action. Owned by the page — this screen never routes. */
  onCreateFirstMessage: () => void;
  /** Fired once the line has finished playing, for the funnel's completed-listen. */
  onPlaybackComplete?: () => void;
  /** Fired each time the user asks to hear it again. */
  onReplay?: () => void;
  /**
   * Rect of the stone this screen is taking over from, in viewport coordinates.
   *
   * The `detail → playback` handoff has one rule: **the stone must not
   * re-enter.** Given the outgoing stone's rect, this screen's stone mounts
   * already occupying it exactly, so the cross-dissolve between the two
   * renderings happens in place and invisibly; only then does it travel to
   * where this screen wants it.
   *
   * Omit for a standalone mount (the dev page), where there is nothing to take
   * over from and the stone simply appears.
   */
  /**
   * The outgoing stone's **sphere** rect — the visible circle, not whatever
   * element happens to contain it. The ceremony's stone is a canvas roughly
   * 1.8x the sphere it draws, so handing over the element's own rect scales
   * this screen's stone ~1.8x too large on arrival.
   */
  entranceFrom?: { left: number; top: number; width: number } | null;
  /**
   * Word onsets in ms, measured from the audio being played.
   *
   * When present these are used verbatim: they came from the vendor's own
   * alignment for this exact render, so there is nothing to scale. When absent
   * the cadence table is used instead, stretched to the audio's total length —
   * right about when the line ends, up to ~140ms out within it.
   */
  wordOffsetsMs?: number[] | null;
  /** Overrides the media query. Dev harness only — production omits it. */
  forceReducedMotion?: boolean;
}

/** How long the stone takes to travel from the outgoing rect to its own. */
const ENTRANCE_MS = 700;

const COPY = {
  eyebrow: 'Your voice',
  cta: 'Create your first message',
  replay: 'Hear it again',
  stoneLabel: 'Your voice',
} as const;

/** Which sequenced elements are currently on screen. */
interface Revealed {
  eyebrow: boolean;
  lede1: boolean;
  lede2: boolean;
  spoken: boolean;
  payoff: boolean;
  aside: boolean;
  cta: boolean;
  replay: boolean;
}

const NOTHING_REVEALED: Revealed = {
  eyebrow: false,
  lede1: false,
  lede2: false,
  spoken: false,
  payoff: false,
  aside: false,
  cta: false,
  replay: false,
};

const ALL_REVEALED: Revealed = {
  eyebrow: true,
  lede1: true,
  lede2: true,
  spoken: true,
  payoff: true,
  aside: true,
  cta: true,
  replay: true,
};

/**
 * Step 5 · First Playback — the fifth and final phase of the First Breath
 * ceremony. The stone never leaves the screen; it stops breathing and starts
 * speaking.
 *
 * Mirrors `prototypes/essence-step5-first-playback.html`, which is the design
 * source of truth for every timing, cadence and motion decision here.
 *
 * Pure and props-driven: no Supabase, no routing, no fetching. The signed URL
 * arrives as a prop and actions bubble out via callbacks.
 */
export function FirstPlaybackScreen({
  line,
  ledeLines,
  payoff,
  aside,
  amplitude,
  wordOffsetsMs,
  onCreateFirstMessage,
  onPlaybackComplete,
  onReplay,
  entranceFrom,
  forceReducedMotion,
}: FirstPlaybackScreenProps) {
  const systemReducedMotion = useReducedMotion();
  const reduced = forceReducedMotion ?? systemReducedMotion;

  /**
   * Real onsets win over the table. A length mismatch is treated as unusable
   * rather than silently lighting the wrong words.
   */
  const realBeats = useMemo<WordBeat[] | null>(() => {
    if (!wordOffsetsMs) return null;
    const split = line.trim().split(/\s+/).filter(Boolean);
    if (wordOffsetsMs.length !== split.length) return null;
    return split.map((word, i) => ({ word, atMs: wordOffsetsMs[i] }));
  }, [line, wordOffsetsMs]);

  const words = useMemo<WordBeat[]>(
    () => realBeats ?? cadence(line),
    [realBeats, line]
  );
  const lineEnd = useMemo(() => lineEndMs(words), [words]);

  const [revealed, setRevealed] = useState<Revealed>(NOTHING_REVEALED);
  const [litCount, setLitCount] = useState(0);
  const [restCount, setRestCount] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [breathing, setBreathing] = useState(true);
  const [announcement, setAnnouncement] = useState('');

  const [entering, setEntering] = useState(Boolean(entranceFrom));

  const rootRef = useRef<HTMLDivElement>(null);
  const stoneWrapRef = useRef<HTMLDivElement>(null);
  const spokenRef = useRef<HTMLParagraphElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const audioGraphRef = useRef<{ ctx: AudioContext; analyser: AnalyserNode } | null>(null);
  /**
   * The real spoken length, once the browser has decoded enough to know it.
   *
   * The cadence table is hand-timed against ONE reading of the line. Every
   * user's clone speaks at its own rate — the owner's renders this line in
   * 2.23s against the table's 3.60s — so a fixed table drifts by more than a
   * second and the last word lights up after the voice has already stopped.
   * The table supplies the RHYTHM; the audio supplies the DURATION.
   */
  const audioDurationMsRef = useRef<number | null>(null);

  // Callbacks live in refs so the sequence effect never re-runs (and restarts
  // the ceremony) because a parent handed down a new closure identity.
  const onPlaybackCompleteRef = useRef(onPlaybackComplete);
  onPlaybackCompleteRef.current = onPlaybackComplete;

  const setLum = useCallback((lum: number, sus: number) => {
    const root = rootRef.current;
    if (!root) return;
    root.style.setProperty('--lum', lum.toFixed(4));
    root.style.setProperty('--sus', sus.toFixed(4));
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const at = useCallback((ms: number, fn: () => void) => {
    timersRef.current.push(setTimeout(fn, ms));
  }, []);

  /**
   * An aria-live region only announces a CHANGE, so the same string set twice
   * is silent. Clearing first, then setting on the next tick, guarantees the
   * screen reader gets the ceremony in order and in time.
   */
  const announce = useCallback((text: string) => {
    setAnnouncement('');
    timersRef.current.push(setTimeout(() => setAnnouncement(text), 60));
  }, []);

  // ── the utterance ────────────────────────────────────────────────────────

  const endSpeech = useCallback(() => {
    runningRef.current = false;
    setSpeaking(false);
    setBreathing(true);
    onPlaybackCompleteRef.current?.();
  }, []);

  const speak = useCallback(() => {
    runningRef.current = true;
    setSpeaking(true);
    setBreathing(false);
    announce(line);

    // Stretch or compress the table onto the actual utterance. 1 when there is
    // no audio to measure against, so the dev page is unchanged.
    // Real onsets are already in the audio's own time — scaling them would
    // reintroduce the error this exists to remove.
    const realMs = audioDurationMsRef.current;
    const scale = realBeats || !realMs || lineEnd <= 0 ? 1 : realMs / lineEnd;
    const scaled = (ms: number) => Math.round(ms * scale);
    const endMs = realBeats && realMs ? realMs : scaled(lineEnd);

    words.forEach((w, i) => {
      at(scaled(w.atMs), () => setLitCount((n) => Math.max(n, i + 1)));
      at(scaled(w.atMs) + WORD_REST_MS, () => setRestCount((n) => Math.max(n, i + 1)));
    });

    // The tail is scheduled from here, not from the sequence effect, because
    // only now is the real length known. Hanging "That's you." off the model
    // would delay it by the same drift the words were suffering.
    at(endMs + PAYOFF_AFTER_LINE_MS, () => {
      setRevealed((r) => ({ ...r, payoff: true }));
      announce(`${payoff} ${aside}`);
    });
    at(endMs + ASIDE_AFTER_LINE_MS, () =>
      setRevealed((r) => ({ ...r, aside: true }))
    );
    at(endMs + CTA_AFTER_LINE_MS, () =>
      setRevealed((r) => ({ ...r, cta: true }))
    );
    at(endMs + REPLAY_AFTER_LINE_MS, () =>
      setRevealed((r) => ({ ...r, replay: true }))
    );

    if (reduced) {
      words.forEach((w) => at(scaled(w.atMs), () => setLum(reducedLuminanceFor(w.word), 0)));
      at(endMs, () => setLum(0.2, 0));
      at(endMs + 400, () => {
        setLum(0, 0);
        endSpeech();
      });
      return;
    }

    const analyser = audioGraphRef.current?.analyser ?? null;
    const bins = analyser ? new Uint8Array(analyser.fftSize) : null;

    /**
     * Real RMS when there is audio, the cadence model when there isn't. Same
     * range, same consumer — which is what lets the dev page and production
     * share every timing.
     */
    const sample = (tMs: number): number => {
      if (analyser && bins) {
        analyser.getByteTimeDomainData(bins);
        let sum = 0;
        for (let i = 0; i < bins.length; i++) {
          const v = (bins[i] - 128) / 128;
          sum += v * v;
        }
        // ×3.2 maps speech-level RMS (~0.05–0.3) onto the 0..1 the layers expect.
        return Math.min(1, Math.sqrt(sum / bins.length) * 3.2);
      }
      return targetAmplitude(tMs / scale, words, lineEnd);
    };

    // The clock accumulates CLAMPED deltas. An absolute performance.now()
    // baseline keeps advancing while rAF is paused in a background tab, so the
    // utterance snapped forward on return.
    let lum = 0;
    let sus = 0;
    let t = 0;
    let prev: number | null = null;

    const loop = (now: number) => {
      t += prev === null ? FIRST_FRAME_DELTA_MS : Math.min(MAX_FRAME_DELTA_MS, now - prev);
      prev = now;

      if (t > endMs + LUM_DECAY_MS) {
        setLum(0, 0);
        endSpeech();
        return;
      }

      const target = sample(t);
      lum += (target - lum) * (target > lum ? LUM_ATTACK : LUM_RELEASE);
      sus += ((t < endMs ? Math.min(1, t / SUS_RAMP_MS) : 0) - sus) * SUS_COEFFICIENT;
      setLum(lum, sus);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, [announce, aside, at, endSpeech, line, lineEnd, payoff, realBeats, reduced, setLum, words]);

  /**
   * Leaving mid-utterance resolves to the settled beat. Resuming mid-word is
   * worse than arriving at the end with "Hear it again" available.
   */
  const settle = useCallback(() => {
    clearTimers();
    setRevealed(ALL_REVEALED);
    setLitCount(words.length);
    setRestCount(words.length);
    setLum(0, 0);
    setAnnouncement(`${payoff} ${aside}`);
    endSpeech();
  }, [aside, clearTimers, endSpeech, payoff, setLum, words.length]);

  // ── the sequence ─────────────────────────────────────────────────────────

  useEffect(() => {
    clearTimers();
    setRevealed(NOTHING_REVEALED);
    setLitCount(0);
    setRestCount(0);
    setBreathing(true);
    setSpeaking(false);
    setLum(0, 0);

    const play = reduced ? REDUCED.playAtMs : PLAY_AT_MS;
    const show = (key: keyof Revealed) => () =>
      setRevealed((r) => ({ ...r, [key]: true }));

    at(reduced ? REDUCED.eyebrowAtMs : EYEBROW_AT_MS, show('eyebrow'));
    at(reduced ? REDUCED.lede1AtMs : LEDE_1_AT_MS, show('lede1'));
    at(reduced ? REDUCED.lede2AtMs : LEDE_2_AT_MS, show('lede2'));
    if (!reduced) {
      // Breath stops on an exhale — the silence before speech.
      at(play - BREATH_STOP_BEFORE_PLAY_MS, () => setBreathing(false));
    }
    at(play - LINE_VISIBLE_BEFORE_PLAY_MS, show('spoken'));
    at(play, () => {
      void startAudio();
      speak();
    });

    // The tail is scheduled inside speak(), which is the only place that knows
    // the real spoken length. It is not compressed under reduced motion: the
    // pause after the line is comprehension time, not choreography.

    return clearTimers;
    // The ceremony runs once per line/motion-mode. Handlers are read from refs
    // so a new closure identity from the parent can't restart it mid-beat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line, reduced]);

  // ── audio ────────────────────────────────────────────────────────────────

  const startAudio = useCallback(async () => {
    if (amplitude.kind !== 'audio') return;
    const el = audioRef.current;
    if (!el) return;

    try {
      if (!audioGraphRef.current) {
        const Ctor: typeof AudioContext | undefined =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (Ctor) {
          const ctx = new Ctor();
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 1024;
          ctx.createMediaElementSource(el).connect(analyser);
          analyser.connect(ctx.destination);
          audioGraphRef.current = { ctx, analyser };
        }
      }
      await audioGraphRef.current?.ctx.resume();
      await el.play();
    } catch {
      // Autoplay blocked, or no Web Audio. The cadence model already drives the
      // choreography and the line is on screen as text throughout, so the beat
      // still lands silently. The dedicated silent-phone / blocked-autoplay
      // state is a separate pass — this is deliberately not a stub for it.
    }
  }, [amplitude]);

  useEffect(() => {
    return () => {
      void audioGraphRef.current?.ctx.close();
      audioGraphRef.current = null;
    };
  }, []);

  // ── the inbound crossfade ────────────────────────────────────────────────

  useLayoutEffect(() => {
    const root = rootRef.current;
    const wrap = stoneWrapRef.current;
    if (!entranceFrom || !root || !wrap) return;
    // Under reduced motion the match cut stands on its own; the stone simply
    // arrives where it belongs. Travelling it would be movement for its own sake.
    if (reduced) {
      setEntering(false);
      return;
    }

    // Measure where this screen's stone WANTS to be, then start it where the
    // outgoing stone currently IS. Measured rather than computed: the stage is
    // `flex: 1`, so its centre depends on the viewport, and a hard-coded offset
    // would drift on any screen that isn't the one it was tuned on.
    const own = wrap.getBoundingClientRect();
    const dx = entranceFrom.left + entranceFrom.width / 2 - (own.left + own.width / 2);
    const dy = entranceFrom.top + entranceFrom.width / 2 - (own.top + own.height / 2);
    const scale = entranceFrom.width / own.width;

    // Driven by the Web Animations API, NOT a CSS transition.
    //
    // The resting transform is composed from custom properties (so the entry
    // offset and the speech follower can share it), and a `var()` change does
    // not reliably start a transition — set-then-release collapses into one
    // style resolution and the stone snaps into place. A forced reflow between
    // the two writes does not fix it either. WAAPI takes an explicit from/to,
    // composites on the GPU, and releases cleanly when it ends.
    //
    // Safe against the follower because --sus is 0 for the whole entrance: the
    // animation is over ~2.2s before the voice starts.
    const easing =
      getComputedStyle(root).getPropertyValue('--ease-page').trim() ||
      'cubic-bezier(0.22, 1, 0.36, 1)';

    const animation = wrap.animate(
      [
        { transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${scale.toFixed(4)})` },
        { transform: 'translate(0px, 0px) scale(1)' },
      ],
      { duration: ENTRANCE_MS, easing, fill: 'none' },
    );

    const done = setTimeout(() => setEntering(false), ENTRANCE_MS + 60);

    return () => {
      animation.cancel();
      clearTimeout(done);
    };
    // Runs once, on the mount that takes over from the ceremony.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── the fit step ─────────────────────────────────────────────────────────

  /**
   * Step the ceremonial size down until the line rags into at most three lines
   * inside its reserved block. The layout must not belong to one sentence.
   */
  const fit = useCallback(() => {
    const el = spokenRef.current;
    if (!el) return;
    for (const size of [34, 32, 30, 28, 26]) {
      el.style.fontSize = `clamp(26px, ${(size / 3.3).toFixed(2)}cqw, ${size}px)`;
      if (el.offsetHeight <= Math.round(size * 1.34 * 3) + 2) break;
    }
  }, []);

  useLayoutEffect(() => {
    fit();
    // Re-fit against the real face — otherwise we have measured the fallback.
    void document.fonts?.ready.then(fit);
  }, [fit, line]);

  // ── leaving mid-utterance ────────────────────────────────────────────────

  useEffect(() => {
    const onHidden = () => {
      if (document.hidden && runningRef.current) settle();
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, [settle]);

  const handleReplay = useCallback(() => {
    if (runningRef.current) return;
    setLitCount(0);
    setRestCount(0);
    onReplay?.();
    const el = audioRef.current;
    if (el) {
      el.currentTime = 0;
      void startAudio();
    }
    speak();
  }, [onReplay, speak, startAudio]);

  return (
    <div
      ref={rootRef}
      className="fpb"
      data-speaking={speaking || undefined}
      data-reduced={reduced || undefined}
      data-entering={entering || undefined}
    >
      <style>{FIRST_PLAYBACK_CSS}</style>

      <div className="fpb__atmos" aria-hidden="true">
        <div className="fpb__l-base" />
        <div className="fpb__l-cast" />
        <div className="fpb__l-vig" />
        <div className="fpb__l-grain" />
      </div>

      <div className="fpb__top">
        <p className="fpb__eyebrow" data-show={revealed.eyebrow || undefined}>
          {COPY.eyebrow}
        </p>
        <p className="fpb__lede">
          <span data-show={revealed.lede1 || undefined}>{ledeLines[0]}</span>
          <span data-show={revealed.lede2 || undefined}>{ledeLines[1]}</span>
        </p>
      </div>

      <div className="fpb__stage">
        <div
          ref={stoneWrapRef}
          className="fpb__stone-wrap"
          data-breathing={breathing && !reduced ? 'true' : undefined}
          role="img"
          aria-label={COPY.stoneLabel}
        >
          <div className="fpb__l-bloom" />
          <div className="fpb__l-contact" />
          <div className="fpb__aura-far" />
          <div className="fpb__aura-near" />
          <div className="fpb__stone">
            <div className="fpb__stone-sub" />
            <div className="fpb__rim" />
            <div className="fpb__spec" />
          </div>
        </div>
      </div>

      <div className="fpb__bottom">
        <div className="fpb__spoken-wrap" data-show={revealed.spoken || undefined}>
          {/* Decoration: the live region below carries the line to assistive tech. */}
          <p className="fpb__spoken" ref={spokenRef} aria-hidden="true">
            {words.map((w, i) => (
              // The separator stays OUTSIDE the span: .fpb__w is inline-block,
              // and a space inside an inline-block collapses to zero width.
              <Fragment key={`${w.word}-${i}`}>
                <span
                  className="fpb__w"
                  data-lit={i < litCount || undefined}
                  data-rest={i < restCount || undefined}
                >
                  {w.word}
                </span>
                {i < words.length - 1 ? ' ' : null}
              </Fragment>
            ))}
          </p>
        </div>

        <p className="fpb__sr-only" role="status" aria-live="polite">
          {announcement}
        </p>

        <div className="fpb__after" aria-hidden="true">
          <h2 className="fpb__payoff" data-show={revealed.payoff || undefined}>
            {payoff}
          </h2>
          <p className="fpb__aside" data-show={revealed.aside || undefined}>
            {aside}
          </p>
        </div>

        {/* Unmount, don't just fade. An element at opacity:0 still occupies its
            row, and on a stage where one action arrives alone an invisible
            button silently sets the spacing of everything below it. */}
        <div className="fpb__actions">
          {revealed.cta && (
            <button
              type="button"
              className="fpb__btn fpb__action-enter"
              onClick={onCreateFirstMessage}
            >
              {COPY.cta}
            </button>
          )}
          {revealed.replay && (
            <button
              type="button"
              className="fpb__btn fpb__btn--quiet fpb__action-enter"
              onClick={handleReplay}
              aria-disabled={speaking || undefined}
            >
              <span className="fpb__replay">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 4v5h5" />
                </svg>
                {COPY.replay}
              </span>
            </button>
          )}
        </div>
      </div>

      {amplitude.kind === 'audio' && (
        <audio
          ref={audioRef}
          src={amplitude.url}
          preload="auto"
          crossOrigin="anonymous"
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            // Guard against Infinity/NaN, which some streams report before
            // enough of the file has arrived.
            if (Number.isFinite(d) && d > 0) {
              audioDurationMsRef.current = Math.round(d * 1000);
            }
          }}
        />
      )}
    </div>
  );
}
