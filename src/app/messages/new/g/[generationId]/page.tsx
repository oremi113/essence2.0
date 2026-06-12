/**
 * /messages/new/g/[generationId] — A6 Preview & Refine (Deferred-Audio).
 *
 * Thin data-shuttle per CLAUDE.md: auth-check, fetch the
 * `pending_generations` row, derive the screen props, render the client
 * wrapper. All fetch-on-action and navigation lives in
 * PreviewRefinePageClient; all visuals live in the screen component.
 *
 * This URL is the A5/A6 deep-link (Step6_OpenContracts.md Q7). Until A5
 * (Generating) is built, a row whose text/audio isn't ready yet bounces
 * back to the flow start rather than rendering a wait state here.
 */
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ROUTES, messageGenerationRoute, signInWithNext } from "@/lib/routes";
import { STEP6_LIMITS, isDeferredAudioEnabled } from "@/lib/messages/cost-controls";
import { estimateSpeechDurationSec } from "@/lib/messages/speech-duration";
import { PreviewRefinePageClient, type A6UiFlag } from "./PreviewRefinePageClient";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The ui_flags keys this screen owns (allowlist for the server action). */
const A6_UI_FLAGS: readonly A6UiFlag[] = ["a6_play_hint_learned", "a6_visited"];

export default async function MessageGenerationPage({
  params,
}: {
  params: Promise<{ generationId: string }>;
}) {
  const { generationId } = await params;
  if (!UUID_RE.test(generationId)) notFound();

  // The deferred-audio A6 is the only screen on this URL so far; with the
  // flag off (control arm) there is nothing to render here yet.
  if (!isDeferredAudioEnabled()) notFound();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(signInWithNext(messageGenerationRoute(generationId)));

  const { data: gen } = await supabase
    .from("pending_generations")
    .select(
      "generation_id, voice_profile_id, category, note, generated_text, candidate_text, text_status, audio_status, audio_duration_ms, regenerate_count, text_reroll_count, audio_render_count, edit_note_depth, recipient_id, pending_recipient_relationship, saved_message_id, superseded_at",
    )
    .eq("generation_id", generationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!gen) notFound();
  // Already saved → the message lives in the vault now. Route to A7 once it
  // exists (FOLLOW_UPS #38); Home is the interim destination.
  if (gen.saved_message_id) redirect(ROUTES.home);
  // Superseded by an edit-note fork — this row is no longer the active one.
  if (gen.superseded_at) redirect(ROUTES.messagesNew);
  // Not ready to preview — A5's territory once it's built (see header note).
  if (gen.text_status !== "succeeded" || gen.audio_status !== "succeeded" || !gen.generated_text) {
    redirect(ROUTES.messagesNew);
  }

  // Relationship is telemetry context only (step6.message_saved), never
  // rendered. Pending-recipient rows carry it inline; existing recipients
  // need a lookup.
  let relationship: string | null = gen.pending_recipient_relationship;
  if (!relationship && gen.recipient_id) {
    const { data: recipient } = await supabase
      .from("recipients")
      .select("relationship")
      .eq("id", gen.recipient_id)
      .maybeSingle();
    relationship = recipient?.relationship ?? null;
  }

  // saved_ordinal context for step6.message_saved (this save would be N+1).
  const { count: savedCount } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "saved");

  // Per-user UI latches (profiles.ui_flags — FOLLOW_UPS #36).
  const { data: profile } = await supabase
    .from("profiles")
    .select("ui_flags")
    .eq("user_id", user.id)
    .maybeSingle();
  const uiFlags =
    profile?.ui_flags && typeof profile.ui_flags === "object" && !Array.isArray(profile.ui_flags)
      ? (profile.ui_flags as Record<string, unknown>)
      : {};
  const playHintLearned = uiFlags.a6_play_hint_learned === true;
  const isFirstArrival = uiFlags.a6_visited !== true;

  /** Latch a one-way ui_flags key for this user (false → true only). */
  async function markA6UiFlag(flag: A6UiFlag): Promise<void> {
    "use server";
    if (!A6_UI_FLAGS.includes(flag)) return; // client-supplied — allowlist it
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("ui_flags")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) return; // no profile row to latch on — harmless skip
    const flags =
      profile.ui_flags && typeof profile.ui_flags === "object" && !Array.isArray(profile.ui_flags)
        ? (profile.ui_flags as Record<string, unknown>)
        : {};
    if (flags[flag] === true) return;
    await supabase
      .from("profiles")
      .update({ ui_flags: { ...flags, [flag]: true } })
      .eq("user_id", user.id);
  }

  return (
    <PreviewRefinePageClient
      generationId={gen.generation_id}
      voiceProfileId={gen.voice_profile_id}
      committedText={gen.generated_text}
      committedDurationSec={
        // Measured duration when the render recorded one (FOLLOW_UPS #37);
        // wpm estimate for pre-migration rows.
        gen.audio_duration_ms
          ? Math.max(1, Math.round(gen.audio_duration_ms / 1000))
          : estimateSpeechDurationSec(gen.generated_text)
      }
      initialCandidateText={gen.candidate_text}
      recordingsRemaining={Math.max(0, STEP6_LIMITS.maxAudioRenders - gen.audio_render_count)}
      rerollsRemaining={Math.max(0, STEP6_LIMITS.maxTextRerolls - gen.text_reroll_count)}
      maxAudioRenders={STEP6_LIMITS.maxAudioRenders}
      maxTextRerolls={STEP6_LIMITS.maxTextRerolls}
      reshapeExhausted={gen.edit_note_depth >= STEP6_LIMITS.maxEditNoteDepth}
      playHintLearned={playHintLearned}
      isFirstArrival={isFirstArrival}
      category={gen.category}
      relationship={relationship}
      hadNote={Boolean(gen.note)}
      regenerateCount={gen.regenerate_count}
      editNoteDepth={gen.edit_note_depth}
      savedCountBefore={savedCount ?? 0}
      onPersistUiFlag={markA6UiFlag}
    />
  );
}
