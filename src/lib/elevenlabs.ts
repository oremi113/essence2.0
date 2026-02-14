/**
 * ElevenLabs API — server-only.
 * Never expose ELEVENLABS_API_KEY to client. Voice id is stored in DB only, not returned in API responses.
 */
import "server-only";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1";
const REQUEST_TIMEOUT_MS = 90_000; // 90 s — fail fast so user sees error instead of hanging

/** ElevenLabs /v1/voices/add expects multipart field "name" and "files" (one or more audio files). */
const FORM_FIELD_FILES = "files";

function getApiKey(): string {
  let key = process.env.ELEVENLABS_API_KEY ?? "";
  key = key.trim();
  if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1).trim();
  if (key.startsWith("'") && key.endsWith("'")) key = key.slice(1, -1).trim();
  if (!key) {
    throw new Error("ELEVENLABS_API_KEY is not set");
  }
  return key;
}

export type CreateVoiceFromClipsParams = {
  name: string;
  /** Audio file blobs (e.g. webm). Order preserved. */
  audioBlobs: Blob[];
};

export type CreateVoiceFromClipsResult =
  | { ok: true; voice_id: string }
  | { ok: false; status: number; code?: string; message: string };

/**
 * Create an Instant Voice Clone from audio samples.
 * Enforces timeout and logs safely (no keys or voice ids in logs).
 * Voice id is stored in DB by the caller; never exposed to client.
 */
export async function createVoiceFromClips(
  params: CreateVoiceFromClipsParams
): Promise<CreateVoiceFromClipsResult> {
  const { name, audioBlobs } = params;
  if (!name?.trim()) {
    return { ok: false, status: 400, message: "Voice name is required" };
  }
  if (!audioBlobs?.length) {
    return { ok: false, status: 400, message: "At least one audio sample is required" };
  }

  const form = new FormData();
  form.append("name", name.trim());
  for (let i = 0; i < audioBlobs.length; i++) {
    const blob = audioBlobs[i];
    const isWebm = blob.type?.includes("webm") ?? true;
    const ext = isWebm ? "webm" : "mp3";
    const mime = isWebm ? "audio/webm" : "audio/mpeg";
    const fileBlob = blob.type ? blob : new Blob([blob], { type: mime });
    form.append(FORM_FIELD_FILES, fileBlob, `sample_${i + 1}.${ext}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${ELEVENLABS_BASE}/voices/add`, {
      method: "POST",
      headers: {
        "xi-api-key": getApiKey(),
      },
      body: form,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        typeof data?.detail?.message === "string"
          ? data.detail.message
          : typeof data?.message === "string"
            ? data.message
            : `ElevenLabs error ${res.status}`;
      const code = data?.detail?.code ?? data?.error ?? data?.detail?.status;
      console.error("[elevenlabs] create voice failed:", res.status, code ?? "", message);
      if (res.status === 401) {
        console.error("[elevenlabs] 401 = key rejected. Check: .env.local has ELEVENLABS_API_KEY=sk_... (no quotes), restart server, or create a new key at elevenlabs.io → Profile → API Keys.");
      }
      return {
        ok: false,
        status: res.status,
        code: code ?? (typeof data?.detail?.code === "string" ? data.detail.code : undefined),
        message,
      };
    }

    const voiceId = data?.voice_id;
    if (!voiceId || typeof voiceId !== "string") {
      console.error("[elevenlabs] unexpected response: no voice_id");
      return { ok: false, status: 502, message: "Invalid response from voice service" };
    }
    return { ok: true, voice_id: voiceId };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        console.error("[elevenlabs] request timeout");
        return { ok: false, status: 504, message: "Request timed out" };
      }
      console.error("[elevenlabs] request error:", err.message);
      return { ok: false, status: 502, message: err.message };
    }
    return { ok: false, status: 502, message: "Unknown error" };
  }
}
