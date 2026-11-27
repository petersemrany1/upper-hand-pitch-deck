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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ad_spend_daily: {
        Row: {
          id: string
          date: string
          ad_id: string | null
          ad_name: string
          adset_name: string | null
          campaign_id: string | null
          campaign_name: string | null
          account_id: string | null
          location: string | null
          spend_aud: number
          impressions: number
          clicks: number
          source: string
          updated_at: string
        }
        Insert: {
          id?: string
          date?: string
          ad_id?: string | null
          ad_name?: string
          adset_name?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          account_id?: string | null
          location?: string | null
          spend_aud?: number
          impressions?: number
          clicks?: number
          source?: string
          updated_at?: string
        }
        Update: {
          id?: string
          date?: string
          ad_id?: string | null
          ad_name?: string
          adset_name?: string | null
          campaign_id?: string | null
          campaign_name?: string | null
          account_id?: string | null
          location?: string | null
          spend_aud?: number
          impressions?: number
          clicks?: number
          source?: string
          updated_at?: string
        }
        Relationships: []
      }

      ad_spend_sync_state: {
        Row: {
          id: number
          last_synced_at: string | null
          last_attempt_at: string | null
          last_status: string | null
          last_message: string | null
          account_id: string | null
          account_name: string | null
          currency: string | null
          timezone: string | null
          coverage_from: string | null
          coverage_to: string | null
          campaign_ids: string[] | null
          ad_total: number | null
          reference_total: number | null
        }
        Insert: {
          id?: number
          last_synced_at?: string | null
          last_attempt_at?: string | null
          last_status?: string | null
          last_message?: string | null
          account_id?: string | null
          account_name?: string | null
          currency?: string | null
          timezone?: string | null
          coverage_from?: string | null
          coverage_to?: string | null
          campaign_ids?: string[] | null
          ad_total?: number | null
          reference_total?: number | null
        }
        Update: {
          id?: number
          last_synced_at?: string | null
          last_attempt_at?: string | null
          last_status?: string | null
          last_message?: string | null
          account_id?: string | null
          account_name?: string | null
          currency?: string | null
          timezone?: string | null
          coverage_from?: string | null
          coverage_to?: string | null
          campaign_ids?: string[] | null
          ad_total?: number | null
          reference_total?: number | null
        }
        Relationships: []
      }

      ad_spend_coverage: {
        Row: {
          date: string
          synced_at: string
          account_id: string
          campaign_ids: string[]
        }
        Insert: {
          date?: string
          synced_at?: string
          account_id?: string
          campaign_ids?: string[]
        }
        Update: {
          date?: string
          synced_at?: string
          account_id?: string
          campaign_ids?: string[]
        }
        Relationships: []
      }

      reporting_hour_overrides: {
        Row: {rep_id:string;work_date:string;hours:number;note:string;updated_at:string}
        Insert: {rep_id:string;work_date:string;hours:number;note:string;updated_at?:string}
        Update: {rep_id?:string;work_date?:string;hours?:number;note?:string;updated_at?:string}
        Relationships: []
      }
      reporting_rep_rates: {
        Row: {
          rep_id: string
          hourly_rate: number | null
          booking_bonus: number | null
        }
        Insert: {
          rep_id: string
          hourly_rate?: number | null
          booking_bonus?: number | null
        }
        Update: {
          rep_id: string
          hourly_rate?: number | null
          booking_bonus?: number | null
        }
        Relationships: []
      }

      ad_briefing_calls: {
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
            foreignKeyName: "ad_briefing_calls_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "ad_briefing_settings"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "ad_briefing_calls_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "ad_briefing_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_briefing_calls_retry_of_fkey"
            columns: ["retry_of"]
            isOneToOne: false
            referencedRelation: "ad_briefing_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_briefing_reports: {
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
            foreignKeyName: "ad_briefing_reports_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "ad_briefing_settings"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      ad_briefing_settings: {
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
      ad_briefing_turns: {
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
            foreignKeyName: "ad_briefing_turns_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "ad_briefing_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
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
      appointment_reminders: {
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
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "firm_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      call_records: {
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
            foreignKeyName: "call_records_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "client_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_records_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      client_asset_calculations: {
        Row: {
          lead_id: string
          calculation: Json
          revision: number
          updated_at: string
          updated_by: string
        }
        Insert: {
          lead_id: string
          calculation: Json
          revision?: number
          updated_at?: string
          updated_by?: string
        }
        Update: {
          calculation?: Json
          revision?: number
        }
        Relationships: [{
          foreignKeyName: "client_asset_calculations_lead_id_fkey"
          columns: ["lead_id"]
          isOneToOne: true
          referencedRelation: "client_leads"
          referencedColumns: ["id"]
        }]
      }
      client_leads: {
        Row: {
          ad_name: string | null
          ad_set_name: string | null
          asset_band: string | null
          booking_date: string | null
          booking_time: string | null
          rep_notes: string | null
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
          rep_notes?: string | null
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
          rep_notes?: string | null
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
          settlement_timeline?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_leads_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_leads_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "firm_lawyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_leads_previous_lead_id_fkey"
            columns: ["previous_lead_id"]
            isOneToOne: false
            referencedRelation: "client_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_leads_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      cold_calling_audit_log: {
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
            foreignKeyName: "cold_calling_audit_log_prospect_firm_id_fkey"
            columns: ["prospect_firm_id"]
            isOneToOne: false
            referencedRelation: "prospect_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_phone_assignments: {
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
            foreignKeyName: "daily_phone_assignments_outbound_caller_id_id_fkey"
            columns: ["outbound_caller_id_id"]
            isOneToOne: false
            referencedRelation: "phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_settings: {
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
      error_logs: {
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
      firm_application_call_sheets: {
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
            foreignKeyName: "firm_application_call_sheets_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "firm_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_application_calls: {
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
            foreignKeyName: "firm_application_calls_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "firm_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_application_calls_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_application_messages: {
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
            foreignKeyName: "firm_application_messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "firm_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_application_notes: {
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
            foreignKeyName: "firm_application_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "firm_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_application_notes_firm_call_id_fkey"
            columns: ["firm_call_id"]
            isOneToOne: true
            referencedRelation: "firm_application_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_pipeline_portals: {
        Row: { application_id: string; firm_id: string; created_at: string }
        Insert: { application_id: string; firm_id: string; created_at?: string }
        Update: { application_id?: string; firm_id?: string; created_at?: string }
        Relationships: [
          {
            foreignKeyName: "firm_pipeline_portals_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "firm_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_pipeline_portals_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_applications: {
        Row: {
          calendly_booking_email: string | null
          calendly_event_uri: string | null
          calendly_start_at: string | null
          calendly_end_at: string | null
          calendly_checked_at: string | null
          calendly_sync_attempted_at: string | null
          ad_name: string | null
          adset_name: string | null
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
          calendly_booking_email?: string | null
          calendly_event_uri?: string | null
          calendly_start_at?: string | null
          calendly_end_at?: string | null
          calendly_checked_at?: string | null
          calendly_sync_attempted_at?: string | null
          ad_name?: string | null
          adset_name?: string | null
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
          calendly_booking_email?: string | null
          calendly_event_uri?: string | null
          calendly_start_at?: string | null
          calendly_end_at?: string | null
          calendly_checked_at?: string | null
          calendly_sync_attempted_at?: string | null
          ad_name?: string | null
          adset_name?: string | null
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
      firm_appointment_notes: {
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
            foreignKeyName: "firm_appointment_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "firm_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_appointment_notes_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_appointments: {
        Row: {
          location_revision: number
          location_id: string | null
          location_name: string | null
          location_address: string | null
          location_parking_info: string | null
          location_nearby_landmarks: string | null
          consultation_duration_minutes: number

          appointment_date: string | null
          appointment_time: string | null
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
          booking_rep_id: string | null
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
          notes: string | null
          offer_pack_id: string | null
          outcome: string | null
          refund_processed_at: string | null
          rebooked_from: string | null
          refund_status: string | null
          status: string
          stripe_refund_id: string | null
          updated_at: string
        }
        Insert: {
          location_revision?: number
          location_id?: string | null
          location_name?: string | null
          location_address?: string | null
          location_parking_info?: string | null
          location_nearby_landmarks?: string | null
          consultation_duration_minutes?: number

          appointment_date?: string | null
          appointment_time?: string | null
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
          booking_rep_id?: string | null
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
          notes?: string | null
          offer_pack_id?: string | null
          outcome?: string | null
          refund_processed_at?: string | null
          rebooked_from?: string | null
          refund_status?: string | null
          status?: string
          stripe_refund_id?: string | null
          updated_at?: string
        }
        Update: {
          location_revision?: number
          location_id?: string | null
          location_name?: string | null
          location_address?: string | null
          location_parking_info?: string | null
          location_nearby_landmarks?: string | null
          consultation_duration_minutes?: number

          appointment_date?: string | null
          appointment_time?: string | null
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
          booking_rep_id?: string | null
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
          notes?: string | null
          offer_pack_id?: string | null
          outcome?: string | null
          refund_processed_at?: string | null
          rebooked_from?: string | null
          refund_status?: string | null
          status?: string
          stripe_refund_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "firm_appointments_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_appointments_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "firm_lawyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "client_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_appointments_offer_pack_id_fkey"
            columns: ["offer_pack_id"]
            isOneToOne: false
            referencedRelation: "firm_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_availability: {
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
            foreignKeyName: "firm_availability_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_blocked_slots: {
        Row: {
          excluded_dates: string[]

          created_at: string
          date: string
          end_time: string | null
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
          excluded_dates?: string[]

          created_at?: string
          date: string
          end_time?: string | null
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
          excluded_dates?: string[]

          created_at?: string
          date?: string
          end_time?: string | null
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
            foreignKeyName: "firm_blocked_slots_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_booking_follow_ups: {
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
            foreignKeyName: "firm_booking_follow_ups_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "firm_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_callback_recipients: {
        Row: { call_id: string; owner_id: string; session_id: string; declined_at: string | null }
        Insert: { call_id: string; owner_id: string; session_id: string; declined_at?: string | null }
        Update: { call_id?: string; owner_id?: string; session_id?: string; declined_at?: string | null }
        Relationships: []
      }
      firm_callback_settings: {
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
      firm_contract_events: {
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
            foreignKeyName: "firm_contract_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "firm_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_contracts: {
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
            foreignKeyName: "firm_contracts_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_lawyers: {
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
            foreignKeyName: "firm_lawyers_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_offer_events: {
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
      firm_offer_milestones: {
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
            foreignKeyName: "firm_offer_milestones_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: true
            referencedRelation: "firm_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_offer_operations: {
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
            foreignKeyName: "firm_offer_operations_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "firm_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_offer_outbox: {
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
            foreignKeyName: "firm_offer_outbox_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "firm_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_offer_rate_limits: {
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
      firm_offer_sessions: {
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
            foreignKeyName: "firm_offer_sessions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "firm_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_offers: {
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
            foreignKeyName: "firm_offers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "firm_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_packs: {
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
            foreignKeyName: "firm_packs_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "firm_packs_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: true
            referencedRelation: "firm_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_portal_users: {
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
            foreignKeyName: "firm_portal_users_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_profile_items: {
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
            foreignKeyName: "firm_profile_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "firm_profile_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_profile_sections: {
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
            foreignKeyName: "firm_profile_sections_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_trading_hours: {
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
            foreignKeyName: "firm_trading_hours_firm_id_fkey"
            columns: ["firm_id"]
            isOneToOne: false
            referencedRelation: "firms"
            referencedColumns: ["id"]
          },
        ]
      }
      firm_locations: {
        Row: {
          sort_order: number
          id: string
          firm_id: string
          name: string
          address: string | null
          city: string | null
          state: string | null
          parking_info: string | null
          nearby_landmarks: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          sort_order?: number
          id?: string
          firm_id: string
          name: string
          address?: string | null
          city?: string | null
          state?: string | null
          parking_info?: string | null
          nearby_landmarks?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          sort_order?: number
          id?: string
          firm_id?: string
          name?: string
          address?: string | null
          city?: string | null
          state?: string | null
          parking_info?: string | null
          nearby_landmarks?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [{ foreignKeyName: "firm_locations_firm_id_fkey"; columns: ["firm_id"]; isOneToOne: false; referencedRelation: "firms"; referencedColumns: ["id"] }]
      }
      firms: {
        Row: {
          consultation_duration_minutes: number
          buffer_minutes: number

          abn: string | null
          address: string | null
          city: string | null
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
          consultation_duration_minutes?: number
          buffer_minutes?: number

          abn?: string | null
          address?: string | null
          city?: string | null
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
          consultation_duration_minutes?: number
          buffer_minutes?: number

          abn?: string | null
          address?: string | null
          city?: string | null
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
      linking_education_plays: {
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
      phone_numbers: {
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
      phone_suppressions: {
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
            foreignKeyName: "phone_suppressions_prospect_firm_id_fkey"
            columns: ["prospect_firm_id"]
            isOneToOne: false
            referencedRelation: "prospect_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_call_recordings: {
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
      profiles: {
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
      prospect_call_attempts: {
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
            foreignKeyName: "prospect_call_attempts_assignment_fk"
            columns: ["daily_phone_assignment_id"]
            isOneToOne: false
            referencedRelation: "daily_phone_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_call_attempts_call_record_id_fkey"
            columns: ["call_record_id"]
            isOneToOne: false
            referencedRelation: "call_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_call_attempts_caller_rep_id_fkey"
            columns: ["caller_rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_call_attempts_outbound_caller_id_id_fkey"
            columns: ["outbound_caller_id_id"]
            isOneToOne: false
            referencedRelation: "phone_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_call_attempts_prospect_contact_id_fkey"
            columns: ["prospect_contact_id"]
            isOneToOne: false
            referencedRelation: "prospect_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_call_attempts_prospect_firm_id_fkey"
            columns: ["prospect_firm_id"]
            isOneToOne: false
            referencedRelation: "prospect_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_contacts: {
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
            foreignKeyName: "prospect_contacts_prospect_firm_id_fkey"
            columns: ["prospect_firm_id"]
            isOneToOne: false
            referencedRelation: "prospect_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_firms: {
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
            foreignKeyName: "prospect_firms_primary_contact_fk"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "prospect_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_import_batches: {
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
      rep_module_progress: {
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
      rep_quiz_progress: {
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
      rep_sessions: {
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
            foreignKeyName: "rep_sessions_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_lead_claims: {
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
            foreignKeyName: "sales_lead_claims_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "client_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_lead_claims_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "rep_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_reps: {
        Row: {
          can_manage_firm_pipeline: boolean
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string | null
          role: string
          portal_pages: string[] | null
          sales_only: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          can_manage_firm_pipeline?: boolean
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          role?: string
          portal_pages?: string[] | null
          sales_only?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          can_manage_firm_pipeline?: boolean
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          role?: string
          portal_pages?: string[] | null
          sales_only?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sales_session_visits: {
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
            foreignKeyName: "sales_session_visits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "client_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_session_visits_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "rep_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_messages: {
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
            foreignKeyName: "sms_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "client_leads"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "sms_threads_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "client_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      firm_conversation_overview: {
        Row: {
          application_id: string | null
          last_activity_at: string | null
          preview: string | null
          unread_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      set_up_firm_portal: {
        Args: { p_application_id: string }
        Returns: { firm_id: string; created: boolean }[]
      }
      sync_firm_calendly_booking: {
        Args: {
          p_application_id: string
          p_expected_email: string
          p_expected_stage: string
          p_checked_at: string
          p_event_uri: string | null
          p_start_at: string | null
          p_end_at: string | null
        }
        Returns: string
      }
      activate_firm_offer_pack: {
        Args: { _firm_id: string; _offer_id: string }
        Returns: string
      }
      claim_sales_lead: {
        Args: {
          p_preferred_lead_id?: string
          p_previous_lead_id?: string
          p_session_id: string
        }
        Returns: string
      }
      current_firm_id: { Args: never; Returns: string }
      current_sales_rep_id: { Args: never; Returns: string }
      firm_name_key: { Args: { p: string }; Returns: string }
      firm_offer_rate_limit: { Args: { _key: string }; Returns: boolean }
      firm_phone_key: { Args: { value: string }; Returns: string }
      get_firm_pack_balance: { Args: { _firm_id: string }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_sales_role: { Args: never; Returns: boolean }
      is_admin_user: { Args: never; Returns: boolean }
      is_firm_user_for: { Args: { _firm_id: string }; Returns: boolean }
      is_phone_suppressed: { Args: { p: string }; Returns: boolean }
      can_manage_firm_pipeline: { Args: never; Returns: boolean }
      current_portal_access: { Args: never; Returns: Json }
      can_access_portal_page: { Args: { p_page: string }; Returns: boolean }
      list_staff_portal_access: { Args: never; Returns: { id: string; user_id: string | null; name: string | null; email: string | null; role: string; is_active: boolean; pages: string[] }[] }
      set_staff_portal_pages: { Args: { p_rep_id: string; p_pages: string[] }; Returns: undefined }
      is_sales_only_user: { Args: never; Returns: boolean }
      is_service_or_admin: { Args: never; Returns: boolean }
      match_firm_application: { Args: { p_phone: string }; Returns: string }
      normalize_phone: { Args: { p: string }; Returns: string }
      renew_sales_lead: {
        Args: { p_lead_id: string; p_session_id: string }
        Returns: boolean
      }
      sales_booking_times: {
        Args: { p_firm_id: string }
        Returns: {
          appointment_date: string
          appointment_time: string
        }[]
      }
      sales_queue_rep: { Args: { p_session_id: string }; Returns: string }
      save_firm_call_sheet: {
        Args: { p_application_id: string; p_patch: Json }
        Returns: undefined
      }
      save_firm_offer: {
        Args: {
          _expires_at?: string
          _id: string
          _snapshot: Json
          _token_hash?: string
          _version: number
        }
        Returns: boolean
      }
      update_firm_sms_status: {
        Args: {
          p_error?: string
          p_id: string
          p_sid: string
          p_status: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
