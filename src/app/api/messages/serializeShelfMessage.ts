/**
 * Serializer for the GET /api/messages list (Memory Shelf).
 *
 * Pure row → response-item mapping, extracted from the route handler so the
 * shaping logic is unit-testable without standing up Supabase or Next. The
 * route selects the columns below and maps each row through
 * {@link serializeShelfMessage}.
 *
 * Field-name note: the Step 7 design SoT
 * (`prototypes/essence-step7-memory-shelf.html`) names the duration field
 * `durationSeconds`, so that is the wire contract — not the brief's loose
 * `duration` shorthand. `category` is exposed as the raw DB enum value; the
 * screen owns the enum → caption mapping (its CATEGORY_LABEL keys must match
 * these enum values, not the prototype's pre-reconciliation short keys).
 */
import type { Database } from "@/lib/supabase/types";

export type MessageCategory = Database["public"]["Enums"]["message_category"];

/** Shape of one row as selected by the GET list query. */
export type ShelfMessageRow = {
  id: string;
  status: string;
  title: string | null;
  body_text: string | null;
  category: MessageCategory;
  audio_duration_ms: number | null;
  played_count: number | null;
  created_at: string;
  /** Joined `recipients(name)` — object or array depending on FK shape. */
  recipients: unknown;
};

/** Response item returned to the Memory Shelf client. */
export type ShelfMessageItem = {
  id: string;
  status: string;
  title: string | null;
  bodyExcerpt: string | null;
  recipientName: string | null;
  category: MessageCategory;
  durationSeconds: number | null;
  played: boolean;
  createdAt: string;
};

/** Excerpt cap (chars) before we append an ellipsis. */
const EXCERPT_MAX = 80;

/**
 * Supabase relation joins return either an object or an array depending on
 * the FK shape, and TS can't always infer them. Handles both so callers
 * don't need an `as unknown as` cast.
 */
export function extractRecipientName(rel: unknown): string | null {
  if (!rel || typeof rel !== "object") return null;
  const obj = Array.isArray(rel) ? rel[0] : rel;
  if (!obj || typeof obj !== "object") return null;
  const name = (obj as Record<string, unknown>).name;
  return typeof name === "string" ? name : null;
}

/** Trim body text to a single-line excerpt with a trailing ellipsis. */
function toExcerpt(body: string | null): string | null {
  if (!body) return null;
  return body.length > EXCERPT_MAX ? body.slice(0, EXCERPT_MAX) + "…" : body;
}

/**
 * Convert stored audio duration (ms) to whole seconds for the `m:ss` caption.
 * Null when the duration was never recorded.
 */
function toDurationSeconds(ms: number | null): number | null {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return null;
  return Math.round(ms / 1000);
}

export function serializeShelfMessage(row: ShelfMessageRow): ShelfMessageItem {
  return {
    id: row.id,
    status: row.status,
    title: row.title,
    bodyExcerpt: toExcerpt(row.body_text),
    recipientName: extractRecipientName(row.recipients),
    category: row.category,
    durationSeconds: toDurationSeconds(row.audio_duration_ms),
    // played_count is NOT NULL default 0 in schema; coalesce defensively.
    played: (row.played_count ?? 0) > 0,
    createdAt: row.created_at,
  };
}
