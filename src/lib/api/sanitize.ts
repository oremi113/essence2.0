/**
 * Collapse whitespace, trim, and truncate an error-like input so it is safe
 * to persist or bubble back to a client. Intended for vendor / upstream error
 * strings only — never for arbitrary user input.
 */
export function sanitizeErrorMessage(input: unknown, maxLen = 200): string {
  return String(input ?? "").replace(/\s+/g, " ").trim().slice(0, maxLen);
}
