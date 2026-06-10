import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Unit tests for the Step 6 generation service layer (src/lib/messages/generation.ts).
 *
 * Covers the deterministic pieces — variant selection, variant lookup by id,
 * four-part template assembly, and generateMessageText's pure-template vs
 * LLM-insert branch. The LLM boundary (./insert) is mocked so we assert the
 * orchestration, not the network.
 */

const generateInsertMock = vi.fn();
vi.mock("@/lib/messages/insert", () => ({
  generateInsert: (...args: unknown[]) => generateInsertMock(...args),
}));

import {
  selectVariantByIndex,
  getTemplateById,
  assembleTemplate,
  generateMessageText,
} from "@/lib/messages/generation";
import { getCategoryDefinition } from "@/lib/messageTemplates";

afterEach(() => {
  generateInsertMock.mockReset();
});

// ----- selectVariantByIndex ------------------------------------------------

describe("selectVariantByIndex", () => {
  it("prefers a relationship-specific variant at index 0", () => {
    // birthday has a generic + a daughter variant; daughter should win first.
    const v = selectVariantByIndex("birthday", "daughter", 0);
    expect(v.relationship).toBe("daughter");
  });

  it("returns only generic variants when relationship is null", () => {
    const v = selectVariantByIndex("birthday", null, 0);
    expect(v.relationship).toBeNull();
  });

  it("rotates to a different variant as the index grows, wrapping the pool", () => {
    const pool = getCategoryDefinition("birthday").templates.filter(
      (t) => t.relationship === "daughter" || t.relationship === null,
    );
    const first = selectVariantByIndex("birthday", "daughter", 0);
    const second = selectVariantByIndex("birthday", "daughter", 1);
    expect(second.id).not.toBe(first.id); // a *different* variant on regenerate
    // index === pool length wraps back to the first pick
    const wrapped = selectVariantByIndex("birthday", "daughter", pool.length);
    expect(wrapped.id).toBe(first.id);
  });

  it("never throws for a single-variant category (wraps to the only option)", () => {
    const a = selectVariantByIndex("comfort", null, 0);
    const b = selectVariantByIndex("comfort", null, 3);
    expect(b.id).toBe(a.id);
  });
});

// ----- getTemplateById -----------------------------------------------------

describe("getTemplateById", () => {
  it("resolves a known variant id within its category", () => {
    expect(getTemplateById("birthday", "birthday_daughter_01")?.id).toBe("birthday_daughter_01");
  });

  it("returns null for an unknown id", () => {
    expect(getTemplateById("birthday", "nope_99")).toBeNull();
  });
});

// ----- assembleTemplate ----------------------------------------------------

describe("assembleTemplate", () => {
  const template = getCategoryDefinition("birthday").templates[0];

  it("includes the insert between intention and closing when one is provided", () => {
    const out = assembleTemplate(template, "I keep your drawing on my desk.");
    expect(out).toContain("I keep your drawing on my desk.");
    expect(out.startsWith(template.openingLine)).toBe(true);
    expect(out.endsWith(template.closingLine)).toBe(true);
  });

  it("omits the insert slot entirely on the pure-template path", () => {
    const out = assembleTemplate(template, null);
    expect(out.startsWith(template.openingLine)).toBe(true);
    expect(out.endsWith(template.closingLine)).toBe(true);
    expect(out).toBe([template.openingLine, template.intentionCore, template.closingLine].join(" "));
  });
});

// ----- generateMessageText -------------------------------------------------

describe("generateMessageText", () => {
  const template = getCategoryDefinition("birthday").templates[0];

  it("returns the pure-template assembly without calling the LLM when there is no note", async () => {
    const result = await generateMessageText({
      template,
      category: "birthday",
      relationship: null,
      note: "   ", // whitespace-only counts as no note
    });
    expect(result.ok).toBe(true);
    expect(generateInsertMock).not.toHaveBeenCalled();
  });

  it("calls the LLM and splices its insert when a note is present", async () => {
    generateInsertMock.mockResolvedValue({ ok: true, text: "Your laugh still fills the house." });
    const result = await generateMessageText({
      template,
      category: "birthday",
      relationship: "daughter",
      note: "she always made everyone laugh",
    });
    expect(generateInsertMock).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toContain("Your laugh still fills the house.");
    }
  });

  it("fails the whole call when insert generation fails — no silent fallback", async () => {
    generateInsertMock.mockResolvedValue({ ok: false, status: 502, code: "llm_error", message: "boom" });
    const result = await generateMessageText({
      template,
      category: "birthday",
      relationship: "daughter",
      note: "a real note",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(502);
      expect(result.code).toBe("llm_error");
    }
  });
});
