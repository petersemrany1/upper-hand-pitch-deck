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
          from_number: string | null
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
          from_number?: string | null
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
          from_number?: string | null
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
      call_stages: {
        Row: {
          band: string
          gun_tell: string | null
          job: string
          move_on: string | null
          moves: Json
          name: string
          never_do: string | null
          notes: string | null
          say_text: string | null
          slug: string
          stage_no: number
          tag: string
        }
        Insert: {
          band: string
          gun_tell?: string | null
          job: string
          move_on?: string | null
          moves?: Json
          name: string
          never_do?: string | null
          notes?: string | null
          say_text?: string | null
          slug: string
          stage_no: number
          tag: string
        }
        Update: {
          band?: string
          gun_tell?: string | null
          job?: string
          move_on?: string | null
          moves?: Json
          name?: string
          never_do?: string | null
          notes?: string | null
          say_text?: string | null
          slug?: string
          stage_no?: number
          tag?: string
        }
        Relationships: []
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
      clinic_appointment_notes: {
        Row: {
          appointment_id: string
          author_name: string | null
          author_type: string
          body: string
          clinic_id: string
          created_at: string
          id: string
        }
        Insert: {
          appointment_id: string
          author_name?: string | null
          author_type: string
          body: string
          clinic_id: string
          created_at?: string
          id?: string
        }
        Update: {
          appointment_id?: string
          author_name?: string | null
          author_type?: string
          body?: string
          clinic_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_appointment_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "clinic_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_appointment_notes_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          clinic_id: string
          consult_summary: string | null
          created_at: string
          deposit_amount: number | null
          id: string
          intel_notes: string | null
          lead_id: string | null
          outcome: string | null
          patient_name: string
          patient_phone: string | null
          refund_processed_at: string | null
          refund_status: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          clinic_id: string
          consult_summary?: string | null
          created_at?: string
          deposit_amount?: number | null
          id?: string
          intel_notes?: string | null
          lead_id?: string | null
          outcome?: string | null
          patient_name: string
          patient_phone?: string | null
          refund_processed_at?: string | null
          refund_status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          clinic_id?: string
          consult_summary?: string | null
          created_at?: string
          deposit_amount?: number | null
          id?: string
          intel_notes?: string | null
          lead_id?: string | null
          outcome?: string | null
          patient_name?: string
          patient_phone?: string | null
          refund_processed_at?: string | null
          refund_status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
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
      clinic_blocked_slots: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          is_recurring: boolean
          recur_day_of_month: number | null
          recur_day_of_week: number | null
          recur_days_of_week: number[] | null
          recur_nth_week: number | null
          recur_pattern: string | null
          recur_until: string | null
          slot_date: string | null
          slot_end: string
          slot_start: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          is_recurring?: boolean
          recur_day_of_month?: number | null
          recur_day_of_week?: number | null
          recur_days_of_week?: number[] | null
          recur_nth_week?: number | null
          recur_pattern?: string | null
          recur_until?: string | null
          slot_date?: string | null
          slot_end: string
          slot_start: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          is_recurring?: boolean
          recur_day_of_month?: number | null
          recur_day_of_week?: number | null
          recur_days_of_week?: number[] | null
          recur_nth_week?: number | null
          recur_pattern?: string | null
          recur_until?: string | null
          slot_date?: string | null
          slot_end?: string
          slot_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_blocked_slots_clinic_id_fkey"
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
      clinic_trading_hours: {
        Row: {
          clinic_id: string
          close_time: string
          consult_duration_mins: number
          created_at: string
          day_of_week: number
          id: string
          is_closed: boolean
          open_time: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          close_time?: string
          consult_duration_mins?: number
          created_at?: string
          day_of_week: number
          id?: string
          is_closed?: boolean
          open_time?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          close_time?: string
          consult_duration_mins?: number
          created_at?: string
          day_of_week?: number
          id?: string
          is_closed?: boolean
          open_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_trading_hours_clinic_id_fkey"
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
          is_parent: boolean
          letter_sent: boolean
          letter_sent_at: string | null
          next_follow_up: string | null
          notes: string | null
          owner_name: string | null
          parent_clinic_id: string | null
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
          is_parent?: boolean
          letter_sent?: boolean
          letter_sent_at?: string | null
          next_follow_up?: string | null
          notes?: string | null
          owner_name?: string | null
          parent_clinic_id?: string | null
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
          is_parent?: boolean
          letter_sent?: boolean
          letter_sent_at?: string | null
          next_follow_up?: string | null
          notes?: string | null
          owner_name?: string | null
          parent_clinic_id?: string | null
          phone?: string | null
          priority?: string
          reminder_sent?: boolean
          state?: string | null
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinics_parent_clinic_id_fkey"
            columns: ["parent_clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
          deposit_amount: number | null
          deposit_paid_at: string | null
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
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
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
          deposit_amount?: number | null
          deposit_paid_at?: string | null
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
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
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
          deposit_amount?: number | null
          deposit_paid_at?: string | null
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
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_acknowledgements: {
        Row: {
          acknowledged_at: string
          metadata: Json
          notification_key: string
          notification_type: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          metadata?: Json
          notification_key: string
          notification_type: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          metadata?: Json
          notification_key?: string
          notification_type?: string
          user_id?: string
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
      phone_numbers: {
        Row: {
          call_count: number
          created_at: string
          friendly_name: string | null
          id: string
          last_used_at: string | null
          number: string
          status: string
          twilio_sid: string | null
        }
        Insert: {
          call_count?: number
          created_at?: string
          friendly_name?: string | null
          id?: string
          last_used_at?: string | null
          number: string
          status?: string
          twilio_sid?: string | null
        }
        Update: {
          call_count?: number
          created_at?: string
          friendly_name?: string | null
          id?: string
          last_used_at?: string | null
          number?: string
          status?: string
          twilio_sid?: string | null
        }
        Relationships: []
      }
      practice_call_recordings: {
        Row: {
          audio_path: string
          conversation_id: string
          created_at: string
          duration_seconds: number | null
          id: string
          rep_id: string | null
        }
        Insert: {
          audio_path: string
          conversation_id: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          rep_id?: string | null
        }
        Update: {
          audio_path?: string
          conversation_id?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          rep_id?: string | null
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          created_at: string | null
          id: string
          options: Json
          question: string
          question_no: number
          section: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          options: Json
          question: string
          question_no: number
          section: string
        }
        Update: {
          created_at?: string | null
          id?: string
          options?: Json
          question?: string
          question_no?: number
          section?: string
        }
        Relationships: []
      }
      rep_booking_targets: {
        Row: {
          created_at: string
          id: string
          month: number
          rep_id: string
          target: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          rep_id: string
          target?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          rep_id?: string
          target?: number
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      rep_module_progress: {
        Row: {
          beats_done: boolean
          drill_done: boolean
          hill_done: boolean
          id: string
          module_complete: boolean
          module_slug: string
          seen_beats: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          beats_done?: boolean
          drill_done?: boolean
          hill_done?: boolean
          id?: string
          module_complete?: boolean
          module_slug?: string
          seen_beats?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          beats_done?: boolean
          drill_done?: boolean
          hill_done?: boolean
          id?: string
          module_complete?: boolean
          module_slug?: string
          seen_beats?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rep_performance_jobs: {
        Row: {
          call_summaries: Json | null
          calls_completed: number
          created_at: string
          created_by: string | null
          date_from: string | null
          date_to: string | null
          error: string | null
          id: string
          rep_id: string
          report: Json | null
          status: string
          total_eligible: number
          updated_at: string
        }
        Insert: {
          call_summaries?: Json | null
          calls_completed?: number
          created_at?: string
          created_by?: string | null
          date_from?: string | null
          date_to?: string | null
          error?: string | null
          id?: string
          rep_id: string
          report?: Json | null
          status?: string
          total_eligible?: number
          updated_at?: string
        }
        Update: {
          call_summaries?: Json | null
          calls_completed?: number
          created_at?: string
          created_by?: string | null
          date_from?: string | null
          date_to?: string | null
          error?: string | null
          id?: string
          rep_id?: string
          report?: Json | null
          status?: string
          total_eligible?: number
          updated_at?: string
        }
        Relationships: []
      }
      rep_quiz_progress: {
        Row: {
          attempts: number
          best_score: number
          passed: boolean
          passed_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          best_score?: number
          passed?: boolean
          passed_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          best_score?: number
          passed?: boolean
          passed_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rep_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          rep_id: string
          started_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          rep_id: string
          started_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          rep_id?: string
          started_at?: string
        }
        Relationships: []
      }
      sales_reps: {
        Row: {
          allowed_tabs: string[] | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean
          last_name: string | null
          name: string
          role: string
        }
        Insert: {
          allowed_tabs?: string[] | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          name: string
          role?: string
        }
        Update: {
          allowed_tabs?: string[] | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          name?: string
          role?: string
        }
        Relationships: []
      }
      scorecard_dimensions: {
        Row: {
          dim_no: number
          gun_desc: string
          miss_desc: string
          name: string
          points: number
        }
        Insert: {
          dim_no: number
          gun_desc: string
          miss_desc: string
          name: string
          points: number
        }
        Update: {
          dim_no?: number
          gun_desc?: string
          miss_desc?: string
          name?: string
          points?: number
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_clinic_id: { Args: never; Returns: string }
      current_sales_rep_id: { Args: never; Returns: string }
      current_sales_rep_role: { Args: never; Returns: string }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_dashboard_stats: { Args: never; Returns: Json }
      has_sales_role: { Args: { _roles: string[] }; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_clinic_setter_user: { Args: never; Returns: boolean }
      is_clinic_user_for: { Args: { _clinic_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      normalize_phone: { Args: { p: string }; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
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
