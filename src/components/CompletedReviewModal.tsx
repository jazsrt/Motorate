import { useEffect, useRef, useState } from 'react';
import { Star, Heart, ThumbsDown, X, Zap, TrendingUp, Award, Share2 } from 'lucide-react';
import type { SpotWizardData } from '../types/spot';
import { floatPoints } from '../utils/floatPoints';
import { shareToSocial } from './ShareCardGenerator';
import { supabase } from '../lib/supabase';

interface CompletedReviewModalProps {
  vehicleId: string;
  spotType: 'quick' | 'full';
  wizardData: SpotWizardData;
  driverRating: number;
  drivingRating: number;
  vehicleRating: number;
  looksRating?: number;
  soundRating?: number;
  conditionRating?: number;
  sentiment: 'love' | 'hate';
  comment?: string;
  selectedTags?: string[];
  reputationEarned: number;
  isFirstSpot?: boolean;
  newRank?: number;
  rankChange?: number;
  nextBadgeName?: string;
  nextBadgeRemaining?: number;
  onDone: () => void;
  onViewVehicle: (vehicleId: string) => void;
  onUpgradeToFull?: () => void;
  userId?: string;
  userHandle?: string;
}

function StarDisplay({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#7a8e9e' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <Star key={star} style={{ width: 14, height: 14, color: star <= value ? '#F97316' : '#445566', fill: star <= value ? '#F97316' : 'transparent' }} />
        ))}
      </div>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: '#eef4f8', width: 24, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

