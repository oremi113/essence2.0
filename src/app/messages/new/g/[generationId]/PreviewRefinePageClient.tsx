"use client";

/**
 * Client wrapper for A6 (Preview & Refine, Deferred-Audio).
 *
 * Owns what the pure screen can't: the fetch for each server action
 * (normalizing the route response shapes to the screen's callback-result
 * contract), navigation on exit paths, persisting the per-user UI
 * latches (profiles.ui_flags via the page's server action), and the V1
 * client telemetry (preview_played, message_saved, message_save_failed,
 * message_discarded, cost_limit_blocked — see
 * docs/analytics/2026-06-01-step6-events.md and the 2026-06-11 A6
 * wiring note).
 *
 * Save success routes to A7 (/messages/saved/[messageId]); reshape and
 * the back chevron route to A4 (/messages/new/g/[id]/reshape), which
 * writes a candidate back onto this row and returns here. Interim
 * navigation (FOLLOW_UPS #38): C3 (Vault Limit) isn't built, so a
 * vault-limit save and discard both land on Home. A lapsed subscription
 * routes to the existing restore gate.
 */
import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PreviewRefineScreen } from "@/components/screens/messages/PreviewRefineScreen";
import type {
  CommitResult,
  FreeDraftResult,
  PlaybackResult,
  SaveResult,
} from "@/components/screens/messages/PreviewRefineScreen.types";
import { clearFlowId, getFlowStartedAt, trackStep6 } from "@/lib/analytics/step6";
import { estimateSpeechDurationSec } from "@/lib/messages/speech-duration";
import { messageReshapeRoute, messageSavedRoute, ROUTES } from "@/lib/routes";

/** One-way per-user latches in profiles.ui_flags this screen owns. */
export type A6UiFlag = "a6_play_hint_learned" | "a6_visited";

interface PreviewRefinePageClientProps {
  generationId: string;
  voiceProfileId: string;
  committedText: string;
  committedDurationSec: number;
  initialCandidateText: string | null;
  recordingsRemaining: number;
  rerollsRemaining: number;
  /** Server-authoritative caps (STEP6_LIMITS) for count → remaining math. */
  maxAudioRenders: number;
  maxTextRerolls: number;
  reshapeExhausted: boolean;
  playHintLearned: boolean;
  isFirstArrival: boolean;
  // Telemetry context (never rendered).
  category: string;
  relationship: string | null;
  hadNote: boolean;
  regenerateCount: number;
  editNoteDepth: number;
  savedCountBefore: number;
  /** Server action (page-owned): latch a ui_flags key for this user. */
  onPersistUiFlag: (flag: A6UiFlag) => Promise<void>;
}

/** Loose view of the Step 6 route response bodies this wrapper reads. */
interface Step6ResponseBody {
  candidate?: boolean;
  candidateText?: string;
  textRerollCount?: number;
  committed?: boolean;
  audioRenderCount?: number;
  audioDurationMs?: number;
  messageId?: string;
  url?: string;
  code?: string;
  limit_kind?: string;
  retryable?: boolean;
}

async function callRoute(
  path: string,
  body?: Record<string, unknown>,
): Promise<{ status: number; data: Step6ResponseBody }> {
  try {
    const res = await fetch(path, body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined);
    const data = (await res.json().catch(() => ({}))) as Step6ResponseBody;
    return { status: res.status, data };
  } catch {
    // Network failure — surface as a retryable non-2xx.
    return { status: 0, data: {} };
  }
}

function remainingFrom(max: number, spentCount: number | undefined): number {
  return typeof spentCount === "number" ? Math.max(0, max - spentCount) : 0;
}

