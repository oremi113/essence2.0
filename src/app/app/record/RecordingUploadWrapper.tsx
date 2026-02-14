"use client";

import { useState } from "react";
import Link from "next/link";
import { RecordingUpload } from "@/components/audio/RecordingUpload";

export function RecordingUploadWrapper({
  voiceProfiles,
}: {
  voiceProfiles: { id: string }[];
}) {
  const [voiceProfileId, setVoiceProfileId] = useState("");
  const [promptIndex, setPromptIndex] = useState(1);

  return (
    <div style={{ marginTop: 16 }}>
      <label style={{ display: "block", marginBottom: 8 }}>
        Voice profile
        <select
          value={voiceProfileId}
          onChange={(e) => setVoiceProfileId(e.target.value)}
          style={{ marginLeft: 8 }}
        >
          <option value="">Select…</option>
          {voiceProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.id.slice(0, 8)}…
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "block", marginBottom: 8 }}>
        Prompt index
        <input
          type="number"
          min={1}
          value={promptIndex}
          onChange={(e) => setPromptIndex(Number(e.target.value) || 1)}
          style={{ marginLeft: 8, width: 60 }}
        />
      </label>
      {voiceProfileId ? (
        <>
          <RecordingUpload
            voiceProfileId={voiceProfileId}
            promptIndex={promptIndex}
          />
          <p style={{ marginTop: 16 }}>
            <Link href={`/app/voice/create?voiceProfileId=${encodeURIComponent(voiceProfileId)}`}>
              Create voice from clips
            </Link>
          </p>
        </>
      ) : (
        <p>Select a voice profile to record.</p>
      )}
    </div>
  );
}
