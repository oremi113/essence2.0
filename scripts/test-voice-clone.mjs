#!/usr/bin/env node
/**
 * Test a cloned voice by generating a short text-to-speech clip.
 * Run from project root: node scripts/test-voice-clone.mjs
 *
 * Reads ELEVENLABS_API_KEY from .env.local, fetches the voice clone
 * from the database voice_id, and generates a short audio sample.
 */
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// --- Read API key from .env.local ---
let apiKey = "";
try {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const line = content.split("\n").find((l) => /^\s*ELEVENLABS_API_KEY\s*=/.test(l));
  if (line) {
    apiKey = line.split("=", 2)[1]?.trim() ?? "";
    if ((apiKey.startsWith('"') && apiKey.endsWith('"')) || (apiKey.startsWith("'") && apiKey.endsWith("'")))
      apiKey = apiKey.slice(1, -1).trim();
  }
} catch (e) {
  console.error("Could not read .env.local:", e.message);
  process.exit(1);
}

if (!apiKey) {
  console.error("ELEVENLABS_API_KEY not found in .env.local");
  process.exit(1);
}

// --- Find the cloned voice ---
console.log("Fetching your ElevenLabs voices...\n");

const voicesRes = await fetch("https://api.elevenlabs.io/v1/voices", {
  headers: { "xi-api-key": apiKey },
});

if (!voicesRes.ok) {
  console.error("Failed to fetch voices:", voicesRes.status, await voicesRes.text());
  process.exit(1);
}

const voicesData = await voicesRes.json();
const clonedVoices = voicesData.voices.filter((v) => v.category === "cloned");

if (clonedVoices.length === 0) {
  console.error("No cloned voices found on your account. The voice creation may not have succeeded.");
  process.exit(1);
}

console.log(`Found ${clonedVoices.length} cloned voice(s):\n`);
clonedVoices.forEach((v, i) => {
  console.log(`  ${i + 1}. "${v.name}" (id: ${v.voice_id}, created: ${v.created_at ?? "unknown"})`);
});

// Use the most recently created cloned voice (or the known one)
const targetVoiceId = clonedVoices[clonedVoices.length - 1].voice_id;
const targetName = clonedVoices[clonedVoices.length - 1].name;
console.log(`\nUsing voice: "${targetName}" (${targetVoiceId})`);

// --- Generate speech ---
const testText = "Hello! This is a test of my cloned voice. If you can hear this and it sounds like me, the voice clone was created successfully.";

console.log(`\nGenerating speech: "${testText.slice(0, 60)}..."`);

const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`, {
  method: "POST",
  headers: {
    "xi-api-key": apiKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    text: testText,
    model_id: "eleven_multilingual_v2",
  }),
});

if (!ttsRes.ok) {
  const errBody = await ttsRes.text();
  console.error(`\nTTS failed (${ttsRes.status}):`, errBody.slice(0, 300));
  process.exit(1);
}

const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());
const outDir = resolve(process.cwd(), ".tmp");
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, "test-voice-output.mp3");
writeFileSync(outPath, audioBuffer);

console.log(`\n✅ Success! Audio saved to: ${outPath}`);
console.log(`   File size: ${(audioBuffer.length / 1024).toFixed(1)} KB`);
console.log(`\nTo listen, run:  open ${outPath}`);
