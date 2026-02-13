"use client";

/**
 * 3-step pipeline: init-upload (server) -> direct PUT to signed URL (client) -> commit (server).
 * State: idle | recording | uploading | committing | ready | error
 */
import { useState, useRef, useCallback } from "react";

type Status = "idle" | "recording" | "uploading" | "committing" | "ready" | "error";

const MIME = "audio/webm;codecs=opus";

function getPreferredMime(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  const options = [MIME, "audio/webm"];
  for (const m of options) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "audio/webm";
}

export function RecordingUpload({
  voiceProfileId,
  promptIndex,
  onReady,
}: {
  voiceProfileId: string;
  promptIndex: number;
  onReady?: (clipId: string) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [clipId, setClipId] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackUnavailable, setPlaybackUnavailable] = useState(false);
  const playbackRetriedRef = useRef(false);
  const chunksRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = getPreferredMime();
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(100);
      setStatus("recording");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start microphone");
      setStatus("error");
    }
  }, []);

  const stopAndUpload = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || status !== "recording") return;

    recorder.stop();
    setStatus("uploading");

    const mime = getPreferredMime();
    const blob = new Blob(chunksRef.current, { type: mime });
    chunksRef.current = [];

    try {
      // 1) Init: get signed URL and DB row id
      const initRes = await fetch("/api/audio/init-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "training_clip",
          voiceProfileId,
          promptId: promptIndex,
          mime,
        }),
      });
      if (!initRes.ok) {
        const data = await initRes.json().catch(() => ({}));
        const msg = data.detail ? `${data.error}: ${data.detail}` : (data.error || "Init upload failed");
        throw new Error(msg);
      }
      const init = await initRes.json();
      const { id, signedUploadUrl, uploadToken, requiredHeaders } = init;

      // 2) Direct upload: PUT to signed URL (or use SDK uploadToSignedUrl)
      const putRes = await fetch(signedUploadUrl, {
        method: "PUT",
        headers: { "Content-Type": requiredHeaders["Content-Type"] ?? mime },
        body: blob,
      });
      if (!putRes.ok) {
        throw new Error("Upload failed");
      }

      setStatus("committing");

      // 3) Commit: server verifies object and flips row to ready
      const commitRes = await fetch("/api/audio/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "training_clip", id }),
      });
      if (!commitRes.ok) {
        const data = await commitRes.json().catch(() => ({}));
        const msg = data.detail ? `${data.error}: ${data.detail}` : (data.error || "Commit failed");
        throw new Error(msg);
      }

      setClipId(id);
      setStatus("ready");
      onReady?.(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStatus("error");
    }
  }, [status, voiceProfileId, promptIndex, onReady]);

  const loadPlaybackUrl = useCallback(async () => {
    if (!clipId) return;
    setPlaybackUnavailable(false);
    const res = await fetch("/api/audio/playback-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "training_clip", id: clipId }),
    });
    if (!res.ok) {
      setError("Playback URL failed");
      return;
    }
    const data = await res.json();
    playbackRetriedRef.current = false; // allow one retry if this URL fails (e.g. expired)
    setPlaybackUrl(data.url);
  }, [clipId]);

  const handleAudioError = useCallback(() => {
    if (!playbackRetriedRef.current) {
      playbackRetriedRef.current = true;
      setPlaybackUrl(null);
      loadPlaybackUrl();
    } else {
      setPlaybackUnavailable(true);
      setPlaybackUrl(null);
    }
  }, [loadPlaybackUrl]);

  return (
    <div style={{ marginTop: 16 }}>
      <p>
        <strong>Status:</strong> {status}
        {error && <span style={{ color: "red", marginLeft: 8 }}>{error}</span>}
      </p>
      {status === "idle" && (
        <button type="button" onClick={startRecording}>
          Start recording
        </button>
      )}
      {status === "recording" && (
        <button type="button" onClick={stopAndUpload}>
          Stop and upload
        </button>
      )}
      {(status === "uploading" || status === "committing") && <p>Please wait…</p>}
      {status === "ready" && (
        <div>
          <p>Saved.</p>
          <button type="button" onClick={loadPlaybackUrl}>
            Get playback URL
          </button>
          {playbackUnavailable && <p>Audio unavailable.</p>}
          {playbackUrl && !playbackUnavailable && (
            <audio
              controls
              src={playbackUrl}
              onError={handleAudioError}
              style={{ display: "block", marginTop: 8 }}
            />
          )}
        </div>
      )}
      {status === "error" && (
        <button type="button" onClick={() => { setStatus("idle"); setError(null); }}>
          Retry
        </button>
      )}
    </div>
  );
}
