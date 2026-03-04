export interface GarageProfile {
  id: string;
  handle: string | null;
  username?: string | null;
  avatar_url: string | null;
  profile_photo_url?: string | null;
  bio?: string | null;
  location?: string | null;
  is_private?: boolean;
  reputation_score?: number;
  avg_driver_rating?: number;
  driver_rating_count?: number;
  pinned_badges?: string[];
  followers_last_week?: number;
  created_at: string;
}

export interface GarageVehicle {
  id: string;
  owner_id: string | null;
  make: string;
  model: string;
  year: number;
  color: string;
  plate_hash: string;
  is_claimed: boolean;
  claimed_at: string | null;
  verification_status: 'shadow' | 'conditional' | 'standard' | 'verified';
  is_verified: boolean;
  avg_rating: number;
  rating_count: number;
  spot_count: number;
  review_count: number;
  photos: VehiclePhoto[];
  modifications: Modification[];
  is_private?: boolean;
  owners_manual_url?: string | null;
  created_at: string;
}

export interface VehiclePhoto {
  id: string;
  vehicle_id: string;
  url: string;
  created_at: string;
}

export interface Modification {
  id: string;
  vehicle_id: string;
  category: string;
  part_name: string;
  is_verified: boolean;
  created_at: string;
}

export interface ProfileCompletionBadge {
  key: string;
  name: string;
  description: string;
  icon_name: string;
  requiredFields: string[];
  earned?: boolean;
  earnedAt?: string | null;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge: Badge;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  icon_name: string;
  level: number;
  level_name: string;
  progression_group?: string;
  created_at?: string;
}

export interface GarageStats {
  vehicleCount: number;
  claimedCount: number;
  verifiedCount: number;
  totalReviews: number;
  totalBadges: number;
  profileCompletion: number;
  followersDelta?: number;
}

export interface GarageViewOptions {
  layout: 'grid' | 'list';
  sortBy: 'newest' | 'oldest' | 'rating' | 'name';
  filterVerified: boolean;
  searchQuery: string;
}

export type ProfileCompletionLevel = 'none' | 'starter' | 'complete' | 'pro';

export interface ProfileCompletionStatus {
  level: ProfileCompletionLevel;
  percentage: number;
  nextBadge?: ProfileCompletionBadge;
  badges: ProfileCompletionBadge[];
  missingFields: string[];
}
