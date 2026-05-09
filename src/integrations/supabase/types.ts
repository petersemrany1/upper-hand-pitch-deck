export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      appointment_reminders: {
        Row: {
          booking_date: string | null
          booking_time: string | null
          created_at: string
          doctor_name: string | null
          id: string
          lead_id: string | null
          patient_first_name: string | null
          patient_last_name: string | null
          patient_phone: string | null
          status: string
          three_day_sms_sent: boolean
          three_day_sms_sent_at: string | null
          twentyfour_hour_sms_sent: boolean
          twentyfour_hour_sms_sent_at: string | null
          updated_at: string
        }
        Insert: {
          booking_date?: string | null
          booking_time?: string | null
          created_at?: string
          doctor_name?: string | null
          id?: string
          lead_id?: string | null
          patient_first_name?: string | null
          patient_last_name?: string | null
          patient_phone?: string | null
          status?: string
          three_day_sms_sent?: boolean
          three_day_sms_sent_at?: string | null
          twentyfour_hour_sms_sent?: boolean
          twentyfour_hour_sms_sent_at?: string | null
          updated_at?: string
        }
        Update: {
          booking_date?: string | null
          booking_time?: string | null
          created_at?: string
          doctor_name?: string | null
          id?: string
          lead_id?: string | null
          patient_first_name?: string | null
          patient_last_name?: string | null
          patient_phone?: string | null
          status?: string
          three_day_sms_sent?: boolean
          three_day_sms_sent_at?: string | null
          twentyfour_hour_sms_sent?: boolean
          twentyfour_hour_sms_sent_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      call_records: {
        Row: {
          analysis_stage: string | null
          attempt_number: number | null
          call_analysis: Json | null
          called_at: string
          client_id: string | null
          clinic_id: string | null
          created_at: string
          day_number: number | null
          dial_number: number | null
          direction: string
          duration: number | null
          duration_seconds: number | null
          id: string
          lead_id: string | null
          needs_review: boolean
          outcome: string | null
          phone: string | null
          recording_sid: string | null
          recording_url: string | null
          rep_id: string | null
          status: string | null
          time_slot: string | null
          twilio_call_sid: string | null
          updated_at: string
        }
        Insert: {
          analysis_stage?: string | null
          attempt_number?: number | null
          call_analysis?: Json | null
          called_at?: string
          client_id?: string | null
          clinic_id?: string | null
          created_at?: string
          day_number?: number | null
          dial_number?: number | null
          direction?: string
          duration?: number | null
          duration_seconds?: number | null
          id?: string
          lead_id?: string | null
          needs_review?: boolean
          outcome?: string | null
          phone?: string | null
          recording_sid?: string | null
          recording_url?: string | null
          rep_id?: string | null
          status?: string | null
          time_slot?: string | null
          twilio_call_sid?: string | null
          updated_at?: string
        }
        Update: {
          analysis_stage?: string | null
          attempt_number?: number | null
          call_analysis?: Json | null
          called_at?: string
          client_id?: string | null
          clinic_id?: string | null
          created_at?: string
          day_number?: number | null
          dial_number?: number | null
          direction?: string
          duration?: number | null
          duration_seconds?: number | null
          id?: string
          lead_id?: string | null
          needs_review?: boolean
          outcome?: string | null
          phone?: string | null
          recording_sid?: string | null
          recording_url?: string | null
          rep_id?: string | null
          status?: string | null
          time_slot?: string | null
          twilio_call_sid?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_records_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinic_appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          clinic_id: string
          consult_summary: string | null
          created_at: string
          id: string
          intel_notes: string | null
          lead_id: string | null
          outcome: string | null
          patient_name: string
          patient_phone: string | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          clinic_id: string
          consult_summary?: string | null
          created_at?: string
          id?: string
          intel_notes?: string | null
          lead_id?: string | null
          outcome?: string | null
          patient_name: string
          patient_phone?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          clinic_id?: string
          consult_summary?: string | null
          created_at?: string
          id?: string
          intel_notes?: string | null
          lead_id?: string | null
          outcome?: string | null
          patient_name?: string
          patient_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_availability: {
        Row: {
          clinic_id: string
          created_at: string
          end_time: string | null
          id: string
          override_date: string
          override_type: string
          start_time: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string
          end_time?: string | null
          id?: string
          override_date: string
          override_type: string
          start_time?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string
          end_time?: string | null
          id?: string
          override_date?: string
          override_type?: string
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_availability_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_contacts: {
        Row: {
          clinic_id: string
          contact_type: string
          created_at: string
          duration: string | null
          id: string
          next_action: string | null
          next_action_date: string | null
          next_action_time: string | null
          notes: string | null
          outcome: string | null
        }
        Insert: {
          clinic_id: string
          contact_type: string
          created_at?: string
          duration?: string | null
          id?: string
          next_action?: string | null
          next_action_date?: string | null
          next_action_time?: string | null
          notes?: string | null
          outcome?: string | null
        }
        Update: {
          clinic_id?: string
          contact_type?: string
          created_at?: string
          duration?: string | null
          id?: string
          next_action?: string | null
          next_action_date?: string | null
          next_action_time?: string | null
          notes?: string | null
          outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_contacts_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_portal_users: {
        Row: {
          clinic_id: string
          created_at: string
          email: string
          id: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          email: string
          id: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_portal_users_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          city: string | null
          clinic_name: string
          consult_includes: string | null
          consult_persuasion_lines: Json
          consult_price_deposit: number | null
          consult_price_free: boolean
          consult_price_original: number | null
          created_at: string
          doctor_name: string | null
          email: string | null
          id: string
          next_follow_up: string | null
          notes: string | null
          owner_name: string | null
          phone: string | null
          priority: string
          reminder_sent: boolean
          state: string | null
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          clinic_name: string
          consult_includes?: string | null
          consult_persuasion_lines?: Json
          consult_price_deposit?: number | null
          consult_price_free?: boolean
          consult_price_original?: number | null
          created_at?: string
          doctor_name?: string | null
          email?: string | null
          id?: string
          next_follow_up?: string | null
          notes?: string | null
          owner_name?: string | null
          phone?: string | null
          priority?: string
          reminder_sent?: boolean
          state?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          clinic_name?: string
          consult_includes?: string | null
          consult_persuasion_lines?: Json
          consult_price_deposit?: number | null
          consult_price_free?: boolean
          consult_price_original?: number | null
          created_at?: string
          doctor_name?: string | null
          email?: string | null
          id?: string
          next_follow_up?: string | null
          notes?: string | null
          owner_name?: string | null
          phone?: string | null
          priority?: string
          reminder_sent?: boolean
          state?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      contract_logs: {
        Row: {
          clinic_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          package_name: string
          source: string
          status: string
        }
        Insert: {
          clinic_name: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          package_name: string
          source?: string
          status?: string
        }
        Update: {
          clinic_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          package_name?: string
          source?: string
          status?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          context: Json | null
          created_at: string
          error_message: string
          function_name: string
          id: string
          resolved: boolean
        }
        Insert: {
          context?: Json | null
          created_at?: string
          error_message: string
          function_name: string
          id?: string
          resolved?: boolean
        }
        Update: {
          context?: Json | null
          created_at?: string
          error_message?: string
          function_name?: string
          id?: string
          resolved?: boolean
        }
        Relationships: []
      }
      meta_leads: {
        Row: {
          ad_name: string | null
          ad_set_name: string | null
          booking_date: string | null
          booking_time: string | null
          call_notes: string | null
          callback_scheduled_at: string | null
          campaign_name: string | null
          clinic_id: string | null
          created_at: string
          creative_time: string | null
          day_number: number
          email: string | null
          finance_eligible: boolean | null
          finance_form_answers: Json | null
          first_name: string | null
          funding_preference: string | null
          id: string
          last_name: string | null
          phone: string | null
          pipeline_summary: string | null
          pipeline_summary_updated_at: string | null
          raw_payload: Json | null
          rep_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ad_name?: string | null
          ad_set_name?: string | null
          booking_date?: string | null
          booking_time?: string | null
          call_notes?: string | null
          callback_scheduled_at?: string | null
          campaign_name?: string | null
          clinic_id?: string | null
          created_at?: string
          creative_time?: string | null
          day_number?: number
          email?: string | null
          finance_eligible?: boolean | null
          finance_form_answers?: Json | null
          first_name?: string | null
          funding_preference?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          pipeline_summary?: string | null
          pipeline_summary_updated_at?: string | null
          raw_payload?: Json | null
          rep_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ad_name?: string | null
          ad_set_name?: string | null
          booking_date?: string | null
          booking_time?: string | null
          call_notes?: string | null
          callback_scheduled_at?: string | null
          campaign_name?: string | null
          clinic_id?: string | null
          created_at?: string
          creative_time?: string | null
          day_number?: number
          email?: string | null
          finance_eligible?: boolean | null
          finance_form_answers?: Json | null
          first_name?: string | null
          funding_preference?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          pipeline_summary?: string | null
          pipeline_summary_updated_at?: string | null
          raw_payload?: Json | null
          rep_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      partner_clinics: {
        Row: {
          address: string | null
          city: string | null
          clinic_name: string
          consult_price_deposit: number | null
          consult_price_original: number | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          nearby_landmarks: string | null
          parking_info: string | null
          phone: string | null
          price_per_booking: number
          state: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          clinic_name: string
          consult_price_deposit?: number | null
          consult_price_original?: number | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          nearby_landmarks?: string | null
          parking_info?: string | null
          phone?: string | null
          price_per_booking?: number
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          clinic_name?: string
          consult_price_deposit?: number | null
          consult_price_original?: number | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          nearby_landmarks?: string | null
          parking_info?: string | null
          phone?: string | null
          price_per_booking?: number
          state?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      partner_doctors: {
        Row: {
          advanced_cases: string | null
          aftercare_included: string | null
          clinic_id: string | null
          created_at: string
          credentials: string | null
          id: string
          is_active: boolean
          name: string
          natural_results_approach: string | null
          specialties: string | null
          talking_points: string | null
          title: string | null
          training_background: string | null
          updated_at: string
          what_makes_them_different: string | null
          years_experience: number | null
        }
        Insert: {
          advanced_cases?: string | null
          aftercare_included?: string | null
          clinic_id?: string | null
          created_at?: string
          credentials?: string | null
          id?: string
          is_active?: boolean
          name: string
          natural_results_approach?: string | null
          specialties?: string | null
          talking_points?: string | null
          title?: string | null
          training_background?: string | null
          updated_at?: string
          what_makes_them_different?: string | null
          years_experience?: number | null
        }
        Update: {
          advanced_cases?: string | null
          aftercare_included?: string | null
          clinic_id?: string | null
          created_at?: string
          credentials?: string | null
          id?: string
          is_active?: boolean
          name?: string
          natural_results_approach?: string | null
          specialties?: string | null
          talking_points?: string | null
          title?: string | null
          training_background?: string | null
          updated_at?: string
          what_makes_them_different?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_doctors_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_reps: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          name: string
          role: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          name: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          name?: string
          role?: string
        }
        Relationships: []
      }
      sent_links: {
        Row: {
          clinic_name: string
          contact_name: string
          created_at: string
          email: string | null
          gst: number
          id: string
          kind: string
          notes: string | null
          package_name: string
          per_show_fee: number
          phone: string | null
          send_method: string
          shows: number
          stripe_url: string | null
          total_exc_gst: number
          total_inc_gst: number
          updated_at: string
        }
        Insert: {
          clinic_name: string
          contact_name: string
          created_at?: string
          email?: string | null
          gst?: number
          id?: string
          kind?: string
          notes?: string | null
          package_name: string
          per_show_fee?: number
          phone?: string | null
          send_method?: string
          shows?: number
          stripe_url?: string | null
          total_exc_gst?: number
          total_inc_gst?: number
          updated_at?: string
        }
        Update: {
          clinic_name?: string
          contact_name?: string
          created_at?: string
          email?: string | null
          gst?: number
          id?: string
          kind?: string
          notes?: string | null
          package_name?: string
          per_show_fee?: number
          phone?: string | null
          send_method?: string
          shows?: number
          stripe_url?: string | null
          total_exc_gst?: number
          total_inc_gst?: number
          updated_at?: string
        }
        Relationships: []
      }
      sms_messages: {
        Row: {
          body: string | null
          created_at: string
          direction: string
          error_code: string | null
          from_number: string | null
          id: string
          lead_id: string | null
          media_urls: Json
          phone: string | null
          sent_at: string | null
          status: string | null
          thread_id: string | null
          to_number: string | null
          twilio_message_sid: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          direction: string
          error_code?: string | null
          from_number?: string | null
          id?: string
          lead_id?: string | null
          media_urls?: Json
          phone?: string | null
          sent_at?: string | null
          status?: string | null
          thread_id?: string | null
          to_number?: string | null
          twilio_message_sid?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          direction?: string
          error_code?: string | null
          from_number?: string | null
          id?: string
          lead_id?: string | null
          media_urls?: Json
          phone?: string | null
          sent_at?: string | null
          status?: string | null
          thread_id?: string | null
          to_number?: string | null
          twilio_message_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "sms_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_threads: {
        Row: {
          clinic_id: string | null
          created_at: string
          display_name: string | null
          id: string
          last_direction: string | null
          last_message_at: string | null
          last_message_preview: string | null
          phone: string
          phone_normalized: string | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_direction?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          phone: string
          phone_normalized?: string | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_direction?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          phone?: string
          phone_normalized?: string | null
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_threads_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_links: {
        Row: {
          package_id: string
          updated_at: string
          url: string
        }
        Insert: {
          package_id: string
          updated_at?: string
          url?: string
        }
        Update: {
          package_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_clinic_id: { Args: never; Returns: string }
      get_dashboard_stats: { Args: never; Returns: Json }
      is_admin_user: { Args: never; Returns: boolean }
      is_clinic_user_for: { Args: { _clinic_id: string }; Returns: boolean }
      normalize_phone: { Args: { p: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
