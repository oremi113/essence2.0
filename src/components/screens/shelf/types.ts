import type { MessageCategory } from "@/app/api/messages/serializeShelfMessage";

export type { MessageCategory };

/**
 * One saved message as returned by GET /api/messages and rendered on the
 * Memory Shelf. Mirrors the `ShelfMessageItem` wire shape from the API
 * serializer — keep the two in sync.
 */
export type ShelfMessage = {
  id: string;
  status: string;
  title: string | null;
  /** Full message text — drives the overlay excerpt + transcript. */
  body: string | null;
  /** Single-line preview (capped); the card clamps `body` visually instead. */
  bodyExcerpt: string | null;
  recipientName: string | null;
  /** Raw DB enum value; the screen maps it to a woven caption. */
  category: MessageCategory;
  /** Whole seconds for the `m:ss` caption; null when never recorded. */
  durationSeconds: number | null;
  /** True once the message has been played at least once. */
  played: boolean;
  createdAt: string;
};

/**
 * Category → woven caption ("A birthday message"), never a pill. Keyed by the
 * raw DB `message_category` enum values (reconciled in Step 7 Chunk 1 — the
 * prototype's short keys `daily`/`future`/`checkin` map to the DB's
 * `daily_reminder`/`future_message`/`checking_in`).
 */
export const CATEGORY_LABEL: Record<MessageCategory, string> = {
  birthday: "A birthday message",
  comfort: "A message of comfort",
  encouragement: "Words of encouragement",
  holiday: "A holiday message",
  future_message: "A message for later",
  daily_reminder: "A daily reminder",
  checking_in: "Just checking in",
};

/** Absolute "Kept on Apr 23, 2026" — archive permanence, not a recency feed. */
export function formatKeptDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Whole seconds → `m:ss`. Null/negative renders as an em dash. */
export function formatDuration(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  const whole = Math.floor(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
