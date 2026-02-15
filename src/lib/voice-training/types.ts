/**
 * Shared types for the V2 voice training script.
 *
 * No "server-only" import — these are used by both server components
 * (to build resolver context) and client components (to render prompts).
 */

// ---------------------------------------------------------------------------
// Line-type discriminator and variant-key unions
// ---------------------------------------------------------------------------

export type LineType =
  | "simple"
  | "city"
  | "timeOfDayName"
  | "generation"
  | "relationship"
  | "relationshipGoodbye";

export type TimeOfDayKey = "morning" | "afternoon" | "evening" | "lateNight";

export type GenerationKey =
  | "1950s"
  | "1960s"
  | "1970s"
  | "1980s"
  | "1990s"
  | "2000s"
  | "default";

export type RelationshipKey =
  | "daughter"
  | "son"
  | "spouse"
  | "grandchild"
  | "friend"
  | "parent"
  | "default";

/** The 7 relationship values accepted by the API and stored in voice_profiles. */
export const VALID_RELATIONSHIPS: readonly RelationshipKey[] = [
  "daughter",
  "son",
  "spouse",
  "grandchild",
  "friend",
  "parent",
  "default",
] as const;

// ---------------------------------------------------------------------------
// Script data types
// ---------------------------------------------------------------------------

export type VoicePrompt = {
  id: number;
  instruction: string;
  emotionalTone: string;
  lineType: LineType;
  /** A plain string for `simple`/`city` prompts, or a variant map for dynamic types. */
  line: string | Record<string, string>;
};

export type CompletionMessage = {
  title: string;
  body: string;
  progress: string;
  cta: string;
  alternativeCta?: string;
  celebration?: string;
};

export type VoiceStage = {
  stage: number;
  title: string;
  description: string;
  estimatedTime: string;
  prompts: VoicePrompt[];
  completionMessage: CompletionMessage;
};

// ---------------------------------------------------------------------------
// Resolver types
// ---------------------------------------------------------------------------

/**
 * Context needed to resolve dynamic prompts.
 *
 * All fields are optional so the resolver degrades gracefully when data is
 * missing (e.g. for legacy profiles created before variant collection).
 * When the creation form requires all fields, they will always be present.
 */
export type ResolverContext = {
  userName?: string;
  city?: string;
  birthYear?: number;
  relationship?: string;
  now?: Date;
};

export type ResolvedPrompt = {
  resolvedText: string;
  resolvedMeta?: {
    timeOfDayKey?: TimeOfDayKey;
    generationKey?: GenerationKey;
    relationshipKey?: RelationshipKey;
  };
};
