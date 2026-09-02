import { describe, it, expect } from "vitest";
import { ageInYears, meetsMinimumAge, MINIMUM_AGE } from "@/lib/onboarding/age";

// Fixed "today" so the tests don't drift with the wall clock.
const TODAY = new Date("2026-09-01T12:00:00");

describe("ageInYears", () => {
  it("returns null for a malformed date", () => {
    expect(ageInYears("not-a-date", TODAY)).toBeNull();
    expect(ageInYears("2001-13-40", TODAY)).toBeNull();
    expect(ageInYears("", TODAY)).toBeNull();
  });

  it("counts whole years using month + day, not just the year", () => {
    // Birthday already passed this year.
    expect(ageInYears("2000-01-15", TODAY)).toBe(26);
    // Birthday later this year → still one less.
    expect(ageInYears("2000-12-31", TODAY)).toBe(25);
  });

  it("treats the exact birthday as having turned that age", () => {
    expect(ageInYears("2008-09-01", TODAY)).toBe(18);
  });

  it("counts the day before the 18th birthday as 17", () => {
    expect(ageInYears("2008-09-02", TODAY)).toBe(17);
  });
});

describe("meetsMinimumAge", () => {
  it("blocks a minor and admits an adult at the boundary", () => {
    expect(MINIMUM_AGE).toBe(18);
    expect(meetsMinimumAge("2008-09-02", TODAY)).toBe(false); // turns 18 tomorrow
    expect(meetsMinimumAge("2008-09-01", TODAY)).toBe(true); // turns 18 today
    expect(meetsMinimumAge("1990-05-10", TODAY)).toBe(true);
  });

  it("is false for an unparseable date", () => {
    expect(meetsMinimumAge("garbage", TODAY)).toBe(false);
  });
});
