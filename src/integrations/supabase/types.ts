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
      applications: {
        Row: {
          admin_notes: string | null
          created_at: string
          decided_at: string | null
          email: string
          employer: string | null
          experience: Database["public"]["Enums"]["investment_experience"]
          full_name: string
          id: string
          id_number: string
          motivation: string
          occupation: string
          phone: string
          referral: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          status_updated_at: string
          submitted_at: string
          tier: Database["public"]["Enums"]["membership_tier"]
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          decided_at?: string | null
          email: string
          employer?: string | null
          experience: Database["public"]["Enums"]["investment_experience"]
          full_name: string
          id?: string
          id_number: string
          motivation: string
          occupation: string
          phone: string
          referral?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          status_updated_at?: string
          submitted_at?: string
          tier: Database["public"]["Enums"]["membership_tier"]
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          decided_at?: string | null
          email?: string
          employer?: string | null
          experience?: Database["public"]["Enums"]["investment_experience"]
          full_name?: string
          id?: string
          id_number?: string
          motivation?: string
          occupation?: string
          phone?: string
          referral?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          status_updated_at?: string
          submitted_at?: string
          tier?: Database["public"]["Enums"]["membership_tier"]
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          reason: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          reason?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          is_archived: boolean
          is_read: boolean
          message: string
          name: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_archived?: boolean
          is_read?: boolean
          message: string
          name: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_archived?: boolean
          is_read?: boolean
          message?: string
          name?: string
          subject?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          file_path: string
          folder: string
          id: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          uploaded_by: string | null
          visibility: string
        }
        Insert: {
          created_at?: string
          file_path: string
          folder?: string
          id?: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          uploaded_by?: string | null
          visibility?: string
        }
        Update: {
          created_at?: string
          file_path?: string
          folder?: string
          id?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          uploaded_by?: string | null
          visibility?: string
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          created_at: string
          email: string
          event_id: string
          full_name: string
          id: string
          phone: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          event_id: string
          full_name: string
          id?: string
          phone?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          event_id?: string
          full_name?: string
          id?: string
          phone?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          description: string
          event_date: string
          event_time: string | null
          event_type: string
          id: string
          image_url: string | null
          location: string
          max_attendees: number | null
          published: boolean
          registration_deadline: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          event_date: string
          event_time?: string | null
          event_type?: string
          id?: string
          image_url?: string | null
          location: string
          max_attendees?: number | null
          published?: boolean
          registration_deadline?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          event_date?: string
          event_time?: string | null
          event_type?: string
          id?: string
          image_url?: string | null
          location?: string
          max_attendees?: number | null
          published?: boolean
          registration_deadline?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      membership_tiers: {
        Row: {
          active: boolean
          benefits: Json
          featured: boolean
          id: string
          name: string
          price_zar: number
          tier: Database["public"]["Enums"]["membership_tier"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          benefits?: Json
          featured?: boolean
          id?: string
          name: string
          price_zar?: number
          tier: Database["public"]["Enums"]["membership_tier"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          benefits?: Json
          featured?: boolean
          id?: string
          name?: string
          price_zar?: number
          tier?: Database["public"]["Enums"]["membership_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          author_name: string | null
          category: string
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          category?: string
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          category?: string
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_webhook_events: {
        Row: {
          created_at: string
          error: string | null
          id: string
          last_retry_at: string | null
          m_payment_id: string | null
          payload: Json
          payment_id: string | null
          pf_payment_id: string | null
          processed: boolean
          provider: string
          retry_count: number
          signature_valid: boolean
          source_ip: string | null
          source_valid: boolean
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          last_retry_at?: string | null
          m_payment_id?: string | null
          payload: Json
          payment_id?: string | null
          pf_payment_id?: string | null
          processed?: boolean
          provider?: string
          retry_count?: number
          signature_valid?: boolean
          source_ip?: string | null
          source_valid?: boolean
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          last_retry_at?: string | null
          m_payment_id?: string | null
          payload?: Json
          payment_id?: string | null
          pf_payment_id?: string | null
          processed?: boolean
          provider?: string
          retry_count?: number
          signature_valid?: boolean
          source_ip?: string | null
          source_valid?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "payment_webhook_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          application_id: string | null
          created_at: string
          currency: string
          email: string | null
          full_name: string | null
          id: string
          m_payment_id: string
          paid_at: string | null
          pf_payment_id: string | null
          provider: string
          raw_payload: Json | null
          status: string
          tier: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          application_id?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          full_name?: string | null
          id?: string
          m_payment_id: string
          paid_at?: string | null
          pf_payment_id?: string | null
          provider?: string
          raw_payload?: Json | null
          status?: string
          tier: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          application_id?: string | null
          created_at?: string
          currency?: string
          email?: string | null
          full_name?: string | null
          id?: string
          m_payment_id?: string
          paid_at?: string | null
          pf_payment_id?: string | null
          provider?: string
          raw_payload?: Json | null
          status?: string
          tier?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          body: string | null
          cover_image: string | null
          created_at: string
          id: string
          member_id: string | null
          slug: string
          social_links: Json
          sort_order: number
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          cover_image?: string | null
          created_at?: string
          id?: string
          member_id?: string | null
          slug: string
          social_links?: Json
          sort_order?: number
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          cover_image?: string | null
          created_at?: string
          id?: string
          member_id?: string | null
          slug?: string
          social_links?: Json
          sort_order?: number
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          joined_at: string | null
          last_payment_at: string | null
          membership_expires_at: string | null
          membership_status: string
          membership_tier: Database["public"]["Enums"]["membership_tier"] | null
          suspended: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          joined_at?: string | null
          last_payment_at?: string | null
          membership_expires_at?: string | null
          membership_status?: string
          membership_tier?:
            | Database["public"]["Enums"]["membership_tier"]
            | null
          suspended?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          joined_at?: string | null
          last_payment_at?: string | null
          membership_expires_at?: string | null
          membership_status?: string
          membership_tier?:
            | Database["public"]["Enums"]["membership_tier"]
            | null
          suspended?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      team_members: {
        Row: {
          active: boolean
          bio: string | null
          category: string | null
          committee: string | null
          committee_order: number
          committee_position: string | null
          contact_email: string | null
          created_at: string
          expertise: string[] | null
          id: string
          linkedin_url: string | null
          location: string | null
          name: string
          order_index: number
          photo_url: string | null
          portfolio_images: string[]
          profile_card_url: string | null
          published: boolean
          social_url: string | null
          title: string
          updated_at: string
          website: string | null
        }
        Insert: {
          active?: boolean
          bio?: string | null
          category?: string | null
          committee?: string | null
          committee_order?: number
          committee_position?: string | null
          contact_email?: string | null
          created_at?: string
          expertise?: string[] | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          name: string
          order_index?: number
          photo_url?: string | null
          portfolio_images?: string[]
          profile_card_url?: string | null
          published?: boolean
          social_url?: string | null
          title: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          active?: boolean
          bio?: string | null
          category?: string | null
          committee?: string | null
          committee_order?: number
          committee_position?: string | null
          contact_email?: string | null
          created_at?: string
          expertise?: string[] | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          name?: string
          order_index?: number
          photo_url?: string | null
          portfolio_images?: string[]
          profile_card_url?: string | null
          published?: boolean
          social_url?: string | null
          title?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member"
      application_status: "pending" | "under_review" | "approved" | "rejected"
      investment_experience: "beginner" | "intermediate" | "advanced"
      membership_tier: "general" | "active" | "patron"
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
      app_role: ["admin", "member"],
      application_status: ["pending", "under_review", "approved", "rejected"],
      investment_experience: ["beginner", "intermediate", "advanced"],
      membership_tier: ["general", "active", "patron"],
    },
  },
} as const
