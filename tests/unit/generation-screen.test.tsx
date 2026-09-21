import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { GenerationScreen } from "@/components/screens/messages/GenerationScreen";
import type { GenerationScreenProps } from "@/components/screens/messages/GenerationScreen.types";

/**
 * A5 Generation — the failed-state contract, incl. the Step 10 generation-
 * failure ceiling. Covers: the working wait, the attempts-1–2 retry treatment
 * (note vs skip), and the exhausted contact-as-care treatment that replaces the
 * endless retry after 3 attempts (§12.4) — including the guard that it falls
 * back to plain retry when no support handler is wired, so the screen never
 * dead-ends. The canvas BreathStone has no 2D context in jsdom, so it's stubbed.
 */
vi.mock("@/components/breath-stone", () => ({
  BreathStone: () => null,
}));

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

function renderGen(over: Partial<GenerationScreenProps> = {}) {
  const props: GenerationScreenProps = {
    recipientName: "Sarah",
    categoryLabel: "Encouragement",
    status: "failed",
    hasNote: true,
    onRetry: vi.fn(),
    onAdjustNote: vi.fn(),
    onContactSupport: vi.fn(),
    ...over,
  };
  render(<GenerationScreen {...props} />);
  return props;
}

describe("GenerationScreen — working", () => {
  it("renders the breathing wait, no failed content", () => {
    renderGen({ status: "working" });
    expect(screen.getByText("Shaping your message.")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });
});

describe("GenerationScreen — retry treatment (attempts 1–2)", () => {
  it("note path: Try again + Adjust your note, with the safe-note reassurance", () => {
    const props = renderGen({ retriesExhausted: false, hasNote: true });
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Your note is kept.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(props.onRetry).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Adjust your note" }));
    expect(props.onAdjustNote).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: /reach us/i })).toBeNull();
  });

  it("skip path: retry alone — no note to adjust, no reassurance line", () => {
    renderGen({ retriesExhausted: false, hasNote: false });
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Adjust your note" })).toBeNull();
    expect(screen.queryByText("Your note is kept.")).toBeNull();
  });
});

describe("GenerationScreen — exhausted / contact-as-care (attempt 3+)", () => {
  it("note path: contact primary fires onContactSupport, quiet retry fires onRetry", () => {
    const props = renderGen({ retriesExhausted: true, hasNote: true });
    // Contact-as-care replaces the retry as the primary.
    fireEvent.click(screen.getByRole("button", { name: /reach us/i }));
    expect(props.onContactSupport).toHaveBeenCalledOnce();
    expect(props.onRetry).not.toHaveBeenCalled();
    // "Try once more" is the quiet secondary — never a hard dead end.
    fireEvent.click(screen.getByRole("button", { name: "Try once more" }));
    expect(props.onRetry).toHaveBeenCalledOnce();
    // No endless "Try again", no "Adjust your note" wall.
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Adjust your note" })).toBeNull();
    expect(screen.getByText("Your note is kept.")).toBeTruthy();
  });

  it("skip path: contact + try once more, aside folds the reassurance", () => {
    renderGen({ retriesExhausted: true, hasNote: false });
    expect(screen.getByRole("button", { name: /reach us/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try once more" })).toBeTruthy();
    expect(screen.getByText(/Nothing is lost\./)).toBeTruthy();
    // Skip path never renders the separate "Your note is kept." line.
    expect(screen.queryByText("Your note is kept.")).toBeNull();
  });

  it("guard: exhausted but no support handler → falls back to retry, never dead-ends", () => {
    const props = renderGen({ retriesExhausted: true, onContactSupport: undefined });
    // Without a support handler the ceiling can't strand the user on a dead
    // primary — it reverts to the plain retry treatment.
    expect(screen.queryByRole("button", { name: /reach us/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(props.onRetry).toHaveBeenCalledOnce();
  });
});

/**
 * A5 blocked — the cost-cap beat (follow-up 2026-09-04).
 *
 * The bug these pin: a 429 `cost_limit_blocked` used to render A5's generic
 * failure — "Something slipped on our end. / Try again" — for a wall that is
 * permanent until state changes. All three lines were wrong, and the retry
 * could not succeed. The owner hit exactly this in the beta and looped.
 */
describe("GenerationScreen — blocked (cost cap)", () => {
  it("does NOT offer a retry, and does not blame our end", () => {
    const onRetry = vi.fn();
    renderGen({ status: "blocked", limitKind: "hourly_max", onRetry, onGoHome: vi.fn() });

    expect(screen.queryByText("Try again")).toBeNull();
    expect(screen.queryByText("Try once more")).toBeNull();
    expect(screen.queryByText(/slipped on our end/i)).toBeNull();
    expect(screen.queryByText(/Couldn’t quite land it/i)).toBeNull();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("offers Back to Home as the one real next step", () => {
    const onGoHome = vi.fn();
    renderGen({ status: "blocked", limitKind: "hourly_max", onGoHome });

    const cta = screen.getByText("Back to Home");
    fireEvent.click(cta);
    expect(onGoHome).toHaveBeenCalledTimes(1);
  });

  it("names the hourly ceiling rather than a generic apology", () => {
    renderGen({ status: "blocked", limitKind: "hourly_max", onGoHome: vi.fn() });
    expect(screen.getByText(/as many as this hour holds/i)).toBeTruthy();
  });

  it("distinguishes a still-in-flight generation from an hourly cap", () => {
    renderGen({ status: "blocked", limitKind: "pending_max", onGoHome: vi.fn() });
    expect(screen.getByText(/still being shaped/i)).toBeTruthy();
    expect(screen.queryByText(/as many as this hour holds/i)).toBeNull();
  });

  it("falls back to calm generic copy for an unrecognised limit kind", () => {
    // A cap added server-side must not render blank, and must not assert a
    // specific reason the screen was never told.
    renderGen({
      status: "blocked",
      limitKind: "totally_new_cap" as never,
      onGoHome: vi.fn(),
    });
    expect(screen.getByText(/pause here for now/i)).toBeTruthy();
    expect(screen.getByText("Back to Home")).toBeTruthy();
  });

  it("keeps the note-safe reassurance on both paths", () => {
    renderGen({ status: "blocked", limitKind: "hourly_max", hasNote: true, onGoHome: vi.fn() });
    expect(screen.getByText("Your note is kept.")).toBeTruthy();
    cleanup();
    renderGen({ status: "blocked", limitKind: "hourly_max", hasNote: false, onGoHome: vi.fn() });
    expect(screen.getByText("Nothing is lost.")).toBeTruthy();
  });

  it("announces the block to assistive tech", () => {
    renderGen({ status: "blocked", limitKind: "hourly_max", onGoHome: vi.fn() });
    expect(screen.getByRole("alert")).toBeTruthy();
  });
});
