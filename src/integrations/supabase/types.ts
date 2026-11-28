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
      ad_spend_daily: {
        Row: {
          ad_id: string | null
          ad_name: string
          adset_name: string | null
          campaign_name: string | null
          clicks: number
          created_at: string
          date: string
          id: string
          impressions: number
          location: string | null
          source: string
          spend_aud: number
          updated_at: string
        }
        Insert: {
          ad_id?: string | null
          ad_name: string
          adset_name?: string | null
          campaign_name?: string | null
          clicks?: number
          created_at?: string
          date: string
          id?: string
          impressions?: number
          location?: string | null
          source?: string
          spend_aud?: number
          updated_at?: string
        }
        Update: {
          ad_id?: string | null
          ad_name?: string
          adset_name?: string | null
          campaign_name?: string | null
          clicks?: number
          created_at?: string
          date?: string
          id?: string
          impressions?: number
          location?: string | null
          source?: string
          spend_aud?: number
          updated_at?: string
        }
        Relationships: []
      }
      ad_spend_sync_state: {
        Row: {
          created_at: string
          id: number
          last_message: string | null
          last_status: string | null
          last_synced_at: string | null
          rows_upserted: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          last_message?: string | null
          last_status?: string | null
          last_synced_at?: string | null
          rows_upserted?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          last_message?: string | null
          last_status?: string | null
          last_synced_at?: string | null
          rows_upserted?: number
          updated_at?: string
        }
        Relationships: []
      }
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
      appointment_confirmation_callbacks: {
        Row: {
          actor_id: string
          actor_name: string
          appointment_id: string
          appointment_updated_at: string
          callback_date: string
          callback_time: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          note: string | null
          replaces_id: string | null
          status: string
        }
        Insert: {
          actor_id: string
          actor_name: string
          appointment_id: string
          appointment_updated_at: string
          callback_date: string
          callback_time?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id: string
          note?: string | null
          replaces_id?: string | null
          status?: string
        }
        Update: {
          actor_id?: string
          actor_name?: string
          appointment_id?: string
          appointment_updated_at?: string
          callback_date?: string
          callback_time?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          replaces_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_confirmation_callbacks_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "ad_lead_outcomes"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "appointment_confirmation_callbacks_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "booking_rep_attribution"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "appointment_confirmation_callbacks_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "clinic_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_confirmation_callbacks_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "pending_clinic_handovers"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "appointment_confirmation_callbacks_replaces_id_fkey"
            columns: ["replaces_id"]
            isOneToOne: false
            referencedRelation: "appointment_confirmation_callbacks"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_confirmation_events: {
        Row: {
          actor_id: string
          actor_name: string
          appointment_id: string
          appointment_updated_at: string
          created_at: string
          id: string
          kind: string
          note: string | null
          sms_body: string | null
          sms_error: string | null
          sms_phone: string | null
          sms_sid: string | null
          sms_status: string | null
        }
        Insert: {
          actor_id: string
          actor_name: string
          appointment_id: string
          appointment_updated_at: string
          created_at?: string
          id: string
          kind: string
          note?: string | null
          sms_body?: string | null
          sms_error?: string | null
          sms_phone?: string | null
          sms_sid?: string | null
          sms_status?: string | null
        }
        Update: {
          actor_id?: string
          actor_name?: string
          appointment_id?: string
          appointment_updated_at?: string
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          sms_body?: string | null
          sms_error?: string | null
          sms_phone?: string | null
          sms_sid?: string | null
          sms_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_confirmation_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "ad_lead_outcomes"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "appointment_confirmation_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "booking_rep_attribution"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "appointment_confirmation_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "clinic_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_confirmation_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "pending_clinic_handovers"
            referencedColumns: ["appointment_id"]
          },
        ]
      }
      appointment_reminder_deliveries: {
        Row: {
          attempts: number
          body: string
          created_at: string
          destination: string
          error: string | null
          id: string
          kind: string
          provider_id: string | null
          reminder_id: string
          revision: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          body: string
          created_at?: string
          destination: string
          error?: string | null
          id?: string
          kind: string
          provider_id?: string | null
          reminder_id: string
          revision: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          body?: string
          created_at?: string
          destination?: string
          error?: string | null
          id?: string
          kind?: string
          provider_id?: string | null
          reminder_id?: string
          revision?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminder_deliveries_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "appointment_reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_reminders: {
        Row: {
          appointment_id: string | null
          booked_at: string
          booking_date: string | null
          booking_time: string | null
          confirmation_ack_at: string | null
          confirmation_call_result: string | null
          confirmation_confirmed_at: string | null
          confirmation_email_at: string | null
          confirmation_followup_at: string | null
          confirmation_last_call_at: string | null
          confirmation_last_reply: string | null
          confirmation_last_reply_at: string | null
          confirmation_method: string | null
          confirmation_reason: string | null
          confirmation_requested_at: string | null
          confirmation_revision: string
          confirmation_state: string
          created_at: string
          doctor_name: string | null
          id: string
          lead_id: string | null
          patient_first_name: string | null
          patient_last_name: string | null
          patient_phone: string | null
          schedule_changed_at: string | null
          status: string
          three_day_sms_claim: string | null
          three_day_sms_sent: boolean
          three_day_sms_sent_at: string | null
          twentyfour_hour_sms_claim: string | null
          twentyfour_hour_sms_sent: boolean
          twentyfour_hour_sms_sent_at: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          booked_at?: string
          booking_date?: string | null
          booking_time?: string | null
          confirmation_ack_at?: string | null
          confirmation_call_result?: string | null
          confirmation_confirmed_at?: string | null
          confirmation_email_at?: string | null
          confirmation_followup_at?: string | null
          confirmation_last_call_at?: string | null
          confirmation_last_reply?: string | null
          confirmation_last_reply_at?: string | null
          confirmation_method?: string | null
          confirmation_reason?: string | null
          confirmation_requested_at?: string | null
          confirmation_revision?: string
          confirmation_state?: string
          created_at?: string
          doctor_name?: string | null
          id?: string
          lead_id?: string | null
          patient_first_name?: string | null
          patient_last_name?: string | null
          patient_phone?: string | null
          schedule_changed_at?: string | null
          status?: string
          three_day_sms_claim?: string | null
          three_day_sms_sent?: boolean
          three_day_sms_sent_at?: string | null
          twentyfour_hour_sms_claim?: string | null
          twentyfour_hour_sms_sent?: boolean
          twentyfour_hour_sms_sent_at?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          booked_at?: string
          booking_date?: string | null
          booking_time?: string | null
          confirmation_ack_at?: string | null
          confirmation_call_result?: string | null
          confirmation_confirmed_at?: string | null
          confirmation_email_at?: string | null
          confirmation_followup_at?: string | null
          confirmation_last_call_at?: string | null
          confirmation_last_reply?: string | null
          confirmation_last_reply_at?: string | null
          confirmation_method?: string | null
          confirmation_reason?: string | null
          confirmation_requested_at?: string | null
          confirmation_revision?: string
          confirmation_state?: string
          created_at?: string
          doctor_name?: string | null
          id?: string
          lead_id?: string | null
          patient_first_name?: string | null
          patient_last_name?: string | null
          patient_phone?: string | null
          schedule_changed_at?: string | null
          status?: string
          three_day_sms_claim?: string | null
          three_day_sms_sent?: boolean
          three_day_sms_sent_at?: string | null
          twentyfour_hour_sms_claim?: string | null
          twentyfour_hour_sms_sent?: boolean
          twentyfour_hour_sms_sent_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "ad_lead_outcomes"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "booking_rep_attribution"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "clinic_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "pending_clinic_handovers"
            referencedColumns: ["appointment_id"]
          },
        ]
      }
      appointment_reply_receipts: {
        Row: {
          created_at: string
          provider_id: string
        }
        Insert: {
          created_at?: string
          provider_id: string
        }
        Update: {
          created_at?: string
          provider_id?: string
        }
        Relationships: []
      }
      appointment_reschedules: {
        Row: {
          actor_id: string
          actor_name: string
          actor_role: string
          appointment_id: string | null
          created_at: string
          email_accepted_at: string | null
          email_attempt_at: string | null
          email_body: string | null
          email_error: string | null
          email_receipt: string | null
          email_status: string | null
          email_subject: string | null
          email_to: string | null
          id: string
          new_date: string
          new_time: string
          old_date: string
          old_time: string
          reason: string | null
          sms_body: string
          sms_error: string | null
          sms_phone: string
          sms_sid: string | null
          sms_status: string
        }
        Insert: {
          actor_id: string
          actor_name: string
          actor_role: string
          appointment_id?: string | null
          created_at?: string
          email_accepted_at?: string | null
          email_attempt_at?: string | null
          email_body?: string | null
          email_error?: string | null
          email_receipt?: string | null
          email_status?: string | null
          email_subject?: string | null
          email_to?: string | null
          id: string
          new_date: string
          new_time: string
          old_date: string
          old_time: string
          reason?: string | null
          sms_body: string
          sms_error?: string | null
          sms_phone: string
          sms_sid?: string | null
          sms_status?: string
        }
        Update: {
          actor_id?: string
          actor_name?: string
          actor_role?: string
          appointment_id?: string | null
          created_at?: string
          email_accepted_at?: string | null
          email_attempt_at?: string | null
          email_body?: string | null
          email_error?: string | null
          email_receipt?: string | null
          email_status?: string | null
          email_subject?: string | null
          email_to?: string | null
          id?: string
          new_date?: string
          new_time?: string
          old_date?: string
          old_time?: string
          reason?: string | null
          sms_body?: string
          sms_error?: string | null
          sms_phone?: string
          sms_sid?: string | null
          sms_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reschedules_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "ad_lead_outcomes"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "appointment_reschedules_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "booking_rep_attribution"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "appointment_reschedules_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "clinic_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_reschedules_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "pending_clinic_handovers"
            referencedColumns: ["appointment_id"]
          },
        ]
      }
      calendar_history_start: {
        Row: {
          singleton: boolean
          started_at: string
        }
        Insert: {
          singleton?: boolean
          started_at?: string
        }
        Update: {
          singleton?: boolean
          started_at?: string
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
          voice_destination_sid: string | null
          voice_error_code: string | null
          voice_sip_response: string | null
          voice_status_sequence: number | null
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
          voice_destination_sid?: string | null
          voice_error_code?: string | null
          voice_sip_response?: string | null
          voice_status_sequence?: number | null
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
          voice_destination_sid?: string | null
          voice_error_code?: string | null
          voice_sip_response?: string | null
          voice_status_sequence?: number | null
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
            referencedRelation: "ad_lead_outcomes"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "clinic_appointment_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "booking_rep_attribution"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "clinic_appointment_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "clinic_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_appointment_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "pending_clinic_handovers"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "clinic_appointment_notes_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
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
          booked_at: string
          booking_rep_id: string | null
          chase_note: string | null
          chase_requested_at: string | null
          chase_requested_by: string | null
          chase_result_at: string | null
          chase_result_by: string | null
          chase_status: string | null
          clinic_id: string
          consult_summary: string | null
          consultation_duration_minutes: number
          created_at: string
          deposit_amount: number | null
          disqualified_at: string | null
          disqualified_by: string | null
          disqualified_reason: string | null
          doctor_id: string | null
          doctor_name: string | null
          expectations_set: boolean | null
          id: string
          intel_notes: string | null
          is_free_trial: boolean
          lead_id: string | null
          norwood_level: number | null
          outcome: string | null
          patient_email: string | null
          patient_name: string
          patient_phone: string | null
          payment_processor: string | null
          refund_error: string | null
          refund_processed_at: string | null
          refund_status: string | null
          square_payment_id: string | null
          square_refund_id: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          booked_at?: string
          booking_rep_id?: string | null
          chase_note?: string | null
          chase_requested_at?: string | null
          chase_requested_by?: string | null
          chase_result_at?: string | null
          chase_result_by?: string | null
          chase_status?: string | null
          clinic_id: string
          consult_summary?: string | null
          consultation_duration_minutes?: number
          created_at?: string
          deposit_amount?: number | null
          disqualified_at?: string | null
          disqualified_by?: string | null
          disqualified_reason?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          expectations_set?: boolean | null
          id?: string
          intel_notes?: string | null
          is_free_trial?: boolean
          lead_id?: string | null
          norwood_level?: number | null
          outcome?: string | null
          patient_email?: string | null
          patient_name: string
          patient_phone?: string | null
          payment_processor?: string | null
          refund_error?: string | null
          refund_processed_at?: string | null
          refund_status?: string | null
          square_payment_id?: string | null
          square_refund_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          booked_at?: string
          booking_rep_id?: string | null
          chase_note?: string | null
          chase_requested_at?: string | null
          chase_requested_by?: string | null
          chase_result_at?: string | null
          chase_result_by?: string | null
          chase_status?: string | null
          clinic_id?: string
          consult_summary?: string | null
          consultation_duration_minutes?: number
          created_at?: string
          deposit_amount?: number | null
          disqualified_at?: string | null
          disqualified_by?: string | null
          disqualified_reason?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          expectations_set?: boolean | null
          id?: string
          intel_notes?: string | null
          is_free_trial?: boolean
          lead_id?: string | null
          norwood_level?: number | null
          outcome?: string | null
          patient_email?: string | null
          patient_name?: string
          patient_phone?: string | null
          payment_processor?: string | null
          refund_error?: string | null
          refund_processed_at?: string | null
          refund_status?: string | null
          square_payment_id?: string | null
          square_refund_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_appointments_booking_rep_id_fkey"
            columns: ["booking_rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinic_appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "partner_doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "ad_lead_outcomes"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "clinic_appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "meta_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "pending_clinic_handovers"
            referencedColumns: ["lead_id"]
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
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
          },
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
          excluded_dates: string[]
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
          excluded_dates?: string[]
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
          excluded_dates?: string[]
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
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinic_blocked_slots_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_calendar_history: {
        Row: {
          actor_id: string | null
          actor_name: string
          actor_role: string
          after_data: Json | null
          before_data: Json | null
          clinic_id: string
          entity_id: string
          entity_type: string
          id: number
          operation: string
          recorded_at: string
        }
        Insert: {
          actor_id?: string | null
          actor_name: string
          actor_role: string
          after_data?: Json | null
          before_data?: Json | null
          clinic_id: string
          entity_id: string
          entity_type: string
          id?: never
          operation: string
          recorded_at?: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string
          actor_role?: string
          after_data?: Json | null
          before_data?: Json | null
          clinic_id?: string
          entity_id?: string
          entity_type?: string
          id?: never
          operation?: string
          recorded_at?: string
        }
        Relationships: []
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
      clinic_leads: {
        Row: {
          assigned_to: string | null
          city: string | null
          clinic_name: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          raw_payload: Json
          source: string
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          city?: string | null
          clinic_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          raw_payload?: Json
          source?: string
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          city?: string | null
          clinic_name?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          raw_payload?: Json
          source?: string
          state?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinic_packs: {
        Row: {
          amount_paid_ex_gst: number | null
          clinic_id: string
          created_at: string
          date_paid: string | null
          free_shows_included: number
          id: string
          notes: string | null
          pack_name: string | null
          pack_size: number
          pack_type: string
          purchased_at: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_paid_ex_gst?: number | null
          clinic_id: string
          created_at?: string
          date_paid?: string | null
          free_shows_included?: number
          id?: string
          notes?: string | null
          pack_name?: string | null
          pack_size: number
          pack_type?: string
          purchased_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_paid_ex_gst?: number | null
          clinic_id?: string
          created_at?: string
          date_paid?: string | null
          free_shows_included?: number
          id?: string
          notes?: string | null
          pack_name?: string | null
          pack_size?: number
          pack_type?: string
          purchased_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_packs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinic_packs_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
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
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinic_portal_users_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_public_holidays: {
        Row: {
          holiday_date: string
          name: string
          state: string
        }
        Insert: {
          holiday_date: string
          name: string
          state: string
        }
        Update: {
          holiday_date?: string
          name?: string
          state?: string
        }
        Relationships: []
      }
      clinic_reclassification_requests: {
        Row: {
          acknowledged_at: string
          acknowledgement_version: string
          appointment_date: string
          appointment_id: string
          appointment_time: string | null
          clinic_id: string
          clinic_name: string
          created_at: string
          email_error: string | null
          email_message_id: string
          email_state: string
          id: string
          outcome_at_request: string | null
          patient_name: string
          reason: string
          requested_by: string
          requester_email: string
          status: string
        }
        Insert: {
          acknowledged_at?: string
          acknowledgement_version?: string
          appointment_date: string
          appointment_id: string
          appointment_time?: string | null
          clinic_id: string
          clinic_name: string
          created_at?: string
          email_error?: string | null
          email_message_id?: string
          email_state?: string
          id?: string
          outcome_at_request?: string | null
          patient_name: string
          reason: string
          requested_by: string
          requester_email: string
          status?: string
        }
        Update: {
          acknowledged_at?: string
          acknowledgement_version?: string
          appointment_date?: string
          appointment_id?: string
          appointment_time?: string | null
          clinic_id?: string
          clinic_name?: string
          created_at?: string
          email_error?: string | null
          email_message_id?: string
          email_state?: string
          id?: string
          outcome_at_request?: string | null
          patient_name?: string
          reason?: string
          requested_by?: string
          requester_email?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_reclassification_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "ad_lead_outcomes"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "clinic_reclassification_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "booking_rep_attribution"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "clinic_reclassification_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "clinic_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_reclassification_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "pending_clinic_handovers"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "clinic_reclassification_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinic_reclassification_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_reminder_settings: {
        Row: {
          alert_email: string
          call_days: number[]
          clinic_id: string
          closed_dates: string[]
          mode: string
          normal_send_time: string
          timezone: string
          updated_at: string
        }
        Insert: {
          alert_email?: string
          call_days?: number[]
          clinic_id: string
          closed_dates?: string[]
          mode?: string
          normal_send_time?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          alert_email?: string
          call_days?: number[]
          clinic_id?: string
          closed_dates?: string[]
          mode?: string
          normal_send_time?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_reminder_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinic_reminder_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
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
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinic_trading_hours_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_trials: {
        Row: {
          appointment_end: string
          appointment_start: string
          booking_opens: string
          clinic_id: string
          paid_started_at: string | null
        }
        Insert: {
          appointment_end: string
          appointment_start: string
          booking_opens: string
          clinic_id: string
          paid_started_at?: string | null
        }
        Update: {
          appointment_end?: string
          appointment_start?: string
          booking_opens?: string
          clinic_id?: string
          paid_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_trials_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinic_trials_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinicflow_chase_requests: {
        Row: {
          appointment_id: string
          clinic_id: string
          created_at: string
          done_at: string | null
          id: string
          note: string | null
          patient_name: string
          quote_id: string | null
          requested_at: string
          status: string
        }
        Insert: {
          appointment_id: string
          clinic_id: string
          created_at?: string
          done_at?: string | null
          id?: string
          note?: string | null
          patient_name: string
          quote_id?: string | null
          requested_at?: string
          status?: string
        }
        Update: {
          appointment_id?: string
          clinic_id?: string
          created_at?: string
          done_at?: string | null
          id?: string
          note?: string | null
          patient_name?: string
          quote_id?: string | null
          requested_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinicflow_chase_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "ad_lead_outcomes"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "clinicflow_chase_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "booking_rep_attribution"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "clinicflow_chase_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "clinic_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinicflow_chase_requests_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "pending_clinic_handovers"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "clinicflow_chase_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinicflow_chase_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinicflow_chase_requests_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "clinicflow_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      clinicflow_clinic_settings: {
        Row: {
          clinic_id: string
          cooling_off_days: number
          created_at: string
          default_deposit_amount: number
          doctor_name: string | null
          email_notifications_enabled: boolean
          follicle_model_url: string | null
          id: string
          kiosk_pin: string
          logo_url: string | null
          notification_email: string | null
          quote_validity_days: number
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          stripe_details_submitted: boolean
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          clinic_id: string
          cooling_off_days?: number
          created_at?: string
          default_deposit_amount?: number
          doctor_name?: string | null
          email_notifications_enabled?: boolean
          follicle_model_url?: string | null
          id?: string
          kiosk_pin?: string
          logo_url?: string | null
          notification_email?: string | null
          quote_validity_days?: number
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_details_submitted?: boolean
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          clinic_id?: string
          cooling_off_days?: number
          created_at?: string
          default_deposit_amount?: number
          doctor_name?: string | null
          email_notifications_enabled?: boolean
          follicle_model_url?: string | null
          id?: string
          kiosk_pin?: string
          logo_url?: string | null
          notification_email?: string | null
          quote_validity_days?: number
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_details_submitted?: boolean
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinicflow_clinic_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinicflow_clinic_settings_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: true
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinicflow_followups: {
        Row: {
          clinic_id: string
          created_at: string
          done_at: string | null
          due_date: string
          id: string
          patient_name: string
          quote_id: string
          status: string
          task_type: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          done_at?: string | null
          due_date: string
          id?: string
          patient_name: string
          quote_id: string
          status?: string
          task_type: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          done_at?: string | null
          due_date?: string
          id?: string
          patient_name?: string
          quote_id?: string
          status?: string
          task_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinicflow_followups_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinicflow_followups_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinicflow_followups_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "clinicflow_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      clinicflow_intakes: {
        Row: {
          allergies: string | null
          appointment_id: string
          clinic_id: string
          completed_at: string | null
          confirmed_name: string | null
          created_at: string
          dob: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          gp_details: string | null
          hair_answers: Json
          id: string
          lead_id: string | null
          medical_conditions: string | null
          medications: string | null
          mobile: string | null
          previous_treatments: string | null
          status: string
          updated_at: string
          wellbeing_answers: Json
          wellbeing_review: boolean
        }
        Insert: {
          allergies?: string | null
          appointment_id: string
          clinic_id: string
          completed_at?: string | null
          confirmed_name?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gp_details?: string | null
          hair_answers?: Json
          id?: string
          lead_id?: string | null
          medical_conditions?: string | null
          medications?: string | null
          mobile?: string | null
          previous_treatments?: string | null
          status?: string
          updated_at?: string
          wellbeing_answers?: Json
          wellbeing_review?: boolean
        }
        Update: {
          allergies?: string | null
          appointment_id?: string
          clinic_id?: string
          completed_at?: string | null
          confirmed_name?: string | null
          created_at?: string
          dob?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          gp_details?: string | null
          hair_answers?: Json
          id?: string
          lead_id?: string | null
          medical_conditions?: string | null
          medications?: string | null
          mobile?: string | null
          previous_treatments?: string | null
          status?: string
          updated_at?: string
          wellbeing_answers?: Json
          wellbeing_review?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "clinicflow_intakes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "ad_lead_outcomes"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "clinicflow_intakes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "booking_rep_attribution"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "clinicflow_intakes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "clinic_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinicflow_intakes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "pending_clinic_handovers"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "clinicflow_intakes_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinicflow_intakes_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinicflow_photos: {
        Row: {
          caption: string | null
          clinic_id: string
          created_at: string
          id: string
          stage: string
          url: string
        }
        Insert: {
          caption?: string | null
          clinic_id: string
          created_at?: string
          id?: string
          stage: string
          url: string
        }
        Update: {
          caption?: string | null
          clinic_id?: string
          created_at?: string
          id?: string
          stage?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinicflow_photos_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinicflow_photos_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinicflow_pipeline_status: {
        Row: {
          appointment_id: string
          clinic_id: string
          created_at: string
          id: string
          lost_at: string | null
          lost_note: string | null
          lost_reason: string | null
          next_followup_date: string | null
          next_followup_note: string | null
          updated_at: string
        }
        Insert: {
          appointment_id: string
          clinic_id: string
          created_at?: string
          id?: string
          lost_at?: string | null
          lost_note?: string | null
          lost_reason?: string | null
          next_followup_date?: string | null
          next_followup_note?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          clinic_id?: string
          created_at?: string
          id?: string
          lost_at?: string | null
          lost_note?: string | null
          lost_reason?: string | null
          next_followup_date?: string | null
          next_followup_note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinicflow_pipeline_status_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "ad_lead_outcomes"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "clinicflow_pipeline_status_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "booking_rep_attribution"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "clinicflow_pipeline_status_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "clinic_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinicflow_pipeline_status_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "pending_clinic_handovers"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "clinicflow_pipeline_status_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinicflow_pipeline_status_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinicflow_quotes: {
        Row: {
          appointment_id: string
          booked_date: string | null
          clinic_id: string
          created_at: string
          created_by: string | null
          date_option_1: string | null
          date_option_2: string | null
          deposit_amount: number
          deposit_method: string | null
          deposit_recorded_at: string | null
          description: string | null
          diagnosis: string
          graft_unit: string
          grafts: number | null
          id: string
          includes_text: string | null
          intake_id: string | null
          lead_id: string | null
          norwood: string | null
          patient_name: string
          price: number
          status: string
          updated_at: string
          valid_until: string
        }
        Insert: {
          appointment_id: string
          booked_date?: string | null
          clinic_id: string
          created_at?: string
          created_by?: string | null
          date_option_1?: string | null
          date_option_2?: string | null
          deposit_amount: number
          deposit_method?: string | null
          deposit_recorded_at?: string | null
          description?: string | null
          diagnosis: string
          graft_unit?: string
          grafts?: number | null
          id?: string
          includes_text?: string | null
          intake_id?: string | null
          lead_id?: string | null
          norwood?: string | null
          patient_name: string
          price: number
          status?: string
          updated_at?: string
          valid_until: string
        }
        Update: {
          appointment_id?: string
          booked_date?: string | null
          clinic_id?: string
          created_at?: string
          created_by?: string | null
          date_option_1?: string | null
          date_option_2?: string | null
          deposit_amount?: number
          deposit_method?: string | null
          deposit_recorded_at?: string | null
          description?: string | null
          diagnosis?: string
          graft_unit?: string
          grafts?: number | null
          id?: string
          includes_text?: string | null
          intake_id?: string | null
          lead_id?: string | null
          norwood?: string | null
          patient_name?: string
          price?: number
          status?: string
          updated_at?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinicflow_quotes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "ad_lead_outcomes"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "clinicflow_quotes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "booking_rep_attribution"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "clinicflow_quotes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "clinic_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinicflow_quotes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "pending_clinic_handovers"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "clinicflow_quotes_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "clinicflow_quotes_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinicflow_quotes_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "clinicflow_intakes"
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
          contact_confidence: string | null
          contact_enriched_at: string | null
          contact_enrichment_raw: Json | null
          contact_enrichment_status: string | null
          contact_source_url: string | null
          created_at: string
          doctor_name: string | null
          email: string | null
          handover_cc: string | null
          id: string
          is_parent: boolean
          letter_campaign_column: string | null
          letter_campaign_excluded: boolean
          letter_sent: boolean
          letter_sent_at: string | null
          linkedin_url: string | null
          linkedin_url_suggested: string | null
          next_follow_up: string | null
          notes: string | null
          owner_confidence: string | null
          owner_email: string | null
          owner_email_suggested: string | null
          owner_enriched_at: string | null
          owner_enrichment_raw: Json | null
          owner_enrichment_status: string
          owner_linkedin_suggested: string | null
          owner_name: string | null
          owner_name_suggested: string | null
          owner_source_url: string | null
          owner_title: string | null
          owner_title_suggested: string | null
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
          contact_confidence?: string | null
          contact_enriched_at?: string | null
          contact_enrichment_raw?: Json | null
          contact_enrichment_status?: string | null
          contact_source_url?: string | null
          created_at?: string
          doctor_name?: string | null
          email?: string | null
          handover_cc?: string | null
          id?: string
          is_parent?: boolean
          letter_campaign_column?: string | null
          letter_campaign_excluded?: boolean
          letter_sent?: boolean
          letter_sent_at?: string | null
          linkedin_url?: string | null
          linkedin_url_suggested?: string | null
          next_follow_up?: string | null
          notes?: string | null
          owner_confidence?: string | null
          owner_email?: string | null
          owner_email_suggested?: string | null
          owner_enriched_at?: string | null
          owner_enrichment_raw?: Json | null
          owner_enrichment_status?: string
          owner_linkedin_suggested?: string | null
          owner_name?: string | null
          owner_name_suggested?: string | null
          owner_source_url?: string | null
          owner_title?: string | null
          owner_title_suggested?: string | null
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
          contact_confidence?: string | null
          contact_enriched_at?: string | null
          contact_enrichment_raw?: Json | null
          contact_enrichment_status?: string | null
          contact_source_url?: string | null
          created_at?: string
          doctor_name?: string | null
          email?: string | null
          handover_cc?: string | null
          id?: string
          is_parent?: boolean
          letter_campaign_column?: string | null
          letter_campaign_excluded?: boolean
          letter_sent?: boolean
          letter_sent_at?: string | null
          linkedin_url?: string | null
          linkedin_url_suggested?: string | null
          next_follow_up?: string | null
          notes?: string | null
          owner_confidence?: string | null
          owner_email?: string | null
          owner_email_suggested?: string | null
          owner_enriched_at?: string | null
          owner_enrichment_raw?: Json | null
          owner_enrichment_status?: string
          owner_linkedin_suggested?: string | null
          owner_name?: string | null
          owner_name_suggested?: string | null
          owner_source_url?: string | null
          owner_title?: string | null
          owner_title_suggested?: string | null
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
      handover_alerts: {
        Row: {
          appointment_id: string
          created_at: string
          last_error: string | null
          message_id: string
          status: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          last_error?: string | null
          message_id?: string
          status: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          last_error?: string | null
          message_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "handover_alerts_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "ad_lead_outcomes"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "handover_alerts_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "booking_rep_attribution"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "handover_alerts_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "clinic_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "handover_alerts_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "pending_clinic_handovers"
            referencedColumns: ["appointment_id"]
          },
        ]
      }
      internal_cron_config: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      lead_blacklist: {
        Row: {
          created_at: string
          email: string | null
          id: string
          phone: string | null
          reason: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          reason?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          phone?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      lead_skip_events: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          reason: string
          rep_id: string
          rep_name: string
          session_id: string | null
        }
        Insert: {
          created_at?: string
          id: string
          lead_id: string
          reason: string
          rep_id: string
          rep_name: string
          session_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          reason?: string
          rep_id?: string
          rep_name?: string
          session_id?: string | null
        }
        Relationships: []
      }
      legal_ad_briefing_calls: {
        Row: {
          call_date: string
          call_sid: string | null
          caller_id: string
          created_at: string
          duration: number | null
          elevenlabs_conversation_id: string | null
          error_code: string | null
          id: string
          kind: string
          media_stream_sid: string | null
          owner_id: string
          recipient: string
          report_id: string | null
          retry_due_at: string | null
          retry_of: string | null
          speech_engine_claimed: boolean
          speech_engine_id: string | null
          status: string
          test_revision: string | null
        }
        Insert: {
          call_date: string
          call_sid?: string | null
          caller_id: string
          created_at?: string
          duration?: number | null
          elevenlabs_conversation_id?: string | null
          error_code?: string | null
          id?: string
          kind: string
          media_stream_sid?: string | null
          owner_id: string
          recipient: string
          report_id?: string | null
          retry_due_at?: string | null
          retry_of?: string | null
          speech_engine_claimed?: boolean
          speech_engine_id?: string | null
          status?: string
          test_revision?: string | null
        }
        Update: {
          call_date?: string
          call_sid?: string | null
          caller_id?: string
          created_at?: string
          duration?: number | null
          elevenlabs_conversation_id?: string | null
          error_code?: string | null
          id?: string
          kind?: string
          media_stream_sid?: string | null
          owner_id?: string
          recipient?: string
          report_id?: string | null
          retry_due_at?: string | null
          retry_of?: string | null
          speech_engine_claimed?: boolean
          speech_engine_id?: string | null
          status?: string
          test_revision?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_ad_briefing_calls_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "legal_ad_briefing_settings"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "legal_ad_briefing_calls_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "legal_ad_briefing_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_ad_briefing_calls_retry_of_fkey"
            columns: ["retry_of"]
            isOneToOne: false
            referencedRelation: "legal_ad_briefing_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_ad_briefing_reports: {
        Row: {
          collected_at: string
          created_at: string
          id: string
          owner_id: string
          report: string
          report_date: string
          summary: string
        }
        Insert: {
          collected_at: string
          created_at?: string
          id?: string
          owner_id: string
          report: string
          report_date: string
          summary: string
        }
        Update: {
          collected_at?: string
          created_at?: string
          id?: string
          owner_id?: string
          report?: string
          report_date?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_ad_briefing_reports_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "legal_ad_briefing_settings"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      legal_ad_briefing_settings: {
        Row: {
          caller_id: string
          created_at: string
          enabled: boolean
          owner_id: string
          recipient: string
          speech_engine_id: string | null
        }
        Insert: {
          caller_id: string
          created_at?: string
          enabled?: boolean
          owner_id: string
          recipient: string
          speech_engine_id?: string | null
        }
        Update: {
          caller_id?: string
          created_at?: string
          enabled?: boolean
          owner_id?: string
          recipient?: string
          speech_engine_id?: string | null
        }
        Relationships: []
      }
      legal_ad_briefing_turns: {
        Row: {
          answer: string | null
          call_id: string
          created_at: string
          question: string | null
          step: number
          twiml: string | null
        }
        Insert: {
          answer?: string | null
          call_id: string
          created_at?: string
          question?: string | null
          step: number
          twiml?: string | null
        }
        Update: {
          answer?: string | null
          call_id?: string
          created_at?: string
          question?: string | null
          step?: number
          twiml?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_ad_briefing_turns_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "legal_ad_briefing_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_ad_spend_coverage: {
        Row: {
          account_id: string
          campaign_ids: string[]
          date: string
          synced_at: string
        }
        Insert: {
          account_id: string
          campaign_ids: string[]
          date: string
          synced_at: string
        }
        Update: {
          account_id?: string
          campaign_ids?: string[]
          date?: string
          synced_at?: string
        }
        Relationships: []
      }
      legal_ad_spend_daily: {
        Row: {
          account_id: string | null
          ad_id: string | null
          ad_name: string
          adset_id: string | null
          adset_name: string | null
          campaign_id: string | null
          campaign_name: string | null
          clicks: number
          creative_id: string | null
          date: string
          id: string
          impressions: number
          location: string | null
          metrics_fetched_at: string | null
          source: string
          spend_aud: number
          updated_at: string
          video_metrics: Json | null
        }
        Insert: {
          account_id?: string | null
          ad_id?: string | null
          ad_name: string
          adset_id?: string | null
          adset_name?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          clicks?: number
          creative_id?: string | null
          date: string
          id?: string
          impressions?: number
          location?: string | null
          metrics_fetched_at?: string | null
          source: string
          spend_aud: number
          updated_at?: string
          video_metrics?: Json | null
        }
        Update: {
          account_id?: string | null
          ad_id?: string | null
          ad_name?: string
          adset_id?: string | null
          adset_name?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          clicks?: number
          creative_id?: string | null
          date?: string
          id?: string
          impressions?: number
          location?: string | null
          metrics_fetched_at?: string | null
          source?: string
          spend_aud?: number
          updated_at?: string
          video_metrics?: Json | null
        }
        Relationships: []
      }
      legal_ad_spend_sync_state: {
        Row: {
          account_id: string | null
          account_name: string | null
          ad_total: number | null
          campaign_ids: string[] | null
          coverage_from: string | null
          coverage_to: string | null
          currency: string | null
          id: number
          last_attempt_at: string | null
          last_message: string | null
          last_status: string | null
          last_synced_at: string | null
          reference_total: number | null
          timezone: string | null
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          ad_total?: number | null
          campaign_ids?: string[] | null
          coverage_from?: string | null
          coverage_to?: string | null
          currency?: string | null
          id: number
          last_attempt_at?: string | null
          last_message?: string | null
          last_status?: string | null
          last_synced_at?: string | null
          reference_total?: number | null
          timezone?: string | null
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          ad_total?: number | null
          campaign_ids?: string[] | null
          coverage_from?: string | null
          coverage_to?: string | null
          currency?: string | null
          id?: number
          last_attempt_at?: string | null
          last_message?: string | null
          last_status?: string | null
          last_synced_at?: string | null
          reference_total?: number | null
          timezone?: string | null
        }
        Relationships: []
      }
      legal_app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      legal_appointment_attendance: {
        Row: {
          appointment_id: string
          booking_changed_at: string
          booking_version: string
          call_outcome: string | null
          called_at: string | null
          confirmed_at: string | null
          latest_reply: string | null
          latest_reply_at: string | null
          reason: string | null
          status: string
        }
        Insert: {
          appointment_id: string
          booking_changed_at?: string
          booking_version?: string
          call_outcome?: string | null
          called_at?: string | null
          confirmed_at?: string | null
          latest_reply?: string | null
          latest_reply_at?: string | null
          reason?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string
          booking_changed_at?: string
          booking_version?: string
          call_outcome?: string | null
          called_at?: string | null
          confirmed_at?: string | null
          latest_reply?: string | null
          latest_reply_at?: string | null
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_appointment_attendance_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "legal_firm_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_appointment_attendance_events: {
        Row: {
          actor_id: string | null
          appointment_id: string
          booking_version: string
          created_at: string
          detail: string | null
          id: string
          kind: string
        }
        Insert: {
          actor_id?: string | null
          appointment_id: string
          booking_version: string
          created_at?: string
          detail?: string | null
          id?: string
          kind: string
        }
        Update: {
          actor_id?: string | null
          appointment_id?: string
          booking_version?: string
          created_at?: string
          detail?: string | null
          id?: string
          kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_appointment_attendance_events_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "legal_firm_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_appointment_reminder_jobs: {
        Row: {
          appointment_id: string
          booking_version: string
          claimed_at: string | null
          delivery_status: string | null
          due_at: string
          from_phone: string | null
          id: string
          kind: string
          last_error: string | null
          sent_at: string | null
          state: string
          to_phone: string | null
          twilio_sid: string | null
        }
        Insert: {
          appointment_id: string
          booking_version: string
          claimed_at?: string | null
          delivery_status?: string | null
          due_at: string
          from_phone?: string | null
          id?: string
          kind: string
          last_error?: string | null
          sent_at?: string | null
          state?: string
          to_phone?: string | null
          twilio_sid?: string | null
        }
        Update: {
          appointment_id?: string
          booking_version?: string
          claimed_at?: string | null
          delivery_status?: string | null
          due_at?: string
          from_phone?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          sent_at?: string | null
          state?: string
          to_phone?: string | null
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_appointment_reminder_jobs_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "legal_firm_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_appointment_reminders: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          kind: string | null
          send_at: string | null
          sent_at: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          send_at?: string | null
          sent_at?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          send_at?: string | null
          sent_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "legal_firm_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_appointment_sms_opt_outs: {
        Row: {
          created_at: string
          phone: string
        }
        Insert: {
          created_at?: string
          phone: string
        }
        Update: {
          created_at?: string
          phone?: string
        }
        Relationships: []
      }
      legal_appointment_sms_receipts: {
        Row: {
          created_at: string
          sid: string
        }
        Insert: {
          created_at?: string
          sid: string
        }
        Update: {
          created_at?: string
          sid?: string
        }
        Relationships: []
      }
      legal_call_hook_insights: {
        Row: {
          assessment: Json | null
          attempts: number
          call_id: string
          generated_at: string | null
          generation_token: string | null
          hook: string | null
          lease_until: string | null
          model: string
          prompt_version: string
          reason: string
          requested_by: string | null
          source_hash: string
          status: string
          updated_at: string
        }
        Insert: {
          assessment?: Json | null
          attempts?: number
          call_id: string
          generated_at?: string | null
          generation_token?: string | null
          hook?: string | null
          lease_until?: string | null
          model: string
          prompt_version: string
          reason?: string
          requested_by?: string | null
          source_hash: string
          status: string
          updated_at?: string
        }
        Update: {
          assessment?: Json | null
          attempts?: number
          call_id?: string
          generated_at?: string | null
          generation_token?: string | null
          hook?: string | null
          lease_until?: string | null
          model?: string
          prompt_version?: string
          reason?: string
          requested_by?: string | null
          source_hash?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_call_hook_insights_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: true
            referencedRelation: "legal_call_records"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_call_records: {
        Row: {
          call_analysis: Json | null
          call_status: string | null
          created_at: string
          direction: string | null
          duration_seconds: number | null
          id: string
          lead_id: string | null
          needs_review: boolean
          pending_review: boolean
          recording_sid: string | null
          recording_url: string | null
          rep_id: string | null
          transcript: string | null
          twilio_call_sid: string | null
          updated_at: string
        }
        Insert: {
          call_analysis?: Json | null
          call_status?: string | null
          created_at?: string
          direction?: string | null
          duration_seconds?: number | null
          id?: string
          lead_id?: string | null
          needs_review?: boolean
          pending_review?: boolean
          recording_sid?: string | null
          recording_url?: string | null
          rep_id?: string | null
          transcript?: string | null
          twilio_call_sid?: string | null
          updated_at?: string
        }
        Update: {
          call_analysis?: Json | null
          call_status?: string | null
          created_at?: string
          direction?: string | null
          duration_seconds?: number | null
          id?: string
          lead_id?: string | null
          needs_review?: boolean
          pending_review?: boolean
          recording_sid?: string | null
          recording_url?: string | null
          rep_id?: string | null
          transcript?: string | null
          twilio_call_sid?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_call_records_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "legal_client_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_call_records_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "legal_sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_client_asset_calculations: {
        Row: {
          calculation: Json
          lead_id: string
          revision: number
          updated_at: string
          updated_by: string
        }
        Insert: {
          calculation: Json
          lead_id: string
          revision?: number
          updated_at?: string
          updated_by?: string
        }
        Update: {
          calculation?: Json
          lead_id?: string
          revision?: number
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_client_asset_calculations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "legal_client_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_client_leads: {
        Row: {
          ad_name: string | null
          ad_set_name: string | null
          asset_band: string | null
          booking_date: string | null
          booking_time: string | null
          call_notes: string | null
          callback_scheduled_at: string | null
          campaign_name: string | null
          city: string | null
          created_at: string
          day_number: number
          deposit_amount: number | null
          deposit_paid_at: string | null
          eligibility_completed_at: string | null
          eligibility_data: Json | null
          eligibility_flags: Json | null
          eligibility_net_pool: number | null
          eligibility_verdict: string | null
          email: string | null
          ex_partner_full_name: string | null
          fb_lead_id: string | null
          firm_id: string | null
          first_name: string | null
          funding_preference: string | null
          handover_sent_at: string | null
          has_kids_under_18: boolean | null
          id: string
          last_name: string | null
          lawyer_id: string | null
          phone: string | null
          pipeline_summary: string | null
          pipeline_summary_updated_at: string | null
          previous_lead_id: string | null
          raw_payload: Json
          relationship_stage: string | null
          rep_id: string | null
          rep_notes: string | null
          settlement_timeline: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          ad_name?: string | null
          ad_set_name?: string | null
          asset_band?: string | null
          booking_date?: string | null
          booking_time?: string | null
          call_notes?: string | null
          callback_scheduled_at?: string | null
          campaign_name?: string | null
          city?: string | null
          created_at?: string
          day_number?: number
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          eligibility_completed_at?: string | null
          eligibility_data?: Json | null
          eligibility_flags?: Json | null
          eligibility_net_pool?: number | null
          eligibility_verdict?: string | null
          email?: string | null
          ex_partner_full_name?: string | null
          fb_lead_id?: string | null
          firm_id?: string | null
          first_name?: string | null
          funding_preference?: string | null
          handover_sent_at?: string | null
          has_kids_under_18?: boolean | null
          id?: string
          last_name?: string | null
          lawyer_id?: string | null
          phone?: string | null
          pipeline_summary?: string | null
          pipeline_summary_updated_at?: string | null
          previous_lead_id?: string | null
          raw_payload?: Json
          relationship_stage?: string | null
          rep_id?: string | null
          rep_notes?: string | null
          settlement_timeline?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          ad_name?: string | null
          ad_set_name?: string | null
          asset_band?: string | null
          booking_date?: string | null
          booking_time?: string | null
          call_notes?: string | null
          callback_scheduled_at?: string | null
          campaign_name?: string | null
          city?: string | null
          created_at?: string
          day_number?: number
          deposit_amount?: number | null
          deposit_paid_at?: string | null
          eligibility_completed_at?: string | null
          eligibility_data?: Json | null
          eligibility_flags?: Json | null
          eligibility_net_pool?: number | null
          eligibility_verdict?: string | null
          email?: string | null
          ex_partner_full_name?: string | null
          fb_lead_id?: string | null
          firm_id?: string | null
          first_name?: string | null
          funding_preference?: string | null
          handover_sent_at?: string | null
          has_kids_under_18?: boolean | null
          id?: string
          last_name?: string | null
          lawyer_id?: string | null
          phone?: string | null
          pipeline_summary?: string | null
          pipeline_summary_updated_at?: string | null
          previous_lead_id?: string | null
          raw_payload?: Json
          relationship_stage?: string | null
          rep_id?: string | null
          rep_notes?: string | null
          settlement_timeline?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_client_leads_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "legal_firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_client_leads_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "legal_firm_lawyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_client_leads_previous_lead_id_fkey"
            columns: ["previous_lead_id"]
            isOneToOne: false
            referencedRelation: "legal_client_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_client_leads_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "legal_sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_cold_calling_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          at: string
          detail: Json | null
          id: string
          prospect_firm_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          at?: string
          detail?: Json | null
          id?: string
          prospect_firm_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          at?: string
          detail?: Json | null
          id?: string
          prospect_firm_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_cold_calling_audit_log_prospect_firm_id_fkey"
            columns: ["prospect_firm_id"]
            isOneToOne: false
            referencedRelation: "legal_prospect_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_daily_phone_assignments: {
        Row: {
          caller_user_id: string
          created_at: string
          created_by: string | null
          failed_at: string | null
          failure_reason: string | null
          first_call_attempt_id: string | null
          id: string
          locked_at: string | null
          outbound_caller_id_id: string | null
          outbound_caller_id_number: string
          override_reason: string | null
          selected_at: string
          work_date: string
        }
        Insert: {
          caller_user_id: string
          created_at?: string
          created_by?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          first_call_attempt_id?: string | null
          id?: string
          locked_at?: string | null
          outbound_caller_id_id?: string | null
          outbound_caller_id_number: string
          override_reason?: string | null
          selected_at?: string
          work_date: string
        }
        Update: {
          caller_user_id?: string
          created_at?: string
          created_by?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          first_call_attempt_id?: string | null
          id?: string
          locked_at?: string | null
          outbound_caller_id_id?: string | null
          outbound_caller_id_number?: string
          override_reason?: string | null
          selected_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_daily_phone_assignments_outbound_caller_id_id_fkey"
            columns: ["outbound_caller_id_id"]
            isOneToOne: false
            referencedRelation: "legal_phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_deck_settings: {
        Row: {
          conversion_label: string
          created_at: string
          include_risk_slide: boolean
          matter_value: number
          price_per_show: number
          updated_at: string
          user_id: string
        }
        Insert: {
          conversion_label?: string
          created_at?: string
          include_risk_slide?: boolean
          matter_value?: number
          price_per_show?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          conversion_label?: string
          created_at?: string
          include_risk_slide?: boolean
          matter_value?: number
          price_per_show?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_error_logs: {
        Row: {
          created_at: string
          detail: Json | null
          id: string
          message: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          detail?: Json | null
          id?: string
          message?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          detail?: Json | null
          id?: string
          message?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      legal_firm_application_call_sheets: {
        Row: {
          answers: Json
          application_id: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          application_id: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          application_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_application_call_sheets_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "legal_firm_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_application_calls: {
        Row: {
          analysis_started_at: string | null
          analysis_status: string
          application_id: string
          callback_owner_id: string | null
          callback_session_id: string | null
          created_at: string
          direction: string
          duration_seconds: number | null
          id: string
          local_number: string | null
          phone: string
          recording_sid: string | null
          recording_url: string | null
          rep_id: string | null
          reviewed_at: string | null
          status: string
          summary: string | null
          transcript: string | null
          twilio_call_sid: string | null
        }
        Insert: {
          analysis_started_at?: string | null
          analysis_status?: string
          application_id: string
          callback_owner_id?: string | null
          callback_session_id?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          id?: string
          local_number?: string | null
          phone: string
          recording_sid?: string | null
          recording_url?: string | null
          rep_id?: string | null
          reviewed_at?: string | null
          status?: string
          summary?: string | null
          transcript?: string | null
          twilio_call_sid?: string | null
        }
        Update: {
          analysis_started_at?: string | null
          analysis_status?: string
          application_id?: string
          callback_owner_id?: string | null
          callback_session_id?: string | null
          created_at?: string
          direction?: string
          duration_seconds?: number | null
          id?: string
          local_number?: string | null
          phone?: string
          recording_sid?: string | null
          recording_url?: string | null
          rep_id?: string | null
          reviewed_at?: string | null
          status?: string
          summary?: string | null
          transcript?: string | null
          twilio_call_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_application_calls_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "legal_firm_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_firm_application_calls_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "legal_sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_application_messages: {
        Row: {
          application_id: string
          body: string
          created_at: string
          created_by: string | null
          direction: string
          error_code: string | null
          id: string
          local_number: string | null
          phone: string
          reviewed_at: string | null
          source_sms_id: string | null
          status: string
          twilio_sid: string | null
        }
        Insert: {
          application_id: string
          body: string
          created_at?: string
          created_by?: string | null
          direction: string
          error_code?: string | null
          id?: string
          local_number?: string | null
          phone: string
          reviewed_at?: string | null
          source_sms_id?: string | null
          status?: string
          twilio_sid?: string | null
        }
        Update: {
          application_id?: string
          body?: string
          created_at?: string
          created_by?: string | null
          direction?: string
          error_code?: string | null
          id?: string
          local_number?: string | null
          phone?: string
          reviewed_at?: string | null
          source_sms_id?: string | null
          status?: string
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_application_messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "legal_firm_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_application_notes: {
        Row: {
          application_id: string
          body: string
          created_at: string
          firm_call_id: string | null
          id: string
          kind: string
        }
        Insert: {
          application_id: string
          body: string
          created_at?: string
          firm_call_id?: string | null
          id?: string
          kind?: string
        }
        Update: {
          application_id?: string
          body?: string
          created_at?: string
          firm_call_id?: string | null
          id?: string
          kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "legal_firm_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_firm_application_notes_firm_call_id_fkey"
            columns: ["firm_call_id"]
            isOneToOne: true
            referencedRelation: "legal_firm_application_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_applications: {
        Row: {
          ad_name: string | null
          adset_name: string | null
          calendly_booking_email: string | null
          calendly_checked_at: string | null
          calendly_end_at: string | null
          calendly_event_uri: string | null
          calendly_start_at: string | null
          calendly_sync_attempted_at: string | null
          campaign_name: string | null
          city: string | null
          created_at: string
          email: string | null
          firm_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          lead_id: string | null
          phone: string | null
          raw_payload: Json
          stage: string
          updated_at: string
        }
        Insert: {
          ad_name?: string | null
          adset_name?: string | null
          calendly_booking_email?: string | null
          calendly_checked_at?: string | null
          calendly_end_at?: string | null
          calendly_event_uri?: string | null
          calendly_start_at?: string | null
          calendly_sync_attempted_at?: string | null
          campaign_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          firm_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          lead_id?: string | null
          phone?: string | null
          raw_payload?: Json
          stage?: string
          updated_at?: string
        }
        Update: {
          ad_name?: string | null
          adset_name?: string | null
          calendly_booking_email?: string | null
          calendly_checked_at?: string | null
          calendly_end_at?: string | null
          calendly_event_uri?: string | null
          calendly_start_at?: string | null
          calendly_sync_attempted_at?: string | null
          campaign_name?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          firm_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          lead_id?: string | null
          phone?: string | null
          raw_payload?: Json
          stage?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_firm_appointment_notes: {
        Row: {
          appointment_id: string
          author_name: string | null
          author_type: string
          body: string
          created_at: string
          firm_id: string
          id: string
        }
        Insert: {
          appointment_id: string
          author_name?: string | null
          author_type: string
          body: string
          created_at?: string
          firm_id: string
          id?: string
        }
        Update: {
          appointment_id?: string
          author_name?: string | null
          author_type?: string
          body?: string
          created_at?: string
          firm_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_appointment_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "legal_firm_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_firm_appointment_notes_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "legal_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_appointments: {
        Row: {
          appointment_date: string | null
          appointment_time: string | null
          booking_rep_id: string | null
          chase_note: string | null
          chase_requested_at: string | null
          chase_requested_by: string | null
          chase_result_at: string | null
          chase_result_by: string | null
          chase_status: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          conflict_flagged_at: string | null
          conflict_reason: string | null
          conflict_resolved_at: string | null
          conflict_status: string
          consult_mode: string
          consult_summary: string | null
          consultation_duration_minutes: number
          created_at: string
          disqualified_at: string | null
          disqualified_by: string | null
          disqualified_reason: string | null
          ex_partner_name: string | null
          firm_id: string | null
          id: string
          intel_notes: string | null
          lawyer_id: string | null
          lead_id: string | null
          location_address: string | null
          location_id: string | null
          location_name: string | null
          location_nearby_landmarks: string | null
          location_parking_info: string | null
          location_revision: number
          notes: string | null
          offer_pack_id: string | null
          outcome: string | null
          rebooked_from: string | null
          refund_processed_at: string | null
          refund_status: string | null
          status: string
          stripe_refund_id: string | null
          updated_at: string
        }
        Insert: {
          appointment_date?: string | null
          appointment_time?: string | null
          booking_rep_id?: string | null
          chase_note?: string | null
          chase_requested_at?: string | null
          chase_requested_by?: string | null
          chase_result_at?: string | null
          chase_result_by?: string | null
          chase_status?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          conflict_flagged_at?: string | null
          conflict_reason?: string | null
          conflict_resolved_at?: string | null
          conflict_status?: string
          consult_mode?: string
          consult_summary?: string | null
          consultation_duration_minutes?: number
          created_at?: string
          disqualified_at?: string | null
          disqualified_by?: string | null
          disqualified_reason?: string | null
          ex_partner_name?: string | null
          firm_id?: string | null
          id?: string
          intel_notes?: string | null
          lawyer_id?: string | null
          lead_id?: string | null
          location_address?: string | null
          location_id?: string | null
          location_name?: string | null
          location_nearby_landmarks?: string | null
          location_parking_info?: string | null
          location_revision?: number
          notes?: string | null
          offer_pack_id?: string | null
          outcome?: string | null
          rebooked_from?: string | null
          refund_processed_at?: string | null
          refund_status?: string | null
          status?: string
          stripe_refund_id?: string | null
          updated_at?: string
        }
        Update: {
          appointment_date?: string | null
          appointment_time?: string | null
          booking_rep_id?: string | null
          chase_note?: string | null
          chase_requested_at?: string | null
          chase_requested_by?: string | null
          chase_result_at?: string | null
          chase_result_by?: string | null
          chase_status?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          conflict_flagged_at?: string | null
          conflict_reason?: string | null
          conflict_resolved_at?: string | null
          conflict_status?: string
          consult_mode?: string
          consult_summary?: string | null
          consultation_duration_minutes?: number
          created_at?: string
          disqualified_at?: string | null
          disqualified_by?: string | null
          disqualified_reason?: string | null
          ex_partner_name?: string | null
          firm_id?: string | null
          id?: string
          intel_notes?: string | null
          lawyer_id?: string | null
          lead_id?: string | null
          location_address?: string | null
          location_id?: string | null
          location_name?: string | null
          location_nearby_landmarks?: string | null
          location_parking_info?: string | null
          location_revision?: number
          notes?: string | null
          offer_pack_id?: string | null
          outcome?: string | null
          rebooked_from?: string | null
          refund_processed_at?: string | null
          refund_status?: string | null
          status?: string
          stripe_refund_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_appointment_office_belongs_to_firm"
            columns: ["firm_id", "location_id"]
            isOneToOne: false
            referencedRelation: "legal_firm_locations"
            referencedColumns: ["firm_id", "id"]
          },
          {
            foreignKeyName: "legal_firm_appointments_booking_rep_id_fkey"
            columns: ["booking_rep_id"]
            isOneToOne: false
            referencedRelation: "legal_sales_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_firm_appointments_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "legal_firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_firm_appointments_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "legal_firm_lawyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_firm_appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "legal_client_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_firm_appointments_offer_pack_id_fkey"
            columns: ["offer_pack_id"]
            isOneToOne: false
            referencedRelation: "legal_firm_packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_firm_appointments_rebooked_from_fkey"
            columns: ["rebooked_from"]
            isOneToOne: false
            referencedRelation: "legal_firm_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_availability: {
        Row: {
          created_at: string
          end_time: string | null
          firm_id: string
          id: string
          override_date: string
          override_type: string
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          firm_id: string
          id?: string
          override_date: string
          override_type: string
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          firm_id?: string
          id?: string
          override_date?: string
          override_type?: string
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_availability_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "legal_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_blocked_slots: {
        Row: {
          created_at: string
          date: string
          end_time: string | null
          excluded_dates: string[]
          firm_id: string
          id: string
          is_recurring: boolean
          reason: string | null
          recur_day_of_month: number | null
          recur_day_of_week: number | null
          recur_days_of_week: number[] | null
          recur_nth_week: number | null
          recur_pattern: string | null
          recur_until: string | null
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          end_time?: string | null
          excluded_dates?: string[]
          firm_id: string
          id?: string
          is_recurring?: boolean
          reason?: string | null
          recur_day_of_month?: number | null
          recur_day_of_week?: number | null
          recur_days_of_week?: number[] | null
          recur_nth_week?: number | null
          recur_pattern?: string | null
          recur_until?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string | null
          excluded_dates?: string[]
          firm_id?: string
          id?: string
          is_recurring?: boolean
          reason?: string | null
          recur_day_of_month?: number | null
          recur_day_of_week?: number | null
          recur_days_of_week?: number[] | null
          recur_nth_week?: number | null
          recur_pattern?: string | null
          recur_until?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_blocked_slots_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "legal_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_booking_follow_ups: {
        Row: {
          application_id: string
          claimed_at: string | null
          due_at: string
          id: string
          last_error: string | null
          sent_at: string | null
          status: string
          step: number
          twilio_sid: string | null
        }
        Insert: {
          application_id: string
          claimed_at?: string | null
          due_at: string
          id?: string
          last_error?: string | null
          sent_at?: string | null
          status?: string
          step: number
          twilio_sid?: string | null
        }
        Update: {
          application_id?: string
          claimed_at?: string | null
          due_at?: string
          id?: string
          last_error?: string | null
          sent_at?: string | null
          status?: string
          step?: number
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_booking_follow_ups_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "legal_firm_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_calendar_history: {
        Row: {
          actor_name: string
          actor_role: string
          after_data: Json | null
          before_data: Json | null
          entity_id: string
          entity_type: string
          firm_id: string
          id: number
          operation: string
          recorded_at: string
        }
        Insert: {
          actor_name: string
          actor_role: string
          after_data?: Json | null
          before_data?: Json | null
          entity_id: string
          entity_type: string
          firm_id: string
          id?: never
          operation: string
          recorded_at?: string
        }
        Update: {
          actor_name?: string
          actor_role?: string
          after_data?: Json | null
          before_data?: Json | null
          entity_id?: string
          entity_type?: string
          firm_id?: string
          id?: never
          operation?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_calendar_history_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "legal_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_callback_recipients: {
        Row: {
          call_id: string
          declined_at: string | null
          owner_id: string
          session_id: string
        }
        Insert: {
          call_id: string
          declined_at?: string | null
          owner_id: string
          session_id: string
        }
        Update: {
          call_id?: string
          declined_at?: string | null
          owner_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_callback_recipients_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "legal_firm_application_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_callback_settings: {
        Row: {
          available: boolean
          enabled: boolean
          owner_id: string
          session_expires_at: string | null
          session_id: string | null
          singleton: boolean
        }
        Insert: {
          available?: boolean
          enabled?: boolean
          owner_id: string
          session_expires_at?: string | null
          session_id?: string | null
          singleton?: boolean
        }
        Update: {
          available?: boolean
          enabled?: boolean
          owner_id?: string
          session_expires_at?: string | null
          session_id?: string | null
          singleton?: boolean
        }
        Relationships: []
      }
      legal_firm_contract_events: {
        Row: {
          contract_id: string
          created_at: string
          detail: Json | null
          id: string
          kind: string
          provider_event_id: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          detail?: Json | null
          id?: string
          kind: string
          provider_event_id?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          detail?: Json | null
          id?: string
          kind?: string
          provider_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_contract_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "legal_firm_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_contracts: {
        Row: {
          agreement_date: string
          amount_due_cents: number
          annature_envelope_id: string | null
          annature_recipient_id: string | null
          b1_inc_cents: number | null
          b1_shows: number | null
          b2_charge_payment_intent_id: string | null
          b2_inc_cents: number | null
          b2_paid_at: string | null
          b2_payment_link_url: string | null
          b2_payment_status: string | null
          b2_requested_at: string | null
          b2_shows: number | null
          b2_stripe_payment_link_id: string | null
          contract_status: string
          created_at: string
          created_by: string | null
          fee_ex_cents: number
          firm_abn: string | null
          firm_address: string | null
          firm_email: string | null
          firm_id: string
          firm_name: string
          flagged_at: string | null
          flagged_for_call: boolean
          gst_cents: number
          id: string
          is_split: boolean
          last_reminder_at: string | null
          next_reminder_at: string | null
          pack_name: string
          paid_at: string | null
          payment_status: string
          reminder_stage: number
          shows: number
          signatory_email: string
          signatory_name: string
          signed_at: string | null
          signed_pdf_url: string | null
          stripe_customer_id: string | null
          stripe_payment_link_id: string | null
          stripe_payment_link_url: string | null
          stripe_payment_method_id: string | null
          stripe_price_id: string | null
          template: string
          total_ex_cents: number
          total_inc_cents: number
          updated_at: string
          void_reason: string | null
        }
        Insert: {
          agreement_date: string
          amount_due_cents?: number
          annature_envelope_id?: string | null
          annature_recipient_id?: string | null
          b1_inc_cents?: number | null
          b1_shows?: number | null
          b2_charge_payment_intent_id?: string | null
          b2_inc_cents?: number | null
          b2_paid_at?: string | null
          b2_payment_link_url?: string | null
          b2_payment_status?: string | null
          b2_requested_at?: string | null
          b2_shows?: number | null
          b2_stripe_payment_link_id?: string | null
          contract_status?: string
          created_at?: string
          created_by?: string | null
          fee_ex_cents: number
          firm_abn?: string | null
          firm_address?: string | null
          firm_email?: string | null
          firm_id: string
          firm_name: string
          flagged_at?: string | null
          flagged_for_call?: boolean
          gst_cents: number
          id?: string
          is_split?: boolean
          last_reminder_at?: string | null
          next_reminder_at?: string | null
          pack_name: string
          paid_at?: string | null
          payment_status?: string
          reminder_stage?: number
          shows: number
          signatory_email: string
          signatory_name: string
          signed_at?: string | null
          signed_pdf_url?: string | null
          stripe_customer_id?: string | null
          stripe_payment_link_id?: string | null
          stripe_payment_link_url?: string | null
          stripe_payment_method_id?: string | null
          stripe_price_id?: string | null
          template?: string
          total_ex_cents: number
          total_inc_cents: number
          updated_at?: string
          void_reason?: string | null
        }
        Update: {
          agreement_date?: string
          amount_due_cents?: number
          annature_envelope_id?: string | null
          annature_recipient_id?: string | null
          b1_inc_cents?: number | null
          b1_shows?: number | null
          b2_charge_payment_intent_id?: string | null
          b2_inc_cents?: number | null
          b2_paid_at?: string | null
          b2_payment_link_url?: string | null
          b2_payment_status?: string | null
          b2_requested_at?: string | null
          b2_shows?: number | null
          b2_stripe_payment_link_id?: string | null
          contract_status?: string
          created_at?: string
          created_by?: string | null
          fee_ex_cents?: number
          firm_abn?: string | null
          firm_address?: string | null
          firm_email?: string | null
          firm_id?: string
          firm_name?: string
          flagged_at?: string | null
          flagged_for_call?: boolean
          gst_cents?: number
          id?: string
          is_split?: boolean
          last_reminder_at?: string | null
          next_reminder_at?: string | null
          pack_name?: string
          paid_at?: string | null
          payment_status?: string
          reminder_stage?: number
          shows?: number
          signatory_email?: string
          signatory_name?: string
          signed_at?: string | null
          signed_pdf_url?: string | null
          stripe_customer_id?: string | null
          stripe_payment_link_id?: string | null
          stripe_payment_link_url?: string | null
          stripe_payment_method_id?: string | null
          stripe_price_id?: string | null
          template?: string
          total_ex_cents?: number
          total_inc_cents?: number
          updated_at?: string
          void_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_contracts_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "legal_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_lawyers: {
        Row: {
          accredited_specialist: boolean
          created_at: string
          firm_id: string
          hourly_rate: number | null
          id: string
          is_active: boolean
          name: string
          specialties: string | null
          talking_points: string | null
          title: string | null
          updated_at: string
          what_makes_them_different: string | null
          years_experience: number | null
        }
        Insert: {
          accredited_specialist?: boolean
          created_at?: string
          firm_id: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          name: string
          specialties?: string | null
          talking_points?: string | null
          title?: string | null
          updated_at?: string
          what_makes_them_different?: string | null
          years_experience?: number | null
        }
        Update: {
          accredited_specialist?: boolean
          created_at?: string
          firm_id?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          name?: string
          specialties?: string | null
          talking_points?: string | null
          title?: string | null
          updated_at?: string
          what_makes_them_different?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_lawyers_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "legal_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_locations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          firm_id: string
          id: string
          is_active: boolean
          name: string
          nearby_landmarks: string | null
          parking_info: string | null
          sort_order: number
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          firm_id: string
          id?: string
          is_active?: boolean
          name: string
          nearby_landmarks?: string | null
          parking_info?: string | null
          sort_order?: number
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          firm_id?: string
          id?: string
          is_active?: boolean
          name?: string
          nearby_landmarks?: string | null
          parking_info?: string | null
          sort_order?: number
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_locations_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "legal_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_offer_events: {
        Row: {
          created_at: string
          event_type: string
          key: string
          processed_at: string | null
          provider: string
          resource_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          key: string
          processed_at?: string | null
          provider: string
          resource_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          key?: string
          processed_at?: string | null
          provider?: string
          resource_id?: string
        }
        Relationships: []
      }
      legal_firm_offer_milestones: {
        Row: {
          due_at: string
          fifth_show_at: string
          offer_id: string
          review_required: boolean
        }
        Insert: {
          due_at?: string
          fifth_show_at?: string
          offer_id: string
          review_required?: boolean
        }
        Update: {
          due_at?: string
          fifth_show_at?: string
          offer_id?: string
          review_required?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_offer_milestones_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: true
            referencedRelation: "legal_firm_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_offer_operations: {
        Row: {
          created_at: string
          key: string
          kind: string
          offer_id: string
          result: Json | null
          state: string
        }
        Insert: {
          created_at?: string
          key: string
          kind: string
          offer_id: string
          result?: Json | null
          state?: string
        }
        Update: {
          created_at?: string
          key?: string
          kind?: string
          offer_id?: string
          result?: Json | null
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_offer_operations_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "legal_firm_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_offer_outbox: {
        Row: {
          channel: string
          created_at: string
          id: string
          offer_id: string
          provider_id: string | null
          state: string
          step: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          id?: string
          offer_id: string
          provider_id?: string | null
          state?: string
          step: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          offer_id?: string
          provider_id?: string | null
          state?: string
          step?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_offer_outbox_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "legal_firm_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_offer_rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count?: number
          key: string
          window_start?: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
      legal_firm_offer_sessions: {
        Row: {
          expires_at: string
          offer_id: string
          token_hash: string
        }
        Insert: {
          expires_at?: string
          offer_id: string
          token_hash: string
        }
        Update: {
          expires_at?: string
          offer_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_offer_sessions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "legal_firm_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_offers: {
        Row: {
          application_id: string
          created_at: string
          expires_at: string | null
          id: string
          revision: number
          revoked_at: string | null
          snapshot: Json
          token_hash: string | null
          version: number
        }
        Insert: {
          application_id: string
          created_at?: string
          expires_at?: string | null
          id: string
          revision: number
          revoked_at?: string | null
          snapshot: Json
          token_hash?: string | null
          version?: number
        }
        Update: {
          application_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          revision?: number
          revoked_at?: string | null
          snapshot?: Json
          token_hash?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_offers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "legal_firm_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_pack_orders: {
        Row: {
          created_at: string
          firm_id: string
          id: string
          notification_attempts: number
          notification_claim: string | null
          notification_next_at: string
          notification_sent_at: string | null
          pack_id: string
          payment_status: string
          price_per_show_cents: number
          quantity: number
          request_id: string
          requested_by: string
        }
        Insert: {
          created_at?: string
          firm_id: string
          id?: string
          notification_attempts?: number
          notification_claim?: string | null
          notification_next_at?: string
          notification_sent_at?: string | null
          pack_id: string
          payment_status?: string
          price_per_show_cents: number
          quantity: number
          request_id: string
          requested_by: string
        }
        Update: {
          created_at?: string
          firm_id?: string
          id?: string
          notification_attempts?: number
          notification_claim?: string | null
          notification_next_at?: string
          notification_sent_at?: string | null
          pack_id?: string
          payment_status?: string
          price_per_show_cents?: number
          quantity?: number
          request_id?: string
          requested_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_pack_orders_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "legal_firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_firm_pack_orders_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: true
            referencedRelation: "legal_firm_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_packs: {
        Row: {
          created_at: string
          firm_id: string
          id: string
          offer_id: string | null
          on_hold: boolean
          pack_size: number
          price_per_show: number
          price_per_show_cents: number | null
          purchased_at: string
          shows_used: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          firm_id: string
          id?: string
          offer_id?: string | null
          on_hold?: boolean
          pack_size?: number
          price_per_show?: number
          price_per_show_cents?: number | null
          purchased_at?: string
          shows_used?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          firm_id?: string
          id?: string
          offer_id?: string | null
          on_hold?: boolean
          pack_size?: number
          price_per_show?: number
          price_per_show_cents?: number | null
          purchased_at?: string
          shows_used?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_packs_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "legal_firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_firm_packs_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: true
            referencedRelation: "legal_firm_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_pipeline_portals: {
        Row: {
          application_id: string
          created_at: string
          firm_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          firm_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          firm_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_pipeline_portals_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "legal_firm_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_firm_pipeline_portals_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "legal_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_portal_users: {
        Row: {
          created_at: string
          email: string | null
          firm_id: string
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          firm_id: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          firm_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_portal_users_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "legal_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_profile_items: {
        Row: {
          body: string
          created_at: string
          id: string
          section_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          section_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          section_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_profile_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "legal_firm_profile_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_profile_sections: {
        Row: {
          created_at: string
          firm_id: string
          id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          firm_id: string
          id?: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          firm_id?: string
          id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_profile_sections_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "legal_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_public_holidays: {
        Row: {
          holiday_date: string
          name: string
          state: string
        }
        Insert: {
          holiday_date: string
          name: string
          state: string
        }
        Update: {
          holiday_date?: string
          name?: string
          state?: string
        }
        Relationships: []
      }
      legal_firm_reminder_settings: {
        Row: {
          alert_email: string
          closure_dates: string[]
          confirmation_enabled_at: string | null
          firm_id: string
          mode: string
          reminder_time: string
          staffed_days: number[]
          timezone: string
          updated_at: string
        }
        Insert: {
          alert_email?: string
          closure_dates?: string[]
          confirmation_enabled_at?: string | null
          firm_id: string
          mode?: string
          reminder_time?: string
          staffed_days?: number[]
          timezone?: string
          updated_at?: string
        }
        Update: {
          alert_email?: string
          closure_dates?: string[]
          confirmation_enabled_at?: string | null
          firm_id?: string
          mode?: string
          reminder_time?: string
          staffed_days?: number[]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_reminder_settings_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: true
            referencedRelation: "legal_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firm_trading_hours: {
        Row: {
          close_time: string | null
          consult_duration_mins: number
          created_at: string
          day_of_week: number
          firm_id: string
          id: string
          is_open: boolean
          open_time: string | null
          slot_times: string[] | null
          updated_at: string
        }
        Insert: {
          close_time?: string | null
          consult_duration_mins?: number
          created_at?: string
          day_of_week: number
          firm_id: string
          id?: string
          is_open?: boolean
          open_time?: string | null
          slot_times?: string[] | null
          updated_at?: string
        }
        Update: {
          close_time?: string | null
          consult_duration_mins?: number
          created_at?: string
          day_of_week?: number
          firm_id?: string
          id?: string
          is_open?: boolean
          open_time?: string | null
          slot_times?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_firm_trading_hours_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "legal_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_firms: {
        Row: {
          abn: string | null
          address: string | null
          buffer_minutes: number
          city: string | null
          consultation_duration_minutes: number
          created_at: string
          email: string | null
          firm_name: string
          id: string
          is_active: boolean
          nearby_landmarks: string | null
          normal_consult_price: number
          notes: string | null
          parking_info: string | null
          phone: string | null
          signatory_email: string | null
          signatory_name: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          abn?: string | null
          address?: string | null
          buffer_minutes?: number
          city?: string | null
          consultation_duration_minutes?: number
          created_at?: string
          email?: string | null
          firm_name: string
          id?: string
          is_active?: boolean
          nearby_landmarks?: string | null
          normal_consult_price?: number
          notes?: string | null
          parking_info?: string | null
          phone?: string | null
          signatory_email?: string | null
          signatory_name?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          abn?: string | null
          address?: string | null
          buffer_minutes?: number
          city?: string | null
          consultation_duration_minutes?: number
          created_at?: string
          email?: string | null
          firm_name?: string
          id?: string
          is_active?: boolean
          nearby_landmarks?: string | null
          normal_consult_price?: number
          notes?: string | null
          parking_info?: string | null
          phone?: string | null
          signatory_email?: string | null
          signatory_name?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      legal_linking_education_plays: {
        Row: {
          active: boolean
          callback_opener: string
          chip_label: string
          created_at: string
          group_label: string | null
          id: string
          never_say: string | null
          priority: number
          prompt_title: string
          say_this: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          callback_opener: string
          chip_label: string
          created_at?: string
          group_label?: string | null
          id?: string
          never_say?: string | null
          priority: number
          prompt_title: string
          say_this: string
          sort_order: number
        }
        Update: {
          active?: boolean
          callback_opener?: string
          chip_label?: string
          created_at?: string
          group_label?: string | null
          id?: string
          never_say?: string | null
          priority?: number
          prompt_title?: string
          say_this?: string
          sort_order?: number
        }
        Relationships: []
      }
      legal_phone_numbers: {
        Row: {
          call_count: number
          can_receive_return_calls: boolean
          created_at: string
          id: string
          label: string | null
          last_assigned_at: string | null
          last_used_at: string | null
          number: string
          status: string
          updated_at: string
          verified_with_twilio: boolean
        }
        Insert: {
          call_count?: number
          can_receive_return_calls?: boolean
          created_at?: string
          id?: string
          label?: string | null
          last_assigned_at?: string | null
          last_used_at?: string | null
          number: string
          status?: string
          updated_at?: string
          verified_with_twilio?: boolean
        }
        Update: {
          call_count?: number
          can_receive_return_calls?: boolean
          created_at?: string
          id?: string
          label?: string | null
          last_assigned_at?: string | null
          last_used_at?: string | null
          number?: string
          status?: string
          updated_at?: string
          verified_with_twilio?: boolean
        }
        Relationships: []
      }
      legal_phone_suppressions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          phone_e164: string
          phone_tail: string
          prospect_firm_id: string | null
          reason: string
          source: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          phone_e164: string
          phone_tail: string
          prospect_firm_id?: string | null
          reason: string
          source?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          phone_e164?: string
          phone_tail?: string
          prospect_firm_id?: string | null
          reason?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_phone_suppressions_prospect_firm_id_fkey"
            columns: ["prospect_firm_id"]
            isOneToOne: false
            referencedRelation: "legal_prospect_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_practice_call_recordings: {
        Row: {
          audio_path: string | null
          auth_user_id: string
          conversation_id: string
          created_at: string
          duration_seconds: number
          id: string
          persona: string | null
          review_note: string | null
          review_status: string | null
          reviewed_at: string | null
          started_at: string | null
          submitted_as_best: boolean
          transcript: Json | null
        }
        Insert: {
          audio_path?: string | null
          auth_user_id: string
          conversation_id: string
          created_at?: string
          duration_seconds?: number
          id?: string
          persona?: string | null
          review_note?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          started_at?: string | null
          submitted_as_best?: boolean
          transcript?: Json | null
        }
        Update: {
          audio_path?: string | null
          auth_user_id?: string
          conversation_id?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          persona?: string | null
          review_note?: string | null
          review_status?: string | null
          reviewed_at?: string | null
          started_at?: string | null
          submitted_as_best?: boolean
          transcript?: Json | null
        }
        Relationships: []
      }
      legal_profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_prospect_call_attempts: {
        Row: {
          attempt_number: number
          business_disposition: string | null
          call_record_id: string | null
          caller_rep_id: string | null
          caller_user_id: string
          connected_at: string | null
          created_at: string
          daily_phone_assignment_id: string | null
          duration_seconds: number | null
          ended_at: string | null
          follow_up_at: string | null
          id: string
          notes: string | null
          outbound_caller_id_id: string | null
          outbound_caller_id_number: string
          prospect_contact_id: string | null
          prospect_firm_id: string
          started_at: string
          telephony_status: string
          to_number: string
          twilio_call_sid: string | null
          twilio_child_call_sid: string | null
          updated_at: string
        }
        Insert: {
          attempt_number?: number
          business_disposition?: string | null
          call_record_id?: string | null
          caller_rep_id?: string | null
          caller_user_id: string
          connected_at?: string | null
          created_at?: string
          daily_phone_assignment_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          follow_up_at?: string | null
          id?: string
          notes?: string | null
          outbound_caller_id_id?: string | null
          outbound_caller_id_number: string
          prospect_contact_id?: string | null
          prospect_firm_id: string
          started_at?: string
          telephony_status?: string
          to_number: string
          twilio_call_sid?: string | null
          twilio_child_call_sid?: string | null
          updated_at?: string
        }
        Update: {
          attempt_number?: number
          business_disposition?: string | null
          call_record_id?: string | null
          caller_rep_id?: string | null
          caller_user_id?: string
          connected_at?: string | null
          created_at?: string
          daily_phone_assignment_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          follow_up_at?: string | null
          id?: string
          notes?: string | null
          outbound_caller_id_id?: string | null
          outbound_caller_id_number?: string
          prospect_contact_id?: string | null
          prospect_firm_id?: string
          started_at?: string
          telephony_status?: string
          to_number?: string
          twilio_call_sid?: string | null
          twilio_child_call_sid?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_prospect_call_attempts_assignment_fk"
            columns: ["daily_phone_assignment_id"]
            isOneToOne: false
            referencedRelation: "legal_daily_phone_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_prospect_call_attempts_call_record_id_fkey"
            columns: ["call_record_id"]
            isOneToOne: false
            referencedRelation: "legal_call_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_prospect_call_attempts_caller_rep_id_fkey"
            columns: ["caller_rep_id"]
            isOneToOne: false
            referencedRelation: "legal_sales_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_prospect_call_attempts_outbound_caller_id_id_fkey"
            columns: ["outbound_caller_id_id"]
            isOneToOne: false
            referencedRelation: "legal_phone_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_prospect_call_attempts_prospect_contact_id_fkey"
            columns: ["prospect_contact_id"]
            isOneToOne: false
            referencedRelation: "legal_prospect_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_prospect_call_attempts_prospect_firm_id_fkey"
            columns: ["prospect_firm_id"]
            isOneToOne: false
            referencedRelation: "legal_prospect_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_prospect_contacts: {
        Row: {
          confidence: string | null
          created_at: string
          evidence_url: string | null
          full_name: string
          id: string
          is_primary_decision_maker: boolean
          is_secondary_decision_maker: boolean
          linkedin_url: string | null
          notes: string | null
          position: string | null
          profile_url: string | null
          prospect_firm_id: string
          updated_at: string
        }
        Insert: {
          confidence?: string | null
          created_at?: string
          evidence_url?: string | null
          full_name: string
          id?: string
          is_primary_decision_maker?: boolean
          is_secondary_decision_maker?: boolean
          linkedin_url?: string | null
          notes?: string | null
          position?: string | null
          profile_url?: string | null
          prospect_firm_id: string
          updated_at?: string
        }
        Update: {
          confidence?: string | null
          created_at?: string
          evidence_url?: string | null
          full_name?: string
          id?: string
          is_primary_decision_maker?: boolean
          is_secondary_decision_maker?: boolean
          linkedin_url?: string | null
          notes?: string | null
          position?: string | null
          profile_url?: string | null
          prospect_firm_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_prospect_contacts_prospect_firm_id_fkey"
            columns: ["prospect_firm_id"]
            isOneToOne: false
            referencedRelation: "legal_prospect_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_prospect_firms: {
        Row: {
          accreditation_evidence_url: string | null
          accredited_specialist_count: number | null
          accredited_specialist_names: string[]
          apollo_match_status: string | null
          assigned_caller_user_id: string | null
          bad_fit_reason: string | null
          businesses_indicator: boolean | null
          call_attempt_count: number
          capacity_score: number | null
          complex_property: boolean | null
          complex_property_evidence_url: string | null
          created_at: string
          date_researched: string | null
          deal_closed_at: string | null
          deal_closed_by: string | null
          deal_notes: string | null
          deal_status: string
          dedicated_team: boolean | null
          dnc_register_status: string
          do_not_contact: boolean
          do_not_contact_at: string | null
          do_not_contact_by: string | null
          do_not_contact_reason: string | null
          exclusion_reason: string | null
          family_law_confirmed: boolean | null
          family_law_evidence_url: string | null
          family_law_team_size: number | null
          firm_name: string
          fit_score: number | null
          follow_up_note: string | null
          follow_up_owner_user_id: string | null
          google_maps_url: string | null
          google_rating: number | null
          google_review_count: number | null
          id: string
          import_batch_id: string | null
          imported_at: string
          international_assets_indicator: boolean | null
          last_call_at: string | null
          last_disposition: string | null
          meeting_at: string | null
          meeting_booked_at: string | null
          meeting_booked_by: string | null
          meeting_reference: string | null
          next_follow_up_at: string | null
          office_locations: string[]
          personalised_opener: string | null
          phone_e164: string | null
          phone_kind: string | null
          phone_raw: string | null
          phone_source_url: string | null
          phone_verification_status: string
          possible_duplicate: string | null
          postcode: string | null
          primary_city: string | null
          primary_contact_id: string | null
          priority_tier: string | null
          property_evidence_url: string | null
          property_fit_score: number | null
          property_settlements_confirmed: boolean | null
          prospect_status: string
          qualification_status: string | null
          quality_score: number | null
          reason_1: string | null
          reason_1_url: string | null
          reason_2: string | null
          reason_2_url: string | null
          reason_3: string | null
          reason_3_url: string | null
          research_notes: string | null
          root_domain: string | null
          smsf_indicator: boolean | null
          source_record_id: string | null
          state: string | null
          team_size_evidence_url: string | null
          timezone: string | null
          trusts_indicator: boolean | null
          unsuccessful_attempt_count: number
          updated_at: string
          valuations_indicator: boolean | null
          website: string | null
        }
        Insert: {
          accreditation_evidence_url?: string | null
          accredited_specialist_count?: number | null
          accredited_specialist_names?: string[]
          apollo_match_status?: string | null
          assigned_caller_user_id?: string | null
          bad_fit_reason?: string | null
          businesses_indicator?: boolean | null
          call_attempt_count?: number
          capacity_score?: number | null
          complex_property?: boolean | null
          complex_property_evidence_url?: string | null
          created_at?: string
          date_researched?: string | null
          deal_closed_at?: string | null
          deal_closed_by?: string | null
          deal_notes?: string | null
          deal_status?: string
          dedicated_team?: boolean | null
          dnc_register_status?: string
          do_not_contact?: boolean
          do_not_contact_at?: string | null
          do_not_contact_by?: string | null
          do_not_contact_reason?: string | null
          exclusion_reason?: string | null
          family_law_confirmed?: boolean | null
          family_law_evidence_url?: string | null
          family_law_team_size?: number | null
          firm_name: string
          fit_score?: number | null
          follow_up_note?: string | null
          follow_up_owner_user_id?: string | null
          google_maps_url?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          id?: string
          import_batch_id?: string | null
          imported_at?: string
          international_assets_indicator?: boolean | null
          last_call_at?: string | null
          last_disposition?: string | null
          meeting_at?: string | null
          meeting_booked_at?: string | null
          meeting_booked_by?: string | null
          meeting_reference?: string | null
          next_follow_up_at?: string | null
          office_locations?: string[]
          personalised_opener?: string | null
          phone_e164?: string | null
          phone_kind?: string | null
          phone_raw?: string | null
          phone_source_url?: string | null
          phone_verification_status?: string
          possible_duplicate?: string | null
          postcode?: string | null
          primary_city?: string | null
          primary_contact_id?: string | null
          priority_tier?: string | null
          property_evidence_url?: string | null
          property_fit_score?: number | null
          property_settlements_confirmed?: boolean | null
          prospect_status?: string
          qualification_status?: string | null
          quality_score?: number | null
          reason_1?: string | null
          reason_1_url?: string | null
          reason_2?: string | null
          reason_2_url?: string | null
          reason_3?: string | null
          reason_3_url?: string | null
          research_notes?: string | null
          root_domain?: string | null
          smsf_indicator?: boolean | null
          source_record_id?: string | null
          state?: string | null
          team_size_evidence_url?: string | null
          timezone?: string | null
          trusts_indicator?: boolean | null
          unsuccessful_attempt_count?: number
          updated_at?: string
          valuations_indicator?: boolean | null
          website?: string | null
        }
        Update: {
          accreditation_evidence_url?: string | null
          accredited_specialist_count?: number | null
          accredited_specialist_names?: string[]
          apollo_match_status?: string | null
          assigned_caller_user_id?: string | null
          bad_fit_reason?: string | null
          businesses_indicator?: boolean | null
          call_attempt_count?: number
          capacity_score?: number | null
          complex_property?: boolean | null
          complex_property_evidence_url?: string | null
          created_at?: string
          date_researched?: string | null
          deal_closed_at?: string | null
          deal_closed_by?: string | null
          deal_notes?: string | null
          deal_status?: string
          dedicated_team?: boolean | null
          dnc_register_status?: string
          do_not_contact?: boolean
          do_not_contact_at?: string | null
          do_not_contact_by?: string | null
          do_not_contact_reason?: string | null
          exclusion_reason?: string | null
          family_law_confirmed?: boolean | null
          family_law_evidence_url?: string | null
          family_law_team_size?: number | null
          firm_name?: string
          fit_score?: number | null
          follow_up_note?: string | null
          follow_up_owner_user_id?: string | null
          google_maps_url?: string | null
          google_rating?: number | null
          google_review_count?: number | null
          id?: string
          import_batch_id?: string | null
          imported_at?: string
          international_assets_indicator?: boolean | null
          last_call_at?: string | null
          last_disposition?: string | null
          meeting_at?: string | null
          meeting_booked_at?: string | null
          meeting_booked_by?: string | null
          meeting_reference?: string | null
          next_follow_up_at?: string | null
          office_locations?: string[]
          personalised_opener?: string | null
          phone_e164?: string | null
          phone_kind?: string | null
          phone_raw?: string | null
          phone_source_url?: string | null
          phone_verification_status?: string
          possible_duplicate?: string | null
          postcode?: string | null
          primary_city?: string | null
          primary_contact_id?: string | null
          priority_tier?: string | null
          property_evidence_url?: string | null
          property_fit_score?: number | null
          property_settlements_confirmed?: boolean | null
          prospect_status?: string
          qualification_status?: string | null
          quality_score?: number | null
          reason_1?: string | null
          reason_1_url?: string | null
          reason_2?: string | null
          reason_2_url?: string | null
          reason_3?: string | null
          reason_3_url?: string | null
          research_notes?: string | null
          root_domain?: string | null
          smsf_indicator?: boolean | null
          source_record_id?: string | null
          state?: string | null
          team_size_evidence_url?: string | null
          timezone?: string | null
          trusts_indicator?: boolean | null
          unsuccessful_attempt_count?: number
          updated_at?: string
          valuations_indicator?: boolean | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_prospect_firms_primary_contact_fk"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "legal_prospect_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_prospect_import_batches: {
        Row: {
          created_at: string
          created_by: string | null
          failed_count: number
          file_name: string | null
          id: string
          inserted_count: number
          mode: string
          row_errors: Json
          skipped_count: number
          total_rows: number
          updated_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          failed_count?: number
          file_name?: string | null
          id?: string
          inserted_count?: number
          mode?: string
          row_errors?: Json
          skipped_count?: number
          total_rows?: number
          updated_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          failed_count?: number
          file_name?: string | null
          id?: string
          inserted_count?: number
          mode?: string
          row_errors?: Json
          skipped_count?: number
          total_rows?: number
          updated_count?: number
        }
        Relationships: []
      }
      legal_rep_module_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          module_complete: boolean
          module_slug: string
          state: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          module_complete?: boolean
          module_slug: string
          state?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          module_complete?: boolean
          module_slug?: string
          state?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_rep_quiz_progress: {
        Row: {
          attempts: number
          best_score: number
          passed: boolean
          passed_at: string | null
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          best_score?: number
          passed?: boolean
          passed_at?: string | null
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          best_score?: number
          passed?: boolean
          passed_at?: string | null
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_rep_sessions: {
        Row: {
          bookings_made: number
          calls_made: number
          created_at: string
          ended_at: string | null
          id: string
          rep_id: string | null
          started_at: string
          updated_at: string
        }
        Insert: {
          bookings_made?: number
          calls_made?: number
          created_at?: string
          ended_at?: string | null
          id?: string
          rep_id?: string | null
          started_at?: string
          updated_at?: string
        }
        Update: {
          bookings_made?: number
          calls_made?: number
          created_at?: string
          ended_at?: string | null
          id?: string
          rep_id?: string | null
          started_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_rep_sessions_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "legal_sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_reporting_hour_overrides: {
        Row: {
          hours: number
          note: string
          rep_id: string
          updated_at: string
          work_date: string
        }
        Insert: {
          hours: number
          note: string
          rep_id: string
          updated_at?: string
          work_date: string
        }
        Update: {
          hours?: number
          note?: string
          rep_id?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_reporting_hour_overrides_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "legal_sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_reporting_rep_rates: {
        Row: {
          booking_bonus: number | null
          hourly_rate: number | null
          rep_id: string
        }
        Insert: {
          booking_bonus?: number | null
          hourly_rate?: number | null
          rep_id: string
        }
        Update: {
          booking_bonus?: number | null
          hourly_rate?: number | null
          rep_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_reporting_rep_rates_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: true
            referencedRelation: "legal_sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_sales_lead_claims: {
        Row: {
          expires_at: string
          lead_id: string
          session_id: string
        }
        Insert: {
          expires_at: string
          lead_id: string
          session_id: string
        }
        Update: {
          expires_at?: string
          lead_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_sales_lead_claims_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "legal_client_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_sales_lead_claims_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "legal_rep_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_sales_reps: {
        Row: {
          can_manage_firm_pipeline: boolean
          can_view_team_clients: boolean
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string | null
          portal_pages: string[] | null
          role: string
          sales_only: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          can_manage_firm_pipeline?: boolean
          can_view_team_clients?: boolean
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          portal_pages?: string[] | null
          role?: string
          sales_only?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          can_manage_firm_pipeline?: boolean
          can_view_team_clients?: boolean
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          portal_pages?: string[] | null
          role?: string
          sales_only?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      legal_sales_session_visits: {
        Row: {
          lead_id: string
          session_id: string
          visited_at: string
        }
        Insert: {
          lead_id: string
          session_id: string
          visited_at?: string
        }
        Update: {
          lead_id?: string
          session_id?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_sales_session_visits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "legal_client_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_sales_session_visits_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "legal_rep_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_sms_messages: {
        Row: {
          body: string | null
          created_at: string
          delivery_status: string | null
          direction: string
          id: string
          lead_id: string | null
          phone: string | null
          thread_id: string | null
          twilio_sid: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          delivery_status?: string | null
          direction: string
          id?: string
          lead_id?: string | null
          phone?: string | null
          thread_id?: string | null
          twilio_sid?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          delivery_status?: string | null
          direction?: string
          id?: string
          lead_id?: string | null
          phone?: string | null
          thread_id?: string | null
          twilio_sid?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_sms_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "legal_client_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_sms_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "legal_sms_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_sms_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          lead_id: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          lead_id?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_sms_threads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "legal_client_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["legal_app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["legal_app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["legal_app_role"]
          user_id?: string
        }
        Relationships: []
      }
      meta_ads_assets: {
        Row: {
          created_at: string
          draft_id: string
          duration: number
          file_name: string
          height: number
          id: string
          mime: string
          path: string
          size: number
          status: string
          thumbnail_path: string
          width: number
        }
        Insert: {
          created_at?: string
          draft_id: string
          duration: number
          file_name: string
          height: number
          id?: string
          mime: string
          path: string
          size: number
          status?: string
          thumbnail_path: string
          width: number
        }
        Update: {
          created_at?: string
          draft_id?: string
          duration?: number
          file_name?: string
          height?: number
          id?: string
          mime?: string
          path?: string
          size?: number
          status?: string
          thumbnail_path?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "meta_ads_assets_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "meta_ads_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ads_drafts: {
        Row: {
          attempts: number
          config: Json
          created_at: string
          error: string | null
          id: string
          lease_token: string | null
          lease_until: string | null
          name: string
          next_attempt_at: string
          owner_id: string
          pause_requested: boolean
          progress: Json
          requested_mode: string | null
          review_expires_at: string | null
          review_hash: string | null
          review_plan: Json | null
          revision: number
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          config: Json
          created_at?: string
          error?: string | null
          id?: string
          lease_token?: string | null
          lease_until?: string | null
          name?: string
          next_attempt_at?: string
          owner_id: string
          pause_requested?: boolean
          progress?: Json
          requested_mode?: string | null
          review_expires_at?: string | null
          review_hash?: string | null
          review_plan?: Json | null
          revision?: number
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          config?: Json
          created_at?: string
          error?: string | null
          id?: string
          lease_token?: string | null
          lease_until?: string | null
          name?: string
          next_attempt_at?: string
          owner_id?: string
          pause_requested?: boolean
          progress?: Json
          requested_mode?: string | null
          review_expires_at?: string | null
          review_hash?: string | null
          review_plan?: Json | null
          revision?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      meta_ads_events: {
        Row: {
          actor_id: string | null
          created_at: string
          detail: Json
          draft_id: string | null
          event: string
          id: number
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detail?: Json
          draft_id?: string | null
          event: string
          id?: never
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detail?: Json
          draft_id?: string | null
          event?: string
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "meta_ads_events_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "meta_ads_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ads_runtime: {
        Row: {
          heartbeat_at: string | null
          id: boolean
          version: string | null
        }
        Insert: {
          heartbeat_at?: string | null
          id?: boolean
          version?: string | null
        }
        Update: {
          heartbeat_at?: string | null
          id?: boolean
          version?: string | null
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
          deposit_token: string | null
          email: string | null
          expectations_set: boolean | null
          expectations_set_at: string | null
          expectations_set_by: string | null
          finance_eligible: boolean | null
          finance_form_answers: Json | null
          first_name: string | null
          funding_preference: string | null
          handover_sent_at: string | null
          id: string
          last_name: string | null
          lead_class: string
          lead_class_reason: string | null
          lead_id: string | null
          norwood_level: number | null
          payment_processor: string | null
          phone: string | null
          pipeline_summary: string | null
          pipeline_summary_updated_at: string | null
          previous_lead_id: string | null
          raw_payload: Json | null
          rep_id: string | null
          square_order_id: string | null
          square_payment_id: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          superseded_by_lead_id: string | null
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
          deposit_token?: string | null
          email?: string | null
          expectations_set?: boolean | null
          expectations_set_at?: string | null
          expectations_set_by?: string | null
          finance_eligible?: boolean | null
          finance_form_answers?: Json | null
          first_name?: string | null
          funding_preference?: string | null
          handover_sent_at?: string | null
          id?: string
          last_name?: string | null
          lead_class?: string
          lead_class_reason?: string | null
          lead_id?: string | null
          norwood_level?: number | null
          payment_processor?: string | null
          phone?: string | null
          pipeline_summary?: string | null
          pipeline_summary_updated_at?: string | null
          previous_lead_id?: string | null
          raw_payload?: Json | null
          rep_id?: string | null
          square_order_id?: string | null
          square_payment_id?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          superseded_by_lead_id?: string | null
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
          deposit_token?: string | null
          email?: string | null
          expectations_set?: boolean | null
          expectations_set_at?: string | null
          expectations_set_by?: string | null
          finance_eligible?: boolean | null
          finance_form_answers?: Json | null
          first_name?: string | null
          funding_preference?: string | null
          handover_sent_at?: string | null
          id?: string
          last_name?: string | null
          lead_class?: string
          lead_class_reason?: string | null
          lead_id?: string | null
          norwood_level?: number | null
          payment_processor?: string | null
          phone?: string | null
          pipeline_summary?: string | null
          pipeline_summary_updated_at?: string | null
          previous_lead_id?: string | null
          raw_payload?: Json | null
          rep_id?: string | null
          square_order_id?: string | null
          square_payment_id?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          superseded_by_lead_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_leads_previous_lead_id_fkey"
            columns: ["previous_lead_id"]
            isOneToOne: false
            referencedRelation: "ad_lead_outcomes"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "meta_leads_previous_lead_id_fkey"
            columns: ["previous_lead_id"]
            isOneToOne: false
            referencedRelation: "meta_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_leads_previous_lead_id_fkey"
            columns: ["previous_lead_id"]
            isOneToOne: false
            referencedRelation: "pending_clinic_handovers"
            referencedColumns: ["lead_id"]
          },
        ]
      }
      norwood_preview_assessments: {
        Row: {
          ai_confidence: string | null
          ai_norwood: number | null
          ai_observations: Json | null
          ai_reason: string | null
          analysis_attempts: number
          analysis_run: string | null
          analysis_started_at: string | null
          clinic_id: string
          clinic_name: string
          consented_at: string | null
          created_at: string
          created_by: string
          expires_at: string
          final_norwood: number | null
          framing_attempts: number
          framing_checked_at: string | null
          framing_consented_at: string | null
          id: string
          lead_id: string
          model: string | null
          opened_at: string | null
          photo_problems: Json
          photos: Json
          prompt_version: string | null
          result_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revoked_at: string | null
          sms_sid: string | null
          status: string
          token_hash: string
          upload_attempts: number
        }
        Insert: {
          ai_confidence?: string | null
          ai_norwood?: number | null
          ai_observations?: Json | null
          ai_reason?: string | null
          analysis_attempts?: number
          analysis_run?: string | null
          analysis_started_at?: string | null
          clinic_id: string
          clinic_name: string
          consented_at?: string | null
          created_at?: string
          created_by: string
          expires_at?: string
          final_norwood?: number | null
          framing_attempts?: number
          framing_checked_at?: string | null
          framing_consented_at?: string | null
          id?: string
          lead_id: string
          model?: string | null
          opened_at?: string | null
          photo_problems?: Json
          photos?: Json
          prompt_version?: string | null
          result_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revoked_at?: string | null
          sms_sid?: string | null
          status?: string
          token_hash: string
          upload_attempts?: number
        }
        Update: {
          ai_confidence?: string | null
          ai_norwood?: number | null
          ai_observations?: Json | null
          ai_reason?: string | null
          analysis_attempts?: number
          analysis_run?: string | null
          analysis_started_at?: string | null
          clinic_id?: string
          clinic_name?: string
          consented_at?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string
          final_norwood?: number | null
          framing_attempts?: number
          framing_checked_at?: string | null
          framing_consented_at?: string | null
          id?: string
          lead_id?: string
          model?: string | null
          opened_at?: string | null
          photo_problems?: Json
          photos?: Json
          prompt_version?: string | null
          result_at?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revoked_at?: string | null
          sms_sid?: string | null
          status?: string
          token_hash?: string
          upload_attempts?: number
        }
        Relationships: [
          {
            foreignKeyName: "norwood_preview_assessments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "norwood_preview_assessments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "norwood_preview_assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "norwood_preview_assessments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "ad_lead_outcomes"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "norwood_preview_assessments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "meta_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "norwood_preview_assessments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "pending_clinic_handovers"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "norwood_preview_assessments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      norwood_preview_live: {
        Row: {
          answer: string | null
          assessment_id: string
          consented_at: string
          ended: boolean
          expires_at: string
          offer: string | null
          patient_client: string
          patient_seen: string
          rep_client: string | null
          rep_id: string | null
          rep_seen: string | null
          room_id: string
          starts: number
        }
        Insert: {
          answer?: string | null
          assessment_id: string
          consented_at?: string
          ended?: boolean
          expires_at: string
          offer?: string | null
          patient_client: string
          patient_seen?: string
          rep_client?: string | null
          rep_id?: string | null
          rep_seen?: string | null
          room_id?: string
          starts?: number
        }
        Update: {
          answer?: string | null
          assessment_id?: string
          consented_at?: string
          ended?: boolean
          expires_at?: string
          offer?: string | null
          patient_client?: string
          patient_seen?: string
          rep_client?: string | null
          rep_id?: string | null
          rep_seen?: string | null
          room_id?: string
          starts?: number
        }
        Relationships: [
          {
            foreignKeyName: "norwood_preview_live_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "norwood_preview_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "norwood_preview_live_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: true
            referencedRelation: "norwood_preview_comparison"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "norwood_preview_live_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      norwood_preview_reviews: {
        Row: {
          assessment_id: string
          created_at: string
          id: string
          norwood: number
          rep_id: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          id?: string
          norwood: number
          rep_id: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          id?: string
          norwood?: number
          rep_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "norwood_preview_reviews_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "norwood_preview_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "norwood_preview_reviews_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "norwood_preview_comparison"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "norwood_preview_reviews_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
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
          buffer_minutes: number
          city: string | null
          clinic_name: string
          clinicflow_enabled: boolean
          consult_price_deposit: number | null
          consult_price_original: number | null
          consultation_duration_minutes: number
          created_at: string
          email: string | null
          handover_cc: string | null
          id: string
          is_active: boolean
          location: string | null
          min_appointment_gap_mins: number
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
          buffer_minutes?: number
          city?: string | null
          clinic_name: string
          clinicflow_enabled?: boolean
          consult_price_deposit?: number | null
          consult_price_original?: number | null
          consultation_duration_minutes?: number
          created_at?: string
          email?: string | null
          handover_cc?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          min_appointment_gap_mins?: number
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
          buffer_minutes?: number
          city?: string | null
          clinic_name?: string
          clinicflow_enabled?: boolean
          consult_price_deposit?: number | null
          consult_price_original?: number | null
          consultation_duration_minutes?: number
          created_at?: string
          email?: string | null
          handover_cc?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          min_appointment_gap_mins?: number
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
          conducts_consultations: boolean
          created_at: string
          credentials: string | null
          id: string
          is_active: boolean
          name: string
          natural_results_approach: string | null
          performs_procedures: boolean
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
          conducts_consultations?: boolean
          created_at?: string
          credentials?: string | null
          id?: string
          is_active?: boolean
          name: string
          natural_results_approach?: string | null
          performs_procedures?: boolean
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
          conducts_consultations?: boolean
          created_at?: string
          credentials?: string | null
          id?: string
          is_active?: boolean
          name?: string
          natural_results_approach?: string | null
          performs_procedures?: boolean
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
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "partner_doctors_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_sms_opt_outs: {
        Row: {
          created_at: string
          phone: string
        }
        Insert: {
          created_at?: string
          phone: string
        }
        Update: {
          created_at?: string
          phone?: string
        }
        Relationships: []
      }
      personal_phone_lines: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          mms_enabled: boolean
          number: string
          outbound_daily_limit: number
          rep_id: string
          twilio_sid: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          mms_enabled?: boolean
          number: string
          outbound_daily_limit?: number
          rep_id: string
          twilio_sid: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          mms_enabled?: boolean
          number?: string
          outbound_daily_limit?: number
          rep_id?: string
          twilio_sid?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_phone_lines_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: true
            referencedRelation: "sales_reps"
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
          mms_enabled: boolean
          number: string
          outbound_daily_limit: number
          release_due_at: string | null
          release_error: string | null
          release_started_at: string | null
          released_at: string | null
          retired_at: string | null
          retirement_reason: string | null
          status: string
          twilio_sid: string | null
        }
        Insert: {
          call_count?: number
          created_at?: string
          friendly_name?: string | null
          id?: string
          last_used_at?: string | null
          mms_enabled?: boolean
          number: string
          outbound_daily_limit?: number
          release_due_at?: string | null
          release_error?: string | null
          release_started_at?: string | null
          released_at?: string | null
          retired_at?: string | null
          retirement_reason?: string | null
          status?: string
          twilio_sid?: string | null
        }
        Update: {
          call_count?: number
          created_at?: string
          friendly_name?: string | null
          id?: string
          last_used_at?: string | null
          mms_enabled?: boolean
          number?: string
          outbound_daily_limit?: number
          release_due_at?: string | null
          release_error?: string | null
          release_started_at?: string | null
          released_at?: string | null
          retired_at?: string | null
          retirement_reason?: string | null
          status?: string
          twilio_sid?: string | null
        }
        Relationships: []
      }
      portal_todo_lists: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          position: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          position?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          position?: number | null
        }
        Relationships: []
      }
      portal_todos: {
        Row: {
          assignee_email: string | null
          business: string
          completed_by_email: string | null
          created_at: string
          created_by: string | null
          created_by_email: string | null
          done_at: string | null
          due_date: string | null
          due_time: string | null
          id: string
          list_id: string | null
          notes: string | null
          position: number | null
          priority: number
          title: string
          updated_at: string
        }
        Insert: {
          assignee_email?: string | null
          business?: string
          completed_by_email?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          done_at?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          list_id?: string | null
          notes?: string | null
          position?: number | null
          priority?: number
          title: string
          updated_at?: string
        }
        Update: {
          assignee_email?: string | null
          business?: string
          completed_by_email?: string | null
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          done_at?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          list_id?: string | null
          notes?: string | null
          position?: number | null
          priority?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_todos_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "portal_todo_lists"
            referencedColumns: ["id"]
          },
        ]
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
      practice_call_save_queue: {
        Row: {
          attempts: number
          auth_user_id: string | null
          conversation_id: string
          created_at: string
          done_at: string | null
          duration_seconds: number | null
          id: string
          last_error: string | null
          next_attempt_at: string
          rep_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          auth_user_id?: string | null
          conversation_id: string
          created_at?: string
          done_at?: string | null
          duration_seconds?: number | null
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          rep_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          auth_user_id?: string | null
          conversation_id?: string
          created_at?: string
          done_at?: string | null
          duration_seconds?: number | null
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          rep_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_call_save_queue_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
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
      refund_notifications: {
        Row: {
          appointment_id: string | null
          attempts: number
          claim_token: string | null
          claimed_at: string | null
          created_at: string
          dedupe_key: string
          id: string
          inbox_logged: boolean
          kind: string
          last_error: string | null
          next_attempt_at: string
          payload: Json
          sms_body: string | null
          sms_from_number: string | null
          sms_sid: string | null
          status: string
          updated_at: string
          verification_next_at: string
        }
        Insert: {
          appointment_id?: string | null
          attempts?: number
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          dedupe_key: string
          id?: string
          inbox_logged?: boolean
          kind: string
          last_error?: string | null
          next_attempt_at?: string
          payload: Json
          sms_body?: string | null
          sms_from_number?: string | null
          sms_sid?: string | null
          status?: string
          updated_at?: string
          verification_next_at?: string
        }
        Update: {
          appointment_id?: string | null
          attempts?: number
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          dedupe_key?: string
          id?: string
          inbox_logged?: boolean
          kind?: string
          last_error?: string | null
          next_attempt_at?: string
          payload?: Json
          sms_body?: string | null
          sms_from_number?: string | null
          sms_sid?: string | null
          status?: string
          updated_at?: string
          verification_next_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "ad_lead_outcomes"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "refund_notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "booking_rep_attribution"
            referencedColumns: ["appointment_id"]
          },
          {
            foreignKeyName: "refund_notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "clinic_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "pending_clinic_handovers"
            referencedColumns: ["appointment_id"]
          },
        ]
      }
      rep_booking_earnings: {
        Row: {
          earned_at: string
          lead_id: string
          patient_name: string
          rep_id: string | null
          verified: boolean
        }
        Insert: {
          earned_at: string
          lead_id: string
          patient_name: string
          rep_id?: string | null
          verified?: boolean
        }
        Update: {
          earned_at?: string
          lead_id?: string
          patient_name?: string
          rep_id?: string | null
          verified?: boolean
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
      rep_hour_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          hours: number
          id: string
          note: string | null
          rep_id: string
          updated_at: string
          work_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hours: number
          id?: string
          note?: string | null
          rep_id: string
          updated_at?: string
          work_date: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hours?: number
          id?: string
          note?: string | null
          rep_id?: string
          updated_at?: string
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "rep_hour_overrides_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      rep_invoice_config: {
        Row: {
          hourly_rate_cents: number
          rep_id: string
          timezone: string
        }
        Insert: {
          hourly_rate_cents: number
          rep_id: string
          timezone?: string
        }
        Update: {
          hourly_rate_cents?: number
          rep_id?: string
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "rep_invoice_config_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: true
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      rep_invoice_tracking: {
        Row: {
          id: boolean
          started_at: string
        }
        Insert: {
          id?: boolean
          started_at?: string
        }
        Update: {
          id?: boolean
          started_at?: string
        }
        Relationships: []
      }
      rep_invoices: {
        Row: {
          claim: Json
          created_at: string
          email_attempt_at: string | null
          email_error: string | null
          email_sent_at: string | null
          email_status: string
          evidence: Json
          file_hash: string
          file_path: string
          id: string
          invoice_number: string
          period_from: string
          period_to: string
          rep_id: string
          result: Json | null
          status: string
        }
        Insert: {
          claim: Json
          created_at?: string
          email_attempt_at?: string | null
          email_error?: string | null
          email_sent_at?: string | null
          email_status?: string
          evidence: Json
          file_hash: string
          file_path: string
          id: string
          invoice_number: string
          period_from: string
          period_to: string
          rep_id: string
          result?: Json | null
          status?: string
        }
        Update: {
          claim?: Json
          created_at?: string
          email_attempt_at?: string | null
          email_error?: string | null
          email_sent_at?: string | null
          email_status?: string
          evidence?: Json
          file_hash?: string
          file_path?: string
          id?: string
          invoice_number?: string
          period_from?: string
          period_to?: string
          rep_id?: string
          result?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rep_invoices_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
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
      rep_rates: {
        Row: {
          booking_bonus: number | null
          created_at: string
          effective_from: string
          effective_to: string | null
          hourly_rate: number | null
          id: string
          note: string | null
          rep_id: string
          updated_at: string
        }
        Insert: {
          booking_bonus?: number | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          hourly_rate?: number | null
          id?: string
          note?: string | null
          rep_id: string
          updated_at?: string
        }
        Update: {
          booking_bonus?: number | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          hourly_rate?: number | null
          id?: string
          note?: string | null
          rep_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rep_rates_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      rep_sessions: {
        Row: {
          close_reason: string | null
          connection_gap: boolean
          created_at: string
          ended_at: string | null
          id: string
          invoice_tracking: boolean
          last_seen_at: string | null
          rep_id: string
          started_at: string
        }
        Insert: {
          close_reason?: string | null
          connection_gap?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          invoice_tracking?: boolean
          last_seen_at?: string | null
          rep_id: string
          started_at?: string
        }
        Update: {
          close_reason?: string | null
          connection_gap?: boolean
          created_at?: string
          ended_at?: string | null
          id?: string
          invoice_tracking?: boolean
          last_seen_at?: string | null
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
      sales_test_leads: {
        Row: {
          assigned_to: string | null
          city: string | null
          company: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          message: string | null
          phone: string | null
          raw_payload: Json
          source: string
          state: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          message?: string | null
          phone?: string | null
          raw_payload?: Json
          source?: string
          state?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          message?: string | null
          phone?: string | null
          raw_payload?: Json
          source?: string
          state?: string | null
          status?: string
          updated_at?: string
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
          sender_user_id: string | null
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
          sender_user_id?: string | null
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
          sender_user_id?: string | null
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
      sms_notification_preferences: {
        Row: {
          created_at: string
          involved_only: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          involved_only?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          involved_only?: boolean
          user_id?: string
        }
        Relationships: []
      }
      sms_thread_participants: {
        Row: {
          first_involved_at: string
          last_involved_at: string
          thread_id: string
          user_id: string
        }
        Insert: {
          first_involved_at?: string
          last_involved_at?: string
          thread_id: string
          user_id: string
        }
        Update: {
          first_involved_at?: string
          last_involved_at?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_thread_participants_thread_id_fkey"
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
      voice_destination_routes: {
        Row: {
          caller_id: string
          phone: string
          updated_at: string
        }
        Insert: {
          caller_id: string
          phone: string
          updated_at?: string
        }
        Update: {
          caller_id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      voice_dial_decisions: {
        Row: {
          allowed: boolean
          call_sid: string
          caller_id: string | null
          created_at: string
          phone: string
          reason: string
          retry_at: string | null
        }
        Insert: {
          allowed: boolean
          call_sid: string
          caller_id?: string | null
          created_at?: string
          phone: string
          reason: string
          retry_at?: string | null
        }
        Update: {
          allowed?: boolean
          call_sid?: string
          caller_id?: string | null
          created_at?: string
          phone?: string
          reason?: string
          retry_at?: string | null
        }
        Relationships: []
      }
      voice_number_health: {
        Row: {
          alert: string | null
          attempts_7d: number
          baseline_connected_rate: number | null
          checked_at: string
          connected_10s_7d: number
          connected_15s_7d: number
          failures_7d: number
          number: string
          transcript_signals: number
        }
        Insert: {
          alert?: string | null
          attempts_7d: number
          baseline_connected_rate?: number | null
          checked_at: string
          connected_10s_7d?: number
          connected_15s_7d: number
          failures_7d: number
          number: string
          transcript_signals?: number
        }
        Update: {
          alert?: string | null
          attempts_7d?: number
          baseline_connected_rate?: number | null
          checked_at?: string
          connected_10s_7d?: number
          connected_15s_7d?: number
          failures_7d?: number
          number?: string
          transcript_signals?: number
        }
        Relationships: []
      }
      voice_pool_jobs: {
        Row: {
          consumed_at: string | null
          created_at: string
          dry_run: boolean
          expires_at: string
          id: string
          token_hash: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          dry_run: boolean
          expires_at: string
          id?: string
          token_hash: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          dry_run?: boolean
          expires_at?: string
          id?: string
          token_hash?: string
        }
        Relationships: []
      }
      voice_pool_purchases: {
        Row: {
          created_at: string
          currency: string
          error: string | null
          id: string
          monthly_cents: number
          phone: string
          requested_at: string | null
          state: string
          twilio_sid: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency: string
          error?: string | null
          id?: string
          monthly_cents: number
          phone: string
          requested_at?: string | null
          state?: string
          twilio_sid?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          error?: string | null
          id?: string
          monthly_cents?: number
          phone?: string
          requested_at?: string | null
          state?: string
          twilio_sid?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      voice_pool_settings: {
        Row: {
          approved_at: string | null
          baseline_numbers: string[]
          checked_at: string | null
          currency: string
          enabled: boolean
          last_error: string | null
          last_result: string | null
          lease_token: string | null
          lease_until: string | null
          max_additional_numbers: number
          max_monthly_cents: number
          max_unit_cents: number
          pickup_retirement_enabled: boolean
          release_enabled: boolean
          singleton: boolean
          target_active: number
        }
        Insert: {
          approved_at?: string | null
          baseline_numbers?: string[]
          checked_at?: string | null
          currency?: string
          enabled?: boolean
          last_error?: string | null
          last_result?: string | null
          lease_token?: string | null
          lease_until?: string | null
          max_additional_numbers?: number
          max_monthly_cents?: number
          max_unit_cents?: number
          pickup_retirement_enabled?: boolean
          release_enabled?: boolean
          singleton?: boolean
          target_active?: number
        }
        Update: {
          approved_at?: string | null
          baseline_numbers?: string[]
          checked_at?: string | null
          currency?: string
          enabled?: boolean
          last_error?: string | null
          last_result?: string | null
          lease_token?: string | null
          lease_until?: string | null
          max_additional_numbers?: number
          max_monthly_cents?: number
          max_unit_cents?: number
          pickup_retirement_enabled?: boolean
          release_enabled?: boolean
          singleton?: boolean
          target_active?: number
        }
        Relationships: []
      }
      voice_reputation_signals: {
        Row: {
          call_id: string
          detected_at: string
          from_number: string | null
          reason: string
        }
        Insert: {
          call_id: string
          detected_at?: string
          from_number?: string | null
          reason: string
        }
        Update: {
          call_id?: string
          detected_at?: string
          from_number?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_reputation_signals_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: true
            referencedRelation: "call_records"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ad_lead_outcomes: {
        Row: {
          ad_name: string | null
          adset_name: string | null
          appointment_date: string | null
          appointment_id: string | null
          appointment_time: string | null
          campaign_name: string | null
          created_at: string | null
          first_name: string | null
          is_booked: boolean | null
          is_disqualified: boolean | null
          is_noshow: boolean | null
          is_showed: boolean | null
          is_upcoming: boolean | null
          last_name: string | null
          lead_id: string | null
          location: string | null
          needs_outcome: boolean | null
          outcome: string | null
          phone: string | null
          status: string | null
          unattributed: boolean | null
        }
        Relationships: []
      }
      booking_rep_attribution: {
        Row: {
          ad_name: string | null
          appointment_id: string | null
          attribution: string | null
          booked_date: string | null
          cohort_date: string | null
          lead_id: string | null
          location: string | null
          rep_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "ad_lead_outcomes"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "clinic_appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "meta_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "pending_clinic_handovers"
            referencedColumns: ["lead_id"]
          },
        ]
      }
      clinic_effective_rate: {
        Row: {
          amount_paid_ex_gst: number | null
          clinic_id: string | null
          effective_rate: number | null
          list_rate: number | null
          shows_delivered: number | null
          shows_purchased: number | null
        }
        Relationships: []
      }
      clinic_show_slots: {
        Row: {
          appointment_date: string | null
          appointment_id: string | null
          clinic_id: string | null
          is_free: boolean | null
          pack_type: string | null
          show_no: number | null
          unpurchased: boolean | null
        }
        Relationships: []
      }
      legal_firm_conversation_overview: {
        Row: {
          application_id: string | null
          last_activity_at: string | null
          preview: string | null
          unread_count: number | null
        }
        Relationships: []
      }
      norwood_preview_comparison: {
        Row: {
          ai_confidence: string | null
          ai_norwood: number | null
          clinic_id: string | null
          created_at: string | null
          exact_agreement: boolean | null
          final_norwood: number | null
          id: string | null
          lead_id: string | null
          model: string | null
          prompt_version: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          stage_difference: number | null
        }
        Insert: {
          ai_confidence?: string | null
          ai_norwood?: number | null
          clinic_id?: string | null
          created_at?: string | null
          exact_agreement?: never
          final_norwood?: number | null
          id?: string | null
          lead_id?: string | null
          model?: string | null
          prompt_version?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          stage_difference?: never
        }
        Update: {
          ai_confidence?: string | null
          ai_norwood?: number | null
          clinic_id?: string | null
          created_at?: string | null
          exact_agreement?: never
          final_norwood?: number | null
          id?: string | null
          lead_id?: string | null
          model?: string | null
          prompt_version?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          stage_difference?: never
        }
        Relationships: [
          {
            foreignKeyName: "norwood_preview_assessments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinic_effective_rate"
            referencedColumns: ["clinic_id"]
          },
          {
            foreignKeyName: "norwood_preview_assessments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "partner_clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "norwood_preview_assessments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "ad_lead_outcomes"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "norwood_preview_assessments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "meta_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "norwood_preview_assessments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "pending_clinic_handovers"
            referencedColumns: ["lead_id"]
          },
          {
            foreignKeyName: "norwood_preview_assessments_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_clinic_handovers: {
        Row: {
          appointment_date: string | null
          appointment_id: string | null
          appointment_time: string | null
          clinic_name: string | null
          lead_id: string | null
          patient_name: string | null
          pending_since: string | null
          rep_id: string | null
          rep_name: string | null
        }
        Relationships: []
      }
      rep_call_days: {
        Row: {
          calc_hours: number | null
          calls: number | null
          first_call: string | null
          last_call: string | null
          rep_id: string | null
          work_date: string | null
        }
        Relationships: []
      }
      rep_day_key_calls: {
        Row: {
          ad_name: string | null
          leads: number | null
          location: string | null
          rep_id: string | null
          talk_secs: number | null
          work_date: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ad_cost_per_show_monthly: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          location: string
          month: string
          showed: number
          spend: number
        }[]
      }
      ad_location_from_campaign: {
        Args: { p_campaign: string }
        Returns: string
      }
      ad_location_summary: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          booked: number
          disqualified: number
          leads: number
          location: string
          needs_outcome: number
          noshow: number
          showed: number
          spend: number
          upcoming: number
        }[]
      }
      ad_performance: {
        Args: { p_from?: string; p_location?: string; p_to?: string }
        Returns: {
          ad_name: string
          booked: number
          clicks: number
          disqualified: number
          impressions: number
          leads: number
          location: string
          name_collision: boolean
          needs_outcome: number
          noshow: number
          showed: number
          spend: number
          unattributed: boolean
          upcoming: number
        }[]
      }
      apply_voice_status: {
        Args: {
          p_answered_rep?: string
          p_child_sid: string
          p_duration: number
          p_error: string
          p_recording_sid: string
          p_recording_url: string
          p_sequence: number
          p_sid: string
          p_sip: string
          p_status: string
        }
        Returns: Json
      }
      booking_busy_times: {
        Args: { p_clinic: string }
        Returns: {
          appointment_date: string
          appointment_time: string
        }[]
      }
      booking_sales_actor: {
        Args: never
        Returns: {
          id: string
          role: string
        }[]
      }
      booking_schedule_snapshot: { Args: { p_id: string }; Returns: Json }
      calendar_history_fields: {
        Args: { kind: string; row_data: Json }
        Returns: Json
      }
      calendar_history_on_date: {
        Args: { kind: string; target: string; value: Json }
        Returns: boolean
      }
      can_manage_booking: { Args: { p_id: string }; Returns: boolean }
      claim_appointment_reminder: {
        Args: {
          p_claim: string
          p_id: string
          p_kind: string
          p_updated_at: string
        }
        Returns: boolean
      }
      claim_confirmation_delivery: {
        Args: {
          p_body: string
          p_destination: string
          p_kind: string
          p_reminder: string
          p_revision: string
          p_settings_version: string
        }
        Returns: string
      }
      claim_outbound_call: {
        Args: {
          p_call_sid: string
          p_clinic_id?: string
          p_lead_id?: string
          p_phone: string
          p_rep_id: string
        }
        Returns: Json
      }
      claim_refund_notification: {
        Args: { p_id: string }
        Returns: {
          appointment_id: string | null
          attempts: number
          claim_token: string | null
          claimed_at: string | null
          created_at: string
          dedupe_key: string
          id: string
          inbox_logged: boolean
          kind: string
          last_error: string | null
          next_attempt_at: string
          payload: Json
          sms_body: string | null
          sms_from_number: string | null
          sms_sid: string | null
          status: string
          updated_at: string
          verification_next_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "refund_notifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_reschedule_email: { Args: { p_event: string }; Returns: Json }
      clinic_pack_economics: {
        Args: never
        Returns: {
          amount_paid_ex_gst: number
          city: string
          clinic_id: string
          clinic_name: string
          effective_rate: number
          free_shows_delivered: number
          list_rate: number
          over_delivered: number
          packs_missing_amount: number
          paid_rate: number
          shows_delivered: number
          shows_free_purchased: number
          shows_owed: number
          shows_paid_purchased: number
          shows_purchased: number
          value_owed: number
        }[]
      }
      clinic_schedule_snapshot: { Args: { p_clinic: string }; Returns: Json }
      commit_booking_reschedule: {
        Args: {
          p_actor: string
          p_date: string
          p_id: string
          p_phone: string
          p_reason: string
          p_request: string
          p_sms: string
          p_time: string
          p_version: string
        }
        Returns: string
      }
      commit_booking_reschedule_email: {
        Args: {
          p_actor: string
          p_date: string
          p_email_body: string
          p_email_subject: string
          p_expected_email: string
          p_id: string
          p_phone: string
          p_reason: string
          p_request: string
          p_sms: string
          p_time: string
          p_version: string
        }
        Returns: string
      }
      complete_confirmation_callback: {
        Args: { p_callback: string; p_id: string }
        Returns: undefined
      }
      confirm_norwood_preview: {
        Args: {
          p_assessment: string
          p_expectations?: boolean
          p_lead: string
          p_norwood: number
        }
        Returns: undefined
      }
      confirmation_call_alert_due: {
        Args: {
          p_now: string
          r: Database["public"]["Tables"]["appointment_reminders"]["Row"]
          s: Database["public"]["Tables"]["clinic_reminder_settings"]["Row"]
        }
        Returns: boolean
      }
      confirmation_reply_matches: {
        Args: {
          p_from: string
          p_received_at: string
          p_to: string
          r: Database["public"]["Tables"]["appointment_reminders"]["Row"]
        }
        Returns: boolean
      }
      consent_norwood_preview_camera: {
        Args: { p_hash: string }
        Returns: {
          ai_confidence: string | null
          ai_norwood: number | null
          ai_observations: Json | null
          ai_reason: string | null
          analysis_attempts: number
          analysis_run: string | null
          analysis_started_at: string | null
          clinic_id: string
          clinic_name: string
          consented_at: string | null
          created_at: string
          created_by: string
          expires_at: string
          final_norwood: number | null
          framing_attempts: number
          framing_checked_at: string | null
          framing_consented_at: string | null
          id: string
          lead_id: string
          model: string | null
          opened_at: string | null
          photo_problems: Json
          photos: Json
          prompt_version: string | null
          result_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revoked_at: string | null
          sms_sid: string | null
          status: string
          token_hash: string
          upload_attempts: number
        }
        SetofOptions: {
          from: "*"
          to: "norwood_preview_assessments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      consume_appointment_confirmation_reply: {
        Args: {
          p_body: string
          p_from: string
          p_opt_out?: string
          p_sid: string
          p_to: string
        }
        Returns: Json
      }
      consume_voice_pool_job: {
        Args: { p_dry_run: boolean; p_id: string; p_token: string }
        Returns: boolean
      }
      create_norwood_preview: {
        Args: {
          p_clinic: string
          p_hash: string
          p_lead: string
          p_rep: string
        }
        Returns: {
          ai_confidence: string | null
          ai_norwood: number | null
          ai_observations: Json | null
          ai_reason: string | null
          analysis_attempts: number
          analysis_run: string | null
          analysis_started_at: string | null
          clinic_id: string
          clinic_name: string
          consented_at: string | null
          created_at: string
          created_by: string
          expires_at: string
          final_norwood: number | null
          framing_attempts: number
          framing_checked_at: string | null
          framing_consented_at: string | null
          id: string
          lead_id: string
          model: string | null
          opened_at: string | null
          photo_problems: Json
          photos: Json
          prompt_version: string | null
          result_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revoked_at: string | null
          sms_sid: string | null
          status: string
          token_hash: string
          upload_attempts: number
        }
        SetofOptions: {
          from: "*"
          to: "norwood_preview_assessments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_clinic_id: { Args: never; Returns: string }
      current_sales_rep_id: { Args: never; Returns: string }
      current_sales_rep_role: { Args: never; Returns: string }
      customer_journey: { Args: { p_lead: string }; Returns: Json }
      dashboard_conversion_stats: {
        Args: { p_city?: string; p_from: string; p_rep: string }
        Returns: {
          connected_booked: number
          connected_unique: number
          convos_booked: number
          convos_unique: number
          leads_booked: number
          leads_total: number
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      end_session_after_handovers: { Args: { p_rep: string }; Returns: Json }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      enqueue_overdue_handovers: { Args: never; Returns: number }
      enqueue_reclassification_emails: { Args: never; Returns: number }
      enqueue_refund_alert: {
        Args: {
          p_claim: string
          p_html: string
          p_id: string
          p_subject: string
          p_text: string
        }
        Returns: boolean
      }
      ensure_sms_thread: {
        Args: { p_local_number?: string; p_phone: string }
        Returns: string
      }
      finish_confirmation_delivery: {
        Args: {
          p_delivery: string
          p_error?: string
          p_provider?: string
          p_status: string
        }
        Returns: undefined
      }
      flag_refund_notification: {
        Args: { p_category: string; p_id: string; p_reason: string }
        Returns: undefined
      }
      get_booking_reschedule: { Args: { p_id: string }; Returns: Json }
      get_clinic_calendar_history: {
        Args: {
          p_before?: number
          p_clinic: string
          p_date?: string
          p_limit?: number
        }
        Returns: Json
      }
      get_clinic_schedule: { Args: { p_clinic: string }; Returns: Json }
      get_dashboard_stats: { Args: never; Returns: Json }
      has_sales_role: { Args: { _roles: string[] }; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_clinic_setter_user: { Args: never; Returns: boolean }
      is_clinic_user_for: { Args: { _clinic_id: string }; Returns: boolean }
      is_test_lead: { Args: { _lead: string }; Returns: boolean }
      jwt_email_trusted: { Args: never; Returns: string }
      labour_by_key: {
        Args: {
          p_from?: string
          p_mode?: string
          p_rep?: string
          p_to?: string
        }
        Returns: {
          bonus_cost: number
          bonus_missing_rate: number
          bookings: number
          hourly_cost: number
          hours: number
          hours_fallback: number
          hours_missing_rate: number
          key: string
        }[]
      }
      lead_location: {
        Args: { _campaign: string; _lead: string; _payload: Json }
        Returns: string
      }
      legal_activate_firm_offer_pack: {
        Args: { _firm_id: string; _offer_id: string }
        Returns: string
      }
      legal_can_access_portal_page: {
        Args: { p_page: string }
        Returns: boolean
      }
      legal_can_manage_firm_pipeline: { Args: never; Returns: boolean }
      legal_can_view_team_clients: { Args: never; Returns: boolean }
      legal_claim_appointment_reminder: {
        Args: {
          p_from: string
          p_id: string
          p_settings_updated_at?: string
          p_to: string
        }
        Returns: boolean
      }
      legal_claim_call_hook: {
        Args: {
          p_call: string
          p_hash: string
          p_model: string
          p_regenerate?: boolean
          p_user: string
          p_version: string
        }
        Returns: string
      }
      legal_claim_firm_pack_notifications: {
        Args: { p_order?: string }
        Returns: Json
      }
      legal_claim_sales_lead: {
        Args: {
          p_preferred_lead_id?: string
          p_previous_lead_id?: string
          p_session_id: string
        }
        Returns: string
      }
      legal_current_firm_id: { Args: never; Returns: string }
      legal_current_portal_access: { Args: never; Returns: Json }
      legal_current_sales_rep_id: { Args: never; Returns: string }
      legal_finish_firm_pack_notification: {
        Args: { p_claim: string; p_order: string; p_sent: boolean }
        Returns: undefined
      }
      legal_firm_name_key: { Args: { p: string }; Returns: string }
      legal_firm_offer_rate_limit: { Args: { _key: string }; Returns: boolean }
      legal_firm_phone_key: { Args: { value: string }; Returns: string }
      legal_firm_schedule_snapshot: { Args: { p_firm: string }; Returns: Json }
      legal_get_firm_calendar_history: {
        Args: {
          p_before?: number
          p_date?: string
          p_firm: string
          p_limit?: number
        }
        Returns: Json
      }
      legal_get_firm_pack_balance: {
        Args: { _firm_id: string }
        Returns: number
      }
      legal_get_firm_schedule: { Args: { p_firm: string }; Returns: Json }
      legal_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["legal_app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      legal_has_sales_role: { Args: never; Returns: boolean }
      legal_has_staff_profile: { Args: never; Returns: boolean }
      legal_import_verified_legal_spend: {
        Args: {
          p_account: string
          p_account_name: string
          p_campaigns: string[]
          p_fetched_at: string
          p_from: string
          p_rows: Json
          p_to: string
          p_total: number
        }
        Returns: undefined
      }
      legal_is_admin_user: { Args: never; Returns: boolean }
      legal_is_firm_user_for: { Args: { _firm_id: string }; Returns: boolean }
      legal_is_phone_suppressed: { Args: { p: string }; Returns: boolean }
      legal_is_sales_only_user: { Args: never; Returns: boolean }
      legal_is_service_or_admin: { Args: never; Returns: boolean }
      legal_legal_calendar_history_fields: {
        Args: { kind: string; r: Json }
        Returns: Json
      }
      legal_list_staff_portal_access: {
        Args: never
        Returns: {
          email: string
          id: string
          is_active: boolean
          name: string
          pages: string[]
          role: string
          user_id: string
        }[]
      }
      legal_match_firm_application: {
        Args: { p_phone: string }
        Returns: string
      }
      legal_normalize_phone: { Args: { p: string }; Returns: string }
      legal_order_firm_pack: {
        Args: { p_firm: string; p_quantity: number; p_request: string }
        Returns: Json
      }
      legal_portal_leaderboard_source: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      legal_rebook_client_after_no_show: {
        Args: {
          p_actor: string
          p_date: string
          p_firm: string
          p_lawyer: string
          p_lead: string
          p_location?: string
          p_mode: string
          p_previous: string
          p_reminders: Json
          p_time: string
        }
        Returns: Json
      }
      legal_record_appointment_call: {
        Args: {
          p_actor: string
          p_appointment_id: string
          p_outcome: string
          p_version: string
        }
        Returns: undefined
      }
      legal_record_appointment_delivery: {
        Args: { p_error: string; p_id: string; p_sid: string; p_status: string }
        Returns: undefined
      }
      legal_record_appointment_reply: {
        Args: {
          p_body: string
          p_from: string
          p_opt_out: string
          p_sid: string
          p_to: string
        }
        Returns: undefined
      }
      legal_renew_sales_lead: {
        Args: { p_lead_id: string; p_session_id: string }
        Returns: boolean
      }
      legal_replace_legal_meta_spend: {
        Args: {
          p_account: string
          p_account_name: string
          p_campaigns: string[]
          p_from: string
          p_rows: Json
          p_to: string
          p_total: number
        }
        Returns: undefined
      }
      legal_replace_legal_meta_spend_with_metrics: {
        Args: {
          p_account: string
          p_account_name: string
          p_campaigns: string[]
          p_fetched_at: string
          p_from: string
          p_rows: Json
          p_to: string
          p_total: number
        }
        Returns: undefined
      }
      legal_reschedule_firm_appointment: {
        Args: {
          p_appointment: string
          p_author: string
          p_change_location?: boolean
          p_date: string
          p_expected_date: string
          p_expected_location?: string
          p_expected_time: string
          p_location?: string
          p_reminders: Json
          p_time: string
        }
        Returns: undefined
      }
      legal_sales_booking_times: {
        Args: { p_firm_id: string }
        Returns: {
          appointment_date: string
          appointment_time: string
        }[]
      }
      legal_sales_queue_city_has_capacity: {
        Args: { p_city: string }
        Returns: boolean
      }
      legal_sales_queue_rep: { Args: { p_session_id: string }; Returns: string }
      legal_save_firm_call_sheet: {
        Args: { p_application_id: string; p_patch: Json }
        Returns: undefined
      }
      legal_save_firm_offer: {
        Args: {
          _expires_at?: string
          _id: string
          _snapshot: Json
          _token_hash?: string
          _version: number
        }
        Returns: boolean
      }
      legal_save_firm_reminder_settings: {
        Args: {
          p_closures: string[]
          p_days: number[]
          p_email: string
          p_firm_id: string
          p_mode: string
          p_time: string
          p_timezone: string
        }
        Returns: undefined
      }
      legal_save_firm_schedule: {
        Args: { p_command: Json; p_firm: string; p_version: string }
        Returns: Json
      }
      legal_schedule_block_matches: {
        Args: {
          b: Database["public"]["Tables"]["legal_firm_blocked_slots"]["Row"]
          p_day: string
        }
        Returns: boolean
      }
      legal_schedule_hours: {
        Args: { p_day: string; p_firm: string }
        Returns: {
          closes: number
          opens: number
          step: number
        }[]
      }
      legal_schedule_minute: { Args: { p_time: string }; Returns: number }
      legal_schedule_state: { Args: { p_state: string }; Returns: string }
      legal_set_legal_booking_target: {
        Args: { p_month: string; p_rep: string; p_target: number }
        Returns: undefined
      }
      legal_set_staff_portal_pages: {
        Args: { p_pages: string[]; p_rep_id: string }
        Returns: undefined
      }
      legal_set_up_firm_portal: {
        Args: { p_application_id: string }
        Returns: {
          created: boolean
          firm_id: string
        }[]
      }
      legal_staff_portal_pages: {
        Args: { p_rep_id: string }
        Returns: string[]
      }
      legal_sync_firm_calendly_booking: {
        Args: {
          p_application_id: string
          p_checked_at: string
          p_end_at: string
          p_event_uri: string
          p_expected_email: string
          p_expected_stage: string
          p_start_at: string
        }
        Returns: string
      }
      legal_update_firm_sms_status: {
        Args: {
          p_error?: string
          p_id: string
          p_sid: string
          p_status: string
        }
        Returns: undefined
      }
      log_refund_sms: {
        Args: { p_from: string; p_id: string }
        Returns: undefined
      }
      market_city: { Args: { p_text: string }; Returns: string }
      meta_ads_asset: {
        Args: {
          p_asset: Json
          p_complete?: boolean
          p_draft: string
          p_owner: string
        }
        Returns: {
          created_at: string
          draft_id: string
          duration: number
          file_name: string
          height: number
          id: string
          mime: string
          path: string
          size: number
          status: string
          thumbnail_path: string
          width: number
        }
        SetofOptions: {
          from: "*"
          to: "meta_ads_assets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      meta_ads_claim: {
        Args: never
        Returns: {
          attempts: number
          config: Json
          created_at: string
          error: string | null
          id: string
          lease_token: string | null
          lease_until: string | null
          name: string
          next_attempt_at: string
          owner_id: string
          pause_requested: boolean
          progress: Json
          requested_mode: string | null
          review_expires_at: string | null
          review_hash: string | null
          review_plan: Json | null
          revision: number
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "meta_ads_drafts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      meta_ads_queue: {
        Args: {
          p_hash: string
          p_id: string
          p_mode: string
          p_owner: string
          p_revision: number
        }
        Returns: {
          attempts: number
          config: Json
          created_at: string
          error: string | null
          id: string
          lease_token: string | null
          lease_until: string | null
          name: string
          next_attempt_at: string
          owner_id: string
          pause_requested: boolean
          progress: Json
          requested_mode: string | null
          review_expires_at: string | null
          review_hash: string | null
          review_plan: Json | null
          revision: number
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "meta_ads_drafts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      meta_ads_save: {
        Args: {
          p_config: Json
          p_id: string
          p_name: string
          p_owner: string
          p_revision: number
        }
        Returns: {
          attempts: number
          config: Json
          created_at: string
          error: string | null
          id: string
          lease_token: string | null
          lease_until: string | null
          name: string
          next_attempt_at: string
          owner_id: string
          pause_requested: boolean
          progress: Json
          requested_mode: string | null
          review_expires_at: string | null
          review_hash: string | null
          review_plan: Json | null
          revision: number
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "meta_ads_drafts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      meta_ads_tick: { Args: never; Returns: undefined }
      meta_ads_worker_authenticate: {
        Args: { p_token: string }
        Returns: boolean
      }
      meta_lead_classify: { Args: { _prior: string }; Returns: string }
      meta_lead_close_siblings: { Args: { _booked: string }; Returns: number }
      meta_lead_prior_id: {
        Args: {
          _email: string
          _id: string
          _meta_lead_id: string
          _phone: string
        }
        Returns: string
      }
      money_monthly: {
        Args: { p_from?: string; p_rep?: string; p_to?: string }
        Returns: {
          bonus_cost: number
          labour_cost: number
          location: string
          month: string
          revenue: number
          showed: number
          spend: number
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      my_involved_sms_notifications: {
        Args: never
        Returns: {
          clinic_name: string
          display_name: string
          last_message_at: string
          last_message_preview: string
          phone: string
          thread_id: string
          unread_count: number
        }[]
      }
      my_personal_sms_sender: { Args: { p_mms?: boolean }; Returns: string }
      normalize_phone: { Args: { p: string }; Returns: string }
      norwood_preview_live_action: {
        Args: {
          p_action: string
          p_assessment: string
          p_client: string
          p_rep?: string
          p_role: string
          p_room?: string
          p_sdp?: string
        }
        Returns: {
          answer: string | null
          assessment_id: string
          consented_at: string
          ended: boolean
          expires_at: string
          offer: string | null
          patient_client: string
          patient_seen: string
          rep_client: string | null
          rep_id: string | null
          rep_seen: string | null
          room_id: string
          starts: number
        }
        SetofOptions: {
          from: "*"
          to: "norwood_preview_live"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      norwood_preview_patient_action: {
        Args: {
          p_action: string
          p_hash: string
          p_photo?: Json
          p_view?: string
        }
        Returns: {
          ai_confidence: string | null
          ai_norwood: number | null
          ai_observations: Json | null
          ai_reason: string | null
          analysis_attempts: number
          analysis_run: string | null
          analysis_started_at: string | null
          clinic_id: string
          clinic_name: string
          consented_at: string | null
          created_at: string
          created_by: string
          expires_at: string
          final_norwood: number | null
          framing_attempts: number
          framing_checked_at: string | null
          framing_consented_at: string | null
          id: string
          lead_id: string
          model: string | null
          opened_at: string | null
          photo_problems: Json
          photos: Json
          prompt_version: string | null
          result_at: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revoked_at: string | null
          sms_sid: string | null
          status: string
          token_hash: string
          upload_attempts: number
        }
        SetofOptions: {
          from: "*"
          to: "norwood_preview_assessments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      peter_rep_id: { Args: never; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      reconcile_appointment_confirmation_replies: {
        Args: { p_limit?: number }
        Returns: Json
      }
      record_appointment_confirmation: {
        Args: {
          p_body?: string
          p_id: string
          p_kind: string
          p_note?: string
          p_request: string
          p_version: string
        }
        Returns: string
      }
      record_appointment_confirmation_call: {
        Args: { p_reminder: string; p_result: string; p_revision: string }
        Returns: undefined
      }
      record_confirmation_delivery_callback: {
        Args: {
          p_delivery: string
          p_error: string
          p_sid: string
          p_status: string
        }
        Returns: undefined
      }
      record_lead_skip: {
        Args: {
          p_id: string
          p_lead: string
          p_reason: string
          p_session?: string
        }
        Returns: {
          created_at: string
          id: string
          lead_id: string
          reason: string
          rep_id: string
          rep_name: string
          session_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "lead_skip_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_refund_sms_status: {
        Args: {
          p_error?: string
          p_id: string
          p_sid: string
          p_status: string
        }
        Returns: boolean
      }
      recover_refund_notifications: { Args: never; Returns: undefined }
      recover_stale_confirmation_deliveries: { Args: never; Returns: undefined }
      refresh_voice_number_health: { Args: never; Returns: undefined }
      refresh_voice_number_health_base: { Args: never; Returns: undefined }
      reminder_phone: { Args: { p_phone: string }; Returns: string }
      renew_failed_handover_email: {
        Args: {
          p_message_id: number
          p_next_key: string
          p_previous_key: string
        }
        Returns: boolean
      }
      renew_failed_reclassification_email: {
        Args: {
          p_message_id: number
          p_next_key: string
          p_previous_key: string
        }
        Returns: boolean
      }
      renew_failed_refund_email: {
        Args: {
          p_message_id: number
          p_next_key: string
          p_previous_key: string
        }
        Returns: boolean
      }
      rep_hours_report: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          bonus_cost: number
          booking_bonus: number
          bookings: number
          bookings_unresolved: number
          calc_hours: number
          calls: number
          effective_hours: number
          first_call: string
          flag_long: boolean
          flag_no_location: boolean
          flag_sparse: boolean
          has_rate: boolean
          hourly_cost: number
          hourly_rate: number
          last_call: string
          override_hours: number
          override_note: string
          rep_id: string
          rep_name: string
          work_date: string
        }[]
      }
      rep_invoice_session_action: {
        Args: { p_action: string; p_rep: string }
        Returns: Json
      }
      rep_rate_for: {
        Args: { _date: string; _rep: string }
        Returns: {
          booking_bonus: number
          hourly_rate: number
        }[]
      }
      reserve_norwood_preview_frame: {
        Args: { p_hash: string; p_view: string }
        Returns: boolean
      }
      resolve_inbound_voice: {
        Args: { p_call_sid: string; p_phone: string; p_to: string }
        Returns: Json
      }
      revenue_by_key: {
        Args: { p_from?: string; p_mode?: string; p_to?: string }
        Returns: {
          free_shows: number
          key: string
          revenue: number
          revenue_list: number
          shows: number
        }[]
      }
      sales_capacity_snapshot: { Args: never; Returns: Json }
      sales_journey_phone: { Args: { p: string }; Returns: string }
      sales_queue_history: {
        Args: {
          p_leads: string[]
          p_since: string
          p_today: string
          p_zone: string
        }
        Returns: Json
      }
      save_clinic_reminder_settings: {
        Args: {
          p_clinic: string
          p_closed: string[]
          p_days: number[]
          p_email: string
          p_mode: string
          p_time: string
          p_timezone: string
          p_version: string
        }
        Returns: {
          alert_email: string
          call_days: number[]
          clinic_id: string
          closed_dates: string[]
          mode: string
          normal_send_time: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "clinic_reminder_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_clinic_schedule: {
        Args: { p_clinic: string; p_command: Json; p_version: string }
        Returns: Json
      }
      save_lead_contact: {
        Args: {
          p_expected_first_name: string
          p_expected_last_name: string
          p_expected_phone: string
          p_first_name: string
          p_last_name: string
          p_lead_id: string
          p_phone: string
        }
        Returns: Json
      }
      schedule_block_matches: {
        Args: {
          b: Database["public"]["Tables"]["clinic_blocked_slots"]["Row"]
          p_day: string
        }
        Returns: boolean
      }
      schedule_confirmation_callback: {
        Args: {
          p_date: string
          p_expected: string
          p_id: string
          p_note: string
          p_request: string
          p_time: string
          p_version: string
        }
        Returns: string
      }
      schedule_hours: {
        Args: { p_clinic: string; p_day: string }
        Returns: {
          closes: number
          opens: number
          step: number
        }[]
      }
      schedule_minute: { Args: { p_time: string }; Returns: number }
      schedule_state: { Args: { p_state: string }; Returns: string }
      select_sms_sender: {
        Args: { p_mms?: boolean; p_preferred?: string }
        Returns: string
      }
      spend_location: {
        Args: { p_campaign: string; p_location: string }
        Returns: string
      }
      start_clinic_paid_pack: { Args: { p_clinic: string }; Returns: undefined }
      submit_clinic_reclassification: {
        Args: {
          p_acknowledged: boolean
          p_appointment_id: string
          p_reason: string
        }
        Returns: Json
      }
      submit_rep_invoice: {
        Args: {
          p_claim: Json
          p_hash: string
          p_id: string
          p_path: string
          p_rep: string
        }
        Returns: Json
      }
      untouched_sales_leads: {
        Args: { p_before: string; p_session: string }
        Returns: {
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
          deposit_token: string | null
          email: string | null
          expectations_set: boolean | null
          expectations_set_at: string | null
          expectations_set_by: string | null
          finance_eligible: boolean | null
          finance_form_answers: Json | null
          first_name: string | null
          funding_preference: string | null
          handover_sent_at: string | null
          id: string
          last_name: string | null
          lead_class: string
          lead_class_reason: string | null
          lead_id: string | null
          norwood_level: number | null
          payment_processor: string | null
          phone: string | null
          pipeline_summary: string | null
          pipeline_summary_updated_at: string | null
          previous_lead_id: string | null
          raw_payload: Json | null
          rep_id: string | null
          square_order_id: string | null
          square_payment_id: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          superseded_by_lead_id: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "meta_leads"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      voice_pickup_rate: { Args: { p_since?: string }; Returns: Json }
      voice_pool_begin: {
        Args: { p_id: string; p_token: string }
        Returns: boolean
      }
      voice_pool_begin_release: {
        Args: { p_number: string; p_sid: string; p_token: string }
        Returns: boolean
      }
      voice_pool_budget: { Args: never; Returns: Json }
      voice_pool_finish: {
        Args: { p_id: string; p_mms: boolean; p_sid: string }
        Returns: undefined
      }
      voice_pool_finish_release: {
        Args: { p_error?: string; p_number: string; p_sid: string }
        Returns: undefined
      }
      voice_pool_lease: {
        Args: { p_release?: boolean; p_token: string }
        Returns: Json
      }
      voice_pool_reserve: {
        Args: {
          p_cents: number
          p_currency: string
          p_phone: string
          p_token: string
        }
        Returns: Json
      }
      voice_pool_status: { Args: never; Returns: Json }
      voice_pool_tick: { Args: { p_dry_run?: boolean }; Returns: number }
    }
    Enums: {
      legal_app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      legal_app_role: ["admin", "user"],
    },
  },
} as const
