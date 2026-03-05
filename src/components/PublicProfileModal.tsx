import { useState, useEffect } from 'react';
import { X, Car, Lock, Camera, CheckCircle, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FollowButton } from './FollowButton';
import { BadgeCoin } from './BadgeCoin';
import type { OnNavigate } from '../types/navigation';

interface PublicProfileModalProps {
  userId: string;
  onClose: () => void;
  onNavigate?: OnNavigate;
}

function getTierColor(score: number) {
  if (score >= 3500) return { border: 'var(--gold-h)', glow: 'rgba(200,164,90,0.25)' };
  if (score >= 1000) return { border: 'var(--orange)', glow: 'rgba(249,115,22,0.2)' };
  return { border: 'var(--bronze-h)', glow: 'rgba(154,122,88,0.2)' };
}

function getTierName(score: number) {
  if (score >= 8000) return 'Icon';
  if (score >= 5500) return 'Legend';
  if (score >= 3500) return 'Master';
  if (score >= 2000) return 'Expert';
  if (score >= 1000) return 'Veteran';
  if (score >= 600) return 'Competitor';
  if (score >= 300) return 'Contender';
  if (score >= 100) return 'Prospect';
  return 'Rookie';
}

export function PublicProfileModal({ userId, onClose, onNavigate }: PublicProfileModalProps) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [stats, setStats] = useState({ followers: 0, spots: 0, reviews: 0, vehicles: 0 });
  const [loading, setLoading] = useState(true);
  const [cityRank, setCityRank] = useState<number | null>(null);

  useEffect(() => {
    loadAll();
  }, [userId]);

  async function loadAll() {
    try {
      const [profileRes, badgesRes, vehiclesRes, followersRes, spotsRes, reviewsRes] = await Promise.all([
        supabase.from('profiles').select('id, handle, avatar_url, bio, location, reputation_score').eq('id', userId).maybeSingle(),
        supabase.from('user_badges').select('*, badge:badges(id, name, icon_name, category)').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
        supabase.from('vehicles').select('id, make, model, year, plate_number, plate_state, verification_tier').eq('owner_id', userId).order('created_at', { ascending: false }).limit(3),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId).eq('status', 'accepted'),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('post_type', 'spot'),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('post_type', 'review'),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        if (profileRes.data.location) {
          const { count } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('location', profileRes.data.location)
            .gt('reputation_score', profileRes.data.reputation_score || 0);
          setCityRank((count || 0) + 1);
        }
      }

      setBadges(badgesRes.data || []);
      setVehicles(vehiclesRes.data || []);
      setStats({
        followers: followersRes.count || 0,
        spots: spotsRes.count || 0,
        reviews: reviewsRes.count || 0,
        vehicles: (vehiclesRes.data || []).length,
      });
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  const isOwnProfile = currentUser?.id === userId;
  const tierColor = profile ? getTierColor(profile.reputation_score || 0) : getTierColor(0);
  const tierName = profile ? getTierName(profile.reputation_score || 0) : 'Rookie';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: 'rgba(6,10,16,.88)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card-v3 w-full max-w-sm max-h-[85vh] overflow-auto v3-stagger v3-stagger-1"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <div className="flex justify-end px-4 pt-3">
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,.04)', border: '1px solid var(--border)' }}
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: 'var(--t3)' }} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: 'var(--border-3)', borderTopColor: 'var(--orange)' }} />
          </div>
        ) : !profile ? (
          <div className="py-12 text-center">
            <p style={{ fontSize: 13, color: 'var(--t3)' }}>User not found</p>
          </div>
        ) : (
          <div className="px-5 pb-5 space-y-4">
            {/* Avatar + Handle */}
            <div className="flex flex-col items-center text-center">
              <div
                className="w-20 h-20 rounded-full overflow-hidden mb-3"
                style={{
                  border: `3px solid ${tierColor.border}`,
                  boxShadow: `0 0 20px ${tierColor.glow}`,
                }}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.handle} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--s2)' }}>
                    <Car className="w-8 h-8" style={{ color: 'var(--t4)' }} strokeWidth={1} />
                  </div>
                )}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--t1)' }}>@{profile.handle}</h3>
              {profile.location && (
                <div className="flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" strokeWidth={1.2} style={{ color: 'var(--t4)' }} />
                  <span style={{ fontSize: 11, fontWeight: 300, color: 'var(--t3)' }}>{profile.location}</span>
                </div>
              )}
            </div>

            {/* Rep Score + Rank */}
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <span
                  className="mono"
                  style={{ fontSize: 32, fontWeight: 700, color: 'var(--orange)', textShadow: '0 0 20px rgba(249,115,22,.2)', lineHeight: 1 }}
                >
                  {(profile.reputation_score || 0).toLocaleString()}
                </span>
                <div style={{ fontSize: 8, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '2px', color: 'var(--t3)', marginTop: 4 }}>
                  {tierName}
                </div>
              </div>
              {cityRank && (
                <>
                  <div style={{ width: 1, height: 32, background: 'var(--border-2)' }} />
                  <div
                    className="px-3 py-1.5 rounded-full"
                    style={{ background: 'var(--orange-dim)', border: '1px solid var(--orange-muted)' }}
                  >
                    <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--orange)' }}>
                      #{cityRank}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 300, color: 'var(--t3)', marginLeft: 4 }}>
                      in {profile.location}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Stats Strip */}
            <div
              className="grid grid-cols-4 gap-0 rounded-xl overflow-hidden"
              style={{ background: 'var(--s2)', border: '1px solid var(--border)' }}
            >
              {[
                { label: 'Spotted', value: stats.spots },
                { label: 'Reviews', value: stats.reviews },
                { label: 'Vehicles', value: stats.vehicles },
                { label: 'Followers', value: stats.followers },
              ].map((stat, i) => (
                <div key={stat.label} className="py-3 text-center" style={{ borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--t1)' }}>{stat.value}</div>
                  <div style={{ fontSize: 8, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '1.5px', color: 'var(--t4)', marginTop: 2 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Badge Showcase */}
            <div>
              <div style={{ fontSize: 8, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '2.5px', color: 'var(--t4)', marginBottom: 8 }}>
                Badges
              </div>
              <div className="flex gap-2 justify-center">
                {badges.length > 0 ? (
                  <>
                    {badges.map((ub: any) => (
                      <BadgeCoin
                        key={ub.id}
                        tier={(ub.tier?.toLowerCase() || 'bronze') as 'bronze' | 'silver' | 'gold' | 'plat'}
                        name={ub.badge?.name || 'Badge'}
                        size="sm"
                      />
                    ))}
                    {Array.from({ length: Math.max(0, 5 - badges.length) }).map((_, i) => (
                      <div
                        key={`locked-${i}`}
                        className="w-11 h-11 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--s3)', opacity: 0.5 }}
                      >
                        <Lock className="w-4 h-4" strokeWidth={1.2} style={{ color: 'var(--t4)', opacity: 0.3 }} />
                      </div>
                    ))}
                  </>
                ) : (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--s3)', opacity: 0.5 }}
                    >
                      <Lock className="w-4 h-4" strokeWidth={1.2} style={{ color: 'var(--t4)', opacity: 0.3 }} />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Garage Preview */}
            {vehicles.length > 0 && (
              <div>
                <div style={{ fontSize: 8, fontWeight: 500, textTransform: 'uppercase' as const, letterSpacing: '2.5px', color: 'var(--t4)', marginBottom: 8 }}>
                  Garage
                </div>
                <div className="space-y-2">
                  {vehicles.map((v: any) => (
                    <div
                      key={v.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer active:scale-[0.98] transition-transform"
                      style={{ background: 'var(--s2)', border: '1px solid var(--border)' }}
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate('vehicle-detail', { vehicleId: v.id });
                          onClose();
                        }
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>
                          {v.year} {v.make} {v.model}
                        </div>
                        {v.plate_number && (
                          <span className="mono" style={{ fontSize: 10, letterSpacing: '1.5px', color: 'var(--t3)' }}>
                            {v.plate_state} {v.plate_number}
                          </span>
                        )}
                      </div>
                      {(v.verification_tier === 'standard' || v.verification_tier === 'verified' || v.verification_tier === 'vin_verified') && (
                        <CheckCircle className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} style={{ color: 'var(--orange)' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {!isOwnProfile && (
              <div className="flex gap-3 pt-2">
                <div className="flex-1">
                  <FollowButton targetUserId={userId} size="sm" />
                </div>
                <button
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('scan');
                      onClose();
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-semibold uppercase transition-all active:scale-[0.97]"
                  style={{
                    background: 'transparent',
                    color: 'var(--orange)',
                    border: '1px solid var(--orange-muted)',
                    letterSpacing: '1.5px',
                  }}
                >
                  <Camera className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Spot a Ride
                </button>
              </div>
            )}

            {/* View Full Profile */}
            {onNavigate && (
              <button
                onClick={() => {
                  onNavigate('user-profile', { userId: profile.id });
                  onClose();
                }}
                className="w-full text-center py-2"
                style={{ fontSize: 11, color: 'var(--orange)', letterSpacing: '0.5px' }}
              >
                View Full Profile
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
