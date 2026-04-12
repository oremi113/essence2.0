export interface RecordScreenData {
  /** How many clips have been successfully recorded and uploaded */
  clipsRecorded: number;
  /** Current status of the voice profile */
  voiceProfileStatus: string;
  /** User's display name — used in {userName} substitution */
  displayName: string | null;
  /** User's city — used in {city} substitution */
  city: string | null;
  /** Birth year from profiles table — used to derive generation key */
  birthYear: number | null;
  /** Primary relationship from voice_profiles — e.g. 'daughter', 'spouse' */
  relationship: string | null;
  /** voice_profile row id — needed for RecordingUpload and status polling */
  voiceProfileId: string | null;
}
