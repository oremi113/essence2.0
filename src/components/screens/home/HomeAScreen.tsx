'use client';

/**
 * Home A — the screen a user lands on before their voice is `ready`.
 *
 * One adaptive composition, three registers. The shell never changes; the
 * register decides what the content and the pinned action block hold. That is
 * the whole design — see docs/session-home-a/home-a-critique.md for why the
 * alternative (three compositions) was rejected.
 *
 * Its only verb is *re-enter*. There is no prompt text, no record button, and
 * no playback of anything — /app/record owns recording behind a five-screen
 * preamble (mic permission, room check, grounding), and hearing your own voice
 * back is First Breath, after payment. A record affordance here would either
 * skip those gates or lie about what the tap costs.
 *
 * Pure and props-driven: no Supabase, no redirect, no server actions.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { BreathStone } from '@/components/breath-stone';
import { useReducedMotion } from '@/lib/animation/useReducedMotion';
import { homeACss } from './HomeAScreen.css';
import {
  STAGES,
  nextStopLine,
  statusLine,
  stageFractions,
  currentStageIndex,
  type HomeAScreenProps,
} from './HomeAScreen.types';

/** Pinned by the design handoff. 140px, `idle`. Absent in `failed`. */
const STONE_SIZE = 140;

function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

/**
 * The stage band. Equal thirds, honey on the current stage only.
 *
 * Equal — not proportional to 5/12/8. Sizing the segments by prompt count
 * turns three chunks back into one 25-unit bar with two gaps, which is the
 * reading chunking was chosen to escape: a user who finishes Everyday has
 * completed a whole named stage and should see one of three filled, not 20%.
 * The honest count lives in the pill and the labels.
 */
