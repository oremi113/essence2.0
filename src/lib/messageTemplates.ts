/**
 * Message Templates Registry
 *
 * Canonical source of truth for the seven launch message categories.
 * See docs/MASTER_SPEC.md Chapter 8 for spec rules.
 *
 * This file is the single place to edit:
 * - Category display labels and descriptions
 * - Voice settings per category (ElevenLabs Multilingual v2)
 * - Template variants and relationship-specific copy
 *
 * Adding a new category requires:
 * 1. SQL migration: ALTER TYPE public.message_category ADD VALUE 'new_value'
 * 2. Add the value to the MessageCategory union below
 * 3. Add an entry to MESSAGE_CATEGORIES
 * 4. Add to CATEGORY_DISPLAY_ORDER
 *
 * Pattern reference: src/lib/voice-training/script.ts
 */

// ---------- Types ----------

/**
 * Mirrors the public.message_category Postgres enum.
 * Keep in sync with supabase/migrations/20260421120000_messages_category.sql.
 */
export type MessageCategory =
  | 'birthday'
  | 'encouragement'
  | 'daily_reminder'
  | 'future_message'
  | 'comfort'
  | 'holiday'
  | 'checking_in';

export type RelationshipKey =
  | 'daughter'
  | 'son'
  | 'partner'
  | 'parent'
  | 'grandchild'
  | 'friend'
  | 'other';

/**
 * ElevenLabs Multilingual v2 voice settings.
 * - stability: 0.0–1.0. Lower = more emotional/expressive, higher = more consistent.
 * - similarity: 0.0–1.0. How closely the output adheres to the cloned voice. ~0.75 is the sweet spot.
 * - style: 0.0–1.0. Style exaggeration. Higher = more dramatic delivery.
 * - useSpeakerBoost: usually true for emotional content.
 */
export interface VoiceSettings {
  stability: number;
  similarity: number;
  style: number;
  useSpeakerBoost: boolean;
}

/**
 * Spec Chapter 8.2: every template follows a four-part structure.
 * Each part is a string. Personalized insert is optional and contains a {note} placeholder
 * that gets replaced with the user's custom note (or quietly omitted if empty).
 */
export interface MessageTemplate {
  /** Stable identifier for analytics and logging (Spec 8.7 Rule 5) */
  id: string;
  /** Spec 8.2 part 1: warmth and emotional posture */
  openingLine: string;
  /** Spec 8.2 part 2: emotional weight of the category */
  intentionCore: string;
  /** Spec 8.2 part 3: optional, contains {note} placeholder */
  personalizedInsert: string | null;
  /** Spec 8.2 part 4: gentle, simple ending */
  closingLine: string;
  /** Optional relationship hint. Null = generic variant usable for any relationship. */
  relationship: RelationshipKey | null;
}

export interface MessageCategoryDefinition {
  /** The enum value used in the database */
  key: MessageCategory;
  /** User-facing display name (Title Case, matches spec 8.3 wording) */
  label: string;
  /** One-line description shown on the category selection card */
  description: string;
  /** Spec 8.3 emotional goal — used for tooltips, accessibility, internal docs */
  emotionalGoal: string;
  /** ElevenLabs voice settings tuned for this category's emotional register */
  voiceSettings: VoiceSettings;
  /** Template variants. At least one generic (relationship: null) variant required. */
  templates: readonly MessageTemplate[];
}

// ---------- Voice Settings ----------

/**
 * Voice settings tuned per category for ElevenLabs Multilingual v2.
 *
 * Tuning rationale:
 * - Stability lower (0.30–0.45) for warmer, more expressive categories (Birthday, Holiday)
 * - Stability higher (0.50–0.60) for grounded, steady categories (Comfort, Daily Reminder)
 * - Style higher (0.30–0.40) for celebratory/light registers
 * - Style lower (0.15–0.25) for tender, restrained registers
 * - Similarity holds at 0.75 across all (recommended sweet spot for cloned voices)
 * - useSpeakerBoost on for all (emotional content benefits from boost)
 *
 * These values can be revisited after launch with real user feedback.
 */