export function PreviewRefinePageClient({
  generationId,
  voiceProfileId,
  committedText,
  committedDurationSec,
  initialCandidateText,
  recordingsRemaining,
  rerollsRemaining,
  maxAudioRenders,
  maxTextRerolls,
  reshapeExhausted,
  playHintLearned,
  isFirstArrival,
  category,
  relationship,
  hadNote,
  regenerateCount,
  editNoteDepth,
  savedCountBefore,
  onPersistUiFlag,
}: PreviewRefinePageClientProps) {
  const router = useRouter();

  // The draft currently on the card — commit's duration estimate needs it
  // (the commit response carries counts, not text).
  const candidateTextRef = useRef<string | null>(initialCandidateText);
  // step6.preview_played fires once per A6 visit; had_played feeds discard.
  const previewPlayedRef = useRef(false);
  const arrivedAtRef = useRef<number | null>(null);

  // Stamp arrival + consume first-arrival (the education line never shows
  // twice). Latch persistence is best-effort — a failed action just re-shows
  // the line next time.
  useEffect(() => {
    arrivedAtRef.current = Date.now();
    void onPersistUiFlag("a6_visited").catch(() => {});
  }, [onPersistUiFlag]);

  const exitFlow = useCallback(
    (destination: string) => {
      clearFlowId();
      router.push(destination);
    },
    [router],
  );

  // ─── Server actions ────────────────────────────────────────────────────

  const handleFreeDraft = useCallback(async (): Promise<FreeDraftResult> => {
    const { status, data } = await callRoute("/api/messages/regenerate", {
      generationId,
      mode: "variant",
    });
    if (status === 200 && data.candidate && typeof data.candidateText === "string") {
      candidateTextRef.current = data.candidateText;
      return {
        ok: true,
        candidateText: data.candidateText,
        rerollsRemaining: remainingFrom(maxTextRerolls, data.textRerollCount),
      };
    }
    if (status === 429) {
      trackStep6("cost_limit_blocked", { limit_kind: data.limit_kind ?? "unknown" });
    }
    return { ok: false, retryable: data.retryable === true || status === 0 };
  }, [generationId, maxTextRerolls]);

  const handleCommit = useCallback(async (): Promise<CommitResult> => {
    const draftText = candidateTextRef.current ?? "";
    const { status, data } = await callRoute("/api/messages/commit", { generationId });
    if (status === 200 && data.committed) {
      candidateTextRef.current = null;
      return {
        ok: true,
        recordingsRemaining: remainingFrom(maxAudioRenders, data.audioRenderCount),
        // Measured by the render (CBR mp3 byte length); wpm estimate only if
        // the response somehow lacks it. loadedmetadata still corrects last.
        durationSec:
          typeof data.audioDurationMs === "number" && data.audioDurationMs > 0
            ? Math.max(1, Math.round(data.audioDurationMs / 1000))
            : estimateSpeechDurationSec(draftText),
      };
    }
    if (status === 429) {
      trackStep6("cost_limit_blocked", { limit_kind: data.limit_kind ?? "unknown" });
    }
    return { ok: false, retryable: data.retryable === true || status === 0 };
  }, [generationId, maxAudioRenders]);

  const handleKeepCurrent = useCallback(async (): Promise<void> => {
    candidateTextRef.current = null;
    await callRoute("/api/messages/regenerate", { generationId, mode: "keep" });
  }, [generationId]);

  const handleSave = useCallback(async (): Promise<SaveResult> => {
    const { status, data } = await callRoute("/api/messages/save", { generationId });

    if (status === 200 && typeof data.messageId === "string") {
      const flowStartedAt = getFlowStartedAt();
      trackStep6("message_saved", {
        message_id: data.messageId,
        voice_profile_id: voiceProfileId,
        category,
        relationship,
        regenerate_count: regenerateCount,
        edit_note_depth: editNoteDepth,
        had_note: hadNote,
        saved_ordinal: savedCountBefore + 1,
        ...(flowStartedAt !== null
          ? { time_from_flow_start_ms: Date.now() - flowStartedAt }
          : {}),
      });
      return { ok: true, messageId: data.messageId };
    }

    trackStep6("message_save_failed", {
      generation_id: generationId,
      voice_profile_id: voiceProfileId,
      failure_phase: data.code === "vault_limit_reached" ? "quota_check" : "unknown",
      error_code: data.code ?? `http_${status}`,
    });

    if (data.code === "vault_limit_reached") {
      // C3 (Vault Limit) isn't built — Home is the interim landing
      // (FOLLOW_UPS #38). step6.vault_limit_blocked fires when C3 exists.
      exitFlow(ROUTES.home);
      return { ok: false, code: "vault_limit_reached" };
    }
    if (data.code === "subscription_lapsed") {
      router.push(ROUTES.vaultRestore);
      return { ok: false, code: "subscription_lapsed" };
    }
    return { ok: false, code: "retryable" };
  }, [
    generationId,
    voiceProfileId,
    category,
    relationship,
    regenerateCount,
    editNoteDepth,
    hadNote,
    savedCountBefore,
    exitFlow,
    router,
  ]);

  const handleDiscard = useCallback(async (): Promise<void> => {
    const { status } = await callRoute("/api/messages/discard", { generationId });
    if (status === 200) {
      trackStep6("message_discarded", {
        generation_id: generationId,
        voice_profile_id: voiceProfileId,
        had_played: previewPlayedRef.current,
      });
    }
    // Non-200 (already saved / transient 500): still let the screen exit —
    // discard is idempotent and the 24h expiry sweep covers a missed delete.
  }, [generationId, voiceProfileId]);

  const handleRequestPlayback = useCallback(async (): Promise<PlaybackResult> => {
    const { status, data } = await callRoute(`/api/messages/generations/${generationId}/play`);
    if (status === 200 && typeof data.url === "string") {
      if (!previewPlayedRef.current) {
        previewPlayedRef.current = true;
        trackStep6("preview_played", {
          generation_id: generationId,
          voice_profile_id: voiceProfileId,
          regenerate_count: regenerateCount,
          edit_note_depth: editNoteDepth,
          ...(arrivedAtRef.current !== null
            ? { time_from_a6_arrival_ms: Date.now() - arrivedAtRef.current }
            : {}),
        });
      }
      return { ok: true, url: data.url };
    }
    return { ok: false };
  }, [generationId, voiceProfileId, regenerateCount, editNoteDepth]);

  // ─── Latches + navigation ──────────────────────────────────────────────

  const handlePlayHintLearned = useCallback(() => {
    void onPersistUiFlag("a6_play_hint_learned").catch(() => {});
  }, [onPersistUiFlag]);

  // Reshape ("What it says") and the back chevron go to A4 with this
  // generation as fromGenerationId; the deferred reshape writes a
  // candidate back onto this row and returns here in the candidate state.
  const handleReshape = useCallback(() => {
    router.push(messageReshapeRoute(generationId));
  }, [generationId, router]);

  const handleBack = useCallback(() => {
    router.push(messageReshapeRoute(generationId));
  }, [generationId, router]);

  const handleSaved = useCallback(
    (messageId: string) => {
      exitFlow(messageSavedRoute(messageId));
    },
    [exitFlow],
  );

  const handleDiscarded = useCallback(() => {
    exitFlow(ROUTES.home);
  }, [exitFlow]);

  return (
    <PreviewRefineScreen
      committed={{ text: committedText, durationSec: committedDurationSec }}
      initialCandidateText={initialCandidateText}
      recordingsRemaining={recordingsRemaining}
      rerollsRemaining={rerollsRemaining}
      reshapeExhausted={reshapeExhausted}
      playHintLearned={playHintLearned}
      isFirstArrival={isFirstArrival}
      onFreeDraft={handleFreeDraft}
      onCommit={handleCommit}
      onKeepCurrent={handleKeepCurrent}
      onSave={handleSave}
      onDiscard={handleDiscard}
      onReshape={handleReshape}
      onRequestPlayback={handleRequestPlayback}
      onBack={handleBack}
      onPlayHintLearned={handlePlayHintLearned}
      onSaved={handleSaved}
      onDiscarded={handleDiscarded}
    />
  );
}
