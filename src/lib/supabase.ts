import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          handle: string | null;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          reputation_score: number;
          tier: string | null;
          role: string | null;
          onboarding_completed: boolean;
          is_private: boolean;
          notification_preferences: Record<string, any> | null;
          created_at: string;
        };
        Insert: {
          id: string;
          handle?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          reputation_score?: number;
          tier?: string | null;
          role?: string | null;
          onboarding_completed?: boolean;
          is_private?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          handle?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          reputation_score?: number;
          tier?: string | null;
          role?: string | null;
          onboarding_completed?: boolean;
          is_private?: boolean;
          created_at?: string;
        };
      };
      vehicles: {
        Row: {
          id: string;
          owner_id: string | null;
          plate_hash: string;
          plate_number: string | null;
          plate_state: string | null;
          make: string | null;
          model: string | null;
          year: number | null;
          color: string | null;
          trim: string | null;
          stock_image_url: string | null;
          profile_image_url: string | null;
          is_claimed: boolean;
          claimed_at: string | null;
          verification_tier: string | null;
          reputation_score: number;
          spots_count: number;
          vin: string | null;
          vin_raw_data: Record<string, any> | null;
          vin_year: number | null;
          vin_make: string | null;
          vin_model: string | null;
          vin_trim: string | null;
          vin_body_class: string | null;
          vin_fuel_type: string | null;
          vin_engine_cylinders: string | null;
          vin_decoded_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          plate_hash: string;
          plate_number?: string | null;
          plate_state?: string | null;
          make?: string | null;
          model?: string | null;
          year?: number | null;
          color?: string | null;
          stock_image_url?: string | null;
          profile_image_url?: string | null;
          is_claimed?: boolean;
          claimed_at?: string | null;
          verification_tier?: string | null;
          reputation_score?: number;
          spots_count?: number;
          vin?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          plate_hash?: string;
          make?: string | null;
          model?: string | null;
          year?: number | null;
          color?: string | null;
          stock_image_url?: string | null;
          profile_image_url?: string | null;
          is_claimed?: boolean;
          claimed_at?: string | null;
          verification_tier?: string | null;
          reputation_score?: number;
          spots_count?: number;
          vin?: string | null;
          created_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          vehicle_id: string | null;
          post_type: string | null;
          spot_type: string | null;
          sentiment: string | null;
          caption: string | null;
          image_url: string | null;
          video_url: string | null;
          content_type: string | null;
          location_label: string | null;
          privacy_level: string;
          moderation_status: string;
          rating_look: number | null;
          rating_sound: number | null;
          rating_condition: number | null;
          rating_driver: number | null;
          rating_driving: number | null;
          rating_vehicle: number | null;
          view_count: number;
          comment_count: number;
          heat_score: number | null;
          created_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          author_id: string;
          vehicle_id?: string | null;
          post_type?: string | null;
          caption?: string | null;
          image_url?: string | null;
          video_url?: string | null;
          location_label?: string | null;
          privacy_level?: string;
          moderation_status?: string;
          created_at?: string;
        };
        Update: {
          caption?: string | null;
          moderation_status?: string;
          privacy_level?: string;
          vehicle_id?: string | null;
        };
      };
      vehicle_badges: {
        Row: {
          vehicle_id: string;
          badge_id: string;
          tier: string;
          sticker_count: number;
          earned_at: string;
        };
        Insert: {
          vehicle_id: string;
          badge_id: string;
          tier: string;
          sticker_count?: number;
          earned_at?: string;
        };
        Update: {
          tier?: string;
          sticker_count?: number;
        };
      };
      vehicle_stickers: {
        Row: {
          id: string;
          vehicle_id: string;
          sticker_id: string;
          given_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          sticker_id: string;
          given_by: string;
        };
        Update: Record<string, never>;
      };
      sticker_catalog: {
        Row: {
          id: string;
          name: string;
          icon_name: string | null;
          sentiment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          icon_name?: string | null;
          sentiment: string;
        };
        Update: {
          name?: string;
          sentiment?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          status: string;
          muted: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          status?: string;
          muted?: boolean;
        };
        Update: {
          status?: string;
          muted?: boolean;
        };
      };
      vehicle_follows: {
        Row: {
          id: string;
          follower_id: string;
          vehicle_id: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          vehicle_id: string;
          status?: string;
        };
        Update: {
          status?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          link_type: string | null;
          link_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          link_type?: string | null;
          link_id?: string | null;
          is_read?: boolean;
        };
        Update: {
          is_read?: boolean;
        };
      };
      reputation_scores: {
        Row: {
          id: string;
          user_id: string;
          total_score: number;
          level: number;
          rank: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_score?: number;
          level?: number;
        };
        Update: {
          total_score?: number;
          level?: number;
          rank?: number | null;
          updated_at?: string;
        };
      };
      reputation_transactions: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          points: number;
          reference_type: string | null;
          reference_id: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          points: number;
          reference_type?: string | null;
          reference_id?: string | null;
          description?: string | null;
        };
        Update: Record<string, never>;
      };
    };
  };
};
