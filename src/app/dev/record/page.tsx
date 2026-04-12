'use client';

import { useState } from 'react';
import { RecordScreen } from '@/components/screens/RecordScreen';
import type { RecordScreenData } from '@/components/screens/RecordScreen.types';

/**
 * Voice Training dev sandbox — permanent, no auth required.
 * Path: /dev/record — outside /app/* middleware protection.
 *
 * Adjust the controls to test different personalisation combinations
 * and resume states. The recording pipeline is live (calls real APIs)
 * so you'll need a running dev server, but the voiceProfileId is a
 * mock string so uploads will 404 — this is intentional for UI testing.
 */
export default function RecordDevPage() {
  const [runId, setRunId] = useState(0);
  const [clipsRecorded, setClipsRecorded] = useState(0);
  const [status, setStatus] = useState('collecting');
  const [birthYear, setBirthYear] = useState(1992);
  const [relationship, setRelationship] = useState('daughter');

  const data: RecordScreenData = {
    clipsRecorded,
    voiceProfileStatus: status,
    displayName: 'Sarah',
    city: 'Miami',
    birthYear,
    relationship,
    voiceProfileId: 'dev-mock-00000000',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Tunable controls */}
      <div
        style={{
          padding: 12,
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          fontSize: 13,
          background: 'var(--color-surface-card)',
          flexShrink: 0,
        }}
      >
        <label>
          Clips:{' '}
          <input
            type="number"
            value={clipsRecorded}
            onChange={(e) => setClipsRecorded(Number(e.target.value))}
            min={0}
            max={25}
            style={{ width: 50 }}
          />
        </label>
        <label>
          Status:{' '}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="created">created</option>
            <option value="collecting">collecting</option>
            <option value="processing">processing</option>
            <option value="ready">ready</option>
          </select>
        </label>
        <label>
          Birth year:{' '}
          <input
            type="number"
            value={birthYear}
            onChange={(e) => setBirthYear(Number(e.target.value))}
            min={1920}
            max={2010}
            style={{ width: 60 }}
          />
        </label>
        <label>
          Relationship:{' '}
          <select value={relationship} onChange={(e) => setRelationship(e.target.value)}>
            <option value="daughter">daughter</option>
            <option value="son">son</option>
            <option value="spouse">spouse</option>
            <option value="grandchild">grandchild</option>
            <option value="friend">friend</option>
            <option value="parent">parent</option>
          </select>
        </label>
        <button
          onClick={() => setRunId((id) => id + 1)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-primary)',
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
      </div>

      {/* RecordScreen */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <RecordScreen key={runId} data={data} />
      </div>
    </div>
  );
}