function StageBand({ clipsRecorded }: { clipsRecorded: number }) {
  const fractions = stageFractions(clipsRecorded);
  const current = currentStageIndex(clipsRecorded);

  return (
    <div className="homea__band">
      <div className="homea__band-labels" aria-hidden="true">
        {STAGES.map((s) => (
          <div key={s.label} className="homea__band-label">{s.label}</div>
        ))}
      </div>
      <div className="essence-stage-band" role="group" aria-label="Voice training progress">
        {STAGES.map((s, i) => {
          const done = Math.max(0, Math.min(s.length, clipsRecorded - s.start));
          return (
            <div
              key={s.label}
              className={`essence-stage-track${i === current ? ' essence-stage-track--current' : ''}`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={s.length}
              aria-valuenow={done}
              aria-valuetext={`${s.label}: ${done} of ${s.length}`}
            >
              {/* transform only, so it stays GPU-only under throttle. Completed
                  segments sit at scaleX(1) with no transition, so nothing
                  re-animates when another part of the screen changes. */}
              <div
                className="essence-stage-fill"
                style={{ transform: `scaleX(${fractions[i]})` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HomeAScreen({
  register,
  clipsRecorded,
  failedSubState,
  retryAt,
  retryWindowMs,
  pastDueVariant,
  offline = false,
  pending = false,
  onPrimary,
  onContactSupport,
  onSettings,
  reducedMotionOverride,
  banner,
}: HomeAScreenProps) {
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = reducedMotionOverride ?? systemReducedMotion;

  /**
   * The waiting sub-state ends by the clock, not by an interaction. Without
   * this the screen would still be saying "try again in five minutes" at
   * minute six — lying to someone who did exactly what it asked. Flips to
   * `retryable` the moment the window closes, so the button appears when the
   * copy promised it would.
   */
  // `null` until the clock has been read — reading it during render is impure,
  // and on the server there is no meaningful "now" for this at all.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (failedSubState !== 'waiting' || !retryAt) return;
    const tick = () => setNow(Date.now());
    tick();
    const t = setTimeout(tick, Math.max(0, retryAt - Date.now()));
    return () => clearTimeout(t);
  }, [failedSubState, retryAt]);

  const windowClosed = now != null && retryAt != null && now >= retryAt;
  const sub = failedSubState === 'waiting' && windowClosed ? 'retryable' : failedSubState;

  const isFailed = register === 'failed';
  const isNotStarted = register === 'not-started';

  // One banner at a time. Offline suppresses past-due for its duration:
  // "Update card" opens a Stripe portal session, which cannot resolve offline,
  // and a banner whose only action is dead is the rule violating itself.
  const showPastDue = !offline && pastDueVariant != null;

  /**
   * A failed build cannot be retried while the card is failing:
   * `VOICE_CREATION_ALLOWED_STATUSES` is {trial, active}, so `past_due` gets a
   * 402 from /start — but /app/voice/processing lets it through first, so a
   * "Try again" here would route the user to a new screen and only then fail.
   * The card is the blocker and the retry is downstream of it, so the card is
   * the only action offered (the banner already carries it) and this states the
   * dependency. FOLLOW_UPS #109.
   *
   * Not applied to `exhausted`: its primary is a mailto, which is not gated and
   * works regardless of the card.
   */
  const cardBlocksRetry =
    isFailed && pastDueVariant != null && !offline && sub !== 'exhausted';

  // The waiting sub-state has NO primary, deliberately. /start answers 429
  // inside the window, so a "Try again" — even disabled with a timer — is the
  // dead primary this screen's whole register was designed to avoid.
  const showWaitBlock = isFailed && sub === 'waiting' && !cardBlocksRetry;

  /**
   * Offline breaks every primary that works by navigating — "Record the next
   * one" needs the upload path, "Try again" needs the build. The one exception
   * is the exhausted state's mailto: it opens the mail client fine offline and
   * the message waits in the user's own outbox, which is why its copy makes no
   * promise about speed.
   */
  const ctaUnavailable = offline && !(isFailed && sub === 'exhausted');

  const primaryLabel = (() => {
    if (isFailed) return sub === 'exhausted' ? 'Send us a note' : 'Try again';
    if (isNotStarted) return 'Record the first one';
    return 'Record the next one';
  })();

  // Label swap, not a spinner. The motion guard makes a spinner wait, and one
  // that waits then appears reads as a stall on a screen whose job is one tap.
  const ctaLabel = pending && !ctaUnavailable ? 'Opening' : primaryLabel;

  // Pure: keyed off which window applies, not off the clock. Derived from the
  // remaining time it would shrink while the user read it.
  const waitLine =
    (retryWindowMs ?? 0) > 10 * 60 * 1000
      ? 'You can try again in half an hour.'
      : 'You can try again in five minutes.';

  /**
   * Whether the scroll region has more below, and whether we are already at
   * the end. Measured rather than assumed: the overflow depends on the banner
   * variant, the register and the user's text size, so no static rule covers
   * it. Re-measured on resize and on text-size change.
   */
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState<'false' | 'true' | 'end'>('false');
  const measure = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hidden = el.scrollHeight - el.clientHeight;
    if (hidden <= 1) setOverflow('false');
    else setOverflow(el.scrollTop + el.clientHeight >= el.scrollHeight - 1 ? 'end' : 'true');
  }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // The observer fires once on observe(), which is the initial measurement —
    // so there is no synchronous setState in the effect body to cascade from.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const c of Array.from(el.children)) ro.observe(c);

    // The first measurement can land mid-layout and read an overflow that the
    // settled layout does not have — a fade over content that is not actually
    // cut. Seen on a 375x667 viewport: data-overflow='true' with zero hidden
    // pixels. Web fonts are the usual cause (Spectral and Inter reflow the
    // headline after first paint) and a ResizeObserver on the element and its
    // direct children does not always see a grandchild reflow.
    let raf = requestAnimationFrame(() => { raf = requestAnimationFrame(measure); });
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.ready.then(measure).catch(() => {});

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [measure, register, clipsRecorded, pastDueVariant, offline]);

  const rootClass = [
    'homea',
    reducedMotion ? '' : 'is-playing',
  ].filter(Boolean).join(' ');

  const arr = (n: 1 | 2 | 3) =>
    reducedMotion ? 'essence-arr' : `essence-arr essence-arr--in essence-arr--d${n}`;

  return (
    <main className={rootClass} data-register={register}>
      <style>{homeACss}</style>

      <div
        className="homea__scroll"
        ref={scrollRef}
        onScroll={measure}
        data-overflow={overflow}
      >
        {/* Focus order starts here on purpose: an alert that needs an action
            precedes the screen's own controls. In flow, so it can never paint
            over the gear. */}
        {(showPastDue || offline) && (
          <div className="homea__banner">
            {offline ? (
              <div className="essence-banner-slot" role="status">
                <div>
                  <div className="homea__banner-title">You&rsquo;re offline.</div>
                  <div className="homea__banner-body">
                    Recording needs a connection. Come back when you have one and
                    pick up where you left off.
                  </div>
                </div>
              </div>
            ) : (
              banner
            )}
          </div>
        )}

        <div className="homea__topbar">
          <button type="button" className="homea__settings" onClick={onSettings} aria-label="Settings">
            <GearIcon />
          </button>
        </div>

        {/* No stone in `failed`: FOLLOW_UPS #35 is scheduled after this ships,
            so it renders flat, and a flat grey disc above an apology is the
            worst context for the weakest version of it. Do NOT compensate
            locally — no halo, no gradient. That debt #35 has to unpick. */}
        {!isFailed && (
          <div className="homea__stone" aria-hidden="true">
            <BreathStone state="idle" size={STONE_SIZE} reducedMotion={reducedMotion} />
          </div>
        )}

        <div className="homea__body">
        <div className={arr(1)}>
          {isFailed && (
            <>
              <h1 className="homea__headline">
                {sub === 'exhausted'
                  ? 'Your voice hasn’t come through.'
                  : 'Your voice didn’t come through this time.'}
              </h1>
              <p className="homea__sub">
                {sub === 'exhausted'
                  ? 'We’ve tried three times, so a person needs to look. Every clip you’ve recorded is kept.'
                  : 'Every clip you’ve recorded is kept.'}
              </p>
            </>
          )}

          {isNotStarted && (
            <>
              <h1 className="homea__headline">Twenty-five short passages to read aloud.</h1>
              <p className="homea__sub">
                Eleven to fourteen minutes in total, and you can split it across as
                many sittings as you like.
              </p>
            </>
          )}

          {register === 'paused' && (
            <div className="essence-status-pill homea__pill" role="status">
              {statusLine(clipsRecorded)}
            </div>
          )}
        </div>

        {!isFailed && (
          <div className={arr(2)}>
            <StageBand clipsRecorded={clipsRecorded} />
            {register === 'paused' && (
              <p className="homea__next-stop">{nextStopLine(clipsRecorded)}</p>
            )}
          </div>
        )}
        </div>
      </div>

      <div className={`homea__action ${arr(3)}`}>
        {cardBlocksRetry ? (
          // Same shape as the wait block: an instruction, because no control
          // here can work until the card clears. The action lives in the banner.
          <div className="essence-card essence-card--compact" role="status">
            <div className="homea__wait-title">
              We can try again once your card is updated.
            </div>
            <div className="homea__wait-body">Nothing is lost in the meantime.</div>
          </div>
        ) : showWaitBlock ? (
          // An instruction, not a control. Copy Guide §8 asks for one easy next
          // step; when no control can work, the next step is when to come back.
          <div className="essence-card essence-card--compact" role="status">
            <div className="homea__wait-title">{waitLine}</div>
            <div className="homea__wait-body">Nothing is lost while you wait.</div>
          </div>
        ) : (
          <>
            <button
              type="button"
              className={`homea__cta essence-press${ctaUnavailable ? ' homea__cta--unavailable' : ''}`}
              onClick={
                isFailed && sub === 'exhausted'
                  ? onContactSupport
                  : ctaUnavailable
                    ? undefined
                    : onPrimary
              }
              aria-disabled={ctaUnavailable || undefined}
              aria-busy={pending || undefined}
            >
              {ctaLabel}
            </button>
            {isFailed && sub === 'exhausted' && (
              // No speed promise: a mailto composed offline sits unsent in the
              // user's own outbox, so this has to survive being read first.
              <p className="homea__cta-note">
                This opens your mail app. We read every one, and we&rsquo;ll write back.
              </p>
            )}
          </>
        )}

        {/* "There's no rush" under a button that cannot be pressed is the wrong
            register, and `failed` carries its own reassurance in the body. */}
        {!isFailed && !offline && (
          <p className="homea__reassurance">
            {isNotStarted
              ? 'Every clip you record is kept. There’s no rush.'
              : 'Every clip you’ve recorded is kept. There’s no rush.'}
          </p>
        )}
      </div>
    </main>
  );
}

export default HomeAScreen;
