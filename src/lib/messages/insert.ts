/**
 * Hybrid generation — the LLM-touched "Personalized Insert" slot.
 *
 * Per MASTER_SPEC 8.7.1, three of the four template parts (opening tone line,
 * intention core, closing line) come straight from the template JSON. Only the
 * Personalized Insert is touched by an LLM, and only when the user provides a
 * personal note. This module owns that single slot.
 *
 * Provider: Anthropic Claude Haiku (8.7.1 — "Haiku for cost, Sonnet if quality
 * requires"). The provider is swappable behind `generateInsert()` without
 * changing the generation contract (8.7.4).
 *
 * Server-only: reads ANTHROPIC_API_KEY from the environment. Never import from
 * a client component.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { MessageCategory, RelationshipKey } from "@/lib/messageTemplates";

/** 8.7.1: Haiku for cost. Swap to Sonnet only if quality demands it. */
const INSERT_MODEL = "claude-haiku-4-5";

/**
 * The insert is a single short spoken segment — keep the output ceiling tight.
 * ~40 words ≈ well under 256 tokens; the cap is a backstop, not a target.
 */
const INSERT_MAX_TOKENS = 256;

/**
 * 8.7.1 system frame: the LLM writes ONE short segment of natural spoken
 * language. It reinterprets the user's note (8.4 "reinterpret naturally, do not
 * echo verbatim") rather than quoting it, stays in the speaker's first-person
 * voice, and never adds an opening or closing — those are the template's job.
 */
const INSERT_SYSTEM_PROMPT = [
  "You write a single short segment of a spoken message in the speaker's own voice.",
  "This segment sits in the middle of a longer message whose opening and closing are already written — you are writing ONLY the personal middle, nothing else.",
  "",
  "Rules:",
  "- First person, as if the speaker is talking aloud to the recipient.",
  "- Under 40 words. One or two sentences.",
  "- Simple, spoken punctuation. No lists, no headings, no quotation marks, no emoji.",
  "- Reinterpret the speaker's note naturally into warm spoken language. Do NOT echo it back verbatim or quote it.",
  "- Do NOT add a greeting, a sign-off, or the recipient's name — those already exist around your segment.",
  "- Return only the segment text, with no preamble or explanation.",
].join("\n");

export type GenerateInsertParams = {
  /** The user's raw personal note from A4 (already trimmed, non-empty). */
  note: string;
  /** Category — gives the LLM the emotional register to write toward. */
  category: MessageCategory;
  /** The category's emotional goal (e.g. "Warm, celebratory, never cheesy"). */
  emotionalGoal: string;
  /** Normalized relationship, or null when unknown. */
  relationship: RelationshipKey | null;
  /**
   * Optional free-form descriptor for the "Someone else" branch (e.g.
   * "Neighbor"). Sharpens generation when `relationship` is the coarse 'other'.
   */
  descriptor?: string | null;
};

export type GenerateInsertResult =
  | { ok: true; text: string }
  | { ok: false; status: number; code?: string; message: string };

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

/**
 * Build the user-turn prompt that frames the note for the LLM. Relationship and
 * descriptor are context for tone; the note is the content to reinterpret.
 */
function buildUserPrompt(params: GenerateInsertParams): string {
  const { note, category, emotionalGoal, relationship, descriptor } = params;
  const who =
    relationship && relationship !== "other"
      ? relationship
      : descriptor?.trim() || "someone close to them";

  return [
    `Category: ${category} (${emotionalGoal}).`,
    `The message is for the speaker's ${who}.`,
    `The speaker wants to convey this, in their own words: "${note.trim()}"`,
    "",
    "Write the personal middle segment now.",
  ].join("\n");
}

/**
 * Generate the personalized insert for a note. Returns the raw segment text on
 * success. Never throws for an API failure — returns a tagged error so the
 * caller can mark text generation failed and surface a retryable state.
 */
export async function generateInsert(
  params: GenerateInsertParams,
): Promise<GenerateInsertResult> {
  if (!params.note?.trim()) {
    // Caller should not invoke us without a note — pure-template path skips this.
    return { ok: false, status: 400, message: "note is required for insert generation" };
  }

  try {
    const response = await getClient().messages.create({
      model: INSERT_MODEL,
      max_tokens: INSERT_MAX_TOKENS,
      system: INSERT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(params) }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!text) {
      return { ok: false, status: 502, code: "empty_insert", message: "Insert generation returned no text" };
    }

    return { ok: true, text };
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return {
        ok: false,
        status: err.status ?? 502,
        code: err.type ?? "llm_error",
        message: err.message,
      };
    }
    const message = err instanceof Error ? err.message : "Unknown insert generation error";
    return { ok: false, status: 500, code: "llm_unexpected", message };
  }
}
