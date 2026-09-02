import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { VoiceProfileCreateForm } from "@/components/voice/VoiceProfileCreateForm";
import { CONSENT_TEXT_VERSION } from "@/lib/voice-creation/consent-copy";

function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText("How should we address you?"), {
    target: { value: "Oremi" },
  });
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "daughter" } });
  fireEvent.change(screen.getByPlaceholderText(/Austin, Chicago, London/), {
    target: { value: "Chicago" },
  });
  fireEvent.change(screen.getByPlaceholderText("e.g. 1965"), {
    target: { value: "1970" },
  });
}

describe("VoiceProfileCreateForm — consent gate", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ voiceProfileId: "vp_123" }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders both consent affirmations as checkboxes (own-voice-only)", () => {
    render(<VoiceProfileCreateForm onCreated={vi.fn()} />);
    expect(screen.getByText(/I consent to ESSENCE and its service providers/)).toBeTruthy();
    expect(screen.getByText(/This is my own voice\. I am not recording/)).toBeTruthy();
    // Guards the fix: the old "authorization from the person / their estate"
    // path contradicted the own-voice-only rule in the ToS/AUP and is gone.
    expect(screen.queryByText(/authorization from the person/i)).toBeNull();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("keeps submit disabled until both boxes are checked", () => {
    render(<VoiceProfileCreateForm onCreated={vi.fn()} />);
    fillRequiredFields();
    const submit = screen.getByRole("button", {
      name: "Start Voice Training",
    }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(submit);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stays disabled when only one box is checked", () => {
    render(<VoiceProfileCreateForm onCreated={vi.fn()} />);
    fillRequiredFields();
    fireEvent.click(screen.getAllByRole("checkbox")[0]); // consent only
    const submit = screen.getByRole("button", {
      name: "Start Voice Training",
    }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(submit);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends consentToClone + ownershipAttested = true once both boxes are checked", async () => {
    const onCreated = vi.fn();
    render(<VoiceProfileCreateForm onCreated={onCreated} />);
    fillRequiredFields();
    const [consent, ownership] = screen.getAllByRole("checkbox");
    fireEvent.click(consent);
    fireEvent.click(ownership);
    fireEvent.click(screen.getByRole("button", { name: "Start Voice Training" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/voice-profiles");
    const body = JSON.parse(init.body);
    expect(body.consentToClone).toBe(true);
    expect(body.ownershipAttested).toBe(true);
    expect(body.consentTextVersion).toBe(CONSENT_TEXT_VERSION);
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("vp_123"));
  });
});
