import { describe, expect, it } from "vitest";
import {
  initPreviewState,
  previewReducer,
  isLastReroll,
  isRecordingCap,
  isTextCap,
  TOTAL_RECORDINGS,
  TOTAL_REROLLS,
  type PreviewInit,
  type PreviewState,
} from "@/components/screens/messages/PreviewRefineScreen.reducer";

/**
 * Unit coverage for the A6 (Preview & Refine, deferred-audio) view-state
 * machine. The screen's motion + the server round-trips are exercised by the
 * dev sandbox at /dev/messages-preview; this pins the pure logic: the two
 * budgets, the candidate/committed transitions, the failure-safe commit beat
 * (A1 §5.6), the action guards, and the derived cap selectors.
 */

const COMMITTED = { text: "the heard take", durationSec: 28 };

function init(overrides: Partial<PreviewInit> = {}): PreviewState {
  return initPreviewState({
    committed: COMMITTED,
    recordingsRemaining: TOTAL_RECORDINGS,
    rerollsRemaining: TOTAL_REROLLS,
    reshapeExhausted: false,
    playHintLearned: false,
    ...overrides,
  });
}

describe("initPreviewState", () => {
  it("opens in committed mode on first listen", () => {
    const s = init();
    expect(s.mode).toBe("committed");
    expect(s.candidateText).toBeNull();
    expect(s.committedText).toBe(COMMITTED.text);
    expect(s.committedDurationSec).toBe(28);
  });

  it("opens in candidate mode when a candidate is rehydrated", () => {
    const s = init({ initialCandidateText: "an un-heard draft" });
    expect(s.mode).toBe("candidate");
    expect(s.candidateText).toBe("an un-heard draft");
    // the committed take is still underneath
    expect(s.committedText).toBe(COMMITTED.text);
  });

  it("clamps the budgets into range", () => {
    expect(init({ recordingsRemaining: 99 }).recordingsRemaining).toBe(TOTAL_RECORDINGS);
    expect(init({ recordingsRemaining: -4 }).recordingsRemaining).toBe(0);
    expect(init({ rerollsRemaining: 5.7 }).rerollsRemaining).toBe(5);
    expect(init({ rerollsRemaining: Number.NaN }).rerollsRemaining).toBe(0);
  });
});

describe("free draft (See another way)", () => {
  it("START sets the pending round-trip and clears a prior commit failure", () => {
    const s = previewReducer({ ...init(), commitFail: true }, { type: "FREE_DRAFT_START" });
    expect(s.pending).toBe("freedraft");
    expect(s.commitFail).toBe(false);
  });

  it("START is a no-op while another round-trip is in flight", () => {
    const busy = { ...init(), pending: "commit" as const };
    expect(previewReducer(busy, { type: "FREE_DRAFT_START" })).toBe(busy);
  });

  it("START is a no-op at the text cap", () => {
    const capped = init({ rerollsRemaining: 0 });
    expect(previewReducer(capped, { type: "FREE_DRAFT_START" })).toBe(capped);
  });

  it("SUCCESS moves to candidate mode with the new draft + remaining count", () => {
    let s = previewReducer(init(), { type: "FREE_DRAFT_START" });
    s = previewReducer(s, { type: "FREE_DRAFT_SUCCESS", candidateText: "a fresh wording", rerollsRemaining: 8 });
    expect(s.mode).toBe("candidate");
    expect(s.candidateText).toBe("a fresh wording");
    expect(s.rerollsRemaining).toBe(8);
    expect(s.pending).toBeNull();
  });

  it("FAIL clears pending and leaves the draft where it was", () => {
    const candidate = init({ initialCandidateText: "draft" });
    let s = previewReducer(candidate, { type: "FREE_DRAFT_START" });
    s = previewReducer(s, { type: "FREE_DRAFT_FAIL" });
    expect(s.pending).toBeNull();
    expect(s.mode).toBe("candidate");
    expect(s.candidateText).toBe("draft");
  });
});

