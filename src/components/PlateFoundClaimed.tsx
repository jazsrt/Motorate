import { useState, useEffect } from 'react';
import { Star, CheckCircle, Heart, ThumbsDown, Wrench, Car } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TierBadge } from './TierBadge';
import { UserAvatar } from './UserAvatar';
import { AllReviewsModal } from './AllReviewsModal';
import { haptics } from '../lib/haptics';
import { getVehicleImageUrl } from '../lib/carImageryApi';

interface FullRatings {
  driver_avg: number;
  driving_avg: number;
  vehicle_avg: number;
  looks_avg: number | null;
  sound_avg: number | null;
  condition_avg: number | null;
  overall_avg: number;
  spot_count: number;
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

interface ModCategory {
  category: string;
  count: number;
}

interface PlateFoundClaimedProps {
  state: string;
  plateNumber: string;
  vehicle: {
    id: string;
    make: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
    stock_image_url: string | null;
    owner_id: string;
    owner?: {
      handle: string;
      avatar_url: string | null;
    };
    verification_tier: 'shadow' | 'standard' | 'verified';
  };
  onLeaveReview: () => void;
  onBack: () => void;
  onViewOwnerProfile?: (userId: string) => void;
}

export function PlateFoundClaimed({
  state,
  plateNumber,
  vehicle,
  onLeaveReview,
  onBack,
  onViewOwnerProfile,
}: PlateFoundClaimedProps) {
  const [ratings, setRatings] = useState<FullRatings | null>(null);
  const [topStickers, setTopStickers] = useState<TopSticker[]>([]);
  const [modCategories, setModCategories] = useState<ModCategory[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [revealStep, setRevealStep] = useState(0);
  const [stockImageUrl, setStockImageUrl] = useState<string | null>(null);

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
    const loadRatings = async () => {
      // Try the vehicle_ratings view first
      const { data: rData } = await supabase
        .from('vehicle_ratings')
        .select('*')
        .eq('vehicle_id', vehicle.id)
        .maybeSingle();

      if (rData && rData.spot_count > 0 && rData.overall_avg > 0
          && (rData.driver_avg > 0 || rData.driving_avg > 0 || rData.vehicle_avg > 0)) {
        setRatings(rData);
      } else {
        // Fallback: calculate from posts table directly
        const { data: posts } = await supabase
          .from('posts')
          .select('rating_driver, rating_driving, rating_vehicle, looks_rating, sound_rating, condition_rating, sentiment, spot_type')
          .eq('vehicle_id', vehicle.id)
          .in('post_type', ['spot', 'review']);

        if (posts && posts.length > 0) {
          const validPosts = posts.filter((p: any) => p.rating_driver > 0 || p.rating_driving > 0 || p.rating_vehicle > 0);
          if (validPosts.length > 0) {
            const count = validPosts.length;
            const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
            const driverAvg = avg(validPosts.map((p: any) => p.rating_driver || 0));
            const drivingAvg = avg(validPosts.map((p: any) => p.rating_driving || 0));
            const vehicleAvg = avg(validPosts.map((p: any) => p.rating_vehicle || 0));
            const fullPosts = validPosts.filter((p: any) => p.spot_type === 'full');
            const looksVals = fullPosts.map((p: any) => p.looks_rating).filter(Boolean);
            const soundVals = fullPosts.map((p: any) => p.sound_rating).filter(Boolean);
            const condVals = fullPosts.map((p: any) => p.condition_rating).filter(Boolean);

            setRatings({
              driver_avg: driverAvg,
              driving_avg: drivingAvg,
              vehicle_avg: vehicleAvg,
              looks_avg: looksVals.length > 0 ? avg(looksVals) : null,
              sound_avg: soundVals.length > 0 ? avg(soundVals) : null,
              condition_avg: condVals.length > 0 ? avg(condVals) : null,
              overall_avg: (driverAvg + drivingAvg + vehicleAvg) / 3,
              spot_count: count,
              full_review_count: fullPosts.length,
              love_count: validPosts.filter((p: any) => p.sentiment === 'love').length,
              hate_count: validPosts.filter((p: any) => p.sentiment === 'hate').length,
            });
          }
        }
      }
    };

    Promise.all([
      loadRatings(),
      supabase
        .from('vehicle_sticker_counts')
        .select('tag_name, icon_name, tag_sentiment, count')
        .eq('vehicle_id', vehicle.id)
        .order('count', { ascending: false })
        .limit(3)
        .then(({ data: sData }) => { if (sData) setTopStickers(sData); }),
      supabase
        .from('modifications')
        .select('category')
        .eq('vehicle_id', vehicle.id)
        .then(({ data: mData }) => {
          if (mData) {
            const counts: Record<string, number> = {};
            mData.forEach((m: any) => {
              const cat = m.category || 'Other';
              counts[cat] = (counts[cat] || 0) + 1;
            });
            setModCategories(Object.entries(counts).map(([category, count]) => ({ category, count })));
          }
        }),
    ]);
  }, [vehicle.id]);

