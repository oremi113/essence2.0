"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BreathStone } from "@/components/breath-stone/BreathStone";
import { useReducedMotion } from "@/lib/animation/useReducedMotion";
import type { ShelfMessage } from "./types";
import type { PlaybackController } from "./usePlaybackController";
import { MessageList } from "./MessageList";
import { PlaybackOverlay, type PlaybackPhase } from "./PlaybackOverlay";

const MAX_SAVED = 3; // STEP6_MAX_SAVED_MESSAGES — three is the COMPLETE state, not "page 1".

export type ShelfLoadState = "loading" | "error" | "ready";

export interface MemoryShelfProps {
  messages: ShelfMessage[];
  loadState: ShelfLoadState;
  onRetryList: () => void;
  /** The audio engine (real `usePlaybackController`, or a dev mock). Injected
   *  so this screen never fetches — keeps it pure + dev-renderable. */
  playback: PlaybackController;
  /** ids whose audio failed to play; controlled by the parent. */
  unavailableIds?: ReadonlySet<string>;
  /** A focused card's audio just failed — parent adds it to `unavailableIds`. */
  onAudioUnavailable?: (id: string) => void;
  /** Retry a failed card's audio (parent clears it from `unavailableIds`). */
  onRetryAudio?: (id: string) => void;
  /** Newest card just arrived from A7 save (fresh settle + first-ever ceremony). */
  justSaved?: boolean;
  onCreateNew: () => void;
  onWaitlist: () => void;
  /** Test/dev override; defaults to the system `prefers-reduced-motion`. */
  reducedMotionOverride?: boolean;
  /** Dev/test-only: pre-open the ceremonial overlay focused on this card. */
  initialFocusId?: string;
}

const EMPTY_SET: ReadonlySet<string> = new Set();

