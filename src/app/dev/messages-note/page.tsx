'use client';

/**
 * A4 (Personal Note) dev sandbox — permanent per CLAUDE.md.
 *
 * Presets:
 *   d1 Fresh        — empty field, ghost CTA (forward-flow entry)
 *   d2 Reshape      — pre-filled note (A6 "Reshape your note" return)
 *   d3 Near cap     — 184 chars: counter visible + warning color
 *
 * Compose toggles:
 *   Submit fail — the mock /generate resolves not-ok once (honoring
 *   moment returns to input with the note intact), then succeeds.
 *
 * Category chips swap the question copy (all placeholder until the
 *   validation task lands). Mock submit logs + alerts in place of the
 *   /generate round-trip; the honoring moment's min-hold is observable.
 */

import { useCallback, useRef, useState } from 'react';
import { PersonalNoteScreen } from '@/components/screens/messages/PersonalNoteScreen';
import type { MessageCategory } from '@/lib/messageTemplates';

const CATEGORIES: Array<{ key: MessageCategory; label: string }> = [
  { key: 'birthday', label: 'Birthday' },
  { key: 'encouragement', label: 'Encouragement' },
  { key: 'daily_reminder', label: 'Daily Reminder' },
  { key: 'future_message', label: 'A Message for the Future' },
  { key: 'comfort', label: 'Comfort' },
  { key: 'holiday', label: 'Holiday' },
  { key: 'checking_in', label: 'Just Checking In' },
];

const RESHAPE_NOTE = 'Whatever happens Friday, you were braver than you think.';
const NEAR_CAP_NOTE =
  'Remember the summer we drove up the coast with the windows down and you sang every word of every song wrong on purpose just to make me laugh. I think about that day more than you know, kiddo.';

const PRESETS: Record<string, { note: string; hint: string }> = {
  d1: { note: '', hint: 'Empty — ghost CTA. Type to watch it morph.' },
  d2: { note: RESHAPE_NOTE, hint: 'Reshape return — note pre-filled from A6.' },
  d3: { note: NEAR_CAP_NOTE, hint: `Near cap (${NEAR_CAP_NOTE.length} ch) — counter warning.` },
};

const PRESET_LABELS: Record<string, string> = {
  d1: 'd1 · Fresh',
  d2: 'd2 · Reshape',
  d3: 'd3 · Near cap',
};

export default function MessagesNoteDevPage() {
  const [presetKey, setPresetKey] = useState<string>('d1');
  const [category, setCategory] = useState<MessageCategory>('encouragement');
  const [submitFail, setSubmitFail] = useState(false);
  const [runId, setRunId] = useState(0);
  const failRecoveredRef = useRef(false);

  const remount = useCallback(() => {
    failRecoveredRef.current = false;
    setRunId((id) => id + 1);
  }, []);

  const handleSubmit = useCallback(
    async (note: string | null) => {
      // Mock /generate: visible latency so the honoring hold reads true.
      await new Promise((r) => setTimeout(r, 1200));
      if (submitFail && !failRecoveredRef.current) {
        failRecoveredRef.current = true; // next attempt succeeds
        console.log('[dev/messages-note] submit failed (armed)');
        return { ok: false as const };
      }
      console.log('[dev/messages-note] submit', { note });
      alert(
        note === null
          ? 'Mock skip — /generate with the template default, routes to A6 (A5 when built).'
          : 'Mock generate — routes to the new generation’s A6 (A5 when built).',
      );
      return { ok: true as const };
    },
    [submitFail],
  );

  const categoryLabel = CATEGORIES.find((c) => c.key === category)?.label ?? category;

  return (
    <>
      <div style={railStyle}>
        <div style={rowStyle}>
          {Object.keys(PRESETS).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setPresetKey(key);
                remount();
              }}
              style={chip(presetKey === key)}
            >
              {PRESET_LABELS[key]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setSubmitFail((v) => !v);
              remount();
            }}
            style={toggleChip(submitFail)}
          >
            ⚠ Submit fail
          </button>
          <button type="button" onClick={remount} style={chip(false)}>
            ↻ Replay
          </button>
        </div>
        <div style={rowStyle}>
          <span style={rowLabelStyle}>Category</span>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                setCategory(c.key);
                remount();
              }}
              style={chip(category === c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div style={{ opacity: 0.5, fontSize: 11 }}>{PRESETS[presetKey].hint}</div>
      </div>
      <div style={{ paddingTop: 200, maxWidth: 430, margin: '0 auto' }}>
        <PersonalNoteScreen
          key={`${presetKey}-${category}-${runId}`}
          recipientName="Sarah"
          categoryLabel={categoryLabel}
          category={category}
          initialNote={PRESETS[presetKey].note}
          onSubmit={handleSubmit}
          onBack={() => alert('Mock back — exits to A3 (category) / A6 on the reshape path.')}
        />
      </div>
    </>
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

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
  justifyContent: 'center',
  alignItems: 'center',
};

const rowLabelStyle: React.CSSProperties = {
  opacity: 0.4,
  fontSize: 10,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
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
