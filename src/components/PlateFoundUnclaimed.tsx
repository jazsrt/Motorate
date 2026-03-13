import { useState, useEffect } from 'react';
import { Star, AlertTriangle, User, Heart, ThumbsDown, Eye, Car, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserAvatar } from './UserAvatar';
import { AllReviewsModal } from './AllReviewsModal';
import { haptics } from '../lib/haptics';
import { getVehicleImageUrl } from '../lib/carImageryApi';

interface VehicleRatings {
  driver_avg: number;
  driving_avg: number;
  vehicle_avg: number;
  overall_avg: number;
  spot_count: number;
  quick_spot_count: number;
  full_review_count: number;
  love_count: number;
  hate_count: number;
}

interface TopSticker {
  tag_name: string;
  icon_name: string | null;
  tag_sentiment: string;
  count: number;
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
  const [topStickers, setTopStickers] = useState<TopSticker[]>([]);
  const [stockImageUrl, setStockImageUrl] = useState<string | null>(null);
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

  // Fetch stock image if no user photo
  useEffect(() => {
    if (!vehicle.stock_image_url && vehicle.make && vehicle.model) {
      getVehicleImageUrl(vehicle.make, vehicle.model, vehicle.year ?? undefined)
        .then(url => { if (url) setStockImageUrl(url); })
        .catch(() => {});
    }
  }, [vehicle.stock_image_url, vehicle.make, vehicle.model, vehicle.year]);

  useEffect(() => {
    const fetchData = async () => {
      // Get all posts (spots/reviews) for this vehicle
      const { data: postData } = await supabase
        .from('posts')
        .select(`
          id,
          rating_driver,
          rating_driving,
          rating_vehicle,
          sentiment,
          caption,
          spot_type,
          created_at,
          author:profiles!posts_author_id_fkey(handle, avatar_url)
        `)
        .eq('vehicle_id', vehicle.id)
        .in('post_type', ['spot', 'review'])
        .order('created_at', { ascending: false });

      if (postData && postData.length > 0) {
        const validPosts = postData.filter(r => (r.rating_driver || 0) > 0 || (r.rating_driving || 0) > 0 || (r.rating_vehicle || 0) > 0);
        const count = validPosts.length || postData.length;
        const quickCount = postData.filter(r => r.spot_type === 'quick').length;
        const fullCount = postData.filter(r => r.spot_type === 'full').length;

        if (validPosts.length > 0) {
          const driverAvg = validPosts.reduce((sum, r) => sum + (r.rating_driver || 0), 0) / validPosts.length;
          const drivingAvg = validPosts.reduce((sum, r) => sum + (r.rating_driving || 0), 0) / validPosts.length;
          const vehicleAvg = validPosts.reduce((sum, r) => sum + (r.rating_vehicle || 0), 0) / validPosts.length;

          setRatings({
            driver_avg: driverAvg,
            driving_avg: drivingAvg,
            vehicle_avg: vehicleAvg,
            overall_avg: (driverAvg + drivingAvg + vehicleAvg) / 3,
            spot_count: count,
            quick_spot_count: quickCount,
            full_review_count: fullCount,
            love_count: validPosts.filter(r => r.sentiment === 'love').length,
            hate_count: validPosts.filter(r => r.sentiment === 'hate').length,
          });
        } else {
          setRatings({
            driver_avg: 0, driving_avg: 0, vehicle_avg: 0, overall_avg: 0,
            spot_count: postData.length,
            quick_spot_count: quickCount,
            full_review_count: fullCount,
            love_count: 0, hate_count: 0,
          });
        }

        // Get recent posts with comments
        const recentWithComments = postData
          .filter(r => r.caption)
          .slice(0, 3)
          .map(r => ({
            id: r.id,
            driver_rating: r.rating_driver || 0,
            driving_rating: r.rating_driving || 0,
            vehicle_rating: r.rating_vehicle || 0,
            comment: r.caption,
            created_at: r.created_at,
            author: r.author,
          }));

        setRecentReviews(recentWithComments as any);
      }

      // Get stickers
      const { data: stickerData } = await supabase
        .from('vehicle_sticker_counts')
        .select('tag_name, icon_name, tag_sentiment, count')
        .eq('vehicle_id', vehicle.id)
        .order('count', { ascending: false })
        .limit(3);
      if (stickerData) setTopStickers(stickerData);
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
              {(vehicle.stock_image_url || stockImageUrl) ? (
                <div className="aspect-video">
                  <img src={vehicle.stock_image_url || stockImageUrl!} alt={vehicleName} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-surface to-surfacehighlight flex items-center justify-center">
                  <Car className="w-16 h-16 text-quaternary" />
                </div>
              )}

              <div className="p-5">
                <h3 className="text-2xl font-heading font-bold uppercase tracking-tight mb-4">{vehicleName}</h3>

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
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        <span className="text-xl font-bold">{ratings.overall_avg.toFixed(1)}</span>
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
                          <p className="font-bold text-primary">{r.value.toFixed(1)}</p>
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

                    {(ratings.quick_spot_count > 0 || ratings.full_review_count > 0) && (
                      <p className="text-xs text-secondary text-center">
                        {ratings.quick_spot_count > 0 && `${ratings.quick_spot_count} Quick ${ratings.quick_spot_count === 1 ? 'Spot' : 'Spots'}`}
                        {ratings.quick_spot_count > 0 && ratings.full_review_count > 0 && ' · '}
                        {ratings.full_review_count > 0 && `${ratings.full_review_count} Full ${ratings.full_review_count === 1 ? 'Spot' : 'Spots'}`}
                      </p>
                    )}
                  </div>
                )}

                {topStickers.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-surfacehighlight">
                    <p className="text-xs font-bold uppercase tracking-wider text-secondary mb-2">Top Stickers</p>
                    <div className="flex flex-wrap gap-2">
                      {topStickers.map(s => (
                        <span
                          key={s.tag_name}
                          className={`relative flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium ${
                            s.tag_sentiment === 'positive'
                              ? 'bg-green-500/15 text-green-300 border border-green-500/25'
                              : 'bg-red-500/15 text-red-300 border border-red-500/25'
                          }`}
                        >
                          {s.icon_name && <span className="text-base leading-none">{s.icon_name}</span>}
                          {s.tag_name}
                          {s.count > 1 && (
                            <span className="ml-0.5 bg-white/10 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                              &times;{s.count}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
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
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
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
                <button
                  onClick={onClaimVehicle}
                  className="w-full text-center text-sm text-secondary hover:text-accent-primary transition-colors mt-3"
                >
                  Is this your car? <span className="font-semibold text-accent-primary">Claim it &rarr;</span>
                </button>
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
