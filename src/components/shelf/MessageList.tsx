"use client";

import type { ShelfMessage } from "./types";

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

/**
 * Renders the saved-message rows as play-toggle buttons. Pure
 * presentation — playback state and the play() callback are owned
 * by usePlaybackController in the parent.
 */
export function MessageList({
  messages,
  playingId,
  isPaused,
  audioLoading,
  onPlay,
}: {
  messages: ShelfMessage[];
  playingId: string | null;
  isPaused: boolean;
  audioLoading: boolean;
  onPlay: (messageId: string) => void;
}) {
  return (
    <div style={{ marginTop: 16 }}>
      {messages.map((msg) => {
        const isPlaying = playingId === msg.id;
        const isLoading = isPlaying && audioLoading;

        return (
          <button
            key={msg.id}
            type="button"
            onClick={() => onPlay(msg.id)}
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
  );
}
