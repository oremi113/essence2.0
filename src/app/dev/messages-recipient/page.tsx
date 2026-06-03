'use client';

import { useCallback, useState } from 'react';
import { RecipientSetupScreen } from '@/components/screens/messages/RecipientSetupScreen';
import type {
  ExistingRecipient,
  RecipientSelection,
} from '@/components/screens/messages/RecipientSetupScreen.types';

/**
 * A2 (Recipient Setup) dev sandbox — permanent per CLAUDE.md.
 *
 * Lets you exercise all three variations and the validation states
 * without touching the database. Dev-rail at the top toggles how many
 * mock recipients are supplied; the screen derives its mode from that.
 *
 * Mocks:
 *   - 0 recipients → A2.a (first-ever, pure form)
 *   - 1+ recipients → A2.b (returning, list visible)
 *   - "Add new" inside A2.b → A2.c (form revealed)
 *
 * The duplicate-name disambiguator is demonstrated at count=3 (two
 * Sarah / daughter cards with last-message-category sub-text).
 *
 * onSubmit: logs the selection + alerts so you can verify the payload
 * shape, then bumps a re-mount key so the form resets.
 */

const MOCK_RECIPIENTS_BY_COUNT: Record<number, ExistingRecipient[]> = {
  0: [],
  1: [
    {
      id: 'r-sarah-1',
      name: 'Sarah',
      relationship: 'daughter',
      lastMessageCategory: null,
    },
  ],
  2: [
    {
      id: 'r-sarah-1',
      name: 'Sarah',
      relationship: 'daughter',
      lastMessageCategory: null,
    },
    {
      id: 'r-mateo',
      name: 'Mateo',
      relationship: 'son',
      lastMessageCategory: null,
    },
  ],
  3: [
    {
      id: 'r-sarah-1',
      name: 'Sarah',
      relationship: 'daughter',
      lastMessageCategory: 'birthday',
    },
    {
      id: 'r-sarah-2',
      name: 'Sarah',
      relationship: 'daughter',
      lastMessageCategory: 'encouragement',
    },
    {
      id: 'r-mateo',
      name: 'Mateo',
      relationship: 'son',
      lastMessageCategory: null,
    },
  ],
};

const COUNTS = [0, 1, 2, 3] as const;

export default function MessagesRecipientDevPage() {
  const [count, setCount] = useState<number>(0);
  const [runId, setRunId] = useState(0);

  const handleSubmit = useCallback((selection: RecipientSelection) => {
    console.log('[dev/messages-recipient] onSubmit:', selection);
    alert(
      [
        'Mock submit.',
        '',
        JSON.stringify(selection, null, 2),
        '',
        'In production this advances the orchestrator to the category step.',
        'Resetting the screen.',
      ].join('\n')
    );
    setRunId((id) => id + 1);
  }, []);

  const handleBack = useCallback(() => {
    console.log('[dev/messages-recipient] onBack');
    alert('Mock back — in production this exits the flow to /home.');
  }, []);

  return (
    <>
      <DevRail count={count} onPick={(n) => { setCount(n); setRunId((id) => id + 1); }} />
      <div style={{ paddingTop: 36 }}>
        <RecipientSetupScreen
          key={`${count}-${runId}`}
          existingRecipients={MOCK_RECIPIENTS_BY_COUNT[count]}
          onSubmit={handleSubmit}
          onBack={handleBack}
        />
      </div>
    </>
  );
}

function DevRail({
  count,
  onPick,
}: {
  count: number;
  onPick: (n: number) => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(28,26,24,0.88)',
        color: '#fff',
        padding: '6px 12px',
        display: 'flex',
        gap: 8,
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 11,
        letterSpacing: '0.04em',
      }}
    >
      <span style={{ opacity: 0.5, marginRight: 4 }}>Recipients:</span>
      {COUNTS.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPick(n)}
          style={{
            background:
              count === n ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.06)',
            color: count === n ? '#fff' : 'rgba(255,255,255,0.65)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 14,
            padding: '4px 10px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 'inherit',
          }}
        >
          {n} {n === 1 ? 'recipient' : 'recipients'}
        </button>
      ))}
    </div>
  );
}