  const ratingRows = ratings ? [
    { label: 'Driver', value: ratings.driver_avg, count: ratings.spot_count },
    { label: 'Driving', value: ratings.driving_avg, count: ratings.spot_count },
    { label: 'Vehicle', value: ratings.vehicle_avg, count: ratings.spot_count },
    ...(ratings.looks_avg != null ? [{ label: 'Looks', value: ratings.looks_avg, count: ratings.full_review_count }] : []),
    ...(ratings.sound_avg != null ? [{ label: 'Sound', value: ratings.sound_avg, count: ratings.full_review_count }] : []),
    ...(ratings.condition_avg != null ? [{ label: 'Condition', value: ratings.condition_avg, count: ratings.full_review_count }] : []),
  ] : [];

  return (
    <>
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-surface border border-surfacehighlight rounded-2xl overflow-hidden shadow-2xl">
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border-b border-surfacehighlight p-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-lg border border-green-500/30 mb-4">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-green-400">Claimed Plate</span>
            </div>
            <h2 className="text-3xl font-heading font-bold uppercase tracking-tight mb-2 text-primary">
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

          <div className={`p-6 space-y-5 transition-all duration-500 ${revealStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <div className="bg-surfacehighlight rounded-2xl overflow-hidden border border-surfacehighlight/50">
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
                <h3 className="text-2xl font-heading font-bold uppercase tracking-tight mb-1">{vehicleName}</h3>
                {vehicle.color && <p className="text-secondary text-sm capitalize mb-4">{vehicle.color}</p>}

                {vehicle.owner && (
                  <button
                    onClick={() => onViewOwnerProfile?.(vehicle.owner_id)}
                    className="w-full flex items-center justify-between p-3 bg-surface rounded-xl border border-surfacehighlight hover:border-accent-primary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar src={vehicle.owner.avatar_url} alt={vehicle.owner.handle} size="md" />
                      <div className="text-left">
                        <p className="text-xs text-secondary font-bold uppercase tracking-wider">Owner</p>
                        <p className="font-bold text-primary">@{vehicle.owner.handle}</p>
                      </div>
                    </div>
                    <TierBadge tier={vehicle.verification_tier} size="medium" />
                  </button>
                )}
              </div>
            </div>

            {ratings && ratings.spot_count > 0 && (
              <div className="bg-surface border border-surfacehighlight rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-2xl font-bold">{ratings.overall_avg.toFixed(1)}</span>
                    <span className="text-secondary text-sm">/ 5</span>
                  </div>
                  <button
                    onClick={() => setShowAllReviews(true)}
                    className="text-xs text-accent-primary hover:underline font-medium"
                  >
                    View {ratings.spot_count} spots
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {ratingRows.map(r => (
                    <div key={r.label} className="bg-surfacehighlight rounded-xl p-2.5 text-center">
                      <p className="text-xs text-secondary mb-1">{r.label}</p>
                      <p className="font-bold text-primary">{r.value.toFixed(1)}</p>
                      <p className="text-xs text-neutral-600">({r.count})</p>
                    </div>
                  ))}
                </div>

                {(ratings.love_count > 0 || ratings.hate_count > 0) && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-rose-400">
                        <Heart className="w-4 h-4 fill-current" />
                        <span className="text-sm font-bold">{ratings.love_count} Love It</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <ThumbsDown className="w-4 h-4" />
                        <span className="text-sm font-bold">{ratings.hate_count} Hate It</span>
                      </div>
                    </div>
                    <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full"
                        style={{
                          width: `${ratings.love_count + ratings.hate_count > 0
                            ? (ratings.love_count / (ratings.love_count + ratings.hate_count)) * 100
                            : 0}%`
                        }}
                      />
                    </div>
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
                              ×{s.count}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {modCategories.length > 0 && (
              <div className="bg-surface border border-surfacehighlight rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="w-4 h-4 text-secondary" />
                  <p className="text-xs font-bold uppercase tracking-wider text-secondary">Modifications</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {modCategories.map(mod => (
                    <div key={mod.category} className="bg-surfacehighlight rounded-xl p-3 flex items-center justify-between">
                      <span className="text-sm font-medium">{mod.category}</span>
                      <span className="text-xs text-secondary bg-surface px-2 py-0.5 rounded-lg">{mod.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={`grid grid-cols-2 gap-3 transition-all duration-500 ${revealStep >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
              <button
                onClick={onBack}
                className="py-3.5 bg-surface border border-surfacehighlight hover:bg-surfacehighlight rounded-xl font-heading font-bold uppercase tracking-tight text-sm transition-all active:scale-95"
              >
                Back
              </button>
              <button
                onClick={onLeaveReview}
                className="py-3.5 rounded-xl font-heading font-bold uppercase tracking-tight text-sm transition-all active:scale-95 text-white"
                style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
              >
                Spot This Plate
              </button>
            </div>

            {ratings && ratings.spot_count > 0 && (
              <button
                onClick={() => setShowAllReviews(true)}
                className="w-full py-3 bg-surfacehighlight hover:bg-surfacehighlight/80 rounded-xl font-heading font-bold uppercase tracking-tight text-sm transition-all active:scale-95"
              >
                SEE ALL SPOTS ({ratings.spot_count})
              </button>
            )}
          </div>
        </div>
      </div>

      {showAllReviews && (
        <AllReviewsModal
          vehicleId={vehicle.id}
          vehicleName={vehicleName}
          onClose={() => setShowAllReviews(false)}
          onLeaveReview={() => { setShowAllReviews(false); onLeaveReview(); }}
        />
      )}
    </>
  );
}
