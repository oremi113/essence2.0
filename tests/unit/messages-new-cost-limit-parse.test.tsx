import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { MessagesNewPageClient } from "@/app/messages/new/MessagesNewPageClient";

/**
 * The root of follow-up 2026-09-04, pinned where it lived.
 *
 * `/api/messages/generate` answers a cost cap with
 * `429 { code: 'cost_limit_blocked', limit_kind }` — and says in its own
 * comment that the client maps `limit_kind` to calm copy. The client dropped
 * it: every non-200 collapsed to `{ ok: false }`, so a permanent wall rendered
 * A5's transient "Something slipped on our end. / Try again". The owner hit
 * this in the beta and retried into the same apology.
 *
 * These assert the parse, which is what was missing. The rendered beat is
 * covered in generation-screen.test.tsx.
 */
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/breath-stone", () => ({ BreathStone: () => null }));
vi.mock("@/lib/analytics/step6", () => ({
  mintFlowId: vi.fn(), clearFlowId: vi.fn(), trackStep6: vi.fn(),
}));

/** Capture what the orchestrator is handed, without driving three screens. */
let captured: ((req: unknown) => Promise<unknown>) | null = null;
vi.mock("@/components/screens/messages/MessageCreationFlow", () => ({
  MessageCreationFlow: (props: { onGenerate: (req: unknown) => Promise<unknown> }) => {
    captured = props.onGenerate;
    return <div data-testid="flow" />;
  },
}));

function mountAndGetOnGenerate() {
  render(
    <MessagesNewPageClient existingRecipients={[]} voiceProfileId="vp1" savedCountBefore={0} />,
  );
  if (!captured) throw new Error("onGenerate was never handed to the flow");
  return captured;
}

const REQ = {
  recipient: { kind: "existing", recipientId: "r1" },
  category: "encouragement",
  note: "hello",
};

beforeEach(() => { captured = null; push.mockClear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("MessagesNewPageClient — cost-cap parsing", () => {
  it("returns the limit_kind for a 429 cost_limit_blocked", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 429,
      json: async () => ({ code: "cost_limit_blocked", limit_kind: "hourly_max" }),
    }));
    const onGenerate = mountAndGetOnGenerate();
    await expect(onGenerate(REQ)).resolves.toEqual({ ok: false, blocked: "hourly_max" });
    expect(push).not.toHaveBeenCalled();
  });

  it("passes pending_max through distinctly", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 429,
      json: async () => ({ code: "cost_limit_blocked", limit_kind: "pending_max" }),
    }));
    const onGenerate = mountAndGetOnGenerate();
    await expect(onGenerate(REQ)).resolves.toEqual({ ok: false, blocked: "pending_max" });
  });

  it("does NOT mark an ordinary 500 as blocked — it keeps its retry", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 500, json: async () => ({ error: "boom" }),
    }));
    const onGenerate = mountAndGetOnGenerate();
    await expect(onGenerate(REQ)).resolves.toEqual({ ok: false });
  });

  it("does NOT mark a 429 that is not a cost cap as blocked", async () => {
    // A generic rate limiter elsewhere must not borrow the cap beat.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 429, json: async () => ({ error: "slow down" }),
    }));
    const onGenerate = mountAndGetOnGenerate();
    await expect(onGenerate(REQ)).resolves.toEqual({ ok: false });
  });

  it("still navigates on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      status: 200, json: async () => ({ generationId: "g1" }),
    }));
    const onGenerate = mountAndGetOnGenerate();
    await expect(onGenerate(REQ)).resolves.toEqual({ ok: true });
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  });

  it("treats a network throw as an ordinary failure, not a cap", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const onGenerate = mountAndGetOnGenerate();
    await expect(onGenerate(REQ)).resolves.toEqual({ ok: false });
  });
});
