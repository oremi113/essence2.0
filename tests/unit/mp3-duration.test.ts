import { describe, expect, it } from "vitest";
import {
  ELEVENLABS_MP3_BITRATE_KBPS,
  mp3DurationMsFromByteLength,
} from "@/lib/audio/mp3-duration";

describe("mp3DurationMsFromByteLength", () => {
  it("derives duration from CBR byte length (128 kbps default)", () => {
    // 128 kbps = 16,000 bytes per second.
    expect(mp3DurationMsFromByteLength(16_000)).toBe(1_000);
    expect(mp3DurationMsFromByteLength(160_000)).toBe(10_000);
    // The 18s/108,525-byte seed clip from the A6 smoke pass ≈ 6.8s at 128k…
    // …because it was encoded at 48 kbps; the bitrate param covers that.
    expect(mp3DurationMsFromByteLength(108_525, 48)).toBe(18_088);
  });

  it("uses the ElevenLabs default bitrate constant", () => {
    expect(ELEVENLABS_MP3_BITRATE_KBPS).toBe(128);
  });

  it("returns null on junk input", () => {
    expect(mp3DurationMsFromByteLength(0)).toBeNull();
    expect(mp3DurationMsFromByteLength(-5)).toBeNull();
    expect(mp3DurationMsFromByteLength(NaN)).toBeNull();
    expect(mp3DurationMsFromByteLength(Infinity)).toBeNull();
    expect(mp3DurationMsFromByteLength(16_000, 0)).toBeNull();
  });
});
