import { useState, useEffect } from 'react';
import { Star, AlertTriangle, User, Heart, ThumbsDown, Eye, Car, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserAvatar } from './UserAvatar';
import { AllReviewsModal } from './AllReviewsModal';
import { haptics } from '../lib/haptics';

interface VehicleRatings {
  driver_avg: number;
  driving_avg: number;
  vehicle_avg: number;
  overall_avg: number;
  spot_count: number;
  love_count: number;
  hate_count: number;
}

interface RecentReview {
  id: string;
  driver_rating: number;
  driving_rating: number;
  vehicle_rating: number;
  comment: string | null;
  created_at: string;
  author: {
    handle: string;
    avatar_url: string | null;
  } | null;
}

interface PlateFoundUnclaimedProps {
  state: string;
  plateNumber: string;
  vehicle: {
    id: string;
    make: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
    stock_image_url: string | null;
    created_by_user_id?: string | null;
    creator?: {
      handle: string;
      avatar_url: string | null;
    };
  };
  onSpotAndReview: () => void;
  onClaimVehicle: () => void;
  onViewVehicle?: (vehicleId: string) => void;
  isLoggedIn: boolean;
}

export function PlateFoundUnclaimed({
  state,
  plateNumber,
  vehicle,
  onSpotAndReview,
  onClaimVehicle,
  onViewVehicle,
  isLoggedIn,
}: PlateFoundUnclaimedProps) {
  const [ratings, setRatings] = useState<VehicleRatings | null>(null);
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [revealStep, setRevealStep] = useState(0);

  const vehicleName = `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim() || 'Unknown Vehicle';

  useEffect(() => {
    const timers = [
      setTimeout(() => setRevealStep(1), 200),
      setTimeout(() => { setRevealStep(2); haptics.medium(); }, 1100),
      setTimeout(() => setRevealStep(3), 1400),
      setTimeout(() => setRevealStep(4), 1700),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      // Get spot count from spot_history
      const { count: spotCount } = await supabase
        .from('spot_history')
        .select('*', { count: 'exact', head: true })
        .eq('vehicle_id', vehicle.id);

      // Get all reviews for this vehicle
      const { data: reviewData } = await supabase
        .from('reviews')
        .select(`
          id,
          rating_driver,
          rating_driving,
          rating_vehicle,
          sentiment,
          comment,
          spot_type,
          created_at,
          is_hidden_by_owner,
          author:profiles!reviews_author_id_fkey(handle, avatar_url)
        `)
        .eq('vehicle_id', vehicle.id)
        .eq('is_hidden_by_owner', false);

      if (reviewData && reviewData.length > 0) {
        const driverAvg = reviewData.reduce((sum, r) => sum + (r.rating_driver || 0), 0) / reviewData.length;
        const drivingAvg = reviewData.reduce((sum, r) => sum + (r.rating_driving || 0), 0) / reviewData.length;
        const vehicleAvg = reviewData.reduce((sum, r) => sum + (r.rating_vehicle || 0), 0) / reviewData.length;
        const overallAvg = (driverAvg + drivingAvg + vehicleAvg) / 3;
        const loveCount = reviewData.filter(r => r.sentiment === 'love').length;
        const hateCount = reviewData.filter(r => r.sentiment === 'hate').length;

        setRatings({
          driver_avg: driverAvg,
          driving_avg: drivingAvg,
          vehicle_avg: vehicleAvg,
          overall_avg: overallAvg,
          spot_count: spotCount || 0,
          love_count: loveCount,
          hate_count: hateCount,
        });

        // Get recent reviews with comments
        const recentWithComments = reviewData
          .filter(r => r.comment)
          .slice(0, 3)
          .map(r => ({
            id: r.id,
            driver_rating: r.rating_driver || 0,
            driving_rating: r.rating_driving || 0,
            vehicle_rating: r.rating_vehicle || 0,
            comment: r.comment,
            created_at: r.created_at,
            author: r.author,
          }));

        setRecentReviews(recentWithComments as any);
      } else if (spotCount) {
        // If there are spots but no reviews, still show spot count
        setRatings({
          driver_avg: 0,
          driving_avg: 0,
          vehicle_avg: 0,
          overall_avg: 0,
          spot_count: spotCount,
          love_count: 0,
          hate_count: 0,
        });
      }
    };

    fetchData();
  }, [vehicle.id]);

  return (
    <>
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-surface border border-surfacehighlight rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-surface border-b border-white/[0.06] p-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)' }}>
              <AlertTriangle className="w-4 h-4 text-[#fbbf24]" />
              <span className="text-xs font-bold uppercase tracking-wider text-accent-primary">Unclaimed Plate</span>
            </div>
            <h2 className="text-3xl font-heading font-bold uppercase tracking-tight mb-2 bg-gradient-to-r from-white via-orange-200 to-[#F97316] bg-clip-text text-transparent">
              Plate Found!
            </h2>
            <div className={`inline-flex items-center gap-2 px-4 py-2 bg-surface/50 rounded-xl backdrop-blur-sm transition-all duration-700 ${revealStep >= 1 ? 'opacity-100' : 'opacity-0'}`}>
              <span className="font-mono font-bold text-lg text-red-500">{state}</span>
              <span className="text-red-500/60">—</span>
              <span className="font-mono font-bold text-lg tracking-wider text-red-500">{plateNumber}</span>
            </div>
            <div className={`h-px mx-auto mt-2 transition-all duration-300 ${revealStep >= 2 ? 'w-full' : 'w-0'}`}
                 style={{ background: 'var(--orange)', maxWidth: '200px' }} />
          </div>

          <div className={`p-6 transition-all duration-500 ${revealStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <div className="bg-surfacehighlight rounded-2xl overflow-hidden border border-surfacehighlight/50 mb-5">
              {vehicle.stock_image_url ? (
                <div className="aspect-video">
                  <img src={vehicle.stock_image_url} alt={vehicleName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-surface to-surfacehighlight flex items-center justify-center">
                  <Car className="w-16 h-16 text-quaternary" />
                </div>
              )}

              <div className="p-5">
                <h3 className="text-2xl font-heading font-black uppercase tracking-tight mb-4">{vehicleName}</h3>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {vehicle.year && (
                    <div className="bg-surface rounded-xl p-3 text-center border border-surfacehighlight">
                      <p className="text-xs text-secondary uppercase tracking-wider mb-1">Year</p>
                      <p className="font-bold">{vehicle.year}</p>
                    </div>
                  )}
                  {vehicle.make && (
                    <div className="bg-surface rounded-xl p-3 text-center border border-surfacehighlight">
                      <p className="text-xs text-secondary uppercase tracking-wider mb-1">Make</p>
                      <p className="font-bold">{vehicle.make}</p>
                    </div>
                  )}
                  {vehicle.color && (
                    <div className="bg-surface rounded-xl p-3 text-center border border-surfacehighlight">
                      <p className="text-xs text-secondary uppercase tracking-wider mb-1">Color</p>
                      <p className="font-bold capitalize">{vehicle.color}</p>
                    </div>
                  )}
                </div>

                {ratings && ratings.spot_count > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="w-5 h-5 fill-[#F97316] text-[#F97316]" />
                        <span className="text-xl font-black">{ratings.overall_avg.toFixed(1)}</span>
                        <span className="text-sm text-secondary">/ 5</span>
                      </div>
                      <button
                        onClick={() => setShowAllReviews(true)}
                        className="text-xs text-accent-primary hover:underline font-medium"
                      >
                        View {ratings.spot_count} {ratings.spot_count === 1 ? 'spot' : 'spots'}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Driver', value: ratings.driver_avg },
                        { label: 'Driving', value: ratings.driving_avg },
                        { label: 'Vehicle', value: ratings.vehicle_avg },
                      ].map(r => (
                        <div key={r.label} className="bg-surface rounded-xl p-2.5 text-center border border-surfacehighlight">
                          <p className="text-xs text-secondary mb-1">{r.label}</p>
                          <p className="font-black text-primary">{r.value.toFixed(1)}</p>
                        </div>
                      ))}
                    </div>

                    {(ratings.love_count > 0 || ratings.hate_count > 0) && (
                      <div className="flex items-center justify-center gap-4 py-2">
                        <div className="flex items-center gap-1.5 text-rose-400">
                          <Heart className="w-4 h-4 fill-current" />
                          <span className="text-sm font-bold">{ratings.love_count}</span>
                        </div>
                        <div className="w-px h-4 bg-surfacehighlight" />
                        <div className="flex items-center gap-1.5 text-neutral-400">
                          <ThumbsDown className="w-4 h-4" />
                          <span className="text-sm font-bold">{ratings.hate_count}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recent Review Summaries */}
                {recentReviews.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-secondary mb-2">Recent Spots</p>
                    {recentReviews.map((review) => (
                      <div key={review.id} className="bg-surface rounded-xl p-3 border border-surfacehighlight">
                        <div className="flex items-start gap-2 mb-2">
                          {review.author && (
                            <>
                              <UserAvatar src={review.author.avatar_url} alt={review.author.handle} size="sm" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-xs">@{review.author.handle}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Star className="w-3 h-3 fill-[#F97316] text-[#F97316]" />
                                  <span className="text-xs font-bold">
                                    {((review.driver_rating + review.driving_rating + review.vehicle_rating) / 3).toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        {review.comment && (
                          <div className="flex items-start gap-1.5">
                            <MessageCircle className="w-3 h-3 text-secondary flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-secondary line-clamp-2">{review.comment}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {vehicle.creator && (
                  <div className="mt-4 flex items-center gap-3 p-3 bg-surface rounded-xl border border-surfacehighlight">
                    <User className="w-4 h-4 text-secondary flex-shrink-0" />
                    <span className="text-xs text-secondary">Spotted by</span>
                    <UserAvatar src={vehicle.creator.avatar_url} alt={vehicle.creator.handle} size="sm" />
                    <span className="font-medium text-sm">@{vehicle.creator.handle}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {ratings && ratings.spot_count > 0 && (
                <button
                  onClick={() => setShowAllReviews(true)}
                  className="w-full py-3 bg-surfacehighlight hover:bg-surfacehighlight/80 rounded-xl font-heading font-bold uppercase tracking-tight text-sm transition-all active:scale-95"
                >
                  SEE ALL SPOTS ({ratings.spot_count})
                </button>
              )}

              {onViewVehicle && (
                <button
                  onClick={() => onViewVehicle(vehicle.id)}
                  className="w-full py-3.5 rounded-xl text-primary text-[15px] font-bold font-heading tracking-wide flex items-center justify-center gap-2 mb-3 border border-white/[0.06] bg-surface hover:bg-surface-2 transition-all"
                >
                  <Eye className="w-5 h-5" /> VIEW PLATE PROFILE
                </button>
              )}

              {ratings && ratings.spot_count > 0 && (
                <p className="text-center text-sm text-secondary">
                  {ratings.spot_count} {ratings.spot_count === 1 ? 'person has' : 'people have'} spotted this plate
                </p>
              )}
              <button
                onClick={onSpotAndReview}
                disabled={!isLoggedIn}
                className={`w-full py-4 disabled:opacity-50 rounded-xl font-heading font-bold uppercase tracking-tight transition-all active:scale-95 shadow-lg text-white relative flex items-center justify-center gap-3 ${revealStep >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
                style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
              >
                {ratings?.spot_count && ratings.spot_count > 0 ? 'SPOT THIS PLATE' : 'BE THE FIRST TO SPOT!'}
                <span className="absolute right-4 bg-black/20 px-2 py-0.5 rounded-full text-xs font-bold">+15 pts</span>
              </button>

              {isLoggedIn && (
                <div className="pt-4 border-t border-surfacehighlight">
                  <p className="text-center text-sm text-secondary mb-3">Is this your car?</p>
                  <button
                    onClick={onClaimVehicle}
                    className="w-full py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-heading font-bold uppercase tracking-tight text-sm transition-all active:scale-95 shadow-lg"
                  >
                    CLAIM THIS PLATE
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAllReviews && (
        <AllReviewsModal
          vehicleId={vehicle.id}
          vehicleName={vehicleName}
          onClose={() => setShowAllReviews(false)}
          onLeaveReview={() => { setShowAllReviews(false); onSpotAndReview(); }}
        />
      )}
    </>
  );
}
