/**
 * POST: Create a VoiceProfile with status collecting.
 *
 * Accepts and validates four required fields for V2 script dynamic resolution:
 *   displayName  – user's display name (→ profiles.display_name, used as {userName})
 *   relationship – one of 7 values (→ voice_profiles.relationship)
 *   city         – user's city (→ profiles.city, used as {city})
 *   birthYear    – user's birth year (→ profiles.birth_year, used for generation variant)
 *
 * user_id is always derived from the authenticated session, never from the request body.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { VALID_RELATIONSHIPS } from "@/lib/voice-training/types";
import { generateRequestId, logError } from "@/lib/logger";

const MAX_TEXT_LEN = 200;
const MIN_BIRTH_YEAR = 1900;
const MAX_BIRTH_YEAR = 2025;

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    // --- Validate displayName ---
    const rawName = body?.displayName;
    if (typeof rawName !== "string" || !rawName.trim()) {
      return NextResponse.json(
        { error: "displayName is required", field: "displayName" },
        { status: 400 }
      );
    }
    const displayName = rawName.trim().slice(0, MAX_TEXT_LEN);

    // --- Validate relationship ---
    const rawRel = body?.relationship;
    if (
      typeof rawRel !== "string" ||
      !VALID_RELATIONSHIPS.includes(rawRel as typeof VALID_RELATIONSHIPS[number])
    ) {
      return NextResponse.json(
        {
          error: `relationship must be one of: ${VALID_RELATIONSHIPS.join(", ")}`,
          field: "relationship",
        },
        { status: 400 }
      );
    }
    const relationship = rawRel;

    // --- Validate city ---
    const rawCity = body?.city;
    if (typeof rawCity !== "string" || !rawCity.trim()) {
      return NextResponse.json(
        { error: "city is required", field: "city" },
        { status: 400 }
      );
    }
    const city = rawCity.trim().slice(0, MAX_TEXT_LEN);

    // --- Validate birthYear ---
    const rawYear = body?.birthYear;
    const birthYear = typeof rawYear === "number" ? rawYear : Number(rawYear);
    if (
      !Number.isInteger(birthYear) ||
      birthYear < MIN_BIRTH_YEAR ||
      birthYear > MAX_BIRTH_YEAR
    ) {
      return NextResponse.json(
        {
          error: `birthYear must be an integer between ${MIN_BIRTH_YEAR} and ${MAX_BIRTH_YEAR}`,
          field: "birthYear",
        },
        { status: 400 }
      );
    }

    // --- Upsert profile-level fields (display_name, city, birth_year) ---
    // Uses the existing profiles row keyed by user_id (PK).
    // getOrCreateProfile() guarantees the row exists; we update in-place.
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          display_name: displayName,
          city,
          birth_year: birthYear,
        },
        { onConflict: "user_id" }
      );

    if (profileError) {
      logError({
        event: "voice_profile_create_profile_upsert_failed",
        requestId,
        route: "/api/voice-profiles",
        userId: user.id,
        error: profileError,
      });
      return NextResponse.json(
        { error: "Failed to update profile", detail: profileError.message },
        { status: 500 }
      );
    }

    // --- Insert voice_profiles row ---
    const { data: row, error } = await supabase
      .from("voice_profiles")
      .insert({
        user_id: user.id,
        label: displayName,
        relationship,
        status: "collecting",
      })
      .select("id, status")
      .single();

    if (error) {
      logError({
        event: "voice_profile_create_insert_failed",
        requestId,
        route: "/api/voice-profiles",
        userId: user.id,
        error,
      });
      return NextResponse.json(
        { error: "Failed to create voice profile", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      voiceProfileId: row.id,
      status: row.status,
    });
  } catch (err) {
    logError({ event: "voice_profile_create_error", requestId, route: "/api/voice-profiles", error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