const VOICE_SETTINGS: Record<MessageCategory, VoiceSettings> = {
  birthday: { stability: 0.35, similarity: 0.75, style: 0.40, useSpeakerBoost: true },
  encouragement: { stability: 0.45, similarity: 0.75, style: 0.30, useSpeakerBoost: true },
  daily_reminder: { stability: 0.60, similarity: 0.75, style: 0.15, useSpeakerBoost: true },
  future_message: { stability: 0.50, similarity: 0.75, style: 0.25, useSpeakerBoost: true },
  comfort: { stability: 0.55, similarity: 0.75, style: 0.20, useSpeakerBoost: true },
  holiday: { stability: 0.40, similarity: 0.75, style: 0.35, useSpeakerBoost: true },
  checking_in: { stability: 0.45, similarity: 0.75, style: 0.25, useSpeakerBoost: true },
};

// ---------- Category Definitions ----------

export const MESSAGE_CATEGORIES: Record<MessageCategory, MessageCategoryDefinition> = {
  birthday: {
    key: 'birthday',
    label: 'Birthday',
    description: 'A warm note to mark someone’s day.',
    emotionalGoal: 'Warm, celebratory, never cheesy',
    voiceSettings: VOICE_SETTINGS.birthday,
    templates: [
      {
        id: 'birthday_generic_01',
        openingLine: 'Hi sweetheart.',
        intentionCore:
          'I just wanted to be one of the voices that finds you on your birthday. I hope today feels like the love you bring to everyone around you, gently coming back to you.',
        personalizedInsert: '{note}',
        closingLine: 'Happy birthday. I love you.',
        relationship: null,
      },
      {
        id: 'birthday_daughter_01',
        openingLine: 'Hi, my girl.',
        intentionCore:
          'Another year. I’m so proud of who you are. Not what you’ve done — who you are. That’s the part I want you to remember today.',
        personalizedInsert: '{note}',
        closingLine: 'Happy birthday, sweetheart.',
        relationship: 'daughter',
      },
    ],
  },

  encouragement: {
    key: 'encouragement',
    label: 'Encouragement',
    description: 'A grounded reminder when things feel heavy.',
    emotionalGoal: 'Supportive, grounding, hopeful',
    voiceSettings: VOICE_SETTINGS.encouragement,
    templates: [
      {
        id: 'encouragement_generic_01',
        openingLine: 'Hey.',
        intentionCore:
          'I know things are hard right now. I’m not going to pretend they aren’t. But you are not alone in this, and you don’t have to figure it all out today. One thing at a time.',
        personalizedInsert: '{note}',
        closingLine: 'I’m with you. Keep going.',
        relationship: null,
      },
    ],
  },

  daily_reminder: {
    key: 'daily_reminder',
    label: 'Daily Reminder',
    description: 'A small, familiar voice in the everyday.',
    emotionalGoal: 'Gentle, familiar',
    voiceSettings: VOICE_SETTINGS.daily_reminder,
    templates: [
      {
        id: 'daily_reminder_generic_01',
        openingLine: 'Hey, you.',
        intentionCore:
          'Just a small reminder from me — drink some water, take a breath, and be a little gentle with yourself today.',
        personalizedInsert: '{note}',
        closingLine: 'I love you.',
        relationship: null,
      },
    ],
  },

  future_message: {
    key: 'future_message',
    label: 'A Message for the Future',
    description: 'Something to find you later, when it’s time.',
    emotionalGoal: 'Continuity, care across time',
    voiceSettings: VOICE_SETTINGS.future_message,
    templates: [
      {
        id: 'future_message_generic_01',
        openingLine: 'Hi.',
        intentionCore:
          'I’m recording this not knowing exactly when you’ll hear it. But I wanted you to have my voice, in your own time, saying what I most want you to know.',
        personalizedInsert: '{note}',
        closingLine: 'I’m always with you.',
        relationship: null,
      },
    ],
  },

  comfort: {
    key: 'comfort',
    label: 'Comfort',
    description: 'Tenderness, without needing to fix anything.',
    emotionalGoal: 'Tender reassurance without assuming details',
    voiceSettings: VOICE_SETTINGS.comfort,
    templates: [
      {
        id: 'comfort_generic_01',
        openingLine: 'Hey, love.',
        intentionCore:
          'I don’t need to know what’s happening to know that I’m here. You don’t have to explain anything. You just get to be held for a moment.',
        personalizedInsert: '{note}',
        closingLine: 'I love you. So much.',
        relationship: null,
      },
    ],
  },

  holiday: {
    key: 'holiday',
    label: 'Holiday',
    description: 'A note for the seasons that mean something to you.',
    emotionalGoal: 'Seasonal warmth, no religious or cultural assumptions',
    voiceSettings: VOICE_SETTINGS.holiday,
    templates: [
      {
        id: 'holiday_generic_01',
        openingLine: 'Hi, you.',
        intentionCore:
          'I was thinking about you, and about how this time of year always carries something extra. I just wanted to be one of the voices in your day.',
        personalizedInsert: '{note}',
        closingLine: 'Thinking of you.',
        relationship: null,
      },
    ],
  },

  checking_in: {
    key: 'checking_in',
    label: 'Just Checking In',
    description: 'A light hello, no agenda.',
    emotionalGoal: 'Light, friendly, low pressure',
    voiceSettings: VOICE_SETTINGS.checking_in,
    templates: [
      {
        id: 'checking_in_generic_01',
        openingLine: 'Hey.',
        intentionCore:
          'No reason. Just thinking about you and wanted you to hear my voice for a minute. That’s it.',
        personalizedInsert: '{note}',
        closingLine: 'Talk soon.',
        relationship: null,
      },
    ],
  },
};

