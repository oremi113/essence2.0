"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 90_000; // show "taking longer" after this
const POLL_GIVE_UP_MS = 4 * 60 * 1000; // after this, show "timed out" and offer Retry

type ViewState = "starting" | "processing" | "taking_longer" | "success" | "failure";

type StatusResponse = {
  status: string;
  last_error_code?: string;
  last_error_message?: string;
  retry_available?: boolean;
};

export function VoiceCreationView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const voiceProfileId = searchParams.get("voiceProfileId");

  const [viewState, setViewState] = useState<ViewState>("starting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryAvailable, setRetryAvailable] = useState(false);
  const [startDone, setStartDone] = useState(false);

  const pollStatus = useCallback(async () => {
    if (!voiceProfileId) return null;
    const res = await fetch(`/api/voice-profiles/${voiceProfileId}`);
    if (!res.ok) return null;
    return res.json() as Promise<StatusResponse>;
  }, [voiceProfileId]);

  useEffect(() => {
    if (!voiceProfileId) return;

    let cancelled = false;

    const run = async () => {
      if (startDone) return;

      // Check current status first so we show ready/failed immediately when returning to the page
      const getRes = await fetch(`/api/voice-profiles/${voiceProfileId}`);
      if (cancelled) return;
      if (getRes.ok) {
        const getData = (await getRes.json().catch(() => ({}))) as StatusResponse;
        if (getData.status === "ready") {
          setViewState("success");
          setStartDone(true);
          return;
        }
        // "failed" falls through to POST /start which handles retry logic (backoff, attempt count)
        if (getData.status === "processing" || getData.status === "queued") {
          setViewState("processing");
          setStartDone(true);
          return;
        }
      }

      const startRes = await fetch(`/api/voice-profiles/${voiceProfileId}/start`, {
        method: "POST",
      });
      const startData = await startRes.json().catch(() => ({}));

      if (cancelled) return;
      setStartDone(true);

      if (startRes.status === 200 && startData.status === "ready") {
        setViewState("success");
        return;
      }

      if (startRes.status === 200 && startData.status === "failed") {
        setErrorMessage(startData.error ?? startData.last_error_message ?? "Voice creation failed.");
        setRetryAvailable(startData.retry_available ?? false);
        setViewState("failure");
        return;
      }

      if (startRes.status === 400 && startData.code === "INSUFFICIENT_CLIPS") {
        setErrorMessage(
          `You need at least ${startData.required ?? 10} clips. You have ${startData.actual ?? 0}. Record more clips on the record page.`
        );
        setViewState("failure");
        setRetryAvailable(false);
        return;
      }

      if (startRes.status === 400 && startData.code === "CLIPS_TOO_SHORT") {
        setErrorMessage(
          startData.error ?? "Your clips are too short. ElevenLabs needs at least about 1 minute of audio in total. Record longer clips on the record page, then try again."
        );
        setViewState("failure");
        setRetryAvailable(true);
        return;
      }

      if (startRes.status === 429) {
        setErrorMessage("Please wait a few minutes before trying again.");
        setViewState("failure");
        setRetryAvailable(false);
        return;
      }

      if (!startRes.ok && startRes.status !== 200) {
        const msg = startData.error ?? "Something went wrong.";
        const detail = startData.detail ? ` — ${startData.detail}` : "";
        setErrorMessage(msg + detail);
        setViewState("failure");
        setRetryAvailable(startData.retry_available ?? false);
        return;
      }

      if (startData.status === "queued" || startData.status === "processing") {
        setViewState("processing");
        return;
      }

      if (startRes.status === 200 && (startData.status === "created" || startData.status === "collecting")) {
        setErrorMessage(
          startData.error ?? "Could not start voice creation. The server may be missing database columns—ensure migrations are applied (see terminal for details)."
        );
        setRetryAvailable(true);
        setViewState("failure");
        return;
      }

      setViewState("processing");
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [voiceProfileId, startDone]);

  useEffect(() => {
    if (!voiceProfileId || (viewState !== "processing" && viewState !== "taking_longer")) return;

    let cancelled = false;
    let elapsed = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = async () => {
      const data = await pollStatus();
      if (cancelled) return;

      if (data?.status === "ready") {
        setViewState("success");
        return;
      }
      if (data?.status === "failed") {
        setErrorMessage(data.last_error_message ?? "Voice creation failed.");
        setRetryAvailable(data.retry_available ?? false);
        setViewState("failure");
        return;
      }

      elapsed += POLL_INTERVAL_MS;
      if (elapsed >= POLL_GIVE_UP_MS) {
        setErrorMessage("The request may have timed out. Click Retry to try again.");
        setRetryAvailable(true);
        setViewState("failure");
        return;
      }
      if (elapsed >= POLL_TIMEOUT_MS) {
        setViewState("taking_longer");
      }
      timeoutId = setTimeout(tick, POLL_INTERVAL_MS);
    };

    timeoutId = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [voiceProfileId, viewState, pollStatus]);

  const handleRetry = useCallback(() => {
    setStartDone(false);
    setViewState("starting");
    setErrorMessage(null);
    setRetryAvailable(false);
  }, []);

  if (!voiceProfileId) {
    return (
      <div style={{ padding: 24 }}>
        <p>No voice profile selected. Go to the record page and select a profile, then try again.</p>
        <a href="/app/record">Back to Record</a>
      </div>
    );
  }

  if (viewState === "starting") {
    return (
      <div style={{ padding: 24 }}>
        <h2>Preparing your voice</h2>
        <p>Starting…</p>
      </div>
    );
  }

  if (viewState === "processing" || viewState === "taking_longer") {
    return (
      <div style={{ padding: 24 }}>
        <h2>Preparing your voice</h2>
        <p>This can take a moment. You can stay here.</p>
        <p style={{ marginTop: 16 }}>
          <span style={{ display: "inline-block", width: 20, height: 20, border: "2px solid #333", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          {" "}
          {viewState === "taking_longer"
            ? "Taking longer than usual. We’re still working on it."
            : "Working…"}
        </p>
        {viewState === "taking_longer" && (
          <p style={{ marginTop: 16, fontSize: 14, color: "#555" }}>
            Voice creation can take 1–3 minutes. You can wait here—we&apos;ll show success or an error when it finishes. If it&apos;s been several minutes, you can go back and try again; you&apos;ll see the result then.
          </p>
        )}
        <p style={{ marginTop: 16 }}>
          <button type="button" onClick={() => router.push("/app/record")}>
            Back to Record
          </button>
        </p>
        <style dangerouslySetInnerHTML={{ __html: "@keyframes spin { to { transform: rotate(360deg); } }" }} />
      </div>
    );
  }

  if (viewState === "success") {
    return (
      <div style={{ padding: 24 }}>
        <h2>Your voice is ready</h2>
        <p>You can now use this voice to create messages.</p>
        <div style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={() => router.push("/app/messages/new")}
          >
            Create a message
          </button>
          <button
            type="button"
            onClick={() => router.push("/app/record")}
            style={{ marginLeft: 8 }}
          >
            Back to Record
          </button>
        </div>
      </div>
    );
  }

  if (viewState === "failure") {
    return (
      <div style={{ padding: 24 }}>
        <h2>Something went wrong</h2>
        <p>{errorMessage ?? "Voice creation failed. You can try again."}</p>
        <div style={{ marginTop: 16 }}>
          <button type="button" onClick={() => router.push("/app/record")}>
            Back to Record
          </button>
          {retryAvailable && (
            <button
              type="button"
              onClick={handleRetry}
              style={{ marginLeft: 8 }}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
