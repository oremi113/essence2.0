/**
 * Rate limiting for ESSENCE — DB-backed via usage_events table.
 *
 * The DB is the guardrail. The in-memory dedup map is UX polish only
 * (prevents DB queries on rapid double-clicks). It resets on cold start
 * and is explicitly non-authoritative.
 */
import { SupabaseClient } from "@supabase/supabase-js";
import { AppError, ErrorCode } from "@/lib/errors";

// ---------------------------------------------------------------------------
// Caps (env-overridable)
// ---------------------------------------------------------------------------

function envInt(key: string, fallback: number): number {
  const v = process.env[key];
  if (v != null && v !== "") {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return fallback;
}

export const CAPS = {
  get maxClipsPerProfile() {
    return envInt("RATE_LIMIT_MAX_CLIPS_PER_PROFILE", 30);
  },
  get maxMessagesPerDay() {
    return envInt("RATE_LIMIT_MAX_MESSAGES_PER_DAY", 20);
  },
  get maxVoiceCreationsPerDay() {
    return envInt("RATE_LIMIT_MAX_VOICE_CREATIONS_PER_DAY", 5);
  },
  get maxSignedUrlsPerMinute() {
    return envInt("RATE_LIMIT_MAX_SIGNED_URLS_PER_MINUTE", 30);
  },
};

// ---------------------------------------------------------------------------
// In-memory dedup (UX polish only — NOT a guardrail)
// ---------------------------------------------------------------------------

const dedupMap = new Map<string, number>();
const DEDUP_TTL_MS = 5_000; // 5 seconds

/**
 * Returns true if this is a duplicate request within the dedup window.
 * This is UX polish only — prevents the DB query from running on rapid
 * double-clicks. Resets on cold start. Never rely on this as the guardrail.
 */
export function isDedupBlocked(userId: string, action: string): boolean {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const prev = dedupMap.get(key);
  if (prev && now - prev < DEDUP_TTL_MS) {
    return true;
  }
  dedupMap.set(key, now);
  // Lazy cleanup
  if (dedupMap.size > 10_000) {
    for (const [k, ts] of dedupMap) {
      if (now - ts > DEDUP_TTL_MS) dedupMap.delete(k);
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// DB-backed rate limit checks
// ---------------------------------------------------------------------------

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: string; retryAfterMs?: number };

/**
 * Count usage_events for a user+action within a time window.
 * Uses the service client to bypass RLS (server-only).
 */
async function countRecentEvents(
  serviceClient: SupabaseClient,
  userId: string,
  action: string | string[],
  windowMs: number
): Promise<number> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const actions = Array.isArray(action) ? action : [action];

  const { count, error } = await serviceClient
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("action", actions)
    .gte("created_at", since);

  if (error) {
    console.error("[rate-limit] count query failed:", error.message);
    // Fail open on DB errors so users aren't locked out by transient issues
    return 0;
  }
  return count ?? 0;
}

/**
 * Record a usage event in the ledger.
 */
export async function recordUsageEvent(
  serviceClient: SupabaseClient,
  params: {
    userId: string;
    action: string;
    requestId: string;
    outcome?: string;
    idempotencyKey?: string;
    meta?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await serviceClient.from("usage_events").insert({
    user_id: params.userId,
    action: params.action,
    request_id: params.requestId,
    outcome: params.outcome ?? "started",
    idempotency_key: params.idempotencyKey ?? null,
    meta: params.meta ?? null,
  });
  if (error) {
    // Log but don't fail the request — ledger is best-effort
    console.error("[rate-limit] record event failed:", error.message);
  }
}

/**
 * Update the outcome (and optionally duration) of an existing usage event.
 */
export async function updateUsageEventOutcome(
  serviceClient: SupabaseClient,
  requestId: string,
  outcome: string,
  durationMs?: number
): Promise<void> {
  const patch: Record<string, unknown> = { outcome };
  if (durationMs != null) patch.duration_ms = durationMs;
  const { error } = await serviceClient
    .from("usage_events")
    .update(patch)
    .eq("request_id", requestId);
  if (error) {
    console.error("[rate-limit] update outcome failed:", error.message);
  }
}

// ---------------------------------------------------------------------------
// Specific cap checks
// ---------------------------------------------------------------------------

/** Check daily message generation cap */
export async function checkMessageGenerationLimit(
  serviceClient: SupabaseClient,
  userId: string
): Promise<RateLimitResult> {
  const count = await countRecentEvents(
    serviceClient,
    userId,
    "message_generate",
    24 * 60 * 60 * 1000 // 24h
  );
  if (count >= CAPS.maxMessagesPerDay) {
    return {
      allowed: false,
      reason: `Daily message limit reached (${CAPS.maxMessagesPerDay}). Try again tomorrow.`,
    };
  }
  return { allowed: true };
}

/** Check daily voice creation cap */
export async function checkVoiceCreationLimit(
  serviceClient: SupabaseClient,
  userId: string
): Promise<RateLimitResult> {
  const count = await countRecentEvents(
    serviceClient,
    userId,
    "voice_create",
    24 * 60 * 60 * 1000
  );
  if (count >= CAPS.maxVoiceCreationsPerDay) {
    return {
      allowed: false,
      reason: `Daily voice creation limit reached (${CAPS.maxVoiceCreationsPerDay}). Try again tomorrow.`,
    };
  }
  return { allowed: true };
}

/** Check per-profile clip count cap (uses training_clips table, not usage_events) */
export async function checkClipUploadLimit(
  supabase: SupabaseClient,
  voiceProfileId: string
): Promise<RateLimitResult> {
  const { count, error } = await supabase
    .from("training_clips")
    .select("id", { count: "exact", head: true })
    .eq("voice_profile_id", voiceProfileId)
    .neq("status", "deleted");

  if (error) {
    console.error("[rate-limit] clip count query failed:", error.message);
    return { allowed: true }; // fail open
  }

  if ((count ?? 0) >= CAPS.maxClipsPerProfile) {
    return {
      allowed: false,
      reason: `Maximum clips reached for this voice profile (${CAPS.maxClipsPerProfile}).`,
    };
  }
  return { allowed: true };
}

/** Check signed URL rate limit (per minute) */
export async function checkSignedUrlLimit(
  serviceClient: SupabaseClient,
  userId: string
): Promise<RateLimitResult> {
  const count = await countRecentEvents(
    serviceClient,
    userId,
    ["signed_url_playback", "signed_url_upload"],
    60 * 1000 // 1 minute
  );
  if (count >= CAPS.maxSignedUrlsPerMinute) {
    return {
      allowed: false,
      reason: "Too many requests. Try again in a moment.",
      retryAfterMs: 60_000,
    };
  }
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Convenience: throw if not allowed
// ---------------------------------------------------------------------------

export function assertAllowed(result: RateLimitResult): void {
  if (!result.allowed) {
    // Determine if it's a daily limit or a short-term rate limit
    const isDaily =
      result.reason.includes("Daily") || result.reason.includes("tomorrow");
    throw new AppError(
      isDaily ? ErrorCode.DAILY_LIMIT_REACHED : ErrorCode.RATE_LIMIT_EXCEEDED,
      result.reason,
      429,
      !isDaily, // daily limits are not retryable (until tomorrow), short-term are
    );
  }
}
