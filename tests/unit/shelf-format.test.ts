import { describe, it, expect } from "vitest";
import {
  CATEGORY_LABEL,
  formatDuration,
  formatKeptDate,
  type MessageCategory,
} from "@/components/screens/shelf/types";

/**
 * Smoke coverage for the pure helpers behind the Memory Shelf card — the woven
 * category caption and the "Kept on <date> · m:ss" meta. These back the M1
 * keepsake loop's read surface.
 */

// The full DB message_category enum. Kept here as the contract: if a value is
// added to the enum, this list (and CATEGORY_LABEL) must grow with it, or the
// completeness test below fails — guarding against a silently blank caption.
const ALL_CATEGORIES: MessageCategory[] = [
  "birthday",
  "encouragement",
  "daily_reminder",
  "future_message",
  "comfort",
  "holiday",
  "checking_in",
];

describe("CATEGORY_LABEL", () => {
  it("has a non-empty caption for every DB enum value", () => {
    for (const cat of ALL_CATEGORIES) {
      expect(CATEGORY_LABEL[cat], `missing label for ${cat}`).toBeTruthy();
    }
  });

  it("has exactly the enum's keys — no extras, none missing", () => {
    expect(Object.keys(CATEGORY_LABEL).sort()).toEqual([...ALL_CATEGORIES].sort());
  });

  it("maps the reconciled keys the prototype's short keys did not match", () => {
    expect(CATEGORY_LABEL.daily_reminder).toBe("A daily reminder");
    expect(CATEGORY_LABEL.future_message).toBe("A message for later");
    expect(CATEGORY_LABEL.checking_in).toBe("Just checking in");
  });
});

describe("formatDuration", () => {
  it("formats whole seconds as m:ss with a zero-padded seconds field", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(6)).toBe("0:06");
    expect(formatDuration(20)).toBe("0:20");
    expect(formatDuration(48)).toBe("0:48");
  });

  it("rolls over into minutes", () => {
    expect(formatDuration(60)).toBe("1:00");
    expect(formatDuration(125)).toBe("2:05");
  });

  it("floors fractional seconds (matches a ticking element timer)", () => {
    expect(formatDuration(19.9)).toBe("0:19");
  });

  it("renders an em dash for null / negative / non-finite", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(-5)).toBe("—");
    expect(formatDuration(NaN)).toBe("—");
  });
});

describe("formatKeptDate", () => {
  it("renders an absolute 'Mon D, YYYY' date (archive permanence)", () => {
    // Noon UTC keeps the calendar day stable across US/EU runtime time zones.
    expect(formatKeptDate("2026-04-23T12:00:00.000Z")).toMatch(/Apr 23, 2026/);
    expect(formatKeptDate("2026-01-15T12:00:00.000Z")).toMatch(/Jan 15, 2026/);
  });
});
