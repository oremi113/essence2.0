"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ShelfMessage = {
  id: string;
  status: string;
  title: string | null;
  bodyExcerpt: string | null;
  recipientName: string | null;
  createdAt: string;
};

type LoadState = "loading" | "loaded" | "error";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MemoryShelf() {
  // --- List state ---
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [messages, setMessages] = useState<ShelfMessage[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  // --- Playback state ---
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- Fetch messages ---
  const fetchMessages = useCallback(async () => {
    setLoadState("loading");
    setListError(null);
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not load messages");
      }
      const data = await res.json();
      setMessages(data.messages ?? []);
      setLoadState("loaded");
    } catch (err) {
      setListError(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // --- Play a message ---
  const playMessage = useCallback(
    async (messageId: string) => {
      // If already playing this message, toggle pause/play
      if (playingId === messageId && audioRef.current) {
        if (audioRef.current.paused) {
          audioRef.current.play().catch(() => {});
          setIsPaused(false);
        } else {
          audioRef.current.pause();
          setIsPaused(true);
        }
        return;
      }

      // Stop current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }

      setPlayingId(messageId);
      setIsPaused(false);
      setAudioLoading(true);
      setAudioError(null);

      try {
        const res = await fetch(`/api/messages/${messageId}/play`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Audio unavailable");
        }
        const data = await res.json();
        if (!data.url) throw new Error("Audio unavailable");

        if (!audioRef.current) {
          audioRef.current = new Audio();
          audioRef.current.addEventListener("ended", () => {
            setPlayingId(null);
          });
          audioRef.current.addEventListener("error", () => {
            // Ignore errors from deliberate src reset (empty string)
            if (!audioRef.current?.src || audioRef.current.src === window.location.href) {
              return;
            }
            setAudioError("Audio could not be played. Try again.");
            setAudioLoading(false);
          });
        }

        audioRef.current.src = data.url;
        setAudioLoading(false);
        await audioRef.current.play();
      } catch (err) {
        setAudioError(
          err instanceof Error ? err.message : "Audio unavailable"
        );
        setAudioLoading(false);
        setPlayingId(null);
      }
    },
    [playingId]
  );

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setPlayingId(null);
    setIsPaused(false);
    setAudioError(null);
    setAudioLoading(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  // --- Loading state ---
  if (loadState === "loading") {
    return (
      <div>
        <h2>Memory Shelf</h2>
        <div style={{ marginTop: 16 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 72,
                marginBottom: 12,
                borderRadius: 8,
                background: "#f0f0f0",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html:
              "@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }",
          }}
        />
      </div>
    );
  }

  // --- Error state ---
  if (loadState === "error") {
    return (
      <div>
        <h2>Memory Shelf</h2>
        <p style={{ color: "#666", marginTop: 12 }}>
          {listError ?? "Something went wrong loading your messages."}
        </p>
        <button
          type="button"
          onClick={fetchMessages}
          style={{ marginTop: 12, padding: "8px 20px" }}
        >
          Try again
        </button>
      </div>
    );
  }

  // --- Empty state ---
  const savedMessages = messages.filter((m) => m.status === "saved");

  if (savedMessages.length === 0) {
    return (
      <div>
        <h2>Memory Shelf</h2>
        <p style={{ color: "#666", marginTop: 12 }}>
          No messages yet. Create your first message to see it here.
        </p>
        <a
          href="/app/messages/new"
          style={{
            display: "inline-block",
            marginTop: 12,
            padding: "10px 24px",
            background: "#333",
            color: "#fff",
            borderRadius: 6,
            textDecoration: "none",
          }}
        >
          Create a message
        </a>
      </div>
    );
  }

  // --- Loaded list ---
  return (
    <div>
      <h2>Memory Shelf</h2>

      {/* Audio error banner */}
      {audioError && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            background: "#fff3f3",
            border: "1px solid #f5c6c6",
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 14, color: "#a33" }}>{audioError}</span>
          <button
            type="button"
            onClick={() => {
              setAudioError(null);
              if (playingId) playMessage(playingId);
            }}
            style={{
              marginLeft: 12,
              padding: "4px 12px",
              fontSize: 13,
              border: "1px solid #daa",
              borderRadius: 4,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        {savedMessages.map((msg) => {
          const isPlaying = playingId === msg.id;
          const isLoading = isPlaying && audioLoading;

          return (
            <button
              key={msg.id}
              type="button"
              onClick={() => playMessage(msg.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "14px 16px",
                marginBottom: 10,
                border: isPlaying ? "2px solid #333" : "1px solid #ddd",
                borderRadius: 8,
                background: isPlaying ? "#fafafa" : "#fff",
                cursor: "pointer",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {msg.recipientName ?? msg.title ?? "Message"}
                  </div>
                  {msg.bodyExcerpt && (
                    <div
                      style={{
                        fontSize: 13,
                        color: "#666",
                        marginTop: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {msg.bodyExcerpt}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                    {formatDate(msg.createdAt)}
                  </div>
                </div>
                <div
                  style={{
                    marginLeft: 12,
                    fontSize: 20,
                    flexShrink: 0,
                    width: 32,
                    height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isLoading ? (
                    <span
                      style={{
                        display: "inline-block",
                        width: 18,
                        height: 18,
                        border: "2px solid #999",
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                  ) : isPlaying && !isPaused ? (
                    "⏸"
                  ) : (
                    "▶"
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {playingId && !audioLoading && (
        <div style={{ marginTop: 8, textAlign: "center" }}>
          <button
            type="button"
            onClick={stopPlayback}
            style={{
              padding: "6px 16px",
              fontSize: 13,
              border: "1px solid #ccc",
              borderRadius: 4,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Stop
          </button>
        </div>
      )}

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <a href="/app/messages/new" style={{ color: "#555", fontSize: 14 }}>
          + Create a new message
        </a>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html:
            "@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }",
        }}
      />
    </div>
  );
}
