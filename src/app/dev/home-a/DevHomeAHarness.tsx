'use client';

/**
 * /dev/home-a — the review surface for the Home A retrofit.
 *
 * Permanent scaffolding per CLAUDE.md. It has to cover every state the screen
 * can reach, because the states that go wrong are the ones nobody can see:
 * three failed sub-states, three past-due variants, offline, pending, reduced
 * motion, and 130% text.
 *
 * Controls are grouped rather than a flat row of pills — there are enough of
 * them now that a flat row stopped being readable.
 */
import { useState } from 'react';
import type {
  HomeARegister,
  HomeAFailedSubState,
  HomeAPastDueVariant,
} from '@/components/screens/home/HomeAScreen.types';
import { TOTAL_PROMPT_COUNT } from '@/lib/voice-training/script';

const CLIP_STOPS = [0, 1, 5, 12, 17, 24];

const frame: React.CSSProperties = {
  width: 390, height: 844, overflow: 'hidden',
  borderRadius: 40, boxShadow: '0 24px 56px rgba(0,0,0,.45), 0 0 0 6px #14110F',
};

const bar: React.CSSProperties = {
  display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
  padding: '8px 16px', fontSize: 13,
};
const lab: React.CSSProperties = { minWidth: 120, opacity: 0.6 };

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 34, padding: '0 12px', borderRadius: 18, cursor: 'pointer',
        border: '1px solid rgba(0,0,0,.15)',
        background: on ? '#1C1A18' : 'transparent',
        color: on ? '#fff' : 'inherit',
        fontSize: 13, fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

export function DevHomeAHarness() {
  const [register, setRegister] = useState<HomeARegister>('paused');
  const [clips, setClips] = useState(12);
  const [failedSub, setFailedSub] = useState<HomeAFailedSubState>('retryable');
  const [waitLong, setWaitLong] = useState(false);
  const [pastDue, setPastDue] = useState<HomeAPastDueVariant>(null);
  const [offline, setOffline] = useState(false);
  const [pending, setPending] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [run, setRun] = useState(0);

  const isFailed = register === 'failed';
  // `failed` always means 25 clips: creation needs payment and a full script,
  // so it is never a recording failure. An earlier harness modelled it at 0.
  const effectiveClips = isFailed ? TOTAL_PROMPT_COUNT : clips;

  // Far enough out that the screen's own timer won't fire mid-review, but the
  // copy still branches on which window it is.

  const key = [run, register, effectiveClips, failedSub, waitLong, pastDue, offline, pending, reducedMotion].join('-');
  const params = new URLSearchParams({
    register,
    clips: String(effectiveClips),
    sub: failedSub,
    waitLong: waitLong ? '1' : '0',
    pastDue: String(pastDue ?? 0),
    offline: offline ? '1' : '0',
    pending: pending ? '1' : '0',
    rm: reducedMotion ? '1' : '0',
    run: String(run),
  }).toString();

  return (
    <div style={{ fontFamily: 'system-ui', padding: 16 }}>
      <div style={bar}>
        <span style={lab}>Register</span>
        {(['not-started', 'paused', 'failed'] as const).map((r) => (
          <Pill key={r} on={register === r} onClick={() => setRegister(r)}>{r}</Pill>
        ))}
      </div>

      {register === 'paused' && (
        <div style={bar}>
          <span style={lab}>Clips</span>
          {CLIP_STOPS.filter((c) => c > 0).map((c) => (
            <Pill key={c} on={clips === c} onClick={() => setClips(c)}>{c}</Pill>
          ))}
        </div>
      )}

      {isFailed && (
        <div style={bar}>
          <span style={lab}>Failed sub-state</span>
          <Pill on={failedSub === 'retryable'} onClick={() => setFailedSub('retryable')}>1 · retry available</Pill>
          <Pill on={failedSub === 'waiting' && !waitLong} onClick={() => { setFailedSub('waiting'); setWaitLong(false); }}>2 · waiting, 5 min</Pill>
          <Pill on={failedSub === 'waiting' && waitLong} onClick={() => { setFailedSub('waiting'); setWaitLong(true); }}>2 · waiting, 30 min</Pill>
          <Pill on={failedSub === 'exhausted'} onClick={() => setFailedSub('exhausted')}>3 · exhausted</Pill>
        </div>
      )}

      <div style={bar}>
        <span style={lab}>Banner slot</span>
        <Pill on={!pastDue && !offline} onClick={() => { setPastDue(null); setOffline(false); }}>none</Pill>
        {([1, 2, 3] as const).map((v) => (
          <Pill key={v} on={pastDue === v && !offline} onClick={() => { setPastDue(v); setOffline(false); }}>past-due {v}</Pill>
        ))}
        <Pill on={offline} onClick={() => setOffline(true)}>offline</Pill>
        <Pill on={offline && pastDue != null} onClick={() => { setOffline(true); setPastDue(3); }}>
          offline + past-due (suppression)
        </Pill>
      </div>

      <div style={bar}>
        <span style={lab}>Conditions</span>
        <Pill on={pending} onClick={() => setPending((p) => !p)}>CTA pending</Pill>
        <Pill on={reducedMotion} onClick={() => setReducedMotion((v) => !v)}>reduced motion</Pill>
        <button type="button" onClick={() => setRun((r) => r + 1)} style={{ minHeight: 34, padding: '0 12px' }}>
          replay arrival
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        {/* An IFRAME, not a div. A 390px div is not a viewport: media queries
            and dvh resolve against the browser window, so at a desktop width
            this frame was rendering `@media (min-width:768px)` layouts inside
            a phone-shaped box. The past-due banner showed its row variant with
            a 181px text column, which read as a typesetting failure and was
            really a harness failure. An iframe gives a true 390x844 viewport. */}
        <iframe
          key={key}
          title="Home A"
          src={`/dev/home-a/frame?${params}`}
          style={{ ...frame, border: 'none' }}
        />
      </div>

      <p style={{ textAlign: 'center', fontSize: 13, opacity: 0.6, maxWidth: 560, margin: '0 auto' }}>
        {offline && pastDue != null
          ? 'Offline suppresses past-due: "Update card" opens a Stripe portal session, which cannot resolve offline.'
          : isFailed && failedSub === 'waiting'
            ? 'No primary, deliberately: /start answers 429 inside the backoff window. What pins is when to come back.'
            : 'Banner copy mirrors VaultPastDueBanner. Stone is the canvas BreathStone at idle — FOLLOW_UPS #35 owns its warmth.'}
      </p>
    </div>
  );
}