describe("commit (Hear this in your voice)", () => {
  const candidate = () => init({ initialCandidateText: "draft to hear", rerollsRemaining: 9 });

  it("START only fires from candidate mode with recordings left, when idle", () => {
    // committed mode → no-op
    const committed = init();
    expect(previewReducer(committed, { type: "COMMIT_START" })).toBe(committed);
    // at the recording cap → no-op
    const capped = init({ initialCandidateText: "d", recordingsRemaining: 0 });
    expect(previewReducer(capped, { type: "COMMIT_START" })).toBe(capped);
    // valid → pending
    expect(previewReducer(candidate(), { type: "COMMIT_START" }).pending).toBe("commit");
  });

  it("SUCCESS promotes the candidate to the committed take and updates the budget", () => {
    let s = previewReducer(candidate(), { type: "COMMIT_START" });
    s = previewReducer(s, { type: "COMMIT_SUCCESS", recordingsRemaining: 2, durationSec: 31 });
    expect(s.mode).toBe("committed");
    expect(s.committedText).toBe("draft to hear");
    expect(s.committedDurationSec).toBe(31);
    expect(s.candidateText).toBeNull();
    expect(s.recordingsRemaining).toBe(2);
    expect(s.pending).toBeNull();
    expect(s.commitFail).toBe(false);
  });

  it("FAIL is failure-safe: nothing spent, draft kept, the calm line shows (A1 §5.6)", () => {
    const before = candidate();
    let s = previewReducer(before, { type: "COMMIT_START" });
    s = previewReducer(s, { type: "COMMIT_FAIL" });
    expect(s.commitFail).toBe(true);
    expect(s.pending).toBeNull();
    // the dot refills — the count is untouched by a failure
    expect(s.recordingsRemaining).toBe(before.recordingsRemaining);
    // the draft is preserved, still in candidate mode
    expect(s.mode).toBe("candidate");
    expect(s.candidateText).toBe("draft to hear");
  });

  it("a retry after FAIL can then succeed", () => {
    let s = previewReducer(candidate(), { type: "COMMIT_START" });
    s = previewReducer(s, { type: "COMMIT_FAIL" });
    s = previewReducer(s, { type: "COMMIT_START" }); // clears commitFail, re-pends
    expect(s.commitFail).toBe(false);
    expect(s.pending).toBe("commit");
    s = previewReducer(s, { type: "COMMIT_SUCCESS", recordingsRemaining: 1, durationSec: 30 });
    expect(s.mode).toBe("committed");
    expect(s.recordingsRemaining).toBe(1);
  });
});

describe("keep current (Back to the take you heard)", () => {
  it("drops the un-heard draft and returns to the committed take", () => {
    const s = previewReducer(
      init({ initialCandidateText: "draft" }),
      { type: "KEEP" },
    );
    expect(s.mode).toBe("committed");
    expect(s.candidateText).toBeNull();
    expect(s.committedText).toBe(COMMITTED.text);
  });

  it("clears a lingering commit-failure message", () => {
    const failed = { ...init({ initialCandidateText: "draft" }), commitFail: true };
    expect(previewReducer(failed, { type: "KEEP" }).commitFail).toBe(false);
  });
});

describe("play-hint latch", () => {
  it("latches once and is idempotent", () => {
    const s1 = previewReducer(init(), { type: "PLAY_HINT_LEARNED" });
    expect(s1.playHintLearned).toBe(true);
    expect(previewReducer(s1, { type: "PLAY_HINT_LEARNED" })).toBe(s1);
  });
});

describe("derived cap selectors", () => {
  it("isRecordingCap is true only at zero recordings", () => {
    expect(isRecordingCap(init({ recordingsRemaining: 1 }))).toBe(false);
    expect(isRecordingCap(init({ recordingsRemaining: 0 }))).toBe(true);
  });

  it("isLastReroll is true only at exactly one re-roll", () => {
    expect(isLastReroll(init({ rerollsRemaining: 2 }))).toBe(false);
    expect(isLastReroll(init({ rerollsRemaining: 1 }))).toBe(true);
    expect(isLastReroll(init({ rerollsRemaining: 0 }))).toBe(false);
  });

  it("isTextCap is true only at zero re-rolls", () => {
    expect(isTextCap(init({ rerollsRemaining: 1 }))).toBe(false);
    expect(isTextCap(init({ rerollsRemaining: 0 }))).toBe(true);
  });
});
