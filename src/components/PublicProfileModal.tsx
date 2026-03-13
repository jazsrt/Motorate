import { useEffect, useState } from 'react';
import { X, MapPin, CheckCircle, Users, Eye, Car, Crosshair } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BadgeCoin } from './BadgeCoin';

interface PublicProfileModalProps {
  userId: string;
  onClose: () => void;
  onNavigate: (page: string, data?: any) => void;
}

interface ProfileData {
  id: string;
  handle: string;
  avatar_url: string | null;
  location: string | null;
  bio: string | null;
  reputation_score: number;
  role: string | null;
}

const TIERS = [
  { name: 'Rookie', min: 0 },
  { name: 'Prospect', min: 100 },
  { name: 'Contender', min: 300 },
  { name: 'Competitor', min: 600 },
  { name: 'Veteran', min: 1000 },
  { name: 'Expert', min: 2000 },
  { name: 'Master', min: 3500 },
  { name: 'Legend', min: 5500 },
  { name: 'Icon', min: 8000 },
];

function getTierForScore(score: number) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (score >= TIERS[i].min) return TIERS[i];
  }
  return TIERS[0];
}

function getTierBorderColor(score: number): string {
  if (score >= 5500) return '#c8a45a'; // gold
  if (score >= 2000) return '#909aaa'; // silver
  if (score >= 600) return '#F97316';  // orange
  return '#9a7a58'; // bronze
}

