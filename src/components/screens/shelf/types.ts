import type { MessageCategory } from "@/app/api/messages/serializeShelfMessage";

/**
 * One saved message as returned by GET /api/messages and rendered on the
 * Memory Shelf. Mirrors the `ShelfMessageItem` wire shape from the API
 * serializer — keep the two in sync.
 */
export type ShelfMessage = {
  id: string;
  status: string;
  title: string | null;
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
