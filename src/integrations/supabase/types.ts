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
      call_records: {
        Row: {
          call_analysis: Json | null
          called_at: string
          client_id: string | null
          clinic_id: string | null
          created_at: string
          duration: number | null
          id: string
          needs_review: boolean
          recording_sid: string | null
          recording_url: string | null
          status: string | null
          twilio_call_sid: string | null
          updated_at: string
        }
        Insert: {
          call_analysis?: Json | null
          called_at?: string
          client_id?: string | null
          clinic_id?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          needs_review?: boolean
          recording_sid?: string | null
          recording_url?: string | null
          status?: string | null
          twilio_call_sid?: string | null
          updated_at?: string
        }
        Update: {
          call_analysis?: Json | null
          called_at?: string
          client_id?: string | null
          clinic_id?: string | null
          created_at?: string
          duration?: number | null
          id?: string
          needs_review?: boolean
          recording_sid?: string | null
          recording_url?: string | null
          status?: string | null
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
      clinics: {
        Row: {
          city: string | null
          clinic_name: string
          created_at: string
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
          city?: string | null
          clinic_name: string
          created_at?: string
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
          city?: string | null
          clinic_name?: string
          created_at?: string
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
          status: string
        }
        Insert: {
          clinic_name: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          package_name: string
          status?: string
        }
        Update: {
          clinic_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          package_name?: string
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
      sms_messages: {
        Row: {
          body: string | null
          created_at: string
          direction: string
          error_code: string | null
          from_number: string | null
          id: string
          media_urls: Json
          status: string | null
          thread_id: string
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
          media_urls?: Json
          status?: string | null
          thread_id: string
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
          media_urls?: Json
          status?: string | null
          thread_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_dashboard_stats: { Args: never; Returns: Json }
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
