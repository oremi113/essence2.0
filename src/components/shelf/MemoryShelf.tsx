"use client";

import { useCallback, useEffect, useState } from "react";
import type { ShelfMessage } from "./types";
import { MessageList } from "./MessageList";
import { usePlaybackController } from "./usePlaybackController";

type LoadState = "loading" | "loaded" | "error";

/**
 * Memory Shelf — lists the user's saved messages and lets them play
 * each one back. State is split three ways:
 *   - this component owns the list fetch (loadState, messages, listError);
 *   - usePlaybackController owns the audio element + playback state;
 *   - MessageList renders the rows as pure presentation.
 */
export function MemoryShelf() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [messages, setMessages] = useState<ShelfMessage[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const playback = usePlaybackController();

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
      setListError(err instanceof Error ? err.message : "Something went wrong");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

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
  if (messages.length === 0) {
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
      {playback.audioError && (
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
          <span style={{ fontSize: 14, color: "#a33" }}>{playback.audioError}</span>
          <button
            type="button"
            onClick={() => {
              playback.clearError();
              if (playback.playingId) playback.play(playback.playingId);
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

      <MessageList
        messages={messages}
        playingId={playback.playingId}
        isPaused={playback.isPaused}
        audioLoading={playback.audioLoading}
        onPlay={playback.play}
      />

      {playback.playingId && !playback.audioLoading && (
        <div style={{ marginTop: 8, textAlign: "center" }}>
          <button
            type="button"
            onClick={playback.stop}
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
    </div>
  );
}
