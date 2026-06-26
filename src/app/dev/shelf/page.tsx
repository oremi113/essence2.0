"use client";

/**
 * Step 7 (Memory Shelf) dev sandbox — permanent per CLAUDE.md.
 *
 * The dev rail switches all eight states the screen designs around:
 *   empty(0) / 1 / 2 / 3-full / playing / just-saved / loading / error+retry.
 *
 * Playback is a no-network mock (`useMockPlayback`) so the ceremonial overlay's
 * pre-play → playing → complete arc and the live timer are demonstrable without
 * a signed URL. Navigation CTAs log instead of routing.
 */
import { useEffect, useMemo, useState } from "react";
import { MemoryShelf, type ShelfLoadState } from "@/components/screens/shelf/MemoryShelf";
import { MOCK_MESSAGES, useMockPlayback } from "@/components/screens/shelf/mockShelf";
import type { ShelfMessage } from "@/components/screens/shelf/types";

type DevState =
  | "empty"
  | "one"
  | "two"
  | "three"
  | "playing"
  | "justsaved"
  | "loading"
  | "error";

const STATES: { key: DevState; label: string }[] = [
  { key: "empty", label: "Empty" },
  { key: "one", label: "1" },
  { key: "two", label: "2" },
  { key: "three", label: "3 full" },
  { key: "playing", label: "Playing" },
  { key: "justsaved", label: "Just saved" },
  { key: "loading", label: "Loading" },
  { key: "error", label: "Error" },
];

export default function ShelfDevPage() {
  const [state, setState] = useState<DevState>("three");
  const [unavailableIds, setUnavailableIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );
  const playback = useMockPlayback();

  // Switching states resets any in-flight mock playback + the unavailable set.
  useEffect(() => {
    playback.stop();
    setUnavailableIds(state === "error" ? new Set([MOCK_MESSAGES[0].id]) : new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const messages = useMemo<ShelfMessage[]>(() => {
    switch (state) {
      case "empty":
      case "loading":
        return [];
      case "one":
        return MOCK_MESSAGES.slice(0, 1);
      case "two":
        return MOCK_MESSAGES.slice(0, 2);
      case "justsaved":
        return [{ ...MOCK_MESSAGES[0], played: false }];
      default:
        return MOCK_MESSAGES.slice(0, 3);
    }
  }, [state]);

  const loadState: ShelfLoadState = state === "loading" ? "loading" : "ready";

  return (
    <div style={{ minHeight: "100dvh", paddingBottom: 64 }}>
      <MemoryShelf
        key={state}
        messages={messages}
        loadState={loadState}
        onRetryList={() => console.log("[dev/shelf] retry list")}
        playback={playback}
        unavailableIds={unavailableIds}
        onAudioUnavailable={(id) =>
          setUnavailableIds((p) => new Set(p).add(id))
        }
        onRetryAudio={(id) =>
          setUnavailableIds((p) => {
            const n = new Set(p);
            n.delete(id);
            return n;
          })
        }
        justSaved={state === "justsaved"}
        initialFocusId={state === "playing" ? MOCK_MESSAGES[0].id : undefined}
        onCreateNew={() => console.log("[dev/shelf] create new → /messages/new")}
        onWaitlist={() => console.log("[dev/shelf] waitlist → /messages/waitlist")}
      />

      <DevRail current={state} onSelect={setState} />
    </div>
  );
}

function DevRail({
  current,
  onSelect,
}: {
  current: DevState;
  onSelect: (s: DevState) => void;
}) {
  return (
    <div className="shelf-dev-rail">
      <span className="shelf-dev-rail__label">Step 7 · states</span>
      {STATES.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={key === current ? "is-active" : undefined}
          onClick={() => onSelect(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
