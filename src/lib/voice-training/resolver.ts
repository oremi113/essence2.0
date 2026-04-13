/**
 * Pure resolver for V2 voice training prompts.
 *
 * No side effects, no server-only imports — safe for client and server use.
 */
import type {
  VoicePrompt,
  ResolverContext,
  ResolvedPrompt,
  TimeOfDayKey,
  GenerationKey,
  RelationshipKey,
} from "./types";

// ---------------------------------------------------------------------------
// Variant-key helpers
// ---------------------------------------------------------------------------

/** Map the current hour (0-23) to a time-of-day bucket. */
function getTimeOfDayKey(hour: number): TimeOfDayKey {
  if (hour >= 5 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 16) return "afternoon";
  if (hour >= 17 && hour <= 20) return "evening";
  return "lateNight"; // 21-4
}

/** Extract the hour (0-23) from `now` in the given IANA time zone, or the
 *  caller's local zone if none is provided. Falls back to the local hour
 *  if the time zone is invalid. */
function getHourInZone(now: Date, timeZone: string | undefined): number {
  if (!timeZone) return now.getHours();
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hour12: false,
    }).formatToParts(now);
    const hourPart = parts.find((p) => p.type === "hour")?.value;
    const hour = hourPart ? parseInt(hourPart, 10) : NaN;
    return Number.isFinite(hour) ? hour : now.getHours();
  } catch {
    return now.getHours();
  }
}

/** Map a birth year to a generation decade key. */
function getGenerationKey(birthYear: number | undefined): GenerationKey {
  if (birthYear == null) return "default";
  const decade = Math.floor(birthYear / 10) * 10;
  const valid: Record<number, GenerationKey> = {
    1950: "1950s",
    1960: "1960s",
    1970: "1970s",
    1980: "1980s",
    1990: "1990s",
    2000: "2000s",
  };
  return valid[decade] ?? "default";
}

const VALID_RELATIONSHIP_KEYS = new Set<string>([
  "daughter",
  "son",
  "spouse",
  "grandchild",
  "friend",
  "parent",
]);

/** Map a relationship string to a variant key. */
function getRelationshipKey(
  relationship: string | undefined
): RelationshipKey {
  if (relationship && VALID_RELATIONSHIP_KEYS.has(relationship)) {
    return relationship as RelationshipKey;
  }
  return "default";
}

// ---------------------------------------------------------------------------
// Placeholder replacement
// ---------------------------------------------------------------------------

const PLACEHOLDER_DEFAULTS: Record<string, string> = {
  "{userName}": "I\u2019m here",
  "{city}": "my city",
};

function replacePlaceholders(
  text: string,
  ctx: ResolverContext
): string {
  let result = text;
  result = result.replace(
    /\{userName\}/g,
    ctx.userName ?? PLACEHOLDER_DEFAULTS["{userName}"]
  );
  result = result.replace(
    /\{city\}/g,
    ctx.city ?? PLACEHOLDER_DEFAULTS["{city}"]
  );
  return result;
}

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a VoicePrompt into concrete display text, selecting the correct
 * variant for dynamic lineTypes and replacing placeholders.
 */
export function resolvePrompt(
  prompt: VoicePrompt,
  ctx: ResolverContext
): ResolvedPrompt {
  const meta: ResolvedPrompt["resolvedMeta"] = {};

  let rawText: string;

  if (typeof prompt.line === "string") {
    // simple / city — line is already a plain string
    rawText = prompt.line;
  } else {
    // variant map — pick the right key based on lineType
    const variantMap = prompt.line;

    switch (prompt.lineType) {
      case "timeOfDayName": {
        const hour = getHourInZone(ctx.now ?? new Date(), ctx.timeZone);
        const key = getTimeOfDayKey(hour);
        meta.timeOfDayKey = key;
        rawText = variantMap[key] ?? variantMap["morning"] ?? "";
        break;
      }
      case "generation": {
        const key = getGenerationKey(ctx.birthYear);
        meta.generationKey = key;
        rawText = variantMap[key] ?? variantMap["default"] ?? "";
        break;
      }
      case "relationship":
      case "relationshipGoodbye": {
        const key = getRelationshipKey(ctx.relationship);
        meta.relationshipKey = key;
        rawText = variantMap[key] ?? variantMap["default"] ?? "";
        break;
      }
      default:
        // Shouldn't happen for well-formed script data. Fallback to first value.
        rawText =
          Object.values(variantMap)[0] ?? "";
    }
  }

  const resolvedText = replacePlaceholders(rawText, ctx);

  return {
    resolvedText,
    resolvedMeta: Object.keys(meta).length > 0 ? meta : undefined,
  };
}

// ---------------------------------------------------------------------------
// Context builder — single source of truth for assembling ResolverContext
// ---------------------------------------------------------------------------

/**
 * Build a ResolverContext from DB rows.
 *
 * This is the **one function to change** when Guardian introduces non-user
 * subjects. Today it reads birth_year/city from the profiles table (user-level).
 * In the future, voice_profiles could carry subject-specific overrides.
 */
export function buildResolverContext(
  profile: {
    display_name: string | null;
    city: string | null;
    birth_year: number | null;
  },
  voiceProfile: {
    relationship: string | null;
  }
): ResolverContext {
  // NOTE: `now` is intentionally omitted here. This context is built on the
  // server and serialized as props to a client component. Date objects are not
  // serializable across the Next.js server/client boundary. The resolver
  // defaults to `new Date()` on the client when `now` is undefined, which is
  // correct because timeOfDayName should reflect the user's local time.
  return {
    userName: profile.display_name ?? undefined,
    city: profile.city ?? undefined,
    birthYear: profile.birth_year ?? undefined,
    relationship: voiceProfile.relationship ?? undefined,
  };
}
