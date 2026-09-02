export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      legacy_waitlist: {
        Row: {
          email: string
          id: string
          joined_at: string
          notes: string | null
          source: string
          user_id: string
        }
        Insert: {
          email: string
          id?: string
          joined_at?: string
          notes?: string | null
          source?: string
          user_id: string
        }
        Update: {
          email?: string
          id?: string
          joined_at?: string
          notes?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legacy_waitlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      messages: {
        Row: {
          audio_bytes: number | null
          audio_duration_ms: number | null
          audio_sha256: string | null
          body_char_count: number | null
          body_text: string | null
          category: Database["public"]["Enums"]["message_category"]
          created_at: string
          generation_completed_at: string | null
          generation_started_at: string | null
          id: string
          idempotency_key: string | null
          last_error_code: string | null
          last_error_message: string | null
          last_played_at: string | null
          played_count: number
          recipient_id: string | null
          regenerate_count: number
          source_generation_id: string | null
          status: Database["public"]["Enums"]["message_status"]
          storage_bucket: string
          storage_path: string | null
          title: string | null
          updated_at: string
          user_id: string
          voice_profile_id: string
        }
        Insert: {
          audio_bytes?: number | null
          audio_duration_ms?: number | null
          audio_sha256?: string | null
          body_char_count?: number | null
          body_text?: string | null
          category: Database["public"]["Enums"]["message_category"]
          created_at?: string
          generation_completed_at?: string | null
          generation_started_at?: string | null
          id?: string
          idempotency_key?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_played_at?: string | null
          played_count?: number
          recipient_id?: string | null
          regenerate_count?: number
          source_generation_id?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          storage_bucket?: string
          storage_path?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          voice_profile_id: string
        }
        Update: {
          audio_bytes?: number | null
          audio_duration_ms?: number | null
          audio_sha256?: string | null
          body_char_count?: number | null
          body_text?: string | null
          category?: Database["public"]["Enums"]["message_category"]
          created_at?: string
          generation_completed_at?: string | null
          generation_started_at?: string | null
          id?: string
          idempotency_key?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_played_at?: string | null
          played_count?: number
          recipient_id?: string | null
          regenerate_count?: number
          source_generation_id?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          storage_bucket?: string
          storage_path?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          voice_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_source_generation_id_fkey"
            columns: ["source_generation_id"]
            isOneToOne: true
            referencedRelation: "pending_generations"
            referencedColumns: ["generation_id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_voice_profile_id_fkey"
            columns: ["voice_profile_id"]
            isOneToOne: false
            referencedRelation: "voice_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_generations: {
        Row: {
          audio_duration_ms: number | null
          audio_path: string | null
          audio_render_count: number
          audio_status: string
          candidate_template_variant: string | null
          candidate_text: string | null
          category: Database["public"]["Enums"]["message_category"]
          created_at: string
          edit_note_depth: number
          expires_at: string
          generated_text: string | null
          generation_id: string
          note: string | null
          pending_recipient_descriptor: string | null
          pending_recipient_name: string | null
          pending_recipient_relationship: string | null
          recipient_id: string | null
          regenerate_count: number
          saved_message_id: string | null
          source_generation_id: string | null
          superseded_at: string | null
          template_variant: string
          text_reroll_count: number
          text_status: string
          updated_at: string
          user_id: string
          voice_profile_id: string
        }
        Insert: {
          audio_duration_ms?: number | null
          audio_path?: string | null
          audio_render_count?: number
          audio_status?: string
          candidate_template_variant?: string | null
          candidate_text?: string | null
          category: Database["public"]["Enums"]["message_category"]
          created_at?: string
          edit_note_depth?: number
          expires_at?: string
          generated_text?: string | null
          generation_id?: string
          note?: string | null
          pending_recipient_descriptor?: string | null
          pending_recipient_name?: string | null
          pending_recipient_relationship?: string | null
          recipient_id?: string | null
          regenerate_count?: number
          saved_message_id?: string | null
          source_generation_id?: string | null
          superseded_at?: string | null
          template_variant: string
          text_reroll_count?: number
          text_status?: string
          updated_at?: string
          user_id: string
          voice_profile_id: string
        }
        Update: {
          audio_duration_ms?: number | null
          audio_path?: string | null
          audio_render_count?: number
          audio_status?: string
          candidate_template_variant?: string | null
          candidate_text?: string | null
          category?: Database["public"]["Enums"]["message_category"]
          created_at?: string
          edit_note_depth?: number
          expires_at?: string
          generated_text?: string | null
          generation_id?: string
          note?: string | null
          pending_recipient_descriptor?: string | null
          pending_recipient_name?: string | null
          pending_recipient_relationship?: string | null
          recipient_id?: string | null
          regenerate_count?: number
          saved_message_id?: string | null
          source_generation_id?: string | null
          superseded_at?: string | null
          template_variant?: string
          text_reroll_count?: number
          text_status?: string
          updated_at?: string
          user_id?: string
          voice_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_generations_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "recipients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_generations_saved_message_id_fkey"
            columns: ["saved_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_generations_source_generation_id_fkey"
            columns: ["source_generation_id"]
            isOneToOne: false
            referencedRelation: "pending_generations"
            referencedColumns: ["generation_id"]
          },
          {
            foreignKeyName: "pending_generations_voice_profile_id_fkey"
            columns: ["voice_profile_id"]
            isOneToOne: false
            referencedRelation: "voice_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_storage_bucket: string | null
          avatar_storage_path: string | null
          birth_year: number | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          first_name: string | null
          is_suspended: boolean
          last_name: string | null
          locale: string | null
          onboarding_completed_at: string | null
          state: string | null
          stripe_customer_id: string | null
          suspended_reason: string | null
          terms_accepted_at: string | null
          terms_version_accepted: string | null
          three_shaped_ceremony_seen_at: string | null
          timezone: string | null
          ui_flags: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_storage_bucket?: string | null
          avatar_storage_path?: string | null
          birth_year?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          first_name?: string | null
          is_suspended?: boolean
          last_name?: string | null
          locale?: string | null
          onboarding_completed_at?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          suspended_reason?: string | null
          terms_accepted_at?: string | null
          terms_version_accepted?: string | null
          three_shaped_ceremony_seen_at?: string | null
          timezone?: string | null
          ui_flags?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_storage_bucket?: string | null
          avatar_storage_path?: string | null
          birth_year?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          first_name?: string | null
          is_suspended?: boolean
          last_name?: string | null
          locale?: string | null
          onboarding_completed_at?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          suspended_reason?: string | null
          terms_accepted_at?: string | null
          terms_version_accepted?: string | null
          three_shaped_ceremony_seen_at?: string | null
          timezone?: string | null
          ui_flags?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recipients: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          relationship: string | null
          status: Database["public"]["Enums"]["recipient_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          relationship?: string | null
          status?: Database["public"]["Enums"]["recipient_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          relationship?: string | null
          status?: Database["public"]["Enums"]["recipient_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          billing_period: Database["public"]["Enums"]["billing_period_enum"]
          cancel_at_period_end: boolean
          cancelled_at: string | null
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_failed_attempt_count: number
          price_amount_cents: number
          status: Database["public"]["Enums"]["subscription_status_enum"]
          stripe_customer_id: string
          stripe_price_id: string
          stripe_subscription_id: string
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_period: Database["public"]["Enums"]["billing_period_enum"]
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_failed_attempt_count?: number
          price_amount_cents: number
          status?: Database["public"]["Enums"]["subscription_status_enum"]
          stripe_customer_id: string
          stripe_price_id: string
          stripe_subscription_id: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_period?: Database["public"]["Enums"]["billing_period_enum"]
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_failed_attempt_count?: number
          price_amount_cents?: number
          status?: Database["public"]["Enums"]["subscription_status_enum"]
          stripe_customer_id?: string
          stripe_price_id?: string
          stripe_subscription_id?: string
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      training_clips: {
        Row: {
          bytes: number | null
          content_sha256: string | null
          created_at: string
          duration_ms: number | null
          id: string
          mime_type: string | null
          prompt_index: number
          prompt_stage: number | null
          rejection_reason: string | null
          resolved_variant_keys: Json | null
          sample_rate_hz: number | null
          status: Database["public"]["Enums"]["training_clip_status"]
          storage_bucket: string
          storage_path: string
          updated_at: string
          user_id: string
          validation_score: number | null
          voice_profile_id: string
        }
        Insert: {
          bytes?: number | null
          content_sha256?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          mime_type?: string | null
          prompt_index: number
          prompt_stage?: number | null
          rejection_reason?: string | null
          resolved_variant_keys?: Json | null
          sample_rate_hz?: number | null
          status?: Database["public"]["Enums"]["training_clip_status"]
          storage_bucket?: string
          storage_path: string
          updated_at?: string
          user_id: string
          validation_score?: number | null
          voice_profile_id: string
        }
        Update: {
          bytes?: number | null
          content_sha256?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          mime_type?: string | null
          prompt_index?: number
          prompt_stage?: number | null
          rejection_reason?: string | null
          resolved_variant_keys?: Json | null
          sample_rate_hz?: number | null
          status?: Database["public"]["Enums"]["training_clip_status"]
          storage_bucket?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
          validation_score?: number | null
          voice_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_clips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "training_clips_voice_profile_id_fkey"
            columns: ["voice_profile_id"]
            isOneToOne: false
            referencedRelation: "voice_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          action: string
          created_at: string
          duration_ms: number | null
          id: string
          idempotency_key: string | null
          meta: Json | null
          outcome: string
          request_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          idempotency_key?: string | null
          meta?: Json | null
          outcome?: string
          request_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          idempotency_key?: string | null
          meta?: Json | null
          outcome?: string
          request_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      voice_consent_records: {
        Row: {
          accepted_at: string
          consent_text_version: string
          consent_to_clone: boolean
          id: string
          ip_address: unknown
          ownership_attestation: boolean
          user_agent: string | null
          user_id: string
          voice_profile_id: string | null
        }
        Insert: {
          accepted_at?: string
          consent_text_version: string
          consent_to_clone: boolean
          id?: string
          ip_address?: unknown
          ownership_attestation: boolean
          user_agent?: string | null
          user_id: string
          voice_profile_id?: string | null
        }
        Update: {
          accepted_at?: string
          consent_text_version?: string
          consent_to_clone?: boolean
          id?: string
          ip_address?: unknown
          ownership_attestation?: boolean
          user_agent?: string | null
          user_id?: string
          voice_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_consent_records_voice_profile_id_fkey"
            columns: ["voice_profile_id"]
            isOneToOne: false
            referencedRelation: "voice_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_profiles: {
        Row: {
          attempt_count: number
          created_at: string
          id: string
          label: string
          last_attempt_at: string | null
          last_error_at: string | null
          last_error_code: string | null
          last_error_message: string | null
          notes: string | null
          processing_completed_at: string | null
          processing_started_at: string | null
          ready_at: string | null
          recorded_clip_count: number
          relationship: string | null
          required_clip_count: number
          source_clip_count: number | null
          source_clip_seconds: number | null
          status: Database["public"]["Enums"]["voice_profile_status"]
          subject_name: string | null
          updated_at: string
          user_id: string
          vendor: string
          vendor_model_id: string | null
          vendor_voice_id: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          id?: string
          label: string
          last_attempt_at?: string | null
          last_error_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          notes?: string | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          ready_at?: string | null
          recorded_clip_count?: number
          relationship?: string | null
          required_clip_count?: number
          source_clip_count?: number | null
          source_clip_seconds?: number | null
          status?: Database["public"]["Enums"]["voice_profile_status"]
          subject_name?: string | null
          updated_at?: string
          user_id: string
          vendor?: string
          vendor_model_id?: string | null
          vendor_voice_id?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          id?: string
          label?: string
          last_attempt_at?: string | null
          last_error_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          notes?: string | null
          processing_completed_at?: string | null
          processing_started_at?: string | null
          ready_at?: string | null
          recorded_clip_count?: number
          relationship?: string | null
          required_clip_count?: number
          source_clip_count?: number | null
          source_clip_seconds?: number | null
          status?: Database["public"]["Enums"]["voice_profile_status"]
          subject_name?: string | null
          updated_at?: string
          user_id?: string
          vendor?: string
          vendor_model_id?: string | null
          vendor_voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_advisory_lock: { Args: { lock_key: number }; Returns: undefined }
      healthcheck: { Args: never; Returns: string }
    }
    Enums: {
      billing_period_enum: "monthly" | "annual"
      message_category:
        | "birthday"
        | "encouragement"
        | "daily_reminder"
        | "future_message"
        | "comfort"
        | "holiday"
        | "checking_in"
      message_status:
        | "generating"
        | "saving"
        | "saved"
        | "failed"
        | "unavailable"
      recipient_status: "active" | "archived"
      subscription_status_enum:
        | "none"
        | "trial"
        | "active"
        | "past_due"
        | "lapsed"
        | "cancelled"
      training_clip_status:
        | "recorded"
        | "uploading"
        | "uploaded"
        | "rejected"
        | "deleted"
        | "pending_upload"
        | "missing"
      voice_profile_status:
        | "created"
        | "collecting"
        | "processing"
        | "ready"
        | "failed"
        | "archived"
        | "queued"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      billing_period_enum: ["monthly", "annual"],
      message_category: [
        "birthday",
        "encouragement",
        "daily_reminder",
        "future_message",
        "comfort",
        "holiday",
        "checking_in",
      ],
      message_status: [
        "generating",
        "saving",
        "saved",
        "failed",
        "unavailable",
      ],
      recipient_status: ["active", "archived"],
      subscription_status_enum: [
        "none",
        "trial",
        "active",
        "past_due",
        "lapsed",
        "cancelled",
      ],
      training_clip_status: [
        "recorded",
        "uploading",
        "uploaded",
        "rejected",
        "deleted",
        "pending_upload",
        "missing",
      ],
      voice_profile_status: [
        "created",
        "collecting",
        "processing",
        "ready",
        "failed",
        "archived",
        "queued",
      ],
    },
  },
} as const

