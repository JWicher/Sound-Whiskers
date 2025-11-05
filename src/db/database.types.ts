export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_sessions: {
        Row: {
          cost: number
          created_at: string
          id: string
          prompt: string
          status: Database["public"]["Enums"]["ai_status_enum"]
          user_id: string
        }
        Insert: {
          cost: number
          created_at?: string
          id?: string
          prompt: string
          status: Database["public"]["Enums"]["ai_status_enum"]
          user_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          prompt?: string
          status?: Database["public"]["Enums"]["ai_status_enum"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ai_sessions_2025_10: {
        Row: {
          cost: number
          created_at: string
          id: string
          prompt: string
          status: Database["public"]["Enums"]["ai_status_enum"]
          user_id: string
        }
        Insert: {
          cost: number
          created_at?: string
          id?: string
          prompt: string
          status: Database["public"]["Enums"]["ai_status_enum"]
          user_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          prompt?: string
          status?: Database["public"]["Enums"]["ai_status_enum"]
          user_id?: string
        }
        Relationships: []
      }
      ai_sessions_2025_11: {
        Row: {
          cost: number
          created_at: string
          id: string
          prompt: string
          status: Database["public"]["Enums"]["ai_status_enum"]
          user_id: string
        }
        Insert: {
          cost: number
          created_at?: string
          id?: string
          prompt: string
          status: Database["public"]["Enums"]["ai_status_enum"]
          user_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          prompt?: string
          status?: Database["public"]["Enums"]["ai_status_enum"]
          user_id?: string
        }
        Relationships: []
      }
      ai_sessions_2025_12: {
        Row: {
          cost: number
          created_at: string
          id: string
          prompt: string
          status: Database["public"]["Enums"]["ai_status_enum"]
          user_id: string
        }
        Insert: {
          cost: number
          created_at?: string
          id?: string
          prompt: string
          status: Database["public"]["Enums"]["ai_status_enum"]
          user_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          prompt?: string
          status?: Database["public"]["Enums"]["ai_status_enum"]
          user_id?: string
        }
        Relationships: []
      }
      ai_sessions_2026_01: {
        Row: {
          cost: number
          created_at: string
          id: string
          prompt: string
          status: Database["public"]["Enums"]["ai_status_enum"]
          user_id: string
        }
        Insert: {
          cost: number
          created_at?: string
          id?: string
          prompt: string
          status: Database["public"]["Enums"]["ai_status_enum"]
          user_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          id?: string
          prompt?: string
          status?: Database["public"]["Enums"]["ai_status_enum"]
          user_id?: string
        }
        Relationships: []
      }
      playlist_tracks: {
        Row: {
          added_at: string
          album: string
          artist: string
          is_deleted: boolean
          playlist_id: string
          position: number
          title: string
          track_uri: string
        }
        Insert: {
          added_at?: string
          album: string
          artist: string
          is_deleted?: boolean
          playlist_id: string
          position: number
          title: string
          track_uri: string
        }
        Update: {
          added_at?: string
          album?: string
          artist?: string
          is_deleted?: boolean
          playlist_id?: string
          position?: number
          title?: string
          track_uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_deleted: boolean
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_deleted?: boolean
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_deleted?: boolean
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlists_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          plan: Database["public"]["Enums"]["plan_type"]
          pro_expires_at: string | null
          stripe_customer_id: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          pro_expires_at?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          pro_expires_at?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      spotify_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spotify_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_next_ai_sessions_partition: { Args: never; Returns: undefined }
      get_ai_usage_summary: {
        Args: { p_end_date?: string; p_start_date?: string; p_user_id: string }
        Returns: {
          failed_count: number
          succeeded_count: number
          success_rate: number
          timeout_count: number
          total_cost: number
          total_sessions: number
        }[]
      }
      get_spotify_tokens: {
        Args: { p_encryption_key: string; p_user_id: string }
        Returns: {
          access_token: string
          expires_at: string
          refresh_token: string
        }[]
      }
      log_ai_session: {
        Args: {
          p_cost: number
          p_prompt: string
          p_status: Database["public"]["Enums"]["ai_status_enum"]
          p_user_id: string
        }
        Returns: string
      }
      store_spotify_tokens: {
        Args: {
          p_access_token: string
          p_encryption_key: string
          p_expires_at: string
          p_refresh_token: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      ai_status_enum: "succeeded" | "failed" | "timeout"
      plan_type: "free" | "pro"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ai_status_enum: ["succeeded", "failed", "timeout"],
      plan_type: ["free", "pro"],
    },
  },
} as const

