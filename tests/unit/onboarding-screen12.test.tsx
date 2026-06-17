import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Screen12Ready } from "@/components/screens/onboarding/Screen12";

/**
 * Coverage for the Screen 12 "Ready to begin" completion surface — the
 * retry-in-place error UI (FOLLOW_UPS #42-sibling). The completion action
 * now throws loudly on a failed save instead of navigating away silently;
 * Screen12Ready surfaces that as an alert above the still-tappable Begin
 * button so the user can retry without losing their draft.
 *
 * Vanilla matchers only — this project's vitest setup has no jest-dom.
 */
afterEach(() => cleanup());

function beginButton(): HTMLButtonElement {
  return screen.getByRole("button", { name: "Begin recording" }) as HTMLButtonElement;
}

describe("Screen12Ready", () => {
  it("renders no error alert when error is null/absent", () => {
    render(<Screen12Ready onBegin={() => {}} isSubmitting={false} error={null} />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(beginButton().disabled).toBe(false);
  });

  it("surfaces the save-failure message as an alert, button still tappable", () => {
    const onBegin = vi.fn();
    const message =
      "Something kept us from saving just now. Your answers are safe — tap Begin to try again.";
    render(
      <Screen12Ready onBegin={onBegin} isSubmitting={false} error={message} />
    );

    expect(screen.getByRole("alert").textContent).toBe(message);

    // Begin remains enabled so the user can retry in place.
    const begin = beginButton();
    expect(begin.disabled).toBe(false);
    fireEvent.click(begin);
    expect(onBegin).toHaveBeenCalledTimes(1);
  });

  it("disables Begin while a submit is in flight", () => {
    render(<Screen12Ready onBegin={() => {}} isSubmitting={true} error={null} />);
    // While loading, PrimaryButton swaps its label for a spinner, so it has no
    // accessible name — find it by its busy state instead.
    const begin = screen.getByRole("button", { busy: true }) as HTMLButtonElement;
    expect(begin.disabled).toBe(true);
  });
});
