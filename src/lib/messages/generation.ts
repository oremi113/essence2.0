/**
 * Message text generation — the hybrid pipeline of MASTER_SPEC 8.7.1 / 8.7.4.
 *
 * `generateMessageText` is the service boundary (8.7.4): given a resolved
 * template, a relationship, and an optional note, it returns the final spoken
 * text. Three template parts are deterministic; the personalized insert is the
 * only LLM-touched slot, and only when a note is present (see ./insert).
 *
 * Variant selection lives here too, so the generate/regenerate routes share one
 * definition of "which template" and "a different template".
 *
 * Server-only (transitively imports ./insert, which reads ANTHROPIC_API_KEY).
 */
import {
  getTemplatesForCategory,
  getCategoryDefinition,
  type MessageCategory,
  type MessageTemplate,
  type RelationshipKey,
} from "@/lib/messageTemplates";
import { generateInsert } from "./insert";

/**
 * Order a category's candidate templates relationship-specific-first, so the
 * first pick for a daughter prefers the daughter variant over the generic one.
 * Stable within each group (preserves registry order).
 */
function orderedCandidates(
  category: MessageCategory,
  relationship: RelationshipKey | null,
): readonly MessageTemplate[] {
  const candidates = getTemplatesForCategory(category, relationship);
  return [...candidates].sort((a, b) => {
    const aSpecific = a.relationship !== null ? 0 : 1;
    const bSpecific = b.relationship !== null ? 0 : 1;
    return aSpecific - bSpecific;
  });
}

/**
 * Pick a template variant by index within the ordered candidate pool. Index 0
 * is the first generation; regenerate passes the incremented `regenerate_count`
 * so each re-roll lands on a *different* variant (8.7.3), wrapping around if the
 * pool is smaller than the regenerate cap.
 */
export function selectVariantByIndex(
  category: MessageCategory,
  relationship: RelationshipKey | null,
  index: number,
): MessageTemplate {
  const candidates = orderedCandidates(category, relationship);
  // Pool always has at least one generic variant (registry invariant).
  return candidates[index % candidates.length];
}

/**
 * Resolve a specific variant by its stable id within a category — used by the
 * edit-note path, which reuses the prior generation's exact variant (content
 * changed, not style; Q3). Returns null if the id is unknown.
 */
export function getTemplateById(
  category: MessageCategory,
  variantId: string,
): MessageTemplate | null {
  return (
    getCategoryDefinition(category).templates.find((t) => t.id === variantId) ?? null
  );
}

/**
 * Assemble the four-part message. The insert slot is filled only when the
 * template carries a `{note}` placeholder AND an insert was generated; otherwise
 * it is quietly omitted (the pure-template path of 8.7.1).
 */
export function assembleTemplate(
  template: MessageTemplate,
  insertText: string | null,
): string {
  const parts = [template.openingLine, template.intentionCore];
  if (template.personalizedInsert && insertText) {
    parts.push(insertText);
  }
  parts.push(template.closingLine);
  // Single space between parts — read aloud, the TTS layer handles cadence.
  return parts.filter((p) => p && p.trim().length > 0).join(" ");
}

export type GenerateMessageTextParams = {
  template: MessageTemplate;
  category: MessageCategory;
  relationship: RelationshipKey | null;
  /** Optional descriptor for the "Someone else" branch. */
  descriptor?: string | null;
  /** The user's personal note from A4. Empty/absent → pure-template path. */
  note?: string | null;
};

export type GenerateMessageTextResult =
  | { ok: true; text: string }
  | { ok: false; status: number; code?: string; message: string };

/**
 * Produce the final message text for a resolved template. With a note, runs the
 * LLM insert and assembles; without one, returns the pure-template assembly. A
 * note that fails insert generation fails the whole call (the caller marks
 * text_status = 'failed') — we do not silently fall back to the generic insert,
 * since the user explicitly asked for personalization.
 */
export async function generateMessageText(
  params: GenerateMessageTextParams,
): Promise<GenerateMessageTextResult> {
  const { template, category, relationship, descriptor, note } = params;
  const trimmedNote = note?.trim();

  if (!trimmedNote || !template.personalizedInsert) {
    return { ok: true, text: assembleTemplate(template, null) };
  }

  const insert = await generateInsert({
    note: trimmedNote,
    category,
    emotionalGoal: getCategoryDefinition(category).emotionalGoal,
    relationship,
    descriptor,
  });

  if (!insert.ok) {
    return { ok: false, status: insert.status, code: insert.code, message: insert.message };
  }

  return { ok: true, text: assembleTemplate(template, insert.text) };
}
