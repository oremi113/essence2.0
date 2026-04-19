/**
 * Body schemas for API routes that run through defineRoute.
 * Mirror the previous hand-rolled parsers exactly — do not tighten or loosen.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// POST /api/messages
// ---------------------------------------------------------------------------

const MAX_PROMPT_LENGTH = 2000;

export const messageCreateSchema = z
  .object(
    {
      voiceProfileId: z
        .string({ error: "voiceProfileId is required" })
        .transform((v) => v.trim())
        .refine((v) => v.length > 0, { message: "voiceProfileId is required" }),
      promptText: z
        .string({ error: "promptText is required" })
        .max(MAX_PROMPT_LENGTH, {
          message: `promptText must be ${MAX_PROMPT_LENGTH} characters or fewer`,
        })
        .refine((v) => v.trim().length > 0, {
          message: "promptText is required",
        }),
      title: z.string().optional(),
      recipientId: z.string().optional(),
    },
    // Non-object / null body -> "Invalid JSON body" to match the old hand parser.
    { error: "Invalid JSON body" },
  )
  .loose();

export type MessageCreateBody = z.infer<typeof messageCreateSchema>;

// ---------------------------------------------------------------------------
// POST /api/audio/init-upload
// ---------------------------------------------------------------------------

// Old parser accepted promptId OR prompt_index, each either number or a
// value Number() coerces to an integer >= 1. Preserve that via a union +
// refine, then project to a normalized { promptIndex } field.
const promptIndexInput = z.union([z.number(), z.string()]);

export const audioInitUploadSchema = z
  .object({
    kind: z.literal("training_clip", { error: "Invalid kind" }),
    voiceProfileId: z
      .string({ error: "voiceProfileId required" })
      .min(1, { message: "voiceProfileId required" }),
    promptId: promptIndexInput.optional(),
    prompt_index: promptIndexInput.optional(),
    mime: z.string().optional(),
    // Old parser accepted anything that was non-null and typeof==="object"
    // (including arrays), silently coercing everything else to null. Use
    // z.unknown() + normalization in the transform to preserve that.
    resolvedVariantKeys: z.unknown().optional(),
  })
  .loose()
  .transform((val, ctx) => {
    const raw = val.promptId ?? val.prompt_index;
    const promptIndex = raw != null ? Number(raw) : undefined;
    if (
      promptIndex == null ||
      !Number.isInteger(promptIndex) ||
      promptIndex < 1
    ) {
      ctx.addIssue({
        code: "custom",
        message: "promptId (prompt_index) required and must be >= 1",
      });
      return z.NEVER;
    }
    const variantKeys =
      val.resolvedVariantKeys && typeof val.resolvedVariantKeys === "object"
        ? (val.resolvedVariantKeys as Record<string, unknown>)
        : null;
    return {
      kind: val.kind,
      voiceProfileId: val.voiceProfileId,
      promptIndex,
      mime: val.mime ?? "audio/webm",
      resolvedVariantKeys: variantKeys,
    };
  });

export type AudioInitUploadBody = z.infer<typeof audioInitUploadSchema>;

// ---------------------------------------------------------------------------
// POST /api/audio/commit
// ---------------------------------------------------------------------------

// Old parser only checked `!id` (any truthy value). Use z.any + refine to
// preserve that loose contract rather than tightening to a string.
export const audioCommitSchema = z
  .object({
    kind: z.literal("training_clip", { error: "Invalid kind" }),
    id: z.any().refine((v) => !!v, { message: "id required" }),
  })
  .loose();

export type AudioCommitBody = z.infer<typeof audioCommitSchema>;
