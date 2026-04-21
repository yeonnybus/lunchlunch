export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          source: string;
          source_id: string;
          name: string;
          category: string | null;
          phone: string | null;
          address: string | null;
          road_address: string | null;
          lat: number | null;
          lng: number | null;
          region: string;
          menus: string[] | null;
          rating: number | null;
          review_count: number | null;
          price_tier: string | null;
          premium_risk_score: number;
          cuisine_tags: string[] | null;
          raw: Json | null;
          last_crawled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          source?: string;
          source_id: string;
          name: string;
          category?: string | null;
          phone?: string | null;
          address?: string | null;
          road_address?: string | null;
          lat?: number | null;
          lng?: number | null;
          region: string;
          menus?: string[] | null;
          rating?: number | null;
          review_count?: number | null;
          price_tier?: string | null;
          premium_risk_score?: number;
          cuisine_tags?: string[] | null;
          raw?: Json | null;
          last_crawled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          source?: string;
          source_id?: string;
          name?: string;
          category?: string | null;
          phone?: string | null;
          address?: string | null;
          road_address?: string | null;
          lat?: number | null;
          lng?: number | null;
          region?: string;
          menus?: string[] | null;
          rating?: number | null;
          review_count?: number | null;
          price_tier?: string | null;
          premium_risk_score?: number;
          cuisine_tags?: string[] | null;
          raw?: Json | null;
          last_crawled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      crawl_jobs: {
        Row: {
          id: string;
          region: string;
          query: string;
          status: string;
          started_at: string | null;
          ended_at: string | null;
          total_collected: number;
          total_upserted: number;
          error_message: string | null;
          triggered_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          region: string;
          query: string;
          status: string;
          started_at?: string | null;
          ended_at?: string | null;
          total_collected?: number;
          total_upserted?: number;
          error_message?: string | null;
          triggered_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          region?: string;
          query?: string;
          status?: string;
          started_at?: string | null;
          ended_at?: string | null;
          total_collected?: number;
          total_upserted?: number;
          error_message?: string | null;
          triggered_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      daily_context: {
        Row: {
          id: string;
          context_date: string;
          location: string;
          weather: Json | null;
          events: string[] | null;
          situations: string[] | null;
          raw: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          context_date: string;
          location: string;
          weather?: Json | null;
          events?: string[] | null;
          situations?: string[] | null;
          raw?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          context_date?: string;
          location?: string;
          weather?: Json | null;
          events?: string[] | null;
          situations?: string[] | null;
          raw?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          user_id: string;
          favorite_menus: string[] | null;
          disliked_ingredients: string[] | null;
          dietary_rules: string[] | null;
          preferred_vibes: string[] | null;
          max_budget_krw: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          favorite_menus?: string[] | null;
          disliked_ingredients?: string[] | null;
          dietary_rules?: string[] | null;
          preferred_vibes?: string[] | null;
          max_budget_krw?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          favorite_menus?: string[] | null;
          disliked_ingredients?: string[] | null;
          dietary_rules?: string[] | null;
          preferred_vibes?: string[] | null;
          max_budget_krw?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_recommendations: {
        Row: {
          id: string;
          user_id: string | null;
          region: string;
          context_date: string;
          recommended_menus: Json;
          reasoning: string | null;
          model_name: string | null;
          confidence: string | null;
          input_snapshot: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          region: string;
          context_date: string;
          recommended_menus: Json;
          reasoning?: string | null;
          model_name?: string | null;
          confidence?: string | null;
          input_snapshot?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          region?: string;
          context_date?: string;
          recommended_menus?: Json;
          reasoning?: string | null;
          model_name?: string | null;
          confidence?: string | null;
          input_snapshot?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      recommendation_restaurants: {
        Row: {
          id: string;
          recommendation_id: string;
          restaurant_id: string;
          rank: number;
          score: number;
          match_reason: string | null;
          distance_meters: number | null;
          walk_bucket: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          recommendation_id: string;
          restaurant_id: string;
          rank: number;
          score: number;
          match_reason?: string | null;
          distance_meters?: number | null;
          walk_bucket?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          recommendation_id?: string;
          restaurant_id?: string;
          rank?: number;
          score?: number;
          match_reason?: string | null;
          distance_meters?: number | null;
          walk_bucket?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recommendation_restaurants_recommendation_id_fkey";
            columns: ["recommendation_id"];
            isOneToOne: false;
            referencedRelation: "menu_recommendations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recommendation_restaurants_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      geocode_cache: {
        Row: {
          query: string;
          lat: number;
          lng: number;
          provider: string | null;
          last_resolved_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          query: string;
          lat: number;
          lng: number;
          provider?: string | null;
          last_resolved_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          query?: string;
          lat?: number;
          lng?: number;
          provider?: string | null;
          last_resolved_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
