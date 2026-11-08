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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      coin_orders: {
        Row: {
          amount_cents: number
          coins: number
          created_at: string
          id: string
          livemode: boolean
          package_id: string
          paid_at: string | null
          provider_payment_id: string | null
          status: string
          wallet_id: string
        }
        Insert: {
          amount_cents: number
          coins: number
          created_at?: string
          id?: string
          livemode: boolean
          package_id: string
          paid_at?: string | null
          provider_payment_id?: string | null
          status?: string
          wallet_id: string
        }
        Update: {
          amount_cents?: number
          coins?: number
          created_at?: string
          id?: string
          livemode?: boolean
          package_id?: string
          paid_at?: string | null
          provider_payment_id?: string | null
          status?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_orders_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "voice_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_entries: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          suspended_at: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          suspended_at?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          suspended_at?: string | null
          token_hash?: string
        }
        Relationships: []
      }
      voice_reports: {
        Row: {
          created_at: string
          details: string
          id: string
          reason: string
          reported_session: string
          reporter_session: string
          request_hash: string
          room_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string
          id?: string
          reason: string
          reported_session: string
          reporter_session: string
          request_hash: string
          room_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          reason?: string
          reported_session?: string
          reporter_session?: string
          request_hash?: string
          room_id?: string
          status?: string
        }
        Relationships: []
      }
      voice_room_entries: {
        Row: {
          entry_id: string
          peer_id: string
          room_id: string
        }
        Insert: {
          entry_id: string
          peer_id: string
          room_id: string
        }
        Update: {
          entry_id?: string
          peer_id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_room_entries_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "voice_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_room_entries_peer_id_fkey"
            columns: ["peer_id"]
            isOneToOne: false
            referencedRelation: "voice_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_wallets: {
        Row: {
          checkin_day: number
          created_at: string
          id: string
          last_checkin_date: string | null
          last_seen_at: string
          nickname: string
          paid_coins: number
          promo_coins: number
          token_hash: string
        }
        Insert: {
          checkin_day?: number
          created_at?: string
          id?: string
          last_checkin_date?: string | null
          last_seen_at?: string
          nickname: string
          paid_coins?: number
          promo_coins?: number
          token_hash: string
        }
        Update: {
          checkin_day?: number
          created_at?: string
          id?: string
          last_checkin_date?: string | null
          last_seen_at?: string
          nickname?: string
          paid_coins?: number
          promo_coins?: number
          token_hash?: string
        }
        Relationships: []
      }
      wallet_rewards: {
        Row: {
          coins: number
          created_at: string
          id: string
          reference: string
          source: string
          wallet_id: string
        }
        Insert: {
          coins: number
          created_at?: string
          id?: string
          reference: string
          source: string
          wallet_id: string
        }
        Update: {
          coins?: number
          created_at?: string
          id?: string
          reference?: string
          source?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_rewards_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "voice_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      checkin_reward: { Args: { p_day: number }; Returns: number }
      claim_daily_checkin: { Args: { p_token_hash: string }; Returns: Json }
      credit_coin_order: {
        Args: {
          p_amount_cents: number
          p_livemode: boolean
          p_payment_id: string
        }
        Returns: boolean
      }
      register_voice_room: {
        Args: {
          p_entry: string
          p_hash: string
          p_peer: string
          p_room: string
        }
        Returns: boolean
      }
      rewarded_video_coins: { Args: { p_seconds: number }; Returns: number }
      spend_search_coin: {
        Args: { _token_hash: string }
        Returns: {
          ok: boolean
          paid: number
          promo: number
        }[]
      }
      submit_voice_report: {
        Args: {
          p_details: string
          p_hash: string
          p_reason: string
          p_reporter: string
          p_room: string
          p_target: string
        }
        Returns: string
      }
      warn_voice_entry: {
        Args: {
          p_details: string
          p_reason: string
          p_reporter: string
          p_request_hash: string
          p_room: string
          p_target: string
          p_token_hash: string
        }
        Returns: boolean
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
    Enums: {},
  },
} as const
