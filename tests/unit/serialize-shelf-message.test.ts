import { describe, it, expect } from "vitest";
import {
  serializeShelfMessage,
  extractRecipientName,
  type ShelfMessageRow,
} from "@/app/api/messages/serializeShelfMessage";

/** A fully-populated, plausible row; override per-test with a spread. */
function row(overrides: Partial<ShelfMessageRow> = {}): ShelfMessageRow {
  return {
    id: "msg_1",
    status: "saved",
    title: "For Maya",
    body_text: "Happy birthday, sweetheart.",
    category: "birthday",
    audio_duration_ms: 42_000,
    played_count: 0,
    created_at: "2026-06-16T12:00:00.000Z",
    recipients: { name: "Maya" },
    ...overrides,
  };
}

describe("serializeShelfMessage", () => {
  it("maps a full row to the wire shape", () => {
    expect(serializeShelfMessage(row())).toEqual({
      id: "msg_1",
      status: "saved",
      title: "For Maya",
      body: "Happy birthday, sweetheart.",
      bodyExcerpt: "Happy birthday, sweetheart.",
      recipientName: "Maya",
      category: "birthday",
      durationSeconds: 42,
      played: false,
      createdAt: "2026-06-16T12:00:00.000Z",
    });
  });

  describe("body (full transcript text)", () => {
    it("passes the full body through untruncated, even past the excerpt cap", () => {
      const long = "z".repeat(200);
      const out = serializeShelfMessage(row({ body_text: long }));
      expect(out.body).toBe(long); // full text, not clamped
      expect(out.bodyExcerpt).toBe("z".repeat(80) + "…"); // excerpt still capped
    });

    it("is null when body_text is null", () => {
      expect(serializeShelfMessage(row({ body_text: null })).body).toBe(null);
    });
  });

  describe("played flag", () => {
    it("is false when played_count is 0", () => {
      expect(serializeShelfMessage(row({ played_count: 0 })).played).toBe(false);
    });

    it("is true when played_count is positive", () => {
      expect(serializeShelfMessage(row({ played_count: 1 })).played).toBe(true);
      expect(serializeShelfMessage(row({ played_count: 9 })).played).toBe(true);
    });

    it("is false when played_count is null (defensive coalesce)", () => {
      expect(serializeShelfMessage(row({ played_count: null })).played).toBe(
        false,
      );
    });
  });

  describe("durationSeconds", () => {
    it("rounds milliseconds to whole seconds", () => {
      expect(serializeShelfMessage(row({ audio_duration_ms: 42_400 })).durationSeconds).toBe(42);
      expect(serializeShelfMessage(row({ audio_duration_ms: 42_600 })).durationSeconds).toBe(43);
    });

    it("is null when duration was never recorded", () => {
      expect(serializeShelfMessage(row({ audio_duration_ms: null })).durationSeconds).toBe(null);
    });

    it("is null for non-finite or negative values", () => {
      expect(serializeShelfMessage(row({ audio_duration_ms: NaN })).durationSeconds).toBe(null);
      expect(serializeShelfMessage(row({ audio_duration_ms: -5 })).durationSeconds).toBe(null);
    });

    it("maps sub-second durations toward 0", () => {
      expect(serializeShelfMessage(row({ audio_duration_ms: 400 })).durationSeconds).toBe(0);
    });
  });

  describe("bodyExcerpt", () => {
    it("returns null when body_text is null", () => {
      expect(serializeShelfMessage(row({ body_text: null })).bodyExcerpt).toBe(null);
    });

    it("passes short bodies through unchanged", () => {
      const short = "A short note.";
      expect(serializeShelfMessage(row({ body_text: short })).bodyExcerpt).toBe(short);
    });

    it("truncates bodies over 80 chars and appends an ellipsis", () => {
      const long = "x".repeat(120);
      const out = serializeShelfMessage(row({ body_text: long })).bodyExcerpt;
      expect(out).toBe("x".repeat(80) + "…");
      expect(out).toHaveLength(81); // 80 chars + the ellipsis glyph
    });

    it("does not truncate a body of exactly 80 chars", () => {
      const exact = "y".repeat(80);
      expect(serializeShelfMessage(row({ body_text: exact })).bodyExcerpt).toBe(exact);
    });
  });

  it("passes the raw category enum through untransformed", () => {
    expect(serializeShelfMessage(row({ category: "daily_reminder" })).category).toBe("daily_reminder");
    expect(serializeShelfMessage(row({ category: "checking_in" })).category).toBe("checking_in");
  });
});

describe("extractRecipientName", () => {
  it("reads name from an object relation", () => {
    expect(extractRecipientName({ name: "Sam" })).toBe("Sam");
  });

  it("reads name from the first element of an array relation", () => {
    expect(extractRecipientName([{ name: "Sam" }])).toBe("Sam");
  });

  it("returns null for null/empty/malformed relations", () => {
    expect(extractRecipientName(null)).toBe(null);
    expect(extractRecipientName(undefined)).toBe(null);
    expect(extractRecipientName([])).toBe(null);
    expect(extractRecipientName({})).toBe(null);
    expect(extractRecipientName({ name: 42 })).toBe(null);
    expect(extractRecipientName("Sam")).toBe(null);
  });
});
