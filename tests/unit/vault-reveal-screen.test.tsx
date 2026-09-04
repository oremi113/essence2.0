import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { VaultRevealScreen } from "@/components/screens/vault/VaultRevealScreen";

/**
 * The Reveal's forward affordance. It used to be a scroll chevron ported from
 * a scroll-snap prototype deck onto a tap-to-advance route: aria-hidden, drawn
 * in a disabled token at 1.34:1, and naming a gesture the screen doesn't
 * support. The whole section carried role="button" with no accessible name.
 *
 * These lock the shape of the fix, not its pixels.
 */
vi.mock("@/components/vault/BronzeVault", () => ({ BronzeVault: () => null }));

afterEach(cleanup);

describe("VaultRevealScreen — forward affordance", () => {
  it("offers a real button naming what comes next", () => {
    render(<VaultRevealScreen onAdvance={() => {}} />);
    // "Hear your voice" is the Copy Guide's model verb for this exact beat —
    // the next screen is first playback, not a generic "continue".
    const cta = screen.getByRole("button", { name: /hear your voice/i });
    expect(cta).toBeTruthy();
  });

  it("advances when the button is pressed", () => {
    const onAdvance = vi.fn();
    render(<VaultRevealScreen onAdvance={onAdvance} />);
    fireEvent.click(screen.getByRole("button", { name: /hear your voice/i }));
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("advances exactly once — the button press must not also fire the section", () => {
    // The section is still a tap target; without stopPropagation a button press
    // would bubble and push the next route twice.
    const onAdvance = vi.fn();
    const { container } = render(<VaultRevealScreen onAdvance={onAdvance} />);
    fireEvent.click(screen.getByRole("button", { name: /hear your voice/i }));
    expect(onAdvance).toHaveBeenCalledTimes(1);
    // ...and tapping the surface itself still works, for an exploratory tap.
    fireEvent.click(container.querySelector(".vault-screen--reveal")!);
    expect(onAdvance).toHaveBeenCalledTimes(2);
  });

  it("exposes exactly one button — the section is no longer an unnamed one", () => {
    const { container } = render(<VaultRevealScreen onAdvance={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(container.querySelector(".vault-screen--reveal")!.getAttribute("role")).toBeNull();
  });

  it("no longer renders the scroll cue", () => {
    const { container } = render(<VaultRevealScreen onAdvance={() => {}} />);
    expect(container.querySelector(".vault-reveal__scroll-cue")).toBeNull();
  });
});
