import { useState, useEffect, useCallback } from 'react';
import { X, Star, Heart, ThumbsDown, ChevronDown, Car, Flag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserAvatar } from './UserAvatar';
import { DisputeReviewModal } from './DisputeReviewModal';

interface VehicleRatings {
  driver_avg: number;
  driving_avg: number;
  vehicle_avg: number;
  looks_avg: number | null;
  sound_avg: number | null;
  condition_avg: number | null;
  overall_avg: number;
  spot_count: number;
  quick_spot_count: number;
  full_review_count: number;
  love_count: number;
  hate_count: number;
}

interface ReviewWithAuthor {
  id: string;
  spot_type: 'quick' | 'full';
  rating_driver: number;
  rating_driving: number;
  rating_vehicle: number;
  looks_rating: number | null;
  sound_rating: number | null;
  condition_rating: number | null;
  sentiment: 'love' | 'hate' | null;
  comment: string | null;
  created_at: string;
  author: {
    handle: string;
    avatar_url: string | null;
  } | null;
  tags: Array<{ tag_name: string; tag_sentiment: string }>;
}

interface TopSticker {
  tag_name: string;
  tag_sentiment: string;
  count: number;
}

interface AllReviewsModalProps {
  vehicleId: string;
  vehicleName: string;
  onClose: () => void;
  onLeaveReview: () => void;
}

