"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { RecordingUpload } from "@/components/audio/RecordingUpload";
import { voiceTrainingScript, TOTAL_PROMPT_COUNT } from "@/lib/voice-training/script";
import { resolvePrompt } from "@/lib/voice-training/resolver";
import type { ResolverContext, VoiceStage } from "@/lib/voice-training/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Given a global 1-based prompt index, find the stage and prompt-within-stage. */
function locatePrompt(globalIndex: number): {
  stageIdx: number;
  promptIdx: number;
  stage: VoiceStage;
} | null {
  let running = 0;
  for (let s = 0; s < voiceTrainingScript.length; s++) {
    const stage = voiceTrainingScript[s];
    if (globalIndex <= running + stage.prompts.length) {
      return { stageIdx: s, promptIdx: globalIndex - running - 1, stage };
    }
    running += stage.prompts.length;
  }
  return null;
}

/** Check whether `globalIndex` is the last prompt of its stage. */
function isLastPromptInStage(globalIndex: number): boolean {
  const loc = locatePrompt(globalIndex);
  if (!loc) return false;
  return loc.promptIdx === loc.stage.prompts.length - 1;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = {
  voiceProfileId: string;
  voiceProfileStatus: string;
  resolverContext: ResolverContext;
  /** How many prompts (1-based) have already been committed. */
  initialCompletedPrompts: number;
};

type Phase = "prompt" | "stage-complete" | "all-done";

export function RecordingUploadWrapper({
  voiceProfileId,
  voiceProfileStatus,
  resolverContext,
  initialCompletedPrompts,
}: Props) {
  // The next global prompt id to record (1-based).
  const [currentGlobal, setCurrentGlobal] = useState(
    Math.min(initialCompletedPrompts + 1, TOTAL_PROMPT_COUNT + 1)
  );
  const [phase, setPhase] = useState<Phase>(
    initialCompletedPrompts >= TOTAL_PROMPT_COUNT ? "all-done" : "prompt"
  );

  // Derive the stage/prompt location
  const location = useMemo(() => locatePrompt(currentGlobal), [currentGlobal]);
  const stage = location?.stage ?? null;
  const prompt =
    stage && location ? stage.prompts[location.promptIdx] : null;

  // Resolve the prompt text with context (client-side, display only)
  const resolved = useMemo(() => {
    if (!prompt) return null;
    return resolvePrompt(prompt, resolverContext);
  }, [prompt, resolverContext]);

  // Called when RecordingUpload commits successfully
  const handleClipReady = useCallback(() => {
    if (currentGlobal >= TOTAL_PROMPT_COUNT) {
      // All 25 prompts done
      setPhase("all-done");
      return;
    }
    if (isLastPromptInStage(currentGlobal)) {
      // Show stage completion screen before advancing
      setPhase("stage-complete");
      return;
    }
    // Advance to next prompt
    setCurrentGlobal((prev) => prev + 1);
  }, [currentGlobal]);

  // Advance from stage-complete to next prompt
  const handleContinue = useCallback(() => {
    setCurrentGlobal((prev) => prev + 1);
    setPhase("prompt");
  }, []);

  // ---------------------------------------------------------------------------
  // Render: all done
  // ---------------------------------------------------------------------------
  if (phase === "all-done") {
    const finalStage = voiceTrainingScript[voiceTrainingScript.length - 1];
    const cm = finalStage.completionMessage;
    return (
      <div>
        <h2>{cm.title}</h2>
        <p>{cm.body}</p>
        <p style={{ fontWeight: 500, marginTop: 8 }}>{cm.progress}</p>

        {voiceProfileStatus === "ready" ? (
          <div style={{ marginTop: 20 }}>
            <Link href="/app/messages/new">
              <button
                type="button"
                style={{
                  padding: "10px 24px",
                  borderRadius: 6,
                  border: "none",
                  background: "#111",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {cm.cta}
              </button>
            </Link>
          </div>
        ) : (
          <div style={{ marginTop: 20 }}>
            <Link
              href={`/app/voice/create?voiceProfileId=${encodeURIComponent(voiceProfileId)}`}
            >
              <button
                type="button"
                style={{
                  padding: "10px 24px",
                  borderRadius: 6,
                  border: "none",
                  background: "#111",
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {cm.cta}
              </button>
            </Link>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: stage completion
  // ---------------------------------------------------------------------------
  if (phase === "stage-complete" && stage) {
    const cm = stage.completionMessage;
    return (
      <div>
        <h2>{cm.title}</h2>
        <p>{cm.body}</p>
        <p style={{ fontWeight: 500, marginTop: 8 }}>{cm.progress}</p>
        <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={handleContinue}
            style={{
              padding: "10px 24px",
              borderRadius: 6,
              border: "none",
              background: "#111",
              color: "#fff",
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {cm.cta}
          </button>
          {cm.alternativeCta && (
            <Link href="/app/shelf">
              <button
                type="button"
                style={{
                  padding: "10px 24px",
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  background: "transparent",
                  fontSize: 15,
                  cursor: "pointer",
                }}
              >
                {cm.alternativeCta}
              </button>
            </Link>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: prompt recording
  // ---------------------------------------------------------------------------
  if (!stage || !prompt || !resolved) {
    return <p>Something went wrong. Please refresh the page.</p>;
  }

  return (
    <div>
      {/* Stage header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 2 }}>
          Stage {stage.stage} of {voiceTrainingScript.length} &middot;{" "}
          {stage.estimatedTime}
        </p>
        <h2 style={{ margin: "0 0 4px" }}>{stage.title}</h2>
        <p style={{ color: "#666", fontSize: 14 }}>{stage.description}</p>
      </div>

      {/* Progress indicator */}
      <p style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
        Prompt {currentGlobal} of {TOTAL_PROMPT_COUNT}
      </p>

      {/* Prompt card */}
      <div
        style={{
          border: "1px solid #e0e0e0",
          borderRadius: 10,
          padding: "20px 24px",
          marginBottom: 20,
          background: "#fafafa",
        }}
      >
        <p style={{ fontWeight: 500, marginBottom: 8 }}>
          {prompt.instruction}
        </p>
        {prompt.emotionalTone && (
          <p
            style={{
              fontSize: 13,
              color: "#888",
              marginBottom: 12,
              fontStyle: "italic",
            }}
          >
            Tone: {prompt.emotionalTone}
          </p>
        )}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e8e8e8",
            borderRadius: 8,
            padding: "16px 20px",
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          {resolved.resolvedText}
        </div>
      </div>

      {/* Recording component */}
      <RecordingUpload
        voiceProfileId={voiceProfileId}
        promptIndex={currentGlobal}
        resolvedVariantKeys={resolved.resolvedMeta}
        onReady={handleClipReady}
      />
    </div>
  );
}
