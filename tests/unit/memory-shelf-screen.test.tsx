import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { MemoryShelf } from "@/components/screens/shelf/MemoryShelf";
import type { ShelfMessage } from "@/components/screens/shelf/types";
import type { PlaybackController } from "@/components/screens/shelf/usePlaybackController";

/**
 * Smoke coverage for the Memory Shelf screen — the keepsake loop's UI state
 * machine. Asserts the count-driven boundaries (empty / 1-2 / 3-full),
 * loading/error, and that tapping a card opens the ceremonial overlay and
 * Play drives the injected engine. The canvas BreathStone is stubbed (jsdom
 * has no 2D context).
 */
vi.mock("@/components/breath-stone/BreathStone", () => ({
  BreathStone: () => null,
}));

// useReducedMotion reads window.matchMedia via useSyncExternalStore.
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});
afterEach(() => cleanup());

function msg(over: Partial<ShelfMessage> = {}): ShelfMessage {
  return {
    id: "m1",
    status: "saved",
    title: null,
    body: "Hey, you. A small reminder.",
    bodyExcerpt: "Hey, you. A small reminder.",
    recipientName: "Lindsey",
    category: "daily_reminder",
    durationSeconds: 20,
    played: false,
    createdAt: "2026-04-23T12:00:00.000Z",
    ...over,
  };
}

function stubPlayback(over: Partial<PlaybackController> = {}): PlaybackController {
  return {
    playingId: null,
    isPaused: false,
    audioLoading: false,
    audioError: null,
    currentTime: 0,
    duration: 0,
    ended: false,
    play: vi.fn(async () => true),
    stop: vi.fn(),
    clearError: vi.fn(),
    retry: vi.fn(),
    ...over,
  };
}

function renderShelf(props: Partial<React.ComponentProps<typeof MemoryShelf>> = {}) {
  const onCreateNew = vi.fn();
  const onWaitlist = vi.fn();
  const onRetryList = vi.fn();
  const playback = props.playback ?? stubPlayback();
  const view = render(
    <MemoryShelf
      messages={[]}
      loadState="ready"
      onRetryList={onRetryList}
      playback={playback}
      onCreateNew={onCreateNew}
      onWaitlist={onWaitlist}
      reducedMotionOverride
      {...props}
    />
  );
  return { ...view, onCreateNew, onWaitlist, onRetryList, playback };
}

describe("MemoryShelf — load states", () => {
  it("loading shows the skeleton, no cards", () => {
    const { container } = render(
      <MemoryShelf
        messages={[]}
        loadState="loading"
        onRetryList={vi.fn()}
        playback={stubPlayback()}
        onCreateNew={vi.fn()}
        onWaitlist={vi.fn()}
        reducedMotionOverride
      />
    );
    expect(container.querySelector(".shelf-skeleton")).toBeTruthy();
    expect(container.querySelector(".shelf-card")).toBeNull();
  });

  it("error shows the message + retry, and retry bubbles out", () => {
    const onRetryList = vi.fn();
    render(
      <MemoryShelf
        messages={[]}
        loadState="error"
        listError="Boom"
        onRetryList={onRetryList}
        playback={stubPlayback()}
        onCreateNew={vi.fn()}
        onWaitlist={vi.fn()}
        reducedMotionOverride
      />
    );
    expect(screen.getByText("Boom")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetryList).toHaveBeenCalledTimes(1);
  });
});

describe("MemoryShelf — count-driven boundaries", () => {
  it("empty shows the hero + 'create your first message' (no cards)", () => {
    const { onCreateNew } = renderShelf({ messages: [] });
    expect(screen.getByText("Your Memory Shelf")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /create your first message/i }));
    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });

  it("1-2 messages: cards + calm 'Create another message', NO complete block", () => {
    const { container } = renderShelf({ messages: [msg({ id: "a" }), msg({ id: "b" })] });
    expect(container.querySelectorAll(".shelf-card")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /create another message/i })).toBeTruthy();
    expect(screen.queryByText("Three, kept.")).toBeNull();
  });

  it("3 full: complete block + waitlist, and NO 'create another' (complete, not capped)", () => {
    const { onWaitlist } = renderShelf({
      messages: [msg({ id: "a" }), msg({ id: "b" }), msg({ id: "c" })],
    });
    expect(screen.getByText("Three, kept.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /create another message/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /see what.?s coming/i }));
    expect(onWaitlist).toHaveBeenCalledTimes(1);
  });
});

describe("MemoryShelf — ceremonial overlay", () => {
  it("tapping a card opens the overlay in pre-play; Play drives the engine", () => {
    const playback = stubPlayback();
    const { container } = renderShelf({ messages: [msg({ id: "a" })], playback });

    // No overlay until a card is tapped (nothing auto-plays).
    expect(container.querySelector(".shelf-modal")).toBeNull();

    fireEvent.click(container.querySelector(".shelf-card")!);
    const modal = container.querySelector(".shelf-modal");
    expect(modal).toBeTruthy();

    // Pre-play shows Play and has NOT started audio yet.
    const playBtn = within(modal as HTMLElement).getByRole("button", { name: /play/i });
    expect(playback.play).not.toHaveBeenCalled();

    fireEvent.click(playBtn);
    expect(playback.play).toHaveBeenCalledWith("a");
  });

  it("renders the unplayed glow only on unplayed, not-yet-opened cards", () => {
    const { container } = renderShelf({
      messages: [msg({ id: "a", played: false }), msg({ id: "b", played: true })],
    });
    const cards = container.querySelectorAll(".shelf-card");
    expect(cards[0].classList.contains("shelf-card--unplayed")).toBe(true);
    expect(cards[1].classList.contains("shelf-card--unplayed")).toBe(false);

    // Opening the unplayed card optimistically retires its glow this session.
    fireEvent.click(cards[0]);
    expect(
      container.querySelectorAll(".shelf-card")[0].classList.contains("shelf-card--unplayed")
    ).toBe(false);
  });
});
