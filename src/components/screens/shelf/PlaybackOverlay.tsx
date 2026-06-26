"use client";

import { BreathStone } from "@/components/breath-stone/BreathStone";
import type { ShelfMessage } from "./types";
import { formatKeptDate, formatDuration } from "./types";

export type PlaybackPhase = "prePlay" | "playing" | "complete";

/**
 * The ceremonial playback overlay (tap-to-focus a single message) and its
 * transcript sheet. Pure presentation: phase + timer are passed in, every
 * action bubbles out. Mirrors the prototype's pre-play → playing →
 * complete/replay arc with the staggered stone → recipient → excerpt →
 * controls fade-in. Nothing here auto-plays; the user presses Play.
 */
export function PlaybackOverlay({
  message,
  phase,
  audioLoading,
  isPaused,
  currentTime,
  duration,
  transcriptOpen,
  reducedMotion,
  onPlay,
  onPause,
  onReplay,
  onClose,
  onOpenTranscript,
  onCloseTranscript,
}: {
  message: ShelfMessage;
  phase: PlaybackPhase;
  audioLoading: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  transcriptOpen: boolean;
  reducedMotion: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReplay: () => void;
  onClose: () => void;
  onOpenTranscript: () => void;
  onCloseTranscript: () => void;
}) {
  const recipient = `For ${message.recipientName ?? "someone you love"}`;
  // Prefer the real element duration once known; fall back to the stored value
  // so the total reads correctly before metadata loads.
  const total = duration > 0 ? duration : message.durationSeconds ?? 0;
  const stoneState =
    phase === "playing" ? "playback" : phase === "complete" ? "idle" : "ready";
  const stoneSize = phase === "playing" ? 130 : phase === "complete" ? 100 : 110;

  return (
    <>
      <div
        className="shelf-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={recipient}
        onClick={onClose}
      >
        <div className="shelf-modal" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="shelf-modal__close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>

          <div className="shelf-modal__stone" key={phase}>
            <BreathStone
              state={stoneState}
              size={stoneSize}
              reducedMotion={reducedMotion}
            />
          </div>

          <div className="shelf-modal__recipient">{recipient}</div>
          {message.body && (
            <p className="shelf-modal__excerpt">{message.body}</p>
          )}

          <div className="shelf-modal__controls">
            {phase === "prePlay" && (
              <button
                type="button"
                className="shelf-btn-modal-primary"
                onClick={onPlay}
                disabled={audioLoading}
              >
                {audioLoading ? "Loading…" : "▷ Play"}
              </button>
            )}

            {phase === "playing" && (
              <>
                <div className="shelf-timer" aria-live="off">
                  {formatDuration(currentTime)} / {formatDuration(total)}
                </div>
                <button
                  type="button"
                  className="shelf-btn-modal-primary"
                  onClick={onPause}
                >
                  {isPaused ? "▷ Resume" : "❚❚ Pause"}
                </button>
                <button
                  type="button"
                  className="shelf-btn-transcript"
                  onClick={onOpenTranscript}
                >
                  View transcript
                </button>
              </>
            )}

            {phase === "complete" && (
              <>
                <div className="shelf-replay-row">
                  <button
                    type="button"
                    className="shelf-btn-modal-primary"
                    onClick={onReplay}
                  >
                    ↻ Replay
                  </button>
                  <button
                    type="button"
                    className="shelf-btn-modal-secondary"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
                <button
                  type="button"
                  className="shelf-btn-transcript"
                  onClick={onOpenTranscript}
                >
                  View transcript
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {transcriptOpen && (
        <div className="shelf-transcript" role="dialog" aria-modal="true">
          <div className="shelf-transcript__header">
            <div className="shelf-transcript__label">Transcript</div>
            <button
              type="button"
              className="shelf-modal__close"
              aria-label="Close transcript"
              onClick={onCloseTranscript}
            >
              ×
            </button>
          </div>
          <div className="shelf-transcript__content">
            <div className="shelf-transcript__meta">
              {recipient} · {formatKeptDate(message.createdAt)}
            </div>
            <div className="shelf-transcript__body">{message.body}</div>
          </div>
        </div>
      )}
    </>
  );
}
