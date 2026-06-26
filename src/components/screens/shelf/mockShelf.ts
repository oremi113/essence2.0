"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ShelfMessage } from "./types";
import type { PlaybackController } from "./usePlaybackController";

/**
 * Mock saved messages for `/dev/shelf` (newest-first, lifetime max 3). Mirrors
 * the prototype's sample set, mapped to the real `ShelfMessage` wire shape with
 * DB-enum categories.
 */
export const MOCK_MESSAGES: ShelfMessage[] = [
  {
    id: "m3",
    status: "saved",
    title: null,
    body: "Happy birthday, sweetheart. I hope this year is the one where you stop waiting for permission and just begin.\n\nWhatever you decide to chase, I'm already proud of you for it.",
    bodyExcerpt:
      "Happy birthday, sweetheart. I hope this year is the one where you…",
    recipientName: "Maya",
    category: "birthday",
    durationSeconds: 6,
    played: false,
    createdAt: "2026-04-23T12:00:00.000Z",
  },
  {
    id: "m2",
    status: "saved",
    title: null,
    body: "I know things have felt heavy lately. I just want you to hear my voice and know that whatever happens, you are not carrying it alone.\n\nCall me whenever. Day or night. I mean that.",
    bodyExcerpt:
      "I know things have felt heavy lately. I just want you to hear my…",
    recipientName: "Mom",
    category: "comfort",
    durationSeconds: 48,
    played: true,
    createdAt: "2026-03-02T12:00:00.000Z",
  },
  {
    id: "m1",
    status: "saved",
    title: null,
    body: "You've got this. One step at a time, the way we always say. I'm proud of you for even starting.\n\nThe hard part is behind you now. Keep going.",
    bodyExcerpt: "You've got this. One step at a time, the way we always say…",
    recipientName: "Sam",
    category: "encouragement",
    durationSeconds: 32,
    played: true,
    createdAt: "2026-01-15T12:00:00.000Z",
  },
];

/**
 * A no-network playback engine for `/dev/shelf`: advances a fake timer second
 * by second so the ceremonial overlay's pre-play → playing → complete arc is
 * demonstrable without real audio or a signed URL. Satisfies the same
 * `PlaybackController` contract the screen consumes in production.
 */
export function useMockPlayback(
  messages: ShelfMessage[] = MOCK_MESSAGES
): PlaybackController {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ended, setEnded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const tick = useCallback(
    (total: number) => {
      clearTimer();
      timerRef.current = setInterval(() => {
        setCurrentTime((t) => {
          const next = t + 1;
          if (next >= total) {
            clearTimer();
            setEnded(true);
            setIsPaused(false);
            setPlayingId(null);
            return total;
          }
          return next;
        });
      }, 1000);
    },
    [clearTimer]
  );

  const play = useCallback(
    async (id: string) => {
      const msg = messages.find((m) => m.id === id);
      const total = msg?.durationSeconds ?? 0;

      if (playingId === id) {
        // toggle pause/resume
        if (isPaused) {
          setIsPaused(false);
          tick(total);
        } else {
          setIsPaused(true);
          clearTimer();
        }
        return true;
      }

      setPlayingId(id);
      setIsPaused(false);
      setEnded(false);
      setCurrentTime(0);
      setDuration(total);
      tick(total);
      return true;
    },
    [messages, playingId, isPaused, tick, clearTimer]
  );

  const stop = useCallback(() => {
    clearTimer();
    setPlayingId(null);
    setIsPaused(false);
    setEnded(false);
    setCurrentTime(0);
    setDuration(0);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return {
    playingId,
    isPaused,
    audioLoading: false,
    audioError: null,
    currentTime,
    duration,
    ended,
    play,
    stop,
    clearError: () => {},
    retry: () => {},
  };
}
