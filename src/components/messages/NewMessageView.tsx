"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TIMING } from "@/lib/config/timing";

type VoiceProfile = { id: string; label: string; status: string };

type ViewState =
  | "form"
  | "generating"
  | "delayed"
  | "saving"
  | "saved"
  | "failure";

export function NewMessageView({
  voiceProfiles,
}: {
  voiceProfiles: VoiceProfile[];
}) {
  const [viewState, setViewState] = useState<ViewState>("form");
  const [voiceProfileId, setVoiceProfileId] = useState(
    voiceProfiles.length === 1 ? voiceProfiles[0].id : ""
  );
  const [promptText, setPromptText] = useState("");
  const [title, setTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Submit form ---
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting) return;
      if (!voiceProfileId || !promptText.trim()) return;

      setSubmitting(true);
      setErrorMessage(null);
      setViewState("generating");

      // Start "delayed" timer
      delayTimerRef.current = setTimeout(() => {
        setViewState((v) => (v === "generating" ? "delayed" : v));
      }, TIMING.MESSAGE_GENERATION_DELAYED_MS);

      try {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            voiceProfileId,
            promptText: promptText.trim(),
            title: title.trim() || undefined,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (delayTimerRef.current) {
          clearTimeout(delayTimerRef.current);
          delayTimerRef.current = null;
        }

        if (data.messageId) {
          setMessageId(data.messageId);
        }

        if (data.status === "saved") {
          setViewState("saved");
        } else if (data.status === "saving") {
          // Rare edge case: audio stored but finalize failed
          setViewState("saving");
        } else if (data.status === "failed" || !res.ok) {
          setErrorMessage(
            data.error ?? "Something went wrong. Please try again."
          );
          setViewState("failure");
        } else {
          // Unexpected — treat as generating (shouldn't happen in sync flow)
          setViewState("generating");
        }
      } catch {
        if (delayTimerRef.current) {
          clearTimeout(delayTimerRef.current);
          delayTimerRef.current = null;
        }
        setErrorMessage(
          "Could not reach the server. Check your connection and try again."
        );
        setViewState("failure");
      } finally {
        setSubmitting(false);
      }
    },
    [voiceProfileId, promptText, title, submitting]
  );

  // --- Fetch playback URL when saved ---
  useEffect(() => {
    if (viewState !== "saved" || !messageId) return;

    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/messages/${messageId}/play`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.url) {
          setPlaybackUrl(data.url);
        }
      } catch (err) {
        // AbortError on unmount is expected; anything else just means
        // the playback URL fetch failed and the user can retry.
        if ((err as Error).name === "AbortError") return;
      }
    })();

    return () => controller.abort();
  }, [viewState, messageId]);

  // --- Reset to form ---
  const handleNewMessage = useCallback(() => {
    setViewState("form");
    setPromptText("");
    setTitle("");
    setMessageId(null);
    setPlaybackUrl(null);
    setErrorMessage(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const handleRetry = useCallback(() => {
    setViewState("form");
    setMessageId(null);
    setPlaybackUrl(null);
    setErrorMessage(null);
  }, []);

  // --- No ready voices ---
  if (voiceProfiles.length === 0) {
    return (
      <div>
        <h2>Create a message</h2>
        <p>
          You need a ready voice to create messages. Go to the record page to
          create your voice first.
        </p>
        <a href="/app/record">Go to Record</a>
      </div>
    );
  }

  // --- Form ---
  if (viewState === "form") {
    return (
      <div>
        <h2>Create a message</h2>
        <form onSubmit={handleSubmit}>
          {voiceProfiles.length > 1 && (
            <label style={{ display: "block", marginBottom: 12 }}>
              Voice
              <select
                value={voiceProfileId}
                onChange={(e) => setVoiceProfileId(e.target.value)}
                style={{ marginLeft: 8 }}
                required
              >
                <option value="">Select a voice…</option>
                {voiceProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label style={{ display: "block", marginBottom: 12 }}>
            Title (optional)
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Good morning message"
              maxLength={200}
              style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
            />
          </label>
          <label style={{ display: "block", marginBottom: 12 }}>
            What would you like to say?
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Type the words you want your voice to speak…"
              maxLength={2000}
              rows={5}
              required
              style={{ display: "block", width: "100%", marginTop: 4, padding: 8 }}
            />
            <span style={{ fontSize: 12, color: "#888" }}>
              {promptText.length} / 2000
            </span>
          </label>
          <button
            type="submit"
            disabled={!voiceProfileId || !promptText.trim() || submitting}
            style={{ padding: "10px 24px", fontSize: 16 }}
          >
            Create message
          </button>
        </form>
      </div>
    );
  }

  // --- Generating / Delayed ---
  if (viewState === "generating" || viewState === "delayed") {
    return (
      <div>
        <h2>Creating your message</h2>
        <p style={{ marginTop: 12 }}>
          <span
            style={{
              display: "inline-block",
              width: 20,
              height: 20,
              border: "2px solid #333",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />{" "}
          {viewState === "delayed"
            ? "Taking a moment. Your message is still being created."
            : "Generating audio with your voice…"}
        </p>
      </div>
    );
  }

  // --- Saving ---
  if (viewState === "saving") {
    return (
      <div>
        <h2>Almost there</h2>
        <p>Saving your message…</p>
      </div>
    );
  }

  // --- Saved (success + playback) ---
  if (viewState === "saved") {
    return (
      <div>
        <h2>Message created</h2>
        <p>Your message has been saved.</p>
        {playbackUrl ? (
          <div style={{ marginTop: 16 }}>
            <audio
              ref={audioRef}
              controls
              src={playbackUrl}
              style={{ width: "100%" }}
            >
              Your browser does not support audio playback.
            </audio>
          </div>
        ) : (
          <p style={{ marginTop: 16, color: "#888" }}>Loading playback…</p>
        )}
        <div style={{ marginTop: 16 }}>
          <button type="button" onClick={handleNewMessage}>
            Create another message
          </button>
          <a href="/app/shelf" style={{ marginLeft: 12 }}>
            Memory Shelf
          </a>
        </div>
      </div>
    );
  }

  // --- Failure ---
  if (viewState === "failure") {
    return (
      <div>
        <h2>Something went wrong</h2>
        <p>{errorMessage ?? "Message creation failed. You can try again."}</p>
        <div style={{ marginTop: 16 }}>
          <button type="button" onClick={handleRetry}>
            Try again
          </button>
          <a href="/app/shelf" style={{ marginLeft: 12 }}>
            Memory Shelf
          </a>
        </div>
      </div>
    );
  }

  return null;
}
