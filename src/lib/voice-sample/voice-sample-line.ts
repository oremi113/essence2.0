/**
 * The line spoken in the user's own preserved voice at Step 5 First Playback.
 *
 * §4.2 of the design handoff — the single highest-stakes copy decision in the
 * product. Continuity-framed, addressed to no one and therefore to everyone,
 * and it survives being played aloud to family in the room.
 *
 * Constraints it has to keep holding: neutral (no Recipient exists yet), short
 * (every second is a paid second), and true — it must not imply a message was
 * created or sent.
 *
 * Isolated in its own module because BOTH the server (to render the audio) and
 * the client (to typeset the line on screen) need it, and `ensureVoiceSample`
 * is server-only.
 *
 * **This is the fallback, not the source of truth for an existing sample.**
 * What a given user actually hears is whatever was spoken when their sample was
 * rendered, stored in `voice_profiles.sample_line`. Changing the constant here
 * changes it only for samples rendered afterwards — which is exactly why the
 * screen reads the stored line and falls back to this one.
 */
export const VOICE_SAMPLE_LINE =
  "If you're hearing this, I found a way to stay.";
