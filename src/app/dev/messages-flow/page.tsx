'use client';

import { useCallback, useState } from 'react';
import { MessageCreationFlow } from '@/components/screens/messages/MessageCreationFlow';
import type { GenerateRequest } from '@/components/screens/messages/MessageCreationFlow.types';
import type { ExistingRecipient } from '@/components/screens/messages/RecipientSetupScreen.types';

/**
 * MessageCreationFlow (Step 6 orchestrator) dev sandbox — permanent per
 * CLAUDE.md.
 *
 * Exercises the full multi-step orchestrator end-to-end with mock data.
 * The orchestrator owns step transitions; this page just supplies the
 * starting data and the exit callback.
 *
 * Dev-rail at the top lets you toggle the recipient count (which the
 * page would normally derive from a server fetch in /messages/new).
 *
 * onExitFlow: logs + alerts. In production this routes to /home and
 * clears the active flow_id (see MessagesNewPageClient.tsx).
 *
 * Note: trackStep6('flow_started') fires on mount. In dev the request
 * will return 401 since there's no authenticated user — that's
 * expected. Network failure is swallowed by the track() client by
 * design (best-effort), so the screen still functions.
 */

const MOCK_RECIPIENTS: Record<number, ExistingRecipient[]> = {
  0: [],
  1: [
    {
      id: 'r-sarah',
      name: 'Sarah',
      relationship: 'daughter',
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

const COUNTS = [0, 1, 3] as const;

export default function MessagesFlowDevPage() {
  const [count, setCount] = useState<number>(0);
  const [runId, setRunId] = useState(0);
  const [lastGen, setLastGen] = useState<string | null>(null);

  const handleExit = useCallback(() => {
    console.log('[dev/messages-flow] onExitFlow');
    setLastGen('Exited the flow (prod clears flow_id + routes to /home).');
    setRunId((id) => id + 1);
  }, []);

  const handleGenerate = useCallback(async (request: GenerateRequest) => {
    // Mock the A4-submit /generate handoff (the real one — POST /generate
    // + router.push to A5/A6 — lands in the A4→A5 chunk).
    //
    // A4's note path holds the honoring moment until the PARENT navigates
    // away. Production navigates on success; this sandbox can't, so we
    // stand in for that navigation: let the honoring beat play, then
    // remount the flow (back to A2). Without this the honoring dots would
    // hang forever — a dev-only dead end, not a product bug.
    console.log('[dev/messages-flow] onGenerate', request);
    const noteLabel = request.note ? `note "${request.note}"` : 'generic (no note)';
    // Hold past A4's 2.4s honoring min-hold so the moment reads fully.
    await new Promise((r) => setTimeout(r, 2700));
    setLastGen(`${request.category} · ${noteLabel} → looped (prod routes to A5/A6).`);
    setRunId((id) => id + 1);
    return { ok: true as const };
  }, []);

  return (
    <>
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
          flexDirection: 'column',
          gap: 6,
          alignItems: 'center',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 11,
          letterSpacing: '0.04em',
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ opacity: 0.5, marginRight: 4 }}>Recipients:</span>
          {COUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setCount(n);
                setLastGen(null);
                setRunId((id) => id + 1);
              }}
              style={{
                background:
                  count === n
                    ? 'rgba(255,255,255,0.22)'
                    : 'rgba(255,255,255,0.06)',
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
        <span style={{ opacity: 0.5, textAlign: 'center' }}>
          {lastGen
            ? `↻ ${lastGen}`
            : 'A2→A3→A4 spine. A4 submit loops back here (prod routes to A5/A6 — A4→A5 chunk).'}
        </span>
      </div>
      <div style={{ paddingTop: 60 }}>
        <MessageCreationFlow
          key={`${count}-${runId}`}
          existingRecipients={MOCK_RECIPIENTS[count]}
          onExitFlow={handleExit}
          onGenerate={handleGenerate}
        />
      </div>
    </>
  );
}
