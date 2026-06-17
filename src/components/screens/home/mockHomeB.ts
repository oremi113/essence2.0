import type { ShelfMessage } from "@/components/screens/shelf/types";

/**
 * Mock recent messages for `/dev/home-b` and the HomeBScreen unit test. Mirrors
 * the prototype's sample set (Sarah / Mom / Dad), mapped to the real
 * `ShelfMessage` wire shape with DB-enum categories. `dayOffset` lets the dev
 * page stamp recent `createdAt`s relative to "now" so the preview's relative
 * date hint ("Today" / "3 days ago" / "Last week") renders realistically.
 */
type MockSeed = Omit<ShelfMessage, "createdAt"> & { dayOffset: number };

const SEED: MockSeed[] = [
  {
    id: "hb-1",
    status: "saved",
    title: null,
    body: "I wanted my voice to find you somewhere down the road. Whatever you're deciding, trust that I'm already proud of how you'll decide it.",
    bodyExcerpt: "I wanted my voice to find you somewhere down the road…",
    recipientName: "Sarah",
    category: "future_message",
    durationSeconds: 41,
    played: false,
    dayOffset: 0,
  },
  {
    id: "hb-2",
    status: "saved",
    title: null,
    body: "Happy birthday, Mom. I hope today feels like all the love you've handed out, quietly coming back to you.",
    bodyExcerpt: "Happy birthday, Mom. I hope today feels like all the love…",
    recipientName: "Mom",
    category: "birthday",
    durationSeconds: 28,
    played: true,
    dayOffset: 3,
  },
  {
    id: "hb-3",
    status: "saved",
    title: null,
    body: "Just checking in, Dad. No reason — only that I was thinking of you and wanted you to hear it.",
    bodyExcerpt: "Just checking in, Dad. No reason — only that I was thinking…",
    recipientName: "Dad",
    category: "checking_in",
    durationSeconds: 35,
    played: true,
    dayOffset: 9,
  },
];

/** First `count` mock messages, newest first, with `createdAt` stamped
 *  `dayOffset` days before `now` (defaults to the current time). */
export function mockHomeMessages(count: number, now: number = Date.now()): ShelfMessage[] {
  return SEED.slice(0, count).map(({ dayOffset, ...m }) => ({
    ...m,
    createdAt: new Date(now - dayOffset * 86_400_000).toISOString(),
  }));
}