function BecomeAFanPrompt({ vehicleId, userId }: { vehicleId: string; userId: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'pending' | 'already'>('idle');

  useEffect(() => {
    supabase
      .from('vehicle_follows')
      .select('id, status')
      .eq('vehicle_id', vehicleId)
      .eq('follower_id', userId)
      .maybeSingle()
      .then(({ data }) => { if (data) setStatus('already'); });
  }, [vehicleId, userId]);

  const handleBecomeFan = async () => {
    setStatus('loading');
    // Check if vehicle is private
    const { data: vData } = await supabase
      .from('vehicles')
      .select('is_private')
      .eq('id', vehicleId)
      .maybeSingle();
    const newStatus = vData?.is_private ? 'pending' : 'accepted';
    const { error } = await supabase
      .from('vehicle_follows')
      .insert({ vehicle_id: vehicleId, follower_id: userId, status: newStatus });
    if (error) {
      setStatus('idle');
    } else {
      setStatus(newStatus === 'pending' ? 'pending' : 'done');
      try {
        if (newStatus === 'accepted') {
          const { notifyVehicleFollow } = await import('../lib/notifications');
          await notifyVehicleFollow(vehicleId, userId);
        } else {
          const { notifyVehicleFollowRequest } = await import('../lib/notifications');
          await notifyVehicleFollowRequest(vehicleId, userId);
        }
      } catch { /* intentionally empty */ }
    }
  };

  if (status === 'already' || status === 'done') {
    return (
      <div style={{ padding: '10px 20px', textAlign: 'center' as const }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316' }}>
          {status === 'done' ? 'You\'re now a fan!' : 'Already a fan'}
        </span>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div style={{ padding: '10px 20px', textAlign: 'center' as const }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#f0a030' }}>
          Request sent — waiting for owner approval
        </span>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' as const }}>
      <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#5a6e7e', marginBottom: 8 }}>Want updates on this car?</div>
      <button
        onClick={handleBecomeFan}
        disabled={status === 'loading'}
        style={{
          padding: '10px 24px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 8,
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const,
          color: '#F97316', cursor: 'pointer',
        }}
      >
        {status === 'loading' ? 'Joining...' : 'Become a Fan'}
      </button>
    </div>
  );
}

export function CompletedReviewModal({
  vehicleId, spotType, wizardData, driverRating, drivingRating, vehicleRating,
  looksRating, soundRating, conditionRating, sentiment, comment, selectedTags = [],
  reputationEarned, isFirstSpot, newRank, rankChange, nextBadgeName, nextBadgeRemaining,
  onDone, onViewVehicle, onUpgradeToFull, userId, userHandle,
}: CompletedReviewModalProps) {
  const vehicleName = [wizardData.year, wizardData.make, wizardData.model].filter(Boolean).join(' ');
  const pointsRef = useRef<HTMLDivElement>(null);
  const stockImageUrl = wizardData.stockImageUrl;

  useEffect(() => {
    const t = setTimeout(() => floatPoints(pointsRef.current, `+${reputationEarned}`), 400);
    return () => clearTimeout(t);
  }, [reputationEarned]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div ref={pointsRef} style={{
        background: '#0d1117', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 16,
        width: '100%', maxWidth: 420, maxHeight: '85vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column' as const,
      }}>
        {/* Hero header */}
        <div style={{
          padding: '24px 20px', textAlign: 'center' as const, position: 'relative' as const,
          background: 'rgba(249,115,22,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button onClick={onDone} style={{
            position: 'absolute', top: 14, right: 14,
            width: 32, height: 32, borderRadius: 8,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <X style={{ width: 14, height: 14, color: '#7a8e9e' }} />
          </button>

          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316', marginBottom: 12,
          }}>
            Spot Logged
          </div>

          {/* RP earned */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Zap style={{ width: 20, height: 20, color: '#F97316' }} />
            <span style={{
              fontFamily: "'Rajdhani', sans-serif", fontSize: 48, fontWeight: 700,
              color: '#F97316', lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            }}>
              +{reputationEarned}
            </span>
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
            letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#7a8e9e',
          }}>
            Reputation Points
          </div>

          {/* Vehicle name */}
          <div style={{
            fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700,
            color: '#eef4f8', marginTop: 10,
          }}>
            {vehicleName}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto' as const, padding: '16px 20px' }}>
          {/* First spot */}
          {isFirstSpot && (
            <div style={{
              padding: '12px 14px', borderRadius: 8, marginBottom: 14, textAlign: 'center' as const,
              background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.25)',
            }}>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: '#F97316' }}>First Spot!</div>
              <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7a8e9e', marginTop: 2 }}>
                You're the first to spot this {wizardData.make} {wizardData.model}
              </div>
            </div>
          )}

          {/* Rank + badge progress */}
          {(newRank || nextBadgeName) && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              {newRank && (
                <div style={{ flex: 1, padding: '12px', borderRadius: 8, background: '#131920', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' as const }}>
                  <TrendingUp style={{ width: 16, height: 16, color: '#F97316', margin: '0 auto 4px', display: 'block' }} />
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8' }}>#{newRank}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#445566' }}>
                    {rankChange && rankChange > 0 ? `Up ${rankChange}` : 'Your Rank'}
                  </div>
                </div>
              )}
              {nextBadgeName && nextBadgeRemaining != null && (
                <div style={{ flex: 1, padding: '12px', borderRadius: 8, background: '#131920', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' as const }}>
                  <Award style={{ width: 16, height: 16, color: '#F97316', margin: '0 auto 4px', display: 'block' }} />
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8' }}>{nextBadgeRemaining}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#445566' }}>
                    to {nextBadgeName}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ratings */}
          <div style={{ padding: '12px 14px', borderRadius: 8, background: '#131920', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 14 }}>
            <StarDisplay label="Vehicle" value={vehicleRating} />
            {looksRating ? <StarDisplay label="Looks" value={looksRating} /> : null}
            {soundRating ? <StarDisplay label="Sound" value={soundRating} /> : null}
            {conditionRating ? <StarDisplay label="Condition" value={conditionRating} /> : null}
          </div>

          {/* Sentiment */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 8, marginBottom: 14,
            background: sentiment === 'love' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.04)',
            color: sentiment === 'love' ? '#ef4444' : '#a8bcc8',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em',
          }}>
            {sentiment === 'love' ? <Heart style={{ width: 14, height: 14, fill: 'currentColor' }} /> : <ThumbsDown style={{ width: 14, height: 14 }} />}
            {sentiment === 'love' ? 'Love It' : 'Hate It'}
          </div>

          {/* Tags */}
          {selectedTags.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#445566', marginBottom: 6 }}>Bumper Stickers</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                {selectedTags.map(tag => (
                  <span key={tag} style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: 11,
                    fontFamily: "'Barlow', sans-serif", fontWeight: 600,
                    background: 'rgba(249,115,22,0.08)', color: '#F97316',
                    border: '1px solid rgba(249,115,22,0.2)',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Comment */}
          {comment && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#131920', marginBottom: 14, fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#a8bcc8', lineHeight: 1.5 }}>
              {comment}
            </div>
          )}

          {/* Share */}
          <div style={{ textAlign: 'center' as const, padding: '8px 0' }}>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#445566', marginBottom: 10 }}>Share your spot</div>
            <button onClick={() => {
              shareToSocial({
                type: 'spot', title: `Spotted: ${vehicleName}`,
                subtitle: `${sentiment === 'love' ? 'Loved' : 'Reviewed'} this ride on MotoRate`,
                imageUrl: stockImageUrl || undefined, userHandle: userHandle || '',
                userRep: reputationEarned, deepLinkUrl: `${window.location.origin}/#/vehicle/${vehicleId}`,
              }, userId);
            }} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 8, background: '#F97316', border: 'none',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#030508', cursor: 'pointer',
            }}>
              <Share2 style={{ width: 14, height: 14 }} />
              Share Spot
            </button>
          </div>
        </div>

        {/* Become a Fan prompt */}
        {userId && <BecomeAFanPrompt vehicleId={vehicleId} userId={userId} />}

        {/* Footer */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: 10,
        }}>
          <button onClick={onDone} style={{
            flex: 1, padding: 12, borderRadius: 8,
            background: 'transparent', border: '1px solid rgba(255,255,255,0.10)',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#7a8e9e', cursor: 'pointer',
          }}>
            Done
          </button>
          <button onClick={() => onViewVehicle(vehicleId)} style={{
            flex: 1, padding: 12, borderRadius: 8,
            background: 'transparent', border: '1px solid rgba(255,255,255,0.10)',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#eef4f8', cursor: 'pointer',
          }}>
            View Vehicle
          </button>
        </div>
      </div>
    </div>
  );
}
