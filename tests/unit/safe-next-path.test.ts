import { describe, it, expect } from "vitest";
import { safeNextPath, DEFAULT_NEXT } from "@/lib/auth/safeNextPath";

/**
 * Guards the post-auth `?next=` redirect (triage 2026-08-28 / 2026-09-xx).
 *
 * The bug these pin: `next.startsWith("/")` accepts `//evil.com`, which every
 * browser resolves as `https://evil.com`. A just-signed-in user was one crafted
 * link away from landing off-site — genuine sign-in, attacker-controlled
 * destination.
 */
describe("safeNextPath", () => {
  it("keeps ordinary site-relative paths", () => {
    expect(safeNextPath("/home")).toBe("/home");
    expect(safeNextPath("/app/vault/reveal")).toBe("/app/vault/reveal");
    expect(safeNextPath("/messages/new?from=shelf")).toBe("/messages/new?from=shelf");
    expect(safeNextPath("/home#section")).toBe("/home#section");
  });

  it("rejects protocol-relative URLs — the actual vulnerability", () => {
    expect(safeNextPath("//evil.com")).toBe(DEFAULT_NEXT);
    expect(safeNextPath("//evil.com/path")).toBe(DEFAULT_NEXT);
    // Browsers normalise the backslash form to "//" too.
    expect(safeNextPath("/\\evil.com")).toBe(DEFAULT_NEXT);
  });

  it("rejects absolute URLs and schemes", () => {
    expect(safeNextPath("https://evil.com")).toBe(DEFAULT_NEXT);
    expect(safeNextPath("http://evil.com")).toBe(DEFAULT_NEXT);
    expect(safeNextPath("javascript:alert(1)")).toBe(DEFAULT_NEXT);
    expect(safeNextPath("data:text/html,<script>")).toBe(DEFAULT_NEXT);
  });

  it("rejects anything not anchored at a single leading slash", () => {
    expect(safeNextPath("home")).toBe(DEFAULT_NEXT);
    expect(safeNextPath("\t//evil.com")).toBe(DEFAULT_NEXT);
    expect(safeNextPath("\\\\evil.com")).toBe(DEFAULT_NEXT);
  });

  it("rejects percent-encoded slash and backslash", () => {
    expect(safeNextPath("/%2fevil.com")).toBe(DEFAULT_NEXT);
    expect(safeNextPath("/%2Fevil.com")).toBe(DEFAULT_NEXT);
    expect(safeNextPath("/%5cevil.com")).toBe(DEFAULT_NEXT);
  });

  it("honours a custom fallback — the Stripe portal returnPath case", () => {
    const portal = "/app/vault/restore";
    // The old local guard blocked "//" but NOT "/\\", which is the bug.
    expect(safeNextPath("/\\evil.com", portal)).toBe(portal);
    expect(safeNextPath("//evil.com", portal)).toBe(portal);
    expect(safeNextPath("/app/settings?card_updated=1", portal)).toBe(
      "/app/settings?card_updated=1",
    );
    expect(safeNextPath(undefined, portal)).toBe(portal);
  });

  it("rejects non-string input", () => {
    expect(safeNextPath(42)).toBe(DEFAULT_NEXT);
    expect(safeNextPath({})).toBe(DEFAULT_NEXT);
  });

  it("falls back on empty and missing values", () => {
    expect(safeNextPath(null)).toBe(DEFAULT_NEXT);
    expect(safeNextPath(undefined)).toBe(DEFAULT_NEXT);
    expect(safeNextPath("")).toBe(DEFAULT_NEXT);
  });
});
