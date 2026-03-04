import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;


if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Reputation: Missing Supabase environment variables!');
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          reputation_score: number;
          created_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          avatar_url?: string | null;
          reputation_score?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          avatar_url?: string | null;
          reputation_score?: number;
          created_at?: string;
        };
      };
      vehicles: {
        Row: {
          id: string;
          owner_id: string | null;
          plate_hash: string;
          make: string | null;
          model: string | null;
          year: number | null;
          color: string | null;
          stock_image_url: string | null;
          is_claimed: boolean;
          claimed_at: string | null;
          created_at: string;
          vin: string | null;
          vin_year: number | null;
          vin_make: string | null;
          vin_model: string | null;
          vin_trim: string | null;
          vin_body_class: string | null;
          vin_drive_type: string | null;
          vin_fuel_type: string | null;
          vin_engine_cylinders: string | null;
          vin_engine_displacement: string | null;
          vin_horsepower: string | null;
          vin_transmission: string | null;
          vin_doors: string | null;
          vin_plant_country: string | null;
          vin_decoded_at: string | null;
          vin_raw_data: Record<string, any> | null;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          plate_hash: string;
          make?: string | null;
          model?: string | null;
          year?: number | null;
          color?: string | null;
          stock_image_url?: string | null;
          is_claimed?: boolean;
          claimed_at?: string | null;
          created_at?: string;
          vin?: string | null;
          vin_year?: number | null;
          vin_make?: string | null;
          vin_model?: string | null;
          vin_trim?: string | null;
          vin_body_class?: string | null;
          vin_drive_type?: string | null;
          vin_fuel_type?: string | null;
          vin_engine_cylinders?: string | null;
          vin_engine_displacement?: string | null;
          vin_horsepower?: string | null;
          vin_transmission?: string | null;
          vin_doors?: string | null;
          vin_plant_country?: string | null;
          vin_decoded_at?: string | null;
          vin_raw_data?: Record<string, any> | null;
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
          is_claimed?: boolean;
          claimed_at?: string | null;
          created_at?: string;
          vin?: string | null;
          vin_year?: number | null;
          vin_make?: string | null;
          vin_model?: string | null;
          vin_trim?: string | null;
          vin_body_class?: string | null;
          vin_drive_type?: string | null;
          vin_fuel_type?: string | null;
          vin_engine_cylinders?: string | null;
          vin_engine_displacement?: string | null;
          vin_horsepower?: string | null;
          vin_transmission?: string | null;
          vin_doors?: string | null;
          vin_plant_country?: string | null;
          vin_decoded_at?: string | null;
          vin_raw_data?: Record<string, any> | null;
        };
      };
      reviews: {
        Row: {
          id: string;
          vehicle_id: string;
          author_id: string;
          text: string | null;
          location_label: string | null;
          image_url: string | null;
          is_hidden_by_owner: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          author_id: string;
          text?: string | null;
          location_label?: string | null;
          image_url?: string | null;
          is_hidden_by_owner?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          author_id?: string;
          text?: string | null;
          location_label?: string | null;
          image_url?: string | null;
          is_hidden_by_owner?: boolean;
          created_at?: string;
        };
      };
      badges: {
        Row: {
          id: string;
          name: string;
          icon: string;
          type: 'good' | 'bad' | 'landmark' | null;
          monthly_limit: number;
          created_at: string;
        };
      };
      user_inventory: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          count_remaining: number;
          last_reset: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_id: string;
          count_remaining?: number;
          last_reset?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          badge_id?: string;
          count_remaining?: number;
          last_reset?: string | null;
          created_at?: string;
        };
      };
      modifications: {
        Row: {
          id: string;
          vehicle_id: string;
          category: string | null;
          part_name: string;
          is_verified: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          vehicle_id: string;
          category?: string | null;
          part_name: string;
          is_verified?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          vehicle_id?: string;
          category?: string | null;
          part_name?: string;
          is_verified?: boolean;
          created_at?: string;
        };
      };
    };
  };
};
