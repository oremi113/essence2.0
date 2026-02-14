/**
 * Dev-only: check if ELEVENLABS_API_KEY is loaded (no key value exposed).
 * Visit http://localhost:3000/api/dev/elevenlabs-check
 * In production this returns 404.
 */
import { NextResponse } from "next/server";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const key = process.env.ELEVENLABS_API_KEY;
  const set = !!key?.trim();
  return NextResponse.json({
    ELEVENLABS_API_KEY_set: set,
    length: set ? key!.trim().length : 0,
    hint: set ? "Key is loaded. If ElevenLabs still says invalid, the key may be wrong or revoked in the ElevenLabs dashboard." : "Add ELEVENLABS_API_KEY to .env or .env.local in project root, then restart the dev server.",
  });
}
