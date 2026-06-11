'use client';

/**
 * A6 (Preview & Refine, Deferred-Audio) dev sandbox — permanent per CLAUDE.md.
 *
 * Mirrors the prototype dev rail (essence-step6-a6-deferred.html): six state
 * presets across the top, compose toggles below. The screen owns its own view
 * state once mounted; these presets seed the INITIAL props, and the mock async
 * handlers stand in for the backend so every interaction runs without a server:
 *
 *   d1 First listen   — committed, full budget, arrival line, hint visible
 *   d2 Candidate      — opens on an un-heard draft (rec 3 / rerolls 9)
 *   d3 After commit   — committed, one recording spent (rec 2)
 *   d4 Recording cap  — committed, all recordings spent (rec 0)
 *   d5 Commit failure — candidate + "commit fail" armed; tap commit to see §5.6
 *   d6 Discard sheet  — committed; tap Discard to raise the sheet
 *
 * Compose toggles (orthogonal, re-applied on remount):
 *   Reshape exhausted · Audio fail · Commit fail · Max text (200)
 *
 * Mock handlers fail-once-then-succeed for the two failure paths, matching the
 * prototype's recovery semantics.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { PreviewRefineScreen } from '@/components/screens/messages/PreviewRefineScreen';
import type {
  CommitResult,
  FreeDraftResult,
  PlaybackResult,
} from '@/components/screens/messages/PreviewRefineScreen.types';

const COMMITTED_TEXT =
  "Sarah, it's me. Whatever you're weighing right now, you don't have to have it all figured out today. I keep thinking about the way you talk things through until they make sense, and they always do. Take your time, and trust yourself. I'm proud of you.";

const MAX_TEXT_200 =
  "Sarah, it's me. I wanted you to hear this in my own voice. Whatever you're deciding now, you don't have to have it all figured out today. You think things through, and you always land somewhere true.";

const VARIANTS = [
  "Sarah, good morning. I know there's a big decision sitting on your shoulders, so breathe for a second. You work things over out loud the way you always have, turning them until they come clear, and they do come clear. The answer is already yours. I just wanted to remind you.",
  "Hi Sarah. No speech, just a small thing from me. You don't have to choose perfectly, you just have to choose like yourself. I've watched you puzzle things out a hundred times, and you always land somewhere true. Whatever you pick, I'm with you on it.",
  "Sarah, it's me again. I know the waiting and the weighing is the hard part. Remember you think best when you stop bracing for it. You'll talk it through, you'll hear yourself, and you'll know. Go easy. You've got more of the answer than you feel like you do.",
  'Sarah, one small thing before your day gets loud. Decisions like this one don’t need to be wrestled, they need to be walked with. You’ve always known how to do that. Take it on your morning walk and let it answer you back.',
  "Hey Sarah. I'm not going to tell you which way to go, you'd see through that anyway. I'll just say what I've always known: when you trust the quiet part of yourself, you choose well. You always have.",
];

interface Preset {
  rec: number;
  rr: number;
  candidate: boolean;
  firstArrival: boolean;
  /** Auto-arm a compose toggle for this state. */
  arm?: 'commitfail';
  hint: string;
}

const PRESETS: Record<string, Preset> = {
  d1: { rec: 3, rr: 10, candidate: false, firstArrival: true, hint: 'Tap to hear it; then Make a change.' },
  d2: { rec: 3, rr: 9, candidate: true, firstArrival: false, hint: 'Commit, see another, or back out.' },
  d3: { rec: 2, rr: 9, candidate: false, firstArrival: false, hint: 'One recording spent.' },
  d4: { rec: 0, rr: 6, candidate: false, firstArrival: false, hint: 'Recordings spent — commit retired.' },
  d5: { rec: 2, rr: 8, candidate: true, firstArrival: false, arm: 'commitfail', hint: 'Tap commit to see the failure → retry.' },
  d6: { rec: 3, rr: 10, candidate: false, firstArrival: false, hint: 'Tap Discard to raise the sheet.' },
};

