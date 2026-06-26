import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { HomeBScreen } from "@/components/screens/home/HomeBScreen";
import type { HomeBScreenProps } from "@/components/screens/home/HomeBScreen.types";
import { mockHomeMessages } from "@/components/screens/home/mockHomeB";

/**
 * Step 8 Home B — the completed-user hub. Covers the vault-status register
 * (trial / protected / lapsed), the CTA gating across those states + the 3/3
 * cap, the first-arrival beat, the loading/error system overlays, and that
 * every action bubbles out via its callback. The canvas BreathStone has no 2D
 * context in jsdom, so it's stubbed.
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

function renderHomeB(over: Partial<HomeBScreenProps> = {}) {
  const props: HomeBScreenProps = {
    vaultState: "trial",
    messages: mockHomeMessages(2),
    loadState: "ready",
    onRetry: vi.fn(),
    onCreate: vi.fn(),
    onRestore: vi.fn(),
    onOpenShelf: vi.fn(),
    onOpenMessage: vi.fn(),
    onWaitlist: vi.fn(),
    onSettings: vi.fn(),
    ...over,
  };
  render(<HomeBScreen {...props} />);
  return props;
}

describe("HomeBScreen — vault status + CTA", () => {
  it("trial: shows the Trial pill and a shimmering create CTA", () => {
    const props = renderHomeB({ vaultState: "trial" });
    expect(screen.getByText(/Voice Vault · Trial/)).toBeTruthy();
    const cta = screen.getByRole("button", { name: "Create a message" }) as HTMLButtonElement;
    expect(cta.className).toContain("homeb__cta--shimmer");
    fireEvent.click(cta);
    expect(props.onCreate).toHaveBeenCalledTimes(1);
  });

  it("protected: Protected pill, create CTA without shimmer", () => {
    renderHomeB({ vaultState: "protected" });
    expect(screen.getByText(/Voice Vault · Protected/)).toBeTruthy();
    const cta = screen.getByRole("button", { name: "Create a message" }) as HTMLButtonElement;
    expect(cta.className).not.toContain("homeb__cta--shimmer");
  });

  it("lapsed: leads with reassurance, CTA gates to restore", () => {
    const props = renderHomeB({ vaultState: "lapsed" });
    expect(screen.getByText("Your messages are safe")).toBeTruthy();
    expect(screen.getByText("Voice Vault · Paused")).toBeTruthy();
    // no create affordance on a lapsed vault
    expect(screen.queryByRole("button", { name: "Create a message" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Bring it back" }));
    expect(props.onRestore).toHaveBeenCalledTimes(1);
  });
});

describe("HomeBScreen — archive preview", () => {
  it("renders a preview row per message and bubbles taps with the id", () => {
    const props = renderHomeB({ messages: mockHomeMessages(2) });
    const row = screen.getByRole("button", { name: /Message for Sarah/ });
    fireEvent.click(row);
    expect(props.onOpenMessage).toHaveBeenCalledWith("hb-1");
  });

  it("3/3 full: no create CTA, shows the complete line + waitlist", () => {
    const props = renderHomeB({ vaultState: "protected", messages: mockHomeMessages(3) });
    expect(screen.queryByRole("button", { name: "Create a message" })).toBeNull();
    expect(screen.getByText(/Three, kept\./)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Hear about what comes next" }));
    expect(props.onWaitlist).toHaveBeenCalledTimes(1);
  });

  it("open-shelf link bubbles out", () => {
    const props = renderHomeB();
    fireEvent.click(screen.getByRole("button", { name: "Open your Memory Shelf" }));
    expect(props.onOpenShelf).toHaveBeenCalledTimes(1);
  });
});

describe("HomeBScreen — first arrival + system states", () => {
  it("first arrival shows the one-time chapter line", () => {
    renderHomeB({ firstArrival: true, messages: mockHomeMessages(1) });
    expect(screen.getByText(/This is home now\./)).toBeTruthy();
  });

  it("steady state omits the first-arrival line", () => {
    renderHomeB({ firstArrival: false });
    expect(screen.queryByText(/This is home now\./)).toBeNull();
  });

  it("loading: shows the busy skeleton, no vault pill", () => {
    const { container } = render(
      <HomeBScreen
        vaultState="trial"
        messages={[]}
        loadState="loading"
        onRetry={vi.fn()}
        onCreate={vi.fn()}
        onRestore={vi.fn()}
        onOpenShelf={vi.fn()}
        onOpenMessage={vi.fn()}
        onWaitlist={vi.fn()}
        onSettings={vi.fn()}
      />,
    );
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.queryByText(/Voice Vault/)).toBeNull();
  });

  it("error: reassuring alert with a retry that bubbles out", () => {
    const onRetry = vi.fn();
    render(
      <HomeBScreen
        vaultState="trial"
        messages={[]}
        loadState="error"
        listError={null}
        onRetry={onRetry}
        onCreate={vi.fn()}
        onRestore={vi.fn()}
        onOpenShelf={vi.fn()}
        onOpenMessage={vi.fn()}
        onWaitlist={vi.fn()}
        onSettings={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText("Your messages are safe")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("settings affordance bubbles out (dead-links until Step 9)", () => {
    const props = renderHomeB();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(props.onSettings).toHaveBeenCalledTimes(1);
  });
});
