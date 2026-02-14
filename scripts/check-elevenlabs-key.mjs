#!/usr/bin/env node
/**
 * Check if ELEVENLABS_API_KEY from .env.local is accepted by ElevenLabs.
 * Run from project root: node scripts/check-elevenlabs-key.mjs
 * Use a NEW terminal tab (not the one running npm run dev) so you see this output.
 */
import { readFileSync } from "fs";
import { resolve } from "path";

console.log("--- ElevenLabs key check ---");

let key = "";
try {
  const envPath = resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf8");
  const line = content.split("\n").find((l) => /^\s*ELEVENLABS_API_KEY\s*=/.test(l));
  if (line) {
    key = line.split("=", 2)[1]?.trim() ?? "";
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'")))
      key = key.slice(1, -1).trim();
  }
} catch (e) {
  console.error("Could not read .env.local:", e.message);
  process.exit(1);
}

if (!key) {
  console.error("ELEVENLABS_API_KEY not found in .env.local");
  process.exit(1);
}

console.log("Key length:", key.length);

try {
  const res = await fetch("https://api.elevenlabs.io/v1/voices", {
    headers: { "xi-api-key": key },
  });
  console.log("ElevenLabs /v1/voices →", res.status, res.statusText);
  if (res.ok) {
    const data = await res.json();
    console.log("Key is valid. Voices count:", data.voices?.length ?? 0);
    console.log("--- If the app still says invalid key, restart the dev server (Ctrl+C then npm run dev). ---");
  } else {
    const text = await res.text();
    console.log("Key rejected. Response:", text.slice(0, 300));
    if (res.status === 401) {
      console.log("\nFix: Create a new API key at https://elevenlabs.io → Profile → API Keys, put it in .env.local as ELEVENLABS_API_KEY=sk_... (no quotes), then run this script again.");
    }
    process.exit(1);
  }
} catch (err) {
  console.error("Request failed:", err.message);
  process.exit(1);
}
