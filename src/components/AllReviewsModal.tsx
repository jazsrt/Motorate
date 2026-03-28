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
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{
        fontFamily: 'Barlow Condensed, sans-serif',
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.18em',
        color: '#7a8e9e',
        width: 80,
      }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
        {[1, 2, 3, 4, 5].map(s => (
          <div key={s} style={{
            flex: 1,
            height: 6,
            borderRadius: 9999,
            overflow: 'hidden',
            background: '#445566',
          }}>
            <div style={{
              height: '100%',
              background: '#f0a030',
              borderRadius: 9999,
              transition: 'all 0.3s',
              width: `${Math.min(100, (value / 5) * 100)}%`,
            }} />
          </div>
        ))}
      </div>
      <span style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 14,
        fontWeight: 700,
        color: '#eef4f8',
        width: 32,
        textAlign: 'right',
      }}>{value.toFixed(1)}</span>
      {count !== undefined && (
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 12,
          color: '#7a8e9e',
          width: 48,
          textAlign: 'right',
        }}>({count})</span>
      )}
    </div>
  );
}

function MiniStars({ value }: { value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          style={{
            width: 12,
            height: 12,
            fill: s <= value ? '#F97316' : '#445566',
            color: s <= value ? '#F97316' : '#445566',
          }}
        />
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

  const loadReviews = useCallback(async (pageNum: number) => {
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data } = await supabase
      .from('reviews')
      .select(`
        id, spot_type, rating_driver, rating_driving, rating_vehicle,
        looks_rating, sound_rating, condition_rating, sentiment, comment, created_at,
        author:profiles!reviews_author_id_fkey(handle, avatar_url)
      `)
      .eq('vehicle_id', vehicleId)
      .eq('is_hidden_by_owner', false)
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

  const loadInitialData = useCallback(async () => {
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

      // Get spot_history IDs that are already linked to reviews
      const { data: linkedData } = await supabase
        .from('reviews')
        .select('spot_history_id')
        .eq('vehicle_id', vehicleId)
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

    setLoading(true);
    await Promise.all([loadRatings(), loadStickers(), loadReviews(0), loadUnlinkedSpots()]);
    setLoading(false);
  }, [vehicleId, loadReviews]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await loadReviews(nextPage);
    setLoadingMore(false);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        background: '#0d1117',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 16,
        width: '100%',
        maxWidth: 500,
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <p style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: '#F97316',
              marginBottom: 2,
            }}>Reviews</p>
            <h2 style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 22,
              fontWeight: 700,
              color: '#eef4f8',
              lineHeight: 1.1,
              margin: 0,
            }}>Community Reviews</h2>
            <p style={{
              fontFamily: 'Barlow, sans-serif',
              fontSize: 13,
              color: '#7a8e9e',
              marginTop: 2,
            }}>{vehicleName}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 8,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X style={{ width: 20, height: 20, color: '#7a8e9e' }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 20px',
        }}>
          {loading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 0',
            }}>
              <div style={{
                width: 32,
                height: 32,
                border: '2px solid #F97316',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Rating Summary */}
              {ratings && ratings.spot_count > 0 && (
                <div style={{
                  background: '#131920',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 12,
                  padding: 20,
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}>
                    <span style={{
                      fontFamily: 'Barlow Condensed, sans-serif',
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.18em',
                      color: '#7a8e9e',
                    }}>Rating Summary</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Star style={{ width: 16, height: 16, fill: '#F97316', color: '#F97316' }} />
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 18,
                        fontWeight: 700,
                        color: '#eef4f8',
                      }}>{ratings.overall_avg.toFixed(1)}</span>
                      <span style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 12,
                        color: '#7a8e9e',
                      }}>/ 5</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <StarLine label="Driver" value={ratings.driver_avg} count={ratings.spot_count} />
                    <StarLine label="Driving" value={ratings.driving_avg} count={ratings.spot_count} />
                    <StarLine label="Vehicle" value={ratings.vehicle_avg} count={ratings.spot_count} />
                    {ratings.looks_avg != null && <StarLine label="Looks" value={ratings.looks_avg} count={ratings.full_review_count} />}
                    {ratings.sound_avg != null && <StarLine label="Sound" value={ratings.sound_avg} count={ratings.full_review_count} />}
                    {ratings.condition_avg != null && <StarLine label="Condition" value={ratings.condition_avg} count={ratings.full_review_count} />}
                  </div>

                  {/* Love/Hate bar */}
                  {(ratings.love_count > 0 || ratings.hate_count > 0) && (
                    <div style={{
                      paddingTop: 12,
                      marginTop: 12,
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 8,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444' }}>
                          <Heart style={{ width: 16, height: 16, fill: 'currentColor' }} />
                          <span style={{
                            fontFamily: 'Barlow, sans-serif',
                            fontSize: 13,
                            fontWeight: 700,
                          }}>{ratings.love_count} Love It</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7a8e9e' }}>
                          <ThumbsDown style={{ width: 16, height: 16 }} />
                          <span style={{
                            fontFamily: 'Barlow, sans-serif',
                            fontSize: 13,
                            fontWeight: 700,
                          }}>{ratings.hate_count} Hate It</span>
                        </div>
                      </div>
                      <div style={{
                        height: 8,
                        background: '#445566',
                        borderRadius: 9999,
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          background: 'linear-gradient(to right, #ef4444, #f87171)',
                          borderRadius: 9999,
                          transition: 'all 0.3s',
                          width: `${ratings.love_count + ratings.hate_count > 0
                            ? (ratings.love_count / (ratings.love_count + ratings.hate_count)) * 100
                            : 0}%`,
                        }} />
                      </div>
                    </div>
                  )}

                  {/* Top Stickers */}
                  {topStickers.length > 0 && (
                    <div style={{
                      paddingTop: 12,
                      marginTop: 12,
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <p style={{
                        fontFamily: 'Barlow Condensed, sans-serif',
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.18em',
                        color: '#7a8e9e',
                        marginBottom: 8,
                      }}>Top Stickers</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {topStickers.map(s => (
                          <span
                            key={s.tag_name}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontFamily: 'Barlow, sans-serif',
                              fontSize: 12,
                              padding: '4px 10px',
                              borderRadius: 8,
                              fontWeight: 500,
                              background: s.tag_sentiment === 'positive'
                                ? 'rgba(239,68,68,0.15)'
                                : 'rgba(68,85,102,0.6)',
                              color: s.tag_sentiment === 'positive'
                                ? '#fca5a5'
                                : '#7a8e9e',
                            }}
                          >
                            {s.tag_name}
                            <span style={{ opacity: 0.7 }}>{'\u00d7'}{s.count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stats row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 12,
                    paddingTop: 12,
                    marginTop: 12,
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 20,
                        fontWeight: 700,
                        color: '#eef4f8',
                        margin: 0,
                      }}>{ratings.spot_count}</p>
                      <p style={{
                        fontFamily: 'Barlow, sans-serif',
                        fontSize: 12,
                        color: '#7a8e9e',
                        margin: 0,
                      }}>Total Spots</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 20,
                        fontWeight: 700,
                        color: '#eef4f8',
                        margin: 0,
                      }}>{ratings.quick_spot_count}</p>
                      <p style={{
                        fontFamily: 'Barlow, sans-serif',
                        fontSize: 12,
                        color: '#7a8e9e',
                        margin: 0,
                      }}>Quick Spots</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: 20,
                        fontWeight: 700,
                        color: '#eef4f8',
                        margin: 0,
                      }}>{ratings.full_review_count}</p>
                      <p style={{
                        fontFamily: 'Barlow, sans-serif',
                        fontSize: 12,
                        color: '#7a8e9e',
                        margin: 0,
                      }}>Full Spots</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Reviews List */}
              {reviews.length === 0 && unlinkedSpots.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0' }}>
                  <div style={{
                    width: 64,
                    height: 64,
                    background: '#131920',
                    borderRadius: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}>
                    <Car style={{ width: 32, height: 32, color: '#7a8e9e' }} />
                  </div>
                  <p style={{
                    fontFamily: 'Barlow, sans-serif',
                    fontSize: 13,
                    color: '#7a8e9e',
                    margin: 0,
                  }}>No spots yet</p>
                  <p style={{
                    fontFamily: 'Barlow, sans-serif',
                    fontSize: 13,
                    color: '#445566',
                    marginTop: 4,
                  }}>Be the first to spot this plate</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <span style={{
                    fontFamily: 'Barlow Condensed, sans-serif',
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.18em',
                    color: '#7a8e9e',
                  }}>
                    Spots ({reviews.length + unlinkedSpots.length}{hasMore ? '+' : ''})
                  </span>

                  {[...reviews, ...unlinkedSpots]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map(review => (
                    <div key={review.id} style={{
                      background: '#131920',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 12,
                      padding: 16,
                    }}>
                      {/* Review header: avatar, handle, sentiment, dispute */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: 12,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <UserAvatar
                            src={review.author?.avatar_url || null}
                            alt={review.author?.handle || 'User'}
                            size="sm"
                          />
                          <div>
                            <p style={{
                              fontFamily: 'Barlow, sans-serif',
                              fontSize: 13,
                              fontWeight: 700,
                              color: '#F97316',
                              margin: 0,
                            }}>@{review.author?.handle || 'Anonymous'}</p>
                            <p style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: 11,
                              color: '#5a6e7e',
                              margin: 0,
                              marginTop: 2,
                            }}>{timeAgo(review.created_at)}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {review.sentiment && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              fontFamily: 'Barlow, sans-serif',
                              fontSize: 12,
                              padding: '4px 8px',
                              borderRadius: 8,
                              fontWeight: 500,
                              background: review.sentiment === 'love'
                                ? 'rgba(239,68,68,0.20)'
                                : 'rgba(68,85,102,0.50)',
                              color: review.sentiment === 'love'
                                ? '#f87171'
                                : '#7a8e9e',
                            }}>
                              {review.sentiment === 'love'
                                ? <Heart style={{ width: 12, height: 12, fill: 'currentColor' }} />
                                : <ThumbsDown style={{ width: 12, height: 12 }} />}
                              {review.sentiment === 'love' ? 'Love It' : 'Hate It'}
                            </div>
                          )}
                          {user && (
                            <button
                              onClick={() => {
                                setDisputeReviewId(review.id);
                                setDisputeComment(review.comment);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 6,
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#445566',
                              }}
                              title="Dispute this review"
                            >
                              <Flag style={{ width: 14, height: 14 }} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Star ratings grid */}
                      {review.rating_driver > 0 || review.rating_driving > 0 || review.rating_vehicle > 0 ? (
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: 8,
                          marginBottom: 12,
                        }}>
                          {[
                            { l: 'Driver', v: review.rating_driver },
                            { l: 'Driving', v: review.rating_driving },
                            { l: 'Vehicle', v: review.rating_vehicle },
                            ...(review.looks_rating ? [{ l: 'Looks', v: review.looks_rating }] : []),
                            ...(review.sound_rating ? [{ l: 'Sound', v: review.sound_rating }] : []),
                            ...(review.condition_rating ? [{ l: 'Condition', v: review.condition_rating }] : []),
                          ].map(item => (
                            <div key={item.l} style={{ textAlign: 'center' }}>
                              <p style={{
                                fontFamily: 'Barlow Condensed, sans-serif',
                                fontSize: 9,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.18em',
                                color: '#7a8e9e',
                                marginBottom: 4,
                                margin: 0,
                                paddingBottom: 4,
                              }}>{item.l}</p>
                              <MiniStars value={item.v} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{
                          marginBottom: 12,
                          fontFamily: 'Barlow, sans-serif',
                          fontSize: 12,
                          color: '#7a8e9e',
                          background: 'rgba(255,255,255,0.04)',
                          borderRadius: 8,
                          padding: '8px 12px',
                        }}>
                          Spotted — no rating left
                        </div>
                      )}

                      {/* Tags */}
                      {review.tags.length > 0 && (
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                          marginBottom: 12,
                        }}>
                          {review.tags.map(tag => (
                            <span
                              key={tag.tag_name}
                              style={{
                                fontFamily: 'Barlow, sans-serif',
                                fontSize: 12,
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontWeight: 500,
                                background: tag.tag_sentiment === 'positive'
                                  ? 'rgba(239,68,68,0.15)'
                                  : 'rgba(68,85,102,0.50)',
                                color: tag.tag_sentiment === 'positive'
                                  ? '#fca5a5'
                                  : '#7a8e9e',
                              }}
                            >
                              {tag.tag_name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Comment */}
                      {review.comment && (
                        <p style={{
                          fontFamily: 'Barlow, sans-serif',
                          fontSize: 13,
                          color: '#a8bcc8',
                          fontStyle: 'italic',
                          margin: 0,
                        }}>"{review.comment}"</p>
                      )}
                    </div>
                  ))}

                  {/* Load More */}
                  {hasMore && (
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '12px 0',
                        background: '#131920',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 12,
                        fontFamily: 'Barlow, sans-serif',
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#7a8e9e',
                        cursor: loadingMore ? 'default' : 'pointer',
                        opacity: loadingMore ? 0.6 : 1,
                      }}
                    >
                      {loadingMore ? (
                        <div style={{
                          width: 16,
                          height: 16,
                          border: '2px solid currentColor',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite',
                        }} />
                      ) : (
                        <>
                          <ChevronDown style={{ width: 16, height: 16 }} />
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

        {/* Bottom CTA */}
        <div style={{
          flexShrink: 0,
          padding: 16,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button
            onClick={onLeaveReview}
            style={{
              width: '100%',
              padding: '14px 0',
              background: '#F97316',
              border: 'none',
              borderRadius: 12,
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 16,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              color: '#eef4f8',
              cursor: 'pointer',
            }}
          >
            Spot This Plate
          </button>
        </div>
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
