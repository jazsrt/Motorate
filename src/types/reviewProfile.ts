export interface ReviewStats {
  totalSpots: number;
  avgDriverRating: number;
  avgVehicleRating: number;
  memberAgeDays: number;
}

export interface RatingDistribution {
  excellent: number;  // 80-100
  good: number;       // 60-79
  average: number;    // 40-59
  poor: number;       // 0-39
}

export interface StickerStats {
  positiveCount: number;
  negativeCount: number;
  positivityRatio: number;
  mostGivenSticker?: string;
}

export interface CredibilityBadge {
  icon: string;
  label: string;
  color: 'green' | 'blue' | 'yellow' | 'red' | 'purple';
  description: string;
}

export interface ReviewProfile {
  userId: string;
  stats: ReviewStats;
  distribution: RatingDistribution;
  stickerStats: StickerStats;
  credibilityBadges: CredibilityBadge[];
  recentReviews: Array<{
    id: string;
    vehicle_id: string;
    author_id: string;
    text: string | null;
    driver_rating?: number;
    vehicle_rating?: number;
    overall_rating: number;
    location_label: string | null;
    created_at: string;
    author: {
      id: string;
      handle: string;
      avatar_url: string | null;
    } | null;
    vehicle: {
      id: string;
      make: string;
      model: string;
      year: number;
    } | null;
  }>;
}
