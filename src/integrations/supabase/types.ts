export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      account_transfers: {
        Row: {
          amount: number
          conversion_rate: number
          created_at: string
          from_account_id: string
          id: string
          note: string | null
          to_account_id: string
        }
        Insert: {
          amount: number
          conversion_rate?: number
          created_at?: string
          from_account_id: string
          id?: string
          note?: string | null
          to_account_id: string
        }
        Update: {
          amount?: number
          conversion_rate?: number
          created_at?: string
          from_account_id?: string
          id?: string
          note?: string | null
          to_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_transfers_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transfers_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          currency: Database["public"]["Enums"]["currency_type"]
          id: string
          initial_balance: number
          location_access: string[]
          name: string
        }
        Insert: {
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          initial_balance?: number
          location_access?: string[]
          name: string
        }
        Update: {
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          initial_balance?: number
          location_access?: string[]
          name?: string
        }
        Relationships: []
      }
      booking_payments: {
        Row: {
          account_id: string
          amount: number
          booking_id: string
          created_at: string
          id: string
          is_advance: boolean
          note: string | null
          payment_method: string
        }
        Insert: {
          account_id: string
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          is_advance?: boolean
          note?: string | null
          payment_method: string
        }
        Update: {
          account_id?: string
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          is_advance?: boolean
          note?: string | null
          payment_method?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_sync_urls: {
        Row: {
          created_at: string
          ical_url: string
          id: string
          last_synced_at: string | null
          location_id: string
          source: string
        }
        Insert: {
          created_at?: string
          ical_url: string
          id?: string
          last_synced_at?: string | null
          location_id: string
          source: string
        }
        Update: {
          created_at?: string
          ical_url?: string
          id?: string
          last_synced_at?: string | null
          location_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_sync_urls_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          advance_amount: number
          check_in: string
          check_out: string
          created_at: string
          guest_name: string
          id: string
          location_id: string
          paid_amount: number
          source: Database["public"]["Enums"]["booking_source"]
          status: Database["public"]["Enums"]["booking_status"]
          total_amount: number
        }
        Insert: {
          advance_amount?: number
          check_in: string
          check_out: string
          created_at?: string
          guest_name: string
          id?: string
          location_id: string
          paid_amount?: number
          source: Database["public"]["Enums"]["booking_source"]
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount: number
        }
        Update: {
          advance_amount?: number
          check_in?: string
          check_out?: string
          created_at?: string
          guest_name?: string
          id?: string
          location_id?: string
          paid_amount?: number
          source?: Database["public"]["Enums"]["booking_source"]
          status?: Database["public"]["Enums"]["booking_status"]
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_types: {
        Row: {
          created_at: string
          id: string
          main_type: string
          sub_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          main_type: string
          sub_type: string
        }
        Update: {
          created_at?: string
          id?: string
          main_type?: string
          sub_type?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          date: string
          id: string
          location_id: string
          main_type: string
          note: string | null
          sub_type: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          date?: string
          id?: string
          location_id: string
          main_type: string
          note?: string | null
          sub_type: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          date?: string
          id?: string
          location_id?: string
          main_type?: string
          note?: string | null
          sub_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      income: {
        Row: {
          account_id: string
          amount: number
          booking_id: string | null
          created_at: string
          date: string
          id: string
          is_advance: boolean
          location_id: string
          note: string | null
          payment_method: string
          type: Database["public"]["Enums"]["income_type"]
        }
        Insert: {
          account_id: string
          amount: number
          booking_id?: string | null
          created_at?: string
          date?: string
          id?: string
          is_advance?: boolean
          location_id: string
          note?: string | null
          payment_method: string
          type: Database["public"]["Enums"]["income_type"]
        }
        Update: {
          account_id?: string
          amount?: number
          booking_id?: string | null
          created_at?: string
          date?: string
          id?: string
          is_advance?: boolean
          location_id?: string
          note?: string | null
          payment_method?: string
          type?: Database["public"]["Enums"]["income_type"]
        }
        Relationships: [
          {
            foreignKeyName: "income_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "income_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      income_types: {
        Row: {
          created_at: string
          id: string
          type_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          type_name: string
        }
        Update: {
          created_at?: string
          id?: string
          type_name?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      monthly_rent_payments: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          id: string
          location_id: string
          month: number
          year: number
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          id?: string
          location_id: string
          month: number
          year: number
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          id?: string
          location_id?: string
          month?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_rent_payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_rent_payments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          access_calendar: boolean
          access_dashboard: boolean
          access_expenses: boolean
          access_income: boolean
          access_reports: boolean
          created_at: string
          id: string
          location_id: string
          user_id: string
        }
        Insert: {
          access_calendar?: boolean
          access_dashboard?: boolean
          access_expenses?: boolean
          access_income?: boolean
          access_reports?: boolean
          created_at?: string
          id?: string
          location_id: string
          user_id: string
        }
        Update: {
          access_calendar?: boolean
          access_dashboard?: boolean
          access_expenses?: boolean
          access_income?: boolean
          access_reports?: boolean
          created_at?: string
          id?: string
          location_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clear_location_bookings: {
        Args: { p_location_id: string }
        Returns: number
      }
      sync_ical_bookings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      booking_source: "airbnb" | "booking_com" | "direct"
      booking_status: "pending" | "confirmed" | "settled"
      currency_type: "LKR" | "USD"
      income_type: "booking" | "laundry" | "food" | "other"
      user_role: "admin" | "staff"
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
      booking_source: ["airbnb", "booking_com", "direct"],
      booking_status: ["pending", "confirmed", "settled"],
      currency_type: ["LKR", "USD"],
      income_type: ["booking", "laundry", "food", "other"],
      user_role: ["admin", "staff"],
    },
  },
} as const
