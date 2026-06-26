"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { MemoryShelf, type ShelfLoadState } from "@/components/screens/shelf/MemoryShelf";
import { usePlaybackController } from "@/components/screens/shelf/usePlaybackController";
import type { ShelfMessage } from "@/components/screens/shelf/types";
import { useResource } from "@/lib/data/useResource";
import { ROUTES } from "@/lib/routes";

/**
 * Page-local glue for the Memory Shelf route: owns the list fetch
 * (`useResource`), the audio engine (`usePlaybackController`), and navigation.
 * The screen itself is pure + props-driven — this is the only place that
 * touches the network, per CLAUDE.md's page/screen split.
 */
export function ShelfPageClient({ justSaved = false }: { justSaved?: boolean }) {
  const router = useRouter();
  const playback = usePlaybackController();
  const [unavailableIds, setUnavailableIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  const {
    data: messages,
    status,
    error,
    refetch,
  } = useResource<ShelfMessage[]>(
    async (signal) => {
      const res = await fetch("/api/messages", { signal });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not load messages");
      }
      const data = await res.json();
      return data.messages ?? [];
    },
    { initialData: [] }
  );

  const loadState: ShelfLoadState =
    status === "error" ? "error" : status === "loading" ? "loading" : "ready";

  const handleAudioUnavailable = useCallback((id: string) => {
    setUnavailableIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const handleRetryAudio = useCallback(
    (id: string) => {
      setUnavailableIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      playback.clearError(); // re-arm; the user taps the card to play again
    },
    [playback]
  );

  return (
    <MemoryShelf
      messages={messages}
      loadState={loadState}
      listError={error}
      onRetryList={refetch}
      playback={playback}
      unavailableIds={unavailableIds}
      onAudioUnavailable={handleAudioUnavailable}
      onRetryAudio={handleRetryAudio}
      justSaved={justSaved}
      onCreateNew={() => router.push(ROUTES.messagesNew)}
      onWaitlist={() => router.push(ROUTES.messagesWaitlist)}
    />
  );
}
