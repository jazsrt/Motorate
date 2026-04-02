import { useState, useEffect } from 'react';
import { Star, User, Heart, ThumbsDown, Eye, Car, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserAvatar } from './UserAvatar';
import { AllReviewsModal } from './AllReviewsModal';
import { LicensePlate } from './LicensePlate';
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
    profile_image_url?: string | null;
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
      const { count: spotCount } = await supabase
        .from('spot_history')
        .select('*', { count: 'exact', head: true })
        .eq('vehicle_id', vehicle.id);

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

        setRecentReviews(recentWithComments as any as RecentReview[]);
      } else if (spotCount) {
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

  const C = {
    bg: '#030508',
    surface: '#0a0d14',
    surface2: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.06)',
    orange: '#F97316',
    text1: '#eef4f8',
    text2: '#7a8e9e',
    text3: '#5a6e7e',
  };

  const stateCode = state.length === 2 ? state : state.substring(0, 2).toUpperCase();

  return (
    <>
      <div style={{ padding: '0 16px' }}>
          {/* Header */}
          <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '20px 24px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 6, marginBottom: 12 }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.orange }}>Unclaimed Plate</span>
            </div>
            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 26, fontWeight: 700, color: C.text1, margin: '0 0 8px', textTransform: 'uppercase' }}>Plate Found</h2>
            <div style={{ display: 'inline-block', transition: 'opacity 0.7s', opacity: revealStep >= 1 ? 1 : 0 }}>
              <LicensePlate plateNumber={plateNumber} plateState={stateCode} size="lg" />
            </div>
            <div style={{ height: 1, margin: '10px auto 0', maxWidth: 200, background: C.orange, transition: 'width 0.3s', width: revealStep >= 2 ? '100%' : 0 }} />
          </div>

          {/* Body */}
          <div style={{ padding: 24, transition: 'all 0.5s', opacity: revealStep >= 3 ? 1 : 0, transform: revealStep >= 3 ? 'translateY(0)' : 'translateY(8px)' }}>
            {/* Vehicle card */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
              {vehicle.profile_image_url ? (
                <div style={{ aspectRatio: '16/9' }}>
                  <img src={vehicle.profile_image_url} alt={vehicleName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ) : (
                <div style={{ aspectRatio: '16/9', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Car style={{ width: 64, height: 64, color: '#3a4e60' }} />
                </div>
              )}

              <div style={{ padding: 20 }}>
                <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: C.text1, margin: '0 0 16px', textTransform: 'uppercase' }}>{vehicleName}</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  {vehicle.year && (
                    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, textAlign: 'center' }}>
                      <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.text2, margin: '0 0 4px' }}>Year</p>
                      <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 14, fontWeight: 600, color: C.text1, margin: 0 }}>{vehicle.year}</p>
                    </div>
                  )}
                  {vehicle.make && (
                    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, textAlign: 'center' }}>
                      <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.text2, margin: '0 0 4px' }}>Make</p>
                      <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 14, fontWeight: 600, color: C.text1, margin: 0 }}>{vehicle.make}</p>
                    </div>
                  )}
                  {vehicle.color && (
                    <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 10, textAlign: 'center' }}>
                      <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.text2, margin: '0 0 4px' }}>Color</p>
                      <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 14, fontWeight: 600, color: C.text1, margin: 0, textTransform: 'capitalize' }}>{vehicle.color}</p>
                    </div>
                  )}
                </div>

                {/* Ratings */}
                {ratings && ratings.spot_count > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Star style={{ width: 20, height: 20, fill: C.orange, color: C.orange }} />
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: C.text1 }}>{ratings.overall_avg.toFixed(1)}</span>
                        <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: C.text2 }}>/ 5</span>
                      </div>
                      <button
                        onClick={() => setShowAllReviews(true)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow', sans-serif", fontSize: 12, fontWeight: 600, color: C.orange }}
                      >
                        View {ratings.spot_count} {ratings.spot_count === 1 ? 'spot' : 'spots'}
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                      {[
                        { label: 'Driver', value: ratings.driver_avg },
                        { label: 'Driving', value: ratings.driving_avg },
                        { label: 'Vehicle', value: ratings.vehicle_avg },
                      ].map(r => (
                        <div key={r.label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, textAlign: 'center' }}>
                          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.text2, margin: '0 0 4px' }}>{r.label}</p>
                          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 14, fontWeight: 700, color: C.text1, margin: 0 }}>{r.value.toFixed(1)}</p>
                        </div>
                      ))}
                    </div>

                    {(ratings.love_count > 0 || ratings.hate_count > 0) && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '8px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fb7185' }}>
                          <Heart style={{ width: 16, height: 16, fill: 'currentColor' }} />
                          <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, fontWeight: 700 }}>{ratings.love_count}</span>
                        </div>
                        <div style={{ width: 1, height: 16, background: C.border }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#9CA3AF' }}>
                          <ThumbsDown style={{ width: 16, height: 16 }} />
                          <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, fontWeight: 700 }}>{ratings.hate_count}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recent reviews */}
                {recentReviews.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.text2, margin: '0 0 10px' }}>Recent Spots</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {recentReviews.map((review) => (
                        <div key={review.id} style={{ background: C.bg, borderRadius: 8, padding: 12, border: `1px solid ${C.border}` }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                            {review.author && (
                              <>
                                <UserAvatar src={review.author.avatar_url} alt={review.author.handle} size="sm" />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, fontWeight: 600, color: C.text1, margin: 0 }}>@{review.author.handle}</p>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                    <Star style={{ width: 12, height: 12, fill: C.orange, color: C.orange }} />
                                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: C.text1 }}>
                                      {((review.driver_rating + review.driving_rating + review.vehicle_rating) / 3).toFixed(1)}
                                    </span>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                          {review.comment && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                              <MessageCircle style={{ width: 12, height: 12, color: C.text3, flexShrink: 0, marginTop: 2 }} />
                              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: C.text2, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{review.comment}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Spotted by */}
                {vehicle.creator && (
                  <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
                    <User style={{ width: 14, height: 14, color: C.text3, flexShrink: 0 }} />
                    <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: C.text2 }}>Spotted by</span>
                    <UserAvatar src={vehicle.creator.avatar_url} alt={vehicle.creator.handle} size="sm" />
                    <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, fontWeight: 600, color: C.text1 }}>@{vehicle.creator.handle}</span>
                  </div>
                )}
              </div>
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ratings && ratings.spot_count > 0 && (
                <button
                  onClick={() => setShowAllReviews(true)}
                  style={{ width: '100%', padding: '12px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.text1, cursor: 'pointer' }}
                >
                  SEE ALL SPOTS ({ratings.spot_count})
                </button>
              )}

              {onViewVehicle && (
                <button
                  onClick={() => onViewVehicle(vehicle.id)}
                  style={{ width: '100%', padding: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.text1, cursor: 'pointer' }}
                >
                  <Eye style={{ width: 16, height: 16 }} /> VIEW PLATE PROFILE
                </button>
              )}

              <button
                onClick={onSpotAndReview}
                disabled={!isLoggedIn}
                style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#030508', cursor: isLoggedIn ? 'pointer' : 'not-allowed', opacity: isLoggedIn ? 1 : 0.5, transition: 'all 0.5s', transform: revealStep >= 4 ? 'translateY(0)' : 'translateY(8px)' }}
              >
                SPOT THIS PLATE {'\u00B7'} +15 RP
              </button>

              {isLoggedIn && (
                <div style={{ paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                  <p style={{ textAlign: 'center', fontFamily: "'Barlow', sans-serif", fontSize: 13, color: C.text2, margin: '0 0 10px' }}>Is this your car?</p>
                  <button
                    onClick={onClaimVehicle}
                    style={{ width: '100%', padding: '13px', background: '#0a0d14', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#F97316', cursor: 'pointer' }}
                  >
                    VERIFY OWNERSHIP
                  </button>
                </div>
              )}
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
