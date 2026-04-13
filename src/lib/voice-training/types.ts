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

/**
 * What "Continue" on a celebration screen does.
 *  - `next-prompt`   → advance to the next prompt in the flat list.
 *  - `stage-intro`   → show the intro for the named stage (used between stages).
 *  - `working`       → kick off voice-profile generation (final celebration).
 */
export type CelebrationNext =
  | { kind: "next-prompt" }
  | { kind: "stage-intro"; stage: 2 | 3 }
  | { kind: "working" };

/**
 * Optional celebration triggered AFTER this prompt is recorded.
 * Drives the full CelebrationView render — no per-index switch in
 * the component. Add a celebration to a new prompt by attaching this
 * object; remove a celebration by deleting it. No code changes needed.
 */
export type PromptCelebration = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  /** Render the subtitle in italic (used by the final celebration only). */
  italicSubtitle?: boolean;
  /** Use the lighter Spectral weight (400 vs 500). Most celebrations use 400. */
  titleWeight?: 400 | 500;
  /** Show the three-dot stage progress map under the stone. */
  showStageMap?: boolean;
  /** When showStageMap is true, which stage is the active dot. */
  stageMapCurrent?: 1 | 2 | 3;
  /** Show the secondary "Pause for now" link below the primary CTA. */
  showPauseLink?: boolean;
  /** Primary CTA label. */
  cta: string;
  /** Where Continue navigates. */
  next: CelebrationNext;
};

export type VoicePrompt = {
  id: number;
  instruction: string;
  emotionalTone: string;
  lineType: LineType;
  /** A plain string for `simple`/`city` prompts, or a variant map for dynamic types. */
  line: string | Record<string, string>;
  /** Optional celebration triggered after this prompt is recorded. */
  celebration?: PromptCelebration;
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
  stage: 1 | 2 | 3;
  /** Zero-based index of the first prompt in this stage within the flat ALL_PROMPTS list. */
  startIndex: number;
  /** Zero-based index of the last prompt in this stage within the flat ALL_PROMPTS list. */
  endIndex: number;
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