// ---------- Display Order ----------

/**
 * The order the seven categories appear in the UI category selector.
 * Order is intentional — most-used / lowest-cognitive-load categories first.
 * Final order may be adjusted during Pass 3 product review.
 */
export const CATEGORY_DISPLAY_ORDER: readonly MessageCategory[] = [
  'birthday',
  'encouragement',
  'checking_in',
  'comfort',
  'daily_reminder',
  'holiday',
  'future_message',
] as const;

// ---------- Helpers ----------

export function getCategoryDefinition(category: MessageCategory): MessageCategoryDefinition {
  return MESSAGE_CATEGORIES[category];
}

export function getCategoryVoiceSettings(category: MessageCategory): VoiceSettings {
  return MESSAGE_CATEGORIES[category].voiceSettings;
}

/**
 * Returns templates matching the given relationship, with fallback to generic variants.
 * If a category has both a daughter-specific variant and a generic variant, and the recipient
 * is a daughter, this returns both — letting the system or user pick.
 *
 * If the recipient relationship is null/unknown, returns only generic variants.
 */
export function getTemplatesForCategory(
  category: MessageCategory,
  relationship: RelationshipKey | null,
): readonly MessageTemplate[] {
  const all = MESSAGE_CATEGORIES[category].templates;
  if (relationship === null) {
    return all.filter((t) => t.relationship === null);
  }
  return all.filter((t) => t.relationship === relationship || t.relationship === null);
}

/**
 * Maps a free-text relationship string from the recipients table to a RelationshipKey.
 * Falls back to 'other' for anything not recognized.
 *
 * Note: recipients.relationship is currently free text per the schema.
 * Future schema work could constrain this to an enum.
 */
export function normalizeRelationship(raw: string | null | undefined): RelationshipKey {
  if (!raw) return 'other';
  const lower = raw.trim().toLowerCase();
  switch (lower) {
    case 'daughter':
      return 'daughter';
    case 'son':
      return 'son';
    case 'partner':
    case 'spouse':
    case 'wife':
    case 'husband':
      return 'partner';
    case 'parent':
    case 'mother':
    case 'father':
    case 'mom':
    case 'dad':
      return 'parent';
    case 'grandchild':
    case 'grandson':
    case 'granddaughter':
      return 'grandchild';
    case 'friend':
      return 'friend';
    default:
      return 'other';
  }
}
