import { useState, useEffect } from 'react';
import { Star, Heart, ThumbsDown, Wrench, Car } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TierBadge } from './TierBadge';
import { UserAvatar } from './UserAvatar';
import { AllReviewsModal } from './AllReviewsModal';
import { LicensePlate } from './LicensePlate';
import { haptics } from '../lib/haptics';

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
    profile_image_url?: string | null;
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
  onViewVehicle?: (vehicleId: string) => void;
}

export function PlateFoundClaimed({
  state,
  plateNumber,
  vehicle,
  onLeaveReview,
  onBack,
  onViewOwnerProfile,
  onViewVehicle,
}: PlateFoundClaimedProps) {
  const [ratings, setRatings] = useState<FullRatings | null>(null);
  const [topStickers, setTopStickers] = useState<TopSticker[]>([]);
  const [modCategories, setModCategories] = useState<ModCategory[]>([]);
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
    Promise.all([
      supabase
        .from('vehicle_ratings')
        .select('*')
        .eq('vehicle_id', vehicle.id)
        .maybeSingle(),
      supabase
        .from('vehicle_sticker_counts')
        .select('tag_name, tag_sentiment, count')
        .eq('vehicle_id', vehicle.id)
        .order('count', { ascending: false })
        .limit(3),
      supabase
        .from('modifications')
        .select('category')
        .eq('vehicle_id', vehicle.id),
    ]).then(([{ data: rData }, { data: sData }, { data: mData }]) => {
      if (rData) setRatings(rData);
      if (sData) setTopStickers(sData);
      if (mData) {
        const counts: Record<string, number> = {};
        mData.forEach((m: Record<string, unknown>) => {
          const cat = (m.category as string) || 'Other';
          counts[cat] = (counts[cat] || 0) + 1;
        });
        setModCategories(Object.entries(counts).map(([category, count]) => ({ category, count })));
      }
    });
  }, [vehicle.id]);

  const ratingRows = ratings ? [
    { label: 'Driver', value: ratings.driver_avg, count: ratings.spot_count },
    { label: 'Driving', value: ratings.driving_avg, count: ratings.spot_count },
    { label: 'Vehicle', value: ratings.vehicle_avg, count: ratings.spot_count },
    ...(ratings.looks_avg != null ? [{ label: 'Looks', value: ratings.looks_avg, count: ratings.full_review_count }] : []),
    ...(ratings.sound_avg != null ? [{ label: 'Sound', value: ratings.sound_avg, count: ratings.full_review_count }] : []),
    ...(ratings.condition_avg != null ? [{ label: 'Condition', value: ratings.condition_avg, count: ratings.full_review_count }] : []),
  ] : [];

  const C = {
    bg: '#030508',
    surface: '#0a0d14',
    border: 'rgba(255,255,255,0.06)',
    orange: '#F97316',
    text1: '#eef4f8',
    text2: '#7a8e9e',
    text3: '#5a6e7e',
  };

  const stateCode = state.length === 2 ? state : state.substring(0, 2).toUpperCase();

  return (
    <>
      <div style={{ maxWidth: 512, margin: '0 auto', padding: '0 16px' }}>
          {/* Header */}
          <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '20px 24px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 6, marginBottom: 12 }}>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.orange }}>Claimed Plate</span>
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
              {(vehicle.profile_image_url || vehicle.stock_image_url) ? (
                <div style={{ aspectRatio: '16/9' }}>
                  <img src={(vehicle.profile_image_url || vehicle.stock_image_url)!} alt={vehicleName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ) : (
                <div style={{ aspectRatio: '16/9', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Car style={{ width: 64, height: 64, color: C.text3 }} />
                </div>
              )}
              <div style={{ padding: 20 }}>
                <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: C.text1, margin: '0 0 4px', textTransform: 'uppercase' }}>{vehicleName}</h3>
                {vehicle.color && <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: C.text2, margin: '0 0 16px', textTransform: 'capitalize' }}>{vehicle.color}</p>}

                {/* Owner row */}
                {vehicle.owner && (
                  <button
                    onClick={() => onViewOwnerProfile?.(vehicle.owner_id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <UserAvatar src={vehicle.owner.avatar_url} alt={vehicle.owner.handle} size="md" />
                      <div style={{ textAlign: 'left' }}>
                        <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.text2, margin: 0 }}>Owner</p>
                        <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 14, fontWeight: 600, color: C.text1, margin: '2px 0 0' }}>@{vehicle.owner.handle}</p>
                      </div>
                    </div>
                    <TierBadge tier={vehicle.verification_tier} size="medium" />
                  </button>
                )}
              </div>
            </div>

            {/* Ratings */}
            {ratings && ratings.spot_count > 0 && (
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Star style={{ width: 20, height: 20, fill: C.orange, color: C.orange }} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: C.text1 }}>{ratings.overall_avg.toFixed(1)}</span>
                    <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: C.text2 }}>/ 5</span>
                  </div>
                  <button
                    onClick={() => setShowAllReviews(true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow', sans-serif", fontSize: 12, fontWeight: 600, color: C.orange }}
                  >
                    View {ratings.spot_count} spots
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                  {ratingRows.map(r => (
                    <div key={r.label} style={{ background: C.surface, borderRadius: 8, padding: 8, textAlign: 'center' }}>
                      <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.text2, margin: '0 0 4px' }}>{r.label}</p>
                      <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 14, fontWeight: 700, color: C.text1, margin: 0 }}>{r.value.toFixed(1)}</p>
                      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.text3, margin: '2px 0 0' }}>({r.count})</p>
                    </div>
                  ))}
                </div>

                {(ratings.love_count > 0 || ratings.hate_count > 0) && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fb7185' }}>
                        <Heart style={{ width: 16, height: 16, fill: 'currentColor' }} />
                        <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, fontWeight: 700 }}>{ratings.love_count} Love It</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.text2 }}>
                        <ThumbsDown style={{ width: 16, height: 16 }} />
                        <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, fontWeight: 700 }}>{ratings.hate_count} Hate It</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          background: '#fb7185',
                          borderRadius: 9999,
                          width: `${ratings.love_count + ratings.hate_count > 0
                            ? (ratings.love_count / (ratings.love_count + ratings.hate_count)) * 100
                            : 0}%`
                        }}
                      />
                    </div>
                  </div>
                )}

                {topStickers.length > 0 && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                    <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.text2, margin: '0 0 10px' }}>Top Stickers</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {topStickers.map(s => (
                        <span
                          key={s.tag_name}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontFamily: "'Barlow', sans-serif", fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                            ...(s.tag_sentiment === 'positive'
                              ? { background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', color: '#F97316' }
                              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: C.text2 }),
                          }}
                        >
                          {s.tag_name}
                          <span style={{ opacity: 0.6 }}>{'\u00d7'}{s.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mods */}
            {modCategories.length > 0 && (
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Wrench style={{ width: 14, height: 14, color: C.text2 }} />
                  <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.text2, margin: 0 }}>Modifications</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {modCategories.map(mod => (
                    <div key={mod.category} style={{ background: C.surface, borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, fontWeight: 600, color: C.text1 }}>{mod.category}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.text2, background: C.bg, padding: '2px 8px', borderRadius: 4 }}>{mod.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, transition: 'all 0.5s', opacity: revealStep >= 4 ? 1 : 0, transform: revealStep >= 4 ? 'translateY(0)' : 'translateY(8px)' }}>
              {onViewVehicle && (
                <button
                  onClick={() => onViewVehicle(vehicle.id)}
                  style={{ width: '100%', padding: '14px', background: C.orange, border: 'none', borderRadius: 8, fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#030508', cursor: 'pointer' }}
                >
                  VIEW VEHICLE PROFILE
                </button>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  onClick={onBack}
                  style={{ padding: '13px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.text2, cursor: 'pointer' }}
                >
                  Back
                </button>
                <button
                  onClick={onLeaveReview}
                  style={{ padding: '13px', background: C.orange, border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#030508', cursor: 'pointer' }}
                >
                  Spot This Plate
                </button>
              </div>

              {ratings && ratings.spot_count > 0 && (
                <button
                  onClick={() => setShowAllReviews(true)}
                  style={{ width: '100%', padding: '12px', background: 'none', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.text1, cursor: 'pointer' }}
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
