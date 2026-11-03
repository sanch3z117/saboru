export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      campus_blocks: {
        Row: {
          created_at: string;
          id: string;
          location: unknown;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          location: unknown;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          location?: unknown;
          name?: string;
        };
        Relationships: [];
      };
      establishments: {
        Row: {
          address: string;
          category: string;
          created_at: string;
          description: string;
          id: string;
          location: unknown;
          name: string;
          owner_id: string | null;
          photos: string[];
          plan: Database["public"]["Enums"]["establishment_plan"];
          schedule: NonNullable<Json>;
          slug: string;
          status: Database["public"]["Enums"]["establishment_status"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string;
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          location: unknown;
          name: string;
          owner_id?: string | null;
          photos?: string[];
          plan?: Database["public"]["Enums"]["establishment_plan"];
          schedule?: NonNullable<Json>;
          slug: string;
          status?: Database["public"]["Enums"]["establishment_status"];
          updated_at?: string;
        };
        Update: {
          address?: string;
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          location?: unknown;
          name?: string;
          owner_id?: string | null;
          photos?: string[];
          plan?: Database["public"]["Enums"]["establishment_plan"];
          schedule?: NonNullable<Json>;
          slug?: string;
          status?: Database["public"]["Enums"]["establishment_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "establishments_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      favorites: {
        Row: {
          created_at: string;
          establishment_id: string;
          id: string;
          product_id: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          establishment_id: string;
          id?: string;
          product_id?: string | null;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          establishment_id?: string;
          id?: string;
          product_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "favorites_establishment_id_fkey";
            columns: ["establishment_id"];
            isOneToOne: false;
            referencedRelation: "establishments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_establishment_id_fkey";
            columns: ["establishment_id"];
            isOneToOne: false;
            referencedRelation: "public_establishments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "favorites_product_establishment_fkey";
            columns: ["product_id", "establishment_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id", "establishment_id"];
          },
          {
            foreignKeyName: "favorites_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      product_views: {
        Row: {
          created_at: string;
          id: string;
          product_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          product_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          allergens: string[];
          available: boolean;
          category: string;
          created_at: string;
          description: string;
          establishment_id: string;
          id: string;
          name: string;
          photo_url: string | null;
          price_cop: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          allergens?: string[];
          available?: boolean;
          category?: string;
          created_at?: string;
          description?: string;
          establishment_id: string;
          id?: string;
          name: string;
          photo_url?: string | null;
          price_cop: number;
          updated_at?: string;
        };
        Update: {
          allergens?: string[];
          available?: boolean;
          category?: string;
          created_at?: string;
          description?: string;
          establishment_id?: string;
          id?: string;
          name?: string;
          photo_url?: string | null;
          price_cop?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_establishment_id_fkey";
            columns: ["establishment_id"];
            isOneToOne: false;
            referencedRelation: "establishments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_establishment_id_fkey";
            columns: ["establishment_id"];
            isOneToOne: false;
            referencedRelation: "public_establishments";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          role: Database["public"]["Enums"]["user_role"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          email: string;
          full_name?: string;
          id: string;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Update: {
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Relationships: [];
      };
      review_reports: {
        Row: {
          client_id: string;
          created_at: string;
          id: string;
          reason: string;
          reporter_id: string;
          review_id: string;
          status: Database["public"]["Enums"]["report_status"];
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          created_at?: string;
          id?: string;
          reason: string;
          reporter_id?: string;
          review_id: string;
          status?: Database["public"]["Enums"]["report_status"];
        };
        Update: {
          client_id?: string;
          created_at?: string;
          id?: string;
          reason?: string;
          reporter_id?: string;
          review_id?: string;
          status?: Database["public"]["Enums"]["report_status"];
        };
        Relationships: [
          {
            foreignKeyName: "review_reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_reports_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "public_reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_reports_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          client_id: string;
          comment: string | null;
          created_at: string;
          establishment_id: string;
          id: string;
          product_id: string;
          rating_calidad_precio: number;
          rating_cantidad: number;
          rating_precio: number;
          rating_presentacion: number;
          rating_sabor: number;
          status: Database["public"]["Enums"]["review_status"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          client_id: string;
          comment?: string | null;
          created_at?: string;
          establishment_id: string;
          id?: string;
          product_id: string;
          rating_calidad_precio: number;
          rating_cantidad: number;
          rating_precio: number;
          rating_presentacion: number;
          rating_sabor: number;
          status?: Database["public"]["Enums"]["review_status"];
          user_id: string;
        };
        Update: {
          client_id?: string;
          comment?: string | null;
          created_at?: string;
          establishment_id?: string;
          id?: string;
          product_id?: string;
          rating_calidad_precio?: number;
          rating_cantidad?: number;
          rating_precio?: number;
          rating_presentacion?: number;
          rating_sabor?: number;
          status?: Database["public"]["Enums"]["review_status"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_product_establishment_fkey";
            columns: ["product_id", "establishment_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id", "establishment_id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      search_events: {
        Row: {
          block_id: string | null;
          budget: number | null;
          category: string | null;
          created_at: string;
          id: string;
        };
        ComputedFields: never;
        Insert: {
          block_id?: string | null;
          budget?: number | null;
          category?: string | null;
          created_at?: string;
          id?: string;
        };
        Update: {
          block_id?: string | null;
          budget?: number | null;
          category?: string | null;
          created_at?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "search_events_block_id_fkey";
            columns: ["block_id"];
            isOneToOne: false;
            referencedRelation: "campus_blocks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "search_events_block_id_fkey";
            columns: ["block_id"];
            isOneToOne: false;
            referencedRelation: "public_blocks";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_invites: {
        Row: {
          accepted_at: string | null;
          accepted_by: string | null;
          created_at: string;
          email: string;
          establishment_id: string;
          expires_at: string;
          id: string;
          invited_by: string;
        };
        ComputedFields: never;
        Insert: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email: string;
          establishment_id: string;
          expires_at?: string;
          id?: string;
          invited_by: string;
        };
        Update: {
          accepted_at?: string | null;
          accepted_by?: string | null;
          created_at?: string;
          email?: string;
          establishment_id?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_invites_accepted_by_fkey";
            columns: ["accepted_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendor_invites_establishment_id_fkey";
            columns: ["establishment_id"];
            isOneToOne: false;
            referencedRelation: "establishments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendor_invites_establishment_id_fkey";
            columns: ["establishment_id"];
            isOneToOne: false;
            referencedRelation: "public_establishments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendor_invites_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      product_stats: {
        Row: {
          avg_calidad_precio: number | null;
          avg_cantidad: number | null;
          avg_precio: number | null;
          avg_presentacion: number | null;
          avg_sabor: number | null;
          product_id: string;
          review_count: number | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      public_blocks: {
        Row: {
          id: string;
          latitude: number | null;
          longitude: number | null;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string | null;
          latitude?: never;
          longitude?: never;
          name?: string | null;
        };
        Update: {
          id?: string | null;
          latitude?: never;
          longitude?: never;
          name?: string | null;
        };
        Relationships: [];
      };
      public_establishments: {
        Row: {
          address: string;
          category: string;
          description: string;
          id: string;
          latitude: number | null;
          longitude: number | null;
          name: string;
          photos: string[];
          plan: Database["public"]["Enums"]["establishment_plan"];
          schedule: NonNullable<Json>;
          slug: string;
          status: Database["public"]["Enums"]["establishment_status"];
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          category?: string | null;
          description?: string | null;
          id?: string | null;
          latitude?: never;
          longitude?: never;
          name?: string | null;
          photos?: string[] | null;
          plan?: Database["public"]["Enums"]["establishment_plan"] | null;
          schedule?: Json | null;
          slug?: string | null;
          status?: Database["public"]["Enums"]["establishment_status"] | null;
        };
        Update: {
          address?: string | null;
          category?: string | null;
          description?: string | null;
          id?: string | null;
          latitude?: never;
          longitude?: never;
          name?: string | null;
          photos?: string[] | null;
          plan?: Database["public"]["Enums"]["establishment_plan"] | null;
          schedule?: Json | null;
          slug?: string | null;
          status?: Database["public"]["Enums"]["establishment_status"] | null;
        };
        Relationships: [];
      };
      public_reviews: {
        Row: {
          comment: string | null;
          created_at: string;
          establishment_id: string;
          id: string;
          product_id: string;
          rating_calidad_precio: number;
          rating_cantidad: number;
          rating_precio: number;
          rating_presentacion: number;
          rating_sabor: number;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "reviews_product_establishment_fkey";
            columns: ["product_id", "establishment_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id", "establishment_id"];
          },
        ];
      };
    };
    Functions: {
      admin_create_vendor_invite: {
        Args: { p_email: string; p_establishment_id: string };
        Returns: string;
      };
      admin_resolve_report: {
        Args: {
          p_report_id: string;
          p_status: Database["public"]["Enums"]["report_status"];
        };
        Returns: undefined;
      };
      admin_set_establishment_plan: {
        Args: {
          p_establishment_id: string;
          p_plan: Database["public"]["Enums"]["establishment_plan"];
        };
        Returns: undefined;
      };
      admin_set_establishment_status: {
        Args: {
          p_establishment_id: string;
          p_status: Database["public"]["Enums"]["establishment_status"];
        };
        Returns: undefined;
      };
      admin_set_review_status: {
        Args: {
          p_review_id: string;
          p_status: Database["public"]["Enums"]["review_status"];
        };
        Returns: undefined;
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_institutional_student: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      log_product_view: { Args: { p_product_id: string }; Returns: undefined };
      log_search: {
        Args: { p_block_id: string; p_budget: number; p_category: string };
        Returns: undefined;
      };
      min_reviews_for_stats: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      search_products: {
        Args: {
          p_block_id: string;
          p_budget: number;
          p_category: string;
          p_radius_m: number;
        };
        Returns: {
          allergens: string[];
          available: boolean;
          category: string;
          description: string;
          distance_m: number;
          establishment_id: string;
          establishment_name: string;
          establishment_schedule: Json;
          establishment_slug: string;
          id: string;
          name: string;
          photo_url: string;
          price_cop: number;
        }[];
      };
      vendor_campus_comparison: {
        Args: { p_establishment_id: string };
        Returns: {
          campus_avg: number;
          local_avg: number;
          local_review_count: number;
        }[];
      };
      vendor_product_stats: {
        Args: { p_establishment_id: string };
        Returns: {
          avg_calidad_precio: number;
          avg_cantidad: number;
          avg_precio: number;
          avg_presentacion: number;
          avg_sabor: number;
          product_id: string;
          review_count: number;
        }[];
      };
      vendor_recent_comments: {
        Args: { p_establishment_id: string };
        Returns: {
          comment: string;
          created_at: string;
          product_id: string;
          product_name: string;
          rating_calidad_precio: number;
          rating_cantidad: number;
          rating_precio: number;
          rating_presentacion: number;
          rating_sabor: number;
        }[];
      };
      vendor_top_products: {
        Args: { p_establishment_id: string };
        Returns: {
          name: string;
          product_id: string;
          view_count: number;
        }[];
      };
      vendor_views_by_hour: {
        Args: { p_establishment_id: string };
        Returns: {
          hour: number;
          view_count: number;
        }[];
      };
    };
    Enums: {
      establishment_plan: "basic" | "featured" | "pro";
      establishment_status: "draft" | "pending" | "active" | "suspended";
      report_status: "open" | "reviewed" | "dismissed";
      review_status: "published" | "pending" | "hidden";
      user_role: "student" | "vendor" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      establishment_plan: ["basic", "featured", "pro"],
      establishment_status: ["draft", "pending", "active", "suspended"],
      report_status: ["open", "reviewed", "dismissed"],
      review_status: ["published", "pending", "hidden"],
      user_role: ["student", "vendor", "admin"],
    },
  },
} as const;