export function MemoryShelf({
  messages,
  loadState,
  onRetryList,
  playback,
  unavailableIds = EMPTY_SET,
  onAudioUnavailable,
  onRetryAudio,
  justSaved = false,
  onCreateNew,
  onWaitlist,
  reducedMotionOverride,
  initialFocusId,
}: MemoryShelfProps) {
  const systemReduced = useReducedMotion();
  const reducedMotion = reducedMotionOverride ?? systemReduced;

  // --- Overlay (presentation) state ---
  const [focusedId, setFocusedId] = useState<string | null>(initialFocusId ?? null);
  const [hasStarted, setHasStarted] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  // Optimistic "heard" — opening a card retires its unplayed glow this session.
  const [openedIds, setOpenedIds] = useState<ReadonlySet<string>>(EMPTY_SET);
  // First-ever-save ceremony shows once on arrival, then is dismissed.
  const [ceremonyOpen, setCeremonyOpen] = useState(
    justSaved && messages.length === 1
  );

  const focused = useMemo(
    () => messages.find((m) => m.id === focusedId) ?? null,
    [messages, focusedId]
  );

  const phase: PlaybackPhase = !hasStarted
    ? "prePlay"
    : playback.ended
      ? "complete"
      : "playing";

  const closeOverlay = useCallback(() => {
    playback.stop();
    setFocusedId(null);
    setHasStarted(false);
    setTranscriptOpen(false);
  }, [playback]);

  const openOverlay = useCallback((id: string) => {
    setFocusedId(id);
    setHasStarted(false);
    setTranscriptOpen(false);
    setOpenedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  // Start/replay. If the play attempt fails, retreat out of the overlay and let
  // the parent flip the card to "unavailable" (its retry path). Handled at the
  // call site — not via an effect reacting to `audioError`.
  const startOrReplay = useCallback(
    async (id: string) => {
      setHasStarted(true);
      const ok = await playback.play(id);
      if (!ok) {
        onAudioUnavailable?.(id);
        setFocusedId(null);
        setHasStarted(false);
        setTranscriptOpen(false);
      }
    },
    [playback, onAudioUnavailable]
  );

  const startAudio = useCallback(() => {
    if (focusedId) void startOrReplay(focusedId);
  }, [focusedId, startOrReplay]);

  const replay = startAudio;

  const pauseResume = useCallback(() => {
    if (!focusedId) return;
    void playback.play(focusedId); // toggles pause/resume on the active track
  }, [focusedId, playback]);

  // Escape closes transcript → overlay → ceremony, in that order.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (transcriptOpen) setTranscriptOpen(false);
      else if (focusedId) closeOverlay();
      else if (ceremonyOpen) setCeremonyOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [transcriptOpen, focusedId, ceremonyOpen, closeOverlay]);

  const unplayedIds = useMemo<ReadonlySet<string>>(() => {
    const s = new Set<string>();
    for (const m of messages) {
      if (!m.played && !openedIds.has(m.id) && !unavailableIds.has(m.id)) {
        s.add(m.id);
      }
    }
    return s;
  }, [messages, openedIds, unavailableIds]);

  const header = (
    <header className="shelf-header">
      <h1 className="shelf-title">Memory Shelf</h1>
      <p className="shelf-tagline">
        Each message is a keepsake for someone you love
      </p>
    </header>
  );

  // ---- Loading ----
  if (loadState === "loading") {
    return (
      <div className="shelf">
        {header}
        <div aria-hidden="true">
          {[0, 1].map((i) => (
            <div key={i} className="shelf-skeleton">
              <div className="shelf-skeleton__line shelf-skeleton__line--short" />
              <div className="shelf-skeleton__line shelf-skeleton__line--full" />
              <div className="shelf-skeleton__line shelf-skeleton__line--med" />
              <div className="shelf-skeleton__line shelf-skeleton__line--meta" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- List load error (production-only; prototype models per-card errors) ----
  if (loadState === "error") {
    return (
      <div className="shelf">
        {header}
        <div className="shelf-list-error">
          <p className="shelf-list-error__body">
            {"We couldn't load your shelf just now. Your messages are safe."}
          </p>
          <button
            type="button"
            className="shelf-btn-modal-secondary"
            onClick={onRetryList}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ---- Empty ----
  if (messages.length === 0) {
    // The empty hero owns the screen — the persistent header is suppressed here
    // so "Memory Shelf" + "Your Memory Shelf" don't stack (decision 2026-06-16,
    // a deliberate divergence from the prototype which kept the header).
    return (
      <div className="shelf">
        <div className="shelf-empty">
          <div className="shelf-empty__stone">
            <BreathStone state="idle" size={120} reducedMotion={reducedMotion} />
          </div>
          <h2 className="shelf-empty__title">Your Memory Shelf</h2>
          <p className="shelf-empty__body">
            Your voice messages will gather here. Each one a keepsake that
            carries your words forward.
          </p>
          <p className="shelf-empty__promise">
            These messages are preserved and protected. They&rsquo;re not
            temporary. They&rsquo;re yours to keep.
          </p>
          <button
            type="button"
            className="shelf-btn-primary"
            onClick={onCreateNew}
          >
            Create your first message
          </button>
        </div>
      </div>
    );
  }

  // ---- Loaded (1 / 2 / 3-full) ----
  const count = messages.length;
  const isComplete = count >= MAX_SAVED;
  const freshId = justSaved ? messages[0]?.id ?? null : null;

  return (
    <div className="shelf">
      {header}

      <MessageList
        messages={messages}
        unplayedIds={unplayedIds}
        unavailableIds={unavailableIds}
        freshId={freshId}
        onOpen={openOverlay}
        onRetryAudio={(id) => onRetryAudio?.(id)}
      />

      {isComplete ? (
        <section className="shelf-complete">
          <div className="shelf-complete__rule" aria-hidden="true" />
          <h2 className="shelf-complete__title">Three, kept.</h2>
          <p className="shelf-complete__body">
            Your shelf is full. Each message here is preserved and yours to keep.
          </p>
          <button
            type="button"
            className="shelf-complete__link"
            onClick={onWaitlist}
          >
            See what&rsquo;s coming
          </button>
        </section>
      ) : (
        <div className="shelf-add">
          <button type="button" className="shelf-btn-add" onClick={onCreateNew}>
            Create another message
          </button>
        </div>
      )}

      {focused && (
        <PlaybackOverlay
          message={focused}
          phase={phase}
          audioLoading={playback.audioLoading}
          isPaused={playback.isPaused}
          currentTime={playback.currentTime}
          duration={playback.duration}
          transcriptOpen={transcriptOpen}
          reducedMotion={reducedMotion}
          onPlay={startAudio}
          onPause={pauseResume}
          onReplay={replay}
          onClose={closeOverlay}
          onOpenTranscript={() => setTranscriptOpen(true)}
          onCloseTranscript={() => setTranscriptOpen(false)}
        />
      )}

      {ceremonyOpen && (
        <div
          className="shelf-first-ceremony"
          role="dialog"
          aria-modal="true"
          onClick={() => setCeremonyOpen(false)}
        >
          <div className="shelf-first-ceremony__card">
            <div className="shelf-first-ceremony__title">
              Your first message is here.
            </div>
            <div className="shelf-first-ceremony__sub">
              This is where your voice lives.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