const STATE_KEYS = Object.keys(PRESETS) as Array<keyof typeof PRESETS>;
const STATE_LABELS: Record<string, string> = {
  d1: 'd1 · First listen',
  d2: 'd2 · Candidate',
  d3: 'd3 · After commit',
  d4: 'd4 · Recording cap',
  d5: 'd5 · Commit failure',
  d6: 'd6 · Discard sheet',
};

export default function MessagesPreviewDevPage() {
  const [stateKey, setStateKey] = useState<string>('d1');
  const [runId, setRunId] = useState(0);
  const [reshapeExhausted, setReshapeExhausted] = useState(false);
  const [audioFail, setAudioFail] = useState(false);
  const [commitFail, setCommitFail] = useState(false);
  const [maxText, setMaxText] = useState(false);

  const preset = PRESETS[stateKey];

  // Mutable mock backend counters/recovery — reset whenever we remount.
  const recRef = useRef(preset.rec);
  const rerollRef = useRef(preset.rr);
  const variantRef = useRef(0);
  const audioRecoveredRef = useRef(false);
  const commitRecoveredRef = useRef(false);

  const remount = useCallback(
    (next?: Partial<{ stateKey: string }>) => {
      const key = next?.stateKey ?? stateKey;
      const p = PRESETS[key];
      recRef.current = p.rec;
      rerollRef.current = p.rr;
      variantRef.current = 0;
      audioRecoveredRef.current = false;
      commitRecoveredRef.current = false;
      setRunId((id) => id + 1);
    },
    [stateKey],
  );

  const pickState = useCallback(
    (key: string) => {
      setStateKey(key);
      // Auto-arm the commit-fail toggle for d5 so the failure path is one tap away.
      setCommitFail(PRESETS[key].arm === 'commitfail');
      remount({ stateKey: key });
    },
    [remount],
  );

  const draftText = useCallback(
    () => (maxText ? MAX_TEXT_200 : VARIANTS[variantRef.current % VARIANTS.length]),
    [maxText],
  );

  // ─── Mock handlers ───
  const onFreeDraft = useCallback(async (): Promise<FreeDraftResult> => {
    await delay(900);
    if (rerollRef.current <= 0) return { ok: false, retryable: false };
    rerollRef.current -= 1;
    variantRef.current += 1;
    return { ok: true, candidateText: draftText(), rerollsRemaining: rerollRef.current };
  }, [draftText]);

  const onCommit = useCallback(async (): Promise<CommitResult> => {
    await delay(1700);
    if (commitFail && !commitRecoveredRef.current) {
      commitRecoveredRef.current = true; // next attempt succeeds
      return { ok: false, retryable: true };
    }
    recRef.current = Math.max(0, recRef.current - 1);
    return { ok: true, recordingsRemaining: recRef.current, durationSec: 31 };
  }, [commitFail]);

  const onRequestPlayback = useCallback(async (): Promise<PlaybackResult> => {
    await delay(120);
    if (audioFail && !audioRecoveredRef.current) {
      audioRecoveredRef.current = true; // retry succeeds
      return { ok: false };
    }
    // Empty URL: the visual scrubber animates without real audio in the sandbox.
    return { ok: true, url: '' };
  }, [audioFail]);

  const handlers = useMemo(
    () => ({
      onFreeDraft,
      onCommit,
      onRequestPlayback,
      onKeepCurrent: async () => {
        await delay(150);
      },
      onSave: async () => {
        await delay(400);
        console.log('[dev/messages-preview] save');
        alert('Mock save — in production this routes to A7 (saved).');
        return { ok: true as const, messageId: 'mock-message-id' };
      },
      onDiscard: async () => {
        await delay(150);
        console.log('[dev/messages-preview] discard');
      },
      onReshape: () => alert('Mock reshape — routes to A4; returns as a candidate.'),
      onBack: () => alert('Mock back — exits to A4.'),
      onSaved: (id: string) => console.log('[dev/messages-preview] onSaved', id),
      onDiscarded: () => alert('Mock discarded — routes Home.'),
      onPlayHintLearned: () => console.log('[dev/messages-preview] hint learned'),
    }),
    [onFreeDraft, onCommit, onRequestPlayback],
  );

  return (
    <>
      <DevRail
        stateKey={stateKey}
        onPickState={pickState}
        reshapeExhausted={reshapeExhausted}
        audioFail={audioFail}
        commitFail={commitFail}
        maxText={maxText}
        onToggle={{
          reshape: () => {
            setReshapeExhausted((v) => !v);
            remount();
          },
          audio: () => {
            setAudioFail((v) => !v);
            remount();
          },
          commit: () => {
            setCommitFail((v) => !v);
            remount();
          },
          maxtext: () => {
            setMaxText((v) => !v);
            remount();
          },
        }}
        onReplay={() => remount()}
        hint={preset.hint}
      />
      <div style={{ paddingTop: 132, maxWidth: 430, margin: '0 auto' }}>
        <PreviewRefineScreen
          key={`${stateKey}-${runId}`}
          committed={{ text: maxText ? MAX_TEXT_200 : COMMITTED_TEXT, durationSec: 28 }}
          initialCandidateText={preset.candidate ? (maxText ? MAX_TEXT_200 : VARIANTS[0]) : null}
          recordingsRemaining={preset.rec}
          rerollsRemaining={preset.rr}
          reshapeExhausted={reshapeExhausted}
          playHintLearned={false}
          isFirstArrival={preset.firstArrival}
          {...handlers}
        />
      </div>
    </>
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function DevRail({
  stateKey,
  onPickState,
  reshapeExhausted,
  audioFail,
  commitFail,
  maxText,
  onToggle,
  onReplay,
  hint,
}: {
  stateKey: string;
  onPickState: (key: string) => void;
  reshapeExhausted: boolean;
  audioFail: boolean;
  commitFail: boolean;
  maxText: boolean;
  onToggle: {
    reshape: () => void;
    audio: () => void;
    commit: () => void;
    maxtext: () => void;
  };
  onReplay: () => void;
  hint: string;
}) {
  return (
    <div style={railStyle}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {STATE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onPickState(key)}
            style={chip(stateKey === key)}
          >
            {STATE_LABELS[key]}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
        <span style={{ opacity: 0.4, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          Compose
        </span>
        <button type="button" onClick={onToggle.reshape} style={toggleChip(reshapeExhausted)}>
          ⊘ Reshape exhausted
        </button>
        <button type="button" onClick={onToggle.audio} style={toggleChip(audioFail)}>
          ⚠ Audio fail
        </button>
        <button type="button" onClick={onToggle.commit} style={toggleChip(commitFail)}>
          ⚠ Commit fail
        </button>
        <button type="button" onClick={onToggle.maxtext} style={toggleChip(maxText)}>
          Aa Max text
        </button>
        <button type="button" onClick={onReplay} style={chip(false)}>
          ↻ Replay
        </button>
      </div>
      <div style={{ opacity: 0.5, fontSize: 11 }}>{hint}</div>
    </div>
  );
}

const railStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 9999,
  background: 'rgba(28,26,24,0.9)',
  color: '#fff',
  padding: '8px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  alignItems: 'center',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 11,
  letterSpacing: '0.04em',
};

function chip(active: boolean): React.CSSProperties {
  return {
    background: active ? '#7A8088' : 'rgba(255,255,255,0.06)',
    color: active ? '#fff' : 'rgba(255,255,255,0.65)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: '5px 11px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 11,
    letterSpacing: '0.04em',
  };
}

function toggleChip(on: boolean): React.CSSProperties {
  return {
    ...chip(false),
    background: on ? '#8A5A1E' : 'rgba(255,255,255,0.06)',
    color: on ? '#fff' : 'rgba(255,255,255,0.6)',
    borderColor: on ? '#8A5A1E' : 'rgba(255,255,255,0.1)',
  };
}
