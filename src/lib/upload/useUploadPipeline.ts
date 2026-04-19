"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Reusable 3-step upload pipeline: init (server) -> direct PUT to signed URL
 * (client) -> commit (server). Extracted from RecordingUpload so other
 * features (voice profile photo, message audio, retries) can share it.
 */

export type UploadStatus =
  | "idle"
  | "initializing"
  | "uploading"
  | "committing"
  | "succeeded"
  | "failed";

export interface InitResponse {
  id: string;
  signedUploadUrl: string;
  requiredHeaders: Record<string, string>;
  [key: string]: unknown;
}

export interface UseUploadPipelineConfig<TMeta, TInit extends InitResponse = InitResponse> {
  /** Endpoint that creates the DB row and returns a signed upload URL. */
  initEndpoint: string;
  /** Endpoint that verifies the upload and flips the row to ready. */
  commitEndpoint: string;
  /** Map per-feature metadata to the init request body. Defaults to `meta` itself. */
  buildInitBody?: (meta: TMeta) => unknown;
  /**
   * Map per-feature metadata + init response to the commit request body.
   * Defaults to `{ id: init.id }`.
   */
  buildCommitBody?: (meta: TMeta, init: TInit) => unknown;
  /**
   * Optional hook fired synchronously when the pipeline transitions
   * between stages. Useful for callers that need to map transitions
   * onto their own local state without subscribing to `status`.
   */
  onStageChange?: (stage: UploadStatus) => void;
}

export interface UploadResult<TInit extends InitResponse, TCommitResponse> {
  init: TInit;
  commit: TCommitResponse;
}

export interface UseUploadPipelineResult<TMeta, TInit extends InitResponse, TCommitResponse> {
  status: UploadStatus;
  error: string | null;
  /** Imperatively run the full init -> PUT -> commit sequence. */
  upload: (blob: Blob, meta: TMeta) => Promise<UploadResult<TInit, TCommitResponse>>;
  /** Reset status/error back to idle. Does not touch in-flight requests. */
  reset: () => void;
  /** Abort any in-flight fetches from the current upload() call. */
  cancel: () => void;
}

/**
 * Error messages and the init/PUT/commit ordering must stay byte-identical
 * to the original inline implementation in RecordingUpload; tests and
 * users see these strings.
 */
export function useUploadPipeline<
  TMeta,
  TCommitResponse = unknown,
  TInit extends InitResponse = InitResponse
>(
  config: UseUploadPipelineConfig<TMeta, TInit>
): UseUploadPipelineResult<TMeta, TInit, TCommitResponse> {
  const { initEndpoint, commitEndpoint, buildInitBody, buildCommitBody, onStageChange } = config;

  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const upload = useCallback(
    async (blob: Blob, meta: TMeta): Promise<UploadResult<TInit, TCommitResponse>> => {
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setStatus("initializing");
      onStageChange?.("initializing");

      try {
        const initBody = buildInitBody ? buildInitBody(meta) : meta;
        const initRes = await fetch(initEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(initBody),
          signal: controller.signal,
        });
        if (!initRes.ok) {
          const data = await initRes.json().catch(() => ({}));
          const msg = data.detail ? `${data.error}: ${data.detail}` : (data.error || "Init upload failed");
          throw new Error(msg);
        }
        const init = (await initRes.json()) as TInit;
        const { signedUploadUrl, requiredHeaders } = init;

        setStatus("uploading");
        onStageChange?.("uploading");
        const putHeaders: Record<string, string> = {
          "Content-Type": requiredHeaders?.["Content-Type"] ?? blob.type ?? "application/octet-stream",
        };
        const putRes = await fetch(signedUploadUrl, {
          method: "PUT",
          headers: putHeaders,
          body: blob,
          signal: controller.signal,
        });
        if (!putRes.ok) {
          throw new Error("Upload failed");
        }

        setStatus("committing");
        onStageChange?.("committing");
        const commitBody = buildCommitBody
          ? buildCommitBody(meta, init)
          : { id: init.id };
        const commitRes = await fetch(commitEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(commitBody),
          signal: controller.signal,
        });
        if (!commitRes.ok) {
          const data = await commitRes.json().catch(() => ({}));
          const msg = data.detail ? `${data.error}: ${data.detail}` : (data.error || "Commit failed");
          throw new Error(msg);
        }

        const commitJson = (await commitRes.json().catch(() => ({}))) as TCommitResponse;
        setStatus("succeeded");
        onStageChange?.("succeeded");
        abortRef.current = null;
        return { init, commit: commitJson };
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setStatus("failed");
        onStageChange?.("failed");
        abortRef.current = null;
        throw err;
      }
    },
    [initEndpoint, commitEndpoint, buildInitBody, buildCommitBody, onStageChange]
  );

  return { status, error, upload, reset, cancel };
}