export function PublicProfileModal({ userId, onClose, onNavigate }: PublicProfileModalProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [spotCount, setSpotCount] = useState(0);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [badges, setBadges] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, [userId]);

  const loadAll = async () => {
    setLoading(true);

    const [profileRes, followersRes, spotsRes, vehiclesRes, badgesRes] = await Promise.all([
      supabase.from('profiles').select('id, handle, avatar_url, location, bio, reputation_score, role').eq('id', userId).maybeSingle(),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId).eq('status', 'accepted'),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('vehicles').select('id, make, model, year, plate_number, verification_tier').eq('owner_id', userId).limit(3),
      supabase.from('user_badges').select('badge_id, badges(id, name, icon_name, tier)').eq('user_id', userId).limit(5),
    ]);

    if (profileRes.data) setProfile(profileRes.data as ProfileData);
    setFollowerCount(followersRes.count || 0);
    setSpotCount(spotsRes.count || 0);
    if (vehiclesRes.data) {
      setVehicles(vehiclesRes.data);
      setVehicleCount(vehiclesRes.data.length);
    }
    if (badgesRes.data) setBadges(badgesRes.data);

    // Check if current user follows this profile
    if (user && user.id !== userId) {
      const { data: followData } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .eq('status', 'accepted')
        .maybeSingle();
      setIsFollowing(!!followData);
    }

    setLoading(false);
  };

  const handleFollow = async () => {
    if (!user) return;
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', userId);
      setIsFollowing(false);
      setFollowerCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: userId, status: 'accepted' });
      setIsFollowing(true);
      setFollowerCount(c => c + 1);
    }
  };

  const borderColor = profile ? getTierBorderColor(profile.reputation_score) : 'var(--border-2)';
  const tier = profile ? getTierForScore(profile.reputation_score) : TIERS[0];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(6,10,16,.88)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        padding: '24px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card-v3 v3-stagger v3-stagger-1"
        style={{ width: '100%', maxWidth: 380, maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="btn-press"
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 2,
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          <X size={14} color="var(--t3)" strokeWidth={1.5} />
        </button>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto"
              style={{ borderColor: 'var(--border-3)', borderTopColor: 'var(--accent)' }} />
          </div>
        ) : profile && (
          <div style={{ padding: '24px 20px 20px' }}>
            {/* Avatar + Name */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
              <div
                style={{
                  width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
                  border: `3px solid ${borderColor}`,
                  boxShadow: `0 0 16px ${borderColor}40`,
                  marginBottom: 12,
                }}
              >
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 28, fontWeight: 600, color: 'var(--t3)' }}>
                      {profile.handle?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--t1)' }}>
                  @{profile.handle || 'unknown'}
                </span>
                {profile.role === 'owner' && (
                  <CheckCircle size={14} color="var(--accent)" strokeWidth={2} />
                )}
              </div>

              {profile.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                  <MapPin size={11} color="var(--t4)" strokeWidth={1.5} />
                  <span style={{ fontSize: 11, color: 'var(--t4)' }}>{profile.location}</span>
                </div>
              )}

              {/* Rep score + rank */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  className="mono"
                  style={{
                    fontSize: 26, fontWeight: 700, color: 'var(--orange)',
                    textShadow: '0 0 12px rgba(249,115,22,0.25)', lineHeight: 1,
                  }}
                >
                  {profile.reputation_score.toLocaleString()}
                </span>
                <div style={{ width: 1, height: 20, background: 'var(--border-2)' }} />
                <span
                  style={{
                    fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: 2, color: 'var(--t3)',
                  }}
                >
                  {tier.name}
                </span>
              </div>
            </div>

            {/* Stats strip */}
            <div
              className="v3-stagger v3-stagger-2"
              style={{
                display: 'flex', justifyContent: 'space-around',
                padding: '12px 0', marginBottom: 16,
                borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
              }}
            >
              {[
                { icon: Crosshair, label: 'Spotted', value: spotCount },
                { icon: Car, label: 'Garage', value: vehicleCount },
                { icon: Users, label: 'Followers', value: followerCount },
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 600, color: 'var(--t1)' }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--t4)', marginTop: 2 }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Badge showcase */}
            {badges.length > 0 && (
              <div className="v3-stagger v3-stagger-3" style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 2.5, color: 'var(--t4)', marginBottom: 8 }}>
                  Badges
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {badges.map((ub: any) => {
                    const badge = ub.badges;
                    if (!badge) return null;
                    return (
                      <BadgeCoin
                        key={badge.id}
                        tier={(badge.tier?.toLowerCase() || 'bronze') as 'bronze' | 'silver' | 'gold' | 'plat'}
                        name={badge.name}
                        size="sm"
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Garage preview */}
            {vehicles.length > 0 && (
              <div className="v3-stagger v3-stagger-4" style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 2.5, color: 'var(--t4)', marginBottom: 8 }}>
                  Garage
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {vehicles.map(v => (
                    <button
                      key={v.id}
                      onClick={() => { onClose(); onNavigate('vehicle-detail', v.id); }}
                      className="btn-press"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', borderRadius: 10,
                        background: 'var(--s2)', border: '1px solid var(--border)',
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--t1)' }}>
                          {v.year} {v.make} {v.model}
                        </div>
                        {v.plate_number && (
                          <span className="mono" style={{ fontSize: 10, color: 'var(--t4)', letterSpacing: 1 }}>
                            {v.plate_number}
                          </span>
                        )}
                      </div>
                      {v.verification_tier && (
                        <CheckCircle size={12} color="var(--positive)" strokeWidth={2} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="v3-stagger v3-stagger-5" style={{ display: 'flex', gap: 10 }}>
              {user && user.id !== userId && (
                <button
                  onClick={handleFollow}
                  className="btn-press"
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 10,
                    fontSize: 10, fontWeight: 500, letterSpacing: 2,
                    textTransform: 'uppercase', cursor: 'pointer',
                    fontFamily: "'Space Grotesk', sans-serif",
                    background: isFollowing ? 'transparent' : 'var(--orange)',
                    color: isFollowing ? 'var(--t2)' : '#fff',
                    border: isFollowing ? '1px solid var(--border-2)' : 'none',
                  }}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
              <button
                onClick={() => { onClose(); onNavigate('user-profile', userId); }}
                className="btn-press"
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  fontSize: 10, fontWeight: 500, letterSpacing: 2,
                  textTransform: 'uppercase', cursor: 'pointer',
                  fontFamily: "'Space Grotesk', sans-serif",
                  background: 'transparent',
                  color: 'var(--t2)',
                  border: '1px solid var(--border-2)',
                }}
              >
                View Profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
