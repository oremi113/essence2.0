"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Owns the single hidden HTMLAudioElement used by the Memory Shelf, the
 * fetch for its signed-URL, and the play/pause/stop lifecycle. Pulled
 * out of MemoryShelf so the component is just orchestration + render.
 *
 * Lifecycle:
 *   - Audio element is created lazily on first play and reused after.
 *   - "ended" / "error" listeners attach exactly once when the element
 *     is created.
 *   - On unmount, the element is paused and detached so it stops if
 *     the user navigates away mid-play.
 */
export interface PlaybackController {
  /** ID of the currently active message (whether playing OR paused), or null when idle. */
  playingId: string | null;
  /** True only while the active message is paused mid-play. */
  isPaused: boolean;
  /** True while we're fetching the signed URL for the next play. */
  audioLoading: boolean;
  /** Last user-facing error from playback. */
  audioError: string | null;
  /** Start (or toggle pause/resume on) the message with this id. */
  play: (messageId: string) => Promise<void>;
  /** Hard stop and reset to idle. */
  stop: () => void;
  /** Clear the error banner without changing playback state. */
  clearError: () => void;
  /** Re-attempt the last message the user tried to play. No-op if there isn't one. */
  retry: () => void;
}

export function usePlaybackController(): PlaybackController {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Remember the last id we tried to play so the Retry button can
  // replay it after a failure (which clears playingId in the catch).
  const lastAttemptedIdRef = useRef<string | null>(null);

  const ensureAudioElement = useCallback((): HTMLAudioElement => {
    if (audioRef.current) return audioRef.current;
    const el = new Audio();
    el.addEventListener("ended", () => {
      setPlayingId(null);
    });
    el.addEventListener("error", () => {
      // Ignore errors from deliberate src reset (empty string / page URL).
      const src = el.src;
      if (!src || src === window.location.href) return;
      setAudioError("Audio could not be played. Try again.");
      setAudioLoading(false);
    });
    audioRef.current = el;
    return el;
  }, []);

  const play = useCallback(
    async (messageId: string) => {
      // Toggle pause/resume on the currently active message.
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

      // Switching to a different message — stop whatever's playing.
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }

      lastAttemptedIdRef.current = messageId;
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

        const el = ensureAudioElement();
        el.src = data.url;
        setAudioLoading(false);
        await el.play();
      } catch (err) {
        setAudioError(err instanceof Error ? err.message : "Audio unavailable");
        setAudioLoading(false);
        setPlayingId(null);
      }
    },
    [playingId, ensureAudioElement]
  );

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setPlayingId(null);
    setIsPaused(false);
    setAudioError(null);
    setAudioLoading(false);
  }, []);

  const clearError = useCallback(() => setAudioError(null), []);

  const retry = useCallback(() => {
    const id = lastAttemptedIdRef.current;
    if (!id) return;
    setAudioError(null);
    play(id);
  }, [play]);

  // Stop and detach on unmount so audio doesn't keep playing after nav.
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  return { playingId, isPaused, audioLoading, audioError, play, stop, clearError, retry };
}