function StarLine({ label, value, count }: { label: string; value: number; count?: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold uppercase tracking-wider text-secondary w-20">{label}</span>
      <div className="flex items-center gap-0.5 flex-1">
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} className="flex-1 h-1.5 rounded-full overflow-hidden bg-neutral-700">
            <div
              className="h-full bg-yellow-400 rounded-full transition-all"
              style={{ width: `${Math.min(100, (value / 5) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <span className="text-sm font-bold text-primary w-8 text-right">{value.toFixed(1)}</span>
      {count !== undefined && (
        <span className="text-xs text-secondary w-12 text-right">({count})</span>
      )}
    </div>
  );
}

function MiniStars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`w-3 h-3 ${s <= value ? 'fill-yellow-400 text-yellow-400' : 'fill-neutral-700 text-neutral-700'}`} />
      ))}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function AllReviewsModal({ vehicleId, vehicleName, onClose, onLeaveReview }: AllReviewsModalProps) {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<VehicleRatings | null>(null);
  const [reviews, setReviews] = useState<ReviewWithAuthor[]>([]);
  const [topStickers, setTopStickers] = useState<TopSticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlinkedSpots, setUnlinkedSpots] = useState<ReviewWithAuthor[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [disputeReviewId, setDisputeReviewId] = useState<string | null>(null);
  const [disputeComment, setDisputeComment] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  useEffect(() => {
    loadInitialData();
  }, [vehicleId]);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([loadRatings(), loadStickers(), loadReviews(0), loadUnlinkedSpots()]);
    setLoading(false);
  };

  const loadRatings = async () => {
    const { data } = await supabase
      .from('vehicle_ratings')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .maybeSingle();
    if (data) setRatings(data);
  };

  const loadStickers = async () => {
    const { data } = await supabase
      .from('vehicle_sticker_counts')
      .select('tag_name, tag_sentiment, count')
      .eq('vehicle_id', vehicleId)
      .order('count', { ascending: false })
      .limit(10);
    if (data) setTopStickers(data);
  };

  const loadUnlinkedSpots = async () => {
    // Get all spot_history entries for this vehicle
    const { data: spotData } = await supabase
      .from('spot_history')
      .select(`
        id, spot_type, created_at, spotter_id,
        spotter:profiles!spot_history_spotter_id_fkey(handle, avatar_url)
      `)
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false });

    if (!spotData || spotData.length === 0) return;

    // Get spot_history IDs that are already linked to posts
    const { data: linkedData } = await supabase
      .from('posts')
      .select('spot_history_id')
      .eq('vehicle_id', vehicleId)
      .in('post_type', ['spot', 'review'])
      .not('spot_history_id', 'is', null);

    const linkedIds = new Set((linkedData || []).map((r: any) => r.spot_history_id));

    // Convert unlinked spot_history entries to display format
    const unlinked: ReviewWithAuthor[] = (spotData as any[])
      .filter(s => !linkedIds.has(s.id))
      .map(s => ({
        id: s.id,
        spot_type: (s.spot_type as 'quick' | 'full') || 'quick',
        rating_driver: 0,
        rating_driving: 0,
        rating_vehicle: 0,
        looks_rating: null,
        sound_rating: null,
        condition_rating: null,
        sentiment: null,
        comment: null,
        created_at: s.created_at,
        author: Array.isArray(s.spotter) ? s.spotter[0] : s.spotter,
        tags: [],
      }));

    setUnlinkedSpots(unlinked);
  };

  const loadReviews = useCallback(async (pageNum: number) => {
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data } = await supabase
      .from('posts')
      .select(`
        id, spot_type, rating_driver, rating_driving, rating_vehicle,
        looks_rating, sound_rating, condition_rating, sentiment, caption, created_at,
        author:profiles!posts_author_id_fkey(handle, avatar_url)
      `)
      .eq('vehicle_id', vehicleId)
      .in('post_type', ['spot', 'review'])
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!data || data.length === 0) {
      setHasMore(false);
      return;
    }

    const reviewIds = data.map((r: any) => r.id);
    const { data: tagData } = await supabase
      .from('review_tags')
      .select('review_id, tag_name, tag_sentiment')
      .in('review_id', reviewIds);

    const tagsByReview: Record<string, Array<{ tag_name: string; tag_sentiment: string }>> = {};
    (tagData || []).forEach((t: any) => {
      if (!tagsByReview[t.review_id]) tagsByReview[t.review_id] = [];
      tagsByReview[t.review_id].push({ tag_name: t.tag_name, tag_sentiment: t.tag_sentiment });
    });

    const enriched: ReviewWithAuthor[] = (data as any[]).map(r => ({
      ...r,
      comment: r.caption ?? r.comment ?? null,
      author: Array.isArray(r.author) ? r.author[0] : r.author,
      tags: tagsByReview[r.id] || [],
    }));

    if (pageNum === 0) {
      setReviews(enriched);
    } else {
      setReviews(prev => [...prev, ...enriched]);
    }

    setHasMore(data.length === PAGE_SIZE);
  }, [vehicleId]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await loadReviews(nextPage);
    setLoadingMore(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950">
      <div className="flex items-center justify-between px-4 py-4 border-b border-surfacehighlight bg-surface flex-shrink-0">
        <div>
          <h2 className="text-lg font-heading font-black uppercase tracking-tight text-primary">All Spots</h2>
          <p className="text-xs text-secondary">{vehicleName}</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-surfacehighlight transition-colors">
          <X className="w-5 h-5 text-secondary" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
            {ratings && ratings.spot_count > 0 && (
              <div className="bg-surface border border-surfacehighlight rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-heading font-bold uppercase tracking-tight text-sm">Rating Summary</h3>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-lg font-black text-primary">{ratings.overall_avg.toFixed(1)}</span>
                    <span className="text-secondary text-xs">/ 5</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <StarLine label="Driver" value={ratings.driver_avg} count={ratings.spot_count} />
                  <StarLine label="Driving" value={ratings.driving_avg} count={ratings.spot_count} />
                  <StarLine label="Vehicle" value={ratings.vehicle_avg} count={ratings.spot_count} />
                  {ratings.looks_avg != null && <StarLine label="Looks" value={ratings.looks_avg} count={ratings.full_review_count} />}
                  {ratings.sound_avg != null && <StarLine label="Sound" value={ratings.sound_avg} count={ratings.full_review_count} />}
                  {ratings.condition_avg != null && <StarLine label="Condition" value={ratings.condition_avg} count={ratings.full_review_count} />}
                </div>

                {(ratings.love_count > 0 || ratings.hate_count > 0) && (
                  <div className="pt-3 border-t border-surfacehighlight">
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
                        className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full transition-all"
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
                  <div className="pt-3 border-t border-surfacehighlight">
                    <p className="text-xs font-bold uppercase tracking-wider text-secondary mb-2">Top Stickers</p>
                    <div className="flex flex-wrap gap-2">
                      {topStickers.map(s => (
                        <span
                          key={s.tag_name}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium ${
                            s.tag_sentiment === 'positive'
                              ? 'bg-rose-500/15 text-rose-300'
                              : 'bg-neutral-700/60 text-neutral-400'
                          }`}
                        >
                          {s.tag_name}
                          <span className="opacity-70">×{s.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-surfacehighlight">
                  <div className="text-center">
                    <p className="text-xl font-black text-primary">{ratings.spot_count}</p>
                    <p className="text-xs text-secondary">Total Spots</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-primary">{ratings.quick_spot_count}</p>
                    <p className="text-xs text-secondary">Quick Spots</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-black text-primary">{ratings.full_review_count}</p>
                    <p className="text-xs text-secondary">Full Spots</p>
                  </div>
                </div>
              </div>
            )}

            {reviews.length === 0 && unlinkedSpots.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-surfacehighlight rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Car className="w-8 h-8 text-secondary" />
                </div>
                <p className="text-secondary">No spots yet</p>
                <p className="text-sm text-neutral-600 mt-1">Be the first to spot this plate</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-heading font-bold uppercase tracking-tight text-sm text-secondary">
                  Spots ({reviews.length + unlinkedSpots.length}{hasMore ? '+' : ''})
                </h3>
                {[...reviews, ...unlinkedSpots]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map(review => (
                  <div key={review.id} className="bg-surface border border-surfacehighlight rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          src={review.author?.avatar_url || null}
                          alt={review.author?.handle || 'User'}
                          size="sm"
                        />
                        <div>
                          <p className="font-bold text-sm">@{review.author?.handle || 'Anonymous'}</p>
                          <p className="text-xs text-secondary">{timeAgo(review.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium ${
                          review.sentiment === 'love'
                            ? 'bg-rose-500/20 text-rose-400'
                            : review.sentiment === 'hate'
                            ? 'bg-neutral-700/50 text-neutral-400'
                            : 'bg-surfacehighlight text-secondary'
                        }`}>
                          {review.sentiment === 'love' ? <Heart className="w-3 h-3 fill-current" /> : review.sentiment === 'hate' ? <ThumbsDown className="w-3 h-3" /> : null}
                          {review.sentiment === 'love' ? 'Love It' : review.sentiment === 'hate' ? 'Hate It' : ''}
                        </div>
                        {user && (
                          <button
                            onClick={() => {
                              setDisputeReviewId(review.id);
                              setDisputeComment(review.comment);
                            }}
                            className="p-1.5 rounded-lg hover:bg-orange-500/20 text-neutral-600 hover:text-orange-400 transition-colors"
                            title="Dispute this review"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {review.rating_driver > 0 || review.rating_driving > 0 || review.rating_vehicle > 0 ? (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {[
                          { l: 'Driver', v: review.rating_driver },
                          { l: 'Driving', v: review.rating_driving },
                          { l: 'Vehicle', v: review.rating_vehicle },
                          ...(review.looks_rating ? [{ l: 'Looks', v: review.looks_rating }] : []),
                          ...(review.sound_rating ? [{ l: 'Sound', v: review.sound_rating }] : []),
                          ...(review.condition_rating ? [{ l: 'Condition', v: review.condition_rating }] : []),
                        ].map(item => (
                          <div key={item.l} className="text-center">
                            <p className="text-xs text-secondary mb-1">{item.l}</p>
                            <MiniStars value={item.v} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mb-3 text-xs text-secondary bg-surfacehighlight rounded-lg px-3 py-2">
                        Spotted — no rating left
                      </div>
                    )}

                    {review.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {review.tags.map(tag => (
                          <span
                            key={tag.tag_name}
                            className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                              tag.tag_sentiment === 'positive'
                                ? 'bg-rose-500/15 text-rose-300'
                                : 'bg-neutral-700/50 text-neutral-400'
                            }`}
                          >
                            {tag.tag_name}
                          </span>
                        ))}
                      </div>
                    )}

                    {review.comment && (
                      <p className="text-sm text-secondary italic">"{review.comment}"</p>
                    )}
                  </div>
                ))}

                {hasMore && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-surface border border-surfacehighlight hover:bg-surfacehighlight rounded-xl text-sm text-secondary font-medium transition-all"
                  >
                    {loadingMore ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Load More
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 p-4 border-t border-surfacehighlight bg-surface">
        <button
          onClick={onLeaveReview}
          className="w-full py-3.5 bg-accent-primary hover:bg-accent-primary/90 rounded-xl font-heading font-bold uppercase tracking-tight transition-all active:scale-95"
        >
          Spot This Plate
        </button>
      </div>

      {disputeReviewId && (
        <DisputeReviewModal
          reviewId={disputeReviewId}
          reviewComment={disputeComment}
          onClose={() => {
            setDisputeReviewId(null);
            setDisputeComment(null);
          }}
        />
      )}
    </div>
  );
}
