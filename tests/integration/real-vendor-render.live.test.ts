import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { ensureVoiceSample } from "@/lib/voice-sample/ensureVoiceSample";

/**
 * The one test that spends money.
 *
 * No vendor mock: it makes a real, paid ElevenLabs render to prove the whole
 * path — vendor call, alignment collapse, storage upload, row write — actually
 * fits together. Mocks proved every piece in isolation and still could not have
 * caught that the cadence table was 61% long.
 *
 * OFF by default. Run deliberately:
 *
 *   REAL_VENDOR=1 npx vitest run --config vitest.integration.config.ts \
 *     tests/integration/_realvendor.test.ts
 *
 * Needs the local stack, a real sk_ ELEVENLABS_API_KEY, and a vendor_voice_id
 * that exists in that ElevenLabs account. Worth running once before Step 5
 * ships and after any change to the render path.
 */
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

describe.runIf(process.env.REAL_VENDOR === "1")("REAL vendor end-to-end", () => {
  it("renders through ensureVoiceSample and persists real word offsets", async () => {
    const service = createClient(URL_, KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const userId = "00000000-0000-4000-8000-000000000001";

    await service.from("voice_profiles").delete().eq("user_id", userId);
    const { data: prof } = await service
      .from("voice_profiles")
      .insert({
        user_id: userId,
        label: "real vendor",
        status: "ready",
        vendor_voice_id: process.env.REAL_VENDOR_VOICE_ID ?? "xtw4wiBa3u4cFZmEyDXK",
      })
      .select("id")
      .single();

    const result = await ensureVoiceSample({
      supabase: service as never,
      service: service as never,
      userId,
      voiceProfileId: prof!.id,
      requestId: "real-1",
      startMs: Date.now(),
    });

    expect(result).toMatchObject({ ok: true, rendered: true });

    const { data: row } = await service
      .from("voice_profiles")
      .select("sample_status, sample_audio_path, sample_duration_ms, sample_line, sample_word_offsets, sample_render_count")
      .eq("id", prof!.id)
      .single();

    const offsets = row!.sample_word_offsets as number[];
    const words = row!.sample_line!.split(" ").length;

    console.log("REAL RESULT", {
      status: row!.sample_status,
      durationMs: row!.sample_duration_ms,
      renders: row!.sample_render_count,
      words,
      offsets,
    });

    expect(row!.sample_status).toBe("ready");
    expect(row!.sample_render_count).toBe(1);
    expect(offsets).toHaveLength(words);
    expect(offsets[0]).toBe(0);
    expect(Math.max(...offsets)).toBeLessThanOrEqual(row!.sample_duration_ms!);
  }, 90000);
});
