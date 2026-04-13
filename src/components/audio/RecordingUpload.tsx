"use client";

/**
 * 3-step pipeline: init-upload (server) -> direct PUT to signed URL (client) -> commit (server).
 * State: idle | recording | uploading | committing | ready | error | permission_denied
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { TIMING } from "@/lib/config/timing";

export type Status =
  | "idle"
  | "recording"
  | "uploading"
  | "committing"
  | "ready"
  | "error"
  | "permission_denied";

type ClipRow = {
  id: string;
  prompt_index: number;
  status: string;
  bytes: number | null;
  created_at: string;
};

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
  resolvedVariantKeys,
  onReady,
  onStatusChange,
}: {
  voiceProfileId: string;
  promptIndex: number;
  /** Optional resolved variant keys for server-side debugging storage. */
  resolvedVariantKeys?: Record<string, string | undefined>;
  onReady?: (clipId: string) => void;
  /** Optional callback fired whenever the internal status changes. */
  onStatusChange?: (status: Status) => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [clipId, setClipId] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [playbackUnavailable, setPlaybackUnavailable] = useState(false);
  const playbackRetriedRef = useRef(false);
  const chunksRef = useRef<Blob[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const [clips, setClips] = useState<ClipRow[]>([]);
  const [clipsLoading, setClipsLoading] = useState(false);
  const [clipsError, setClipsError] = useState<string | null>(null);
  const [unavailableClipIds, setUnavailableClipIds] = useState<Set<string>>(new Set());
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const playingClipIdRef = useRef<string | null>(null);
  const playbackRetryUsedRef = useRef(false);

  // Notify parent of status changes
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  // Reset recording state when promptIndex changes (auto-advance)
  const prevPromptRef = useRef(promptIndex);
  if (prevPromptRef.current !== promptIndex) {
    prevPromptRef.current = promptIndex;
    if (status === "ready" || status === "error") {
      setStatus("idle");
      setClipId(null);
      setPlaybackUrl(null);
      setPlaybackUnavailable(false);
      setError(null);
      setRecordingSeconds(0);
      playbackRetriedRef.current = false;
    }
  }

  useEffect(() => {
    if (!voiceProfileId) {
      setClips([]);
      setClipsLoading(false);
      setClipsError(null);
      return;
    }
    let cancelled = false;
    setClipsLoading(true);
    setClipsError(null);
    fetch(`/api/training-clips/list?voiceProfileId=${encodeURIComponent(voiceProfileId)}`)
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.error ?? "List failed")));
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setClips(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setClipsError(err instanceof Error ? err.message : "Failed to load clips");
          setClips([]);
        }
      })
      .finally(() => {
        if (!cancelled) setClipsLoading(false);
      });
    return () => { cancelled = true; };
  }, [voiceProfileId]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(TIMING.MEDIA_RECORDER_TIMESLICE_MS);
      setStatus("recording");
      setRecordingSeconds(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, TIMING.RECORDING_TIMER_TICK_MS);
    } catch (err) {
      const isPermissionDenied =
        err instanceof Error &&
        (err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError" ||
          /permission|denied|blocked/i.test(err.message));
      if (isPermissionDenied) {
        setError("Microphone access was blocked.");
        setStatus("permission_denied");
      } else {
        setError(err instanceof Error ? err.message : "Failed to start microphone");
        setStatus("error");
      }
    }
  }, []);

  const stopAndUpload = useCallback(async () => {
    const recorder = recorderRef.current;
    if (!recorder || status !== "recording") return;

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
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
          ...(resolvedVariantKeys ? { resolvedVariantKeys } : {}),
        }),
      });
      if (!initRes.ok) {
        const data = await initRes.json().catch(() => ({}));
        const msg = data.detail ? `${data.error}: ${data.detail}` : (data.error || "Init upload failed");
        throw new Error(msg);
      }
      const init = await initRes.json();
      const { id, signedUploadUrl, requiredHeaders } = init;

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
      // Refetch recent clips so the new clip appears in the list
      fetch(`/api/training-clips/list?voiceProfileId=${encodeURIComponent(voiceProfileId)}`)
        .then((res) => res.ok ? res.json() : [])
        .then((data) => setClips(Array.isArray(data) ? data : []))
        .catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStatus("error");
    }
  }, [status, voiceProfileId, promptIndex, resolvedVariantKeys, onReady]);

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

  const resetToRecordAgain = useCallback(() => {
    setStatus("idle");
    setClipId(null);
    setPlaybackUrl(null);
    setPlaybackUnavailable(false);
    setError(null);
    setRecordingSeconds(0);
    playbackRetriedRef.current = false;
  }, []);

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

  const playClip = useCallback(async (clipId: string) => {
    setUnavailableClipIds((prev) => {
      const next = new Set(prev);
      next.delete(clipId);
      return next;
    });
    playingClipIdRef.current = clipId;
    playbackRetryUsedRef.current = false;
    const audio = playbackAudioRef.current;
    if (!audio) return;

    const doPlay = async () => {
      const res = await fetch("/api/audio/playback-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "training_clip", id: clipId }),
      });
      if (!res.ok) {
        setUnavailableClipIds((prev) => new Set(prev).add(clipId));
        return;
      }
      const data = await res.json();
      const url = data?.url;
      if (!url) return;
      audio.src = url;
      audio.play().catch(() => {
        if (playbackRetryUsedRef.current) {
          setUnavailableClipIds((prev) => new Set(prev).add(clipId));
        } else {
          playbackRetryUsedRef.current = true;
          doPlay();
        }
      });
    };

    audio.onerror = () => {
      if (!playbackRetryUsedRef.current) {
        playbackRetryUsedRef.current = true;
        doPlay();
      } else if (playingClipIdRef.current) {
        setUnavailableClipIds((prev) => new Set(prev).add(playingClipIdRef.current!));
      }
    };
    await doPlay();
  }, []);

  return (
    <div style={{ marginTop: 16 }}>
      <audio ref={playbackAudioRef} style={{ display: "none" }} />
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
        <p style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span aria-live="polite">{recordingSeconds}s</span>
          <button type="button" onClick={stopAndUpload}>
            Stop and upload
          </button>
        </p>
      )}
      {(status === "uploading" || status === "committing") && (
        <p aria-busy="true" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-block", width: 18, height: 18, border: "2px solid #333", borderTopColor: "transparent", borderRadius: "50%", animation: "recording-spin 0.8s linear infinite" }} />
          Please wait…
        </p>
      )}
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
          <p style={{ marginTop: 12 }}>
            <button type="button" onClick={resetToRecordAgain}>
              Record again
            </button>
          </p>
        </div>
      )}
      {status === "error" && (
        <button type="button" onClick={() => { setStatus("idle"); setError(null); }}>
          Retry
        </button>
      )}
      {status === "permission_denied" && (
        <div>
          <p style={{ color: "var(--color-error, #c00)" }}>{error ?? "Microphone access was blocked."}</p>
          <p>Enable the microphone in your browser settings (e.g. address bar or site settings), then click Retry.</p>
          <button type="button" onClick={() => { setStatus("idle"); setError(null); }}>
            Retry
          </button>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: "@keyframes recording-spin { to { transform: rotate(360deg); } }" }} />
      {voiceProfileId && (
        <div style={{ marginTop: 24 }}>
          <strong>Recent clips</strong>
          {clipsLoading && <p style={{ marginTop: 8 }}>Loading…</p>}
          {clipsError && <p style={{ marginTop: 8, color: "red" }}>{clipsError}</p>}
          {!clipsLoading && !clipsError && clips.length === 0 && (
            <p style={{ marginTop: 8 }}>No clips yet.</p>
          )}
          {!clipsLoading && clips.length > 0 && (
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              {clips.map((clip) => (
                <li key={clip.id} style={{ marginBottom: 8 }}>
                  prompt_index {clip.prompt_index} · {new Date(clip.created_at).toLocaleString()} · {clip.status}
                  {clip.bytes != null && ` · ${clip.bytes} bytes`}
                  {" "}
                  <button
                    type="button"
                    onClick={() => playClip(clip.id)}
                    disabled={unavailableClipIds.has(clip.id)}
                  >
                    Play
                  </button>
                  {unavailableClipIds.has(clip.id) && " Audio unavailable"}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
