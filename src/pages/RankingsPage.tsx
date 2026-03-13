import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Award, Lock, ChevronRight, Zap, Crosshair, Star as StarIcon, Users, Heart, Camera, FileText, MessageCircle, TrendingUp, Wrench, ThumbsUp, MapPin, UserPlus, CheckCircle2, Car, Tag, Trophy, Crown, Medal } from 'lucide-react';
import { type OnNavigate } from '../types/navigation';
import { Layout } from '../components/Layout';
import { getVehicleImage, formatRP, formatCount } from '../lib/vehicleUtils';
import { getTierFromScore } from '../lib/tierConfig';

interface RankingsPageProps {
  onNavigate: OnNavigate;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
  tier_threshold: number;
  category: string;
  tracks: string;
  rarity: string;
}

interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
}

interface StickerType {
  sticker_type: string;
  total_count: number;
  vehicle_count: number;
}

interface LeaderboardUser {
  id: string;
  handle: string;
  avatar_url: string | null;
  reputation_score: number;
  avg_driver_rating: number;
  driver_rating_count: number;
  follower_count: number;
  badge_count: number;
}

type VehicleTabType = 'local' | 'national' | 'make';

const iconMap: Record<string, React.ElementType> = {
  'Crosshair': Crosshair,
  'Star': StarIcon,
  'Users': Users,
  'Heart': Heart,
  'Camera': Camera,
  'FileText': FileText,
  'MessageCircle': MessageCircle,
  'TrendingUp': TrendingUp,
  'Wrench': Wrench,
  'ThumbsUp': ThumbsUp,
  'MapPin': MapPin,
  'UserPlus': UserPlus,
  'CheckCircle': CheckCircle2,
  'Car': Car,
  'Tag': Tag,
  'Zap': Zap,
};

function getIcon(iconName: string): React.ElementType {
  return iconMap[iconName] || Award;
}

const rarityColor = (rarity: string) => {
  switch (rarity?.toLowerCase()) {
    case 'common': return { bg: 'bg-[rgba(100,116,139,0.15)]', text: 'text-[#94a3b8]', border: 'rgba(100,116,139,0.3)' };
    case 'uncommon': return { bg: 'bg-[rgba(16,185,129,0.15)]', text: 'text-positive', border: 'rgba(16,185,129,0.35)' };
    case 'rare': return { bg: 'bg-[rgba(249,115,22,0.15)]', text: 'text-accent-2', border: 'rgba(249,115,22,0.35)' };
    case 'epic': return { bg: 'bg-[rgba(251,146,60,0.15)]', text: 'text-accent-2', border: 'rgba(251,146,60,0.35)' };
    case 'legendary': return { bg: 'bg-[rgba(245,158,11,0.15)]', text: 'text-orange', border: 'rgba(245,158,11,0.4)' };
    default: return { bg: 'bg-[rgba(100,116,139,0.15)]', text: 'text-[#94a3b8]', border: 'rgba(100,116,139,0.3)' };
  }
};

export function RankingsPage({ onNavigate }: RankingsPageProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<VehicleTabType>('local');
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [activityCounts, setActivityCounts] = useState<Record<string, number>>({});
  const [stickers, setStickers] = useState<StickerType[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  useEffect(() => {
    loadLeaderboard();
  }, [activeTab]);

  async function loadActivityCounts() {
    if (!user) return {};

    const [
      { count: postCount },
      { count: commentCount },
      { count: likesGiven },
      { count: followersCount },
      { count: spotCount },
      { count: reviewCount },
      { count: photoCount }
    ] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', user.id),
      supabase.from('post_comments').select('*', { count: 'exact', head: true }).eq('author_id', user.id),
      supabase.from('reactions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('spot_history').select('*', { count: 'exact', head: true }).eq('spotter_id', user.id),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', user.id).in('post_type', ['spot', 'review']),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', user.id).not('image_url', 'is', null)
    ]);

    return {
      posts: postCount || 0,
      comments: commentCount || 0,
      likes_given: likesGiven || 0,
      followers: followersCount || 0,
      spots: spotCount || 0,
      reviews: reviewCount || 0,
      photos: photoCount || 0,
      mods: 0,
      likes_received: 0,
      comment_likes: 0,
      locations: 0
    };
  }

  async function loadStickers() {
    if (!user) return;
    try {
      // Get user's vehicle IDs first
      const { data: userVehicles } = await supabase
        .from('vehicles')
        .select('id')
        .eq('owner_id', user.id);
      if (!userVehicles || userVehicles.length === 0) return;

      const vehicleIds = userVehicles.map(v => v.id);

      // Get stickers on user's vehicles
      const { data } = await supabase
        .from('vehicle_stickers')
        .select(`
          vehicle_id,
          bumper_stickers!vehicle_stickers_sticker_id_fkey(name)
        `)
        .in('vehicle_id', vehicleIds);

      if (!data) return;
      const map: Record<string, { total: number; vehicles: Set<string> }> = {};
      for (const row of data as any[]) {
        const name = row.bumper_stickers?.name || 'Unknown';
        if (!map[name]) map[name] = { total: 0, vehicles: new Set() };
        map[name].total++;
        map[name].vehicles.add(row.vehicle_id);
      }
      const result: StickerType[] = Object.entries(map).map(([type, val]) => ({
        sticker_type: type,
        total_count: val.total,
        vehicle_count: val.vehicles.size,
      }));
      setStickers(result.sort((a, b) => b.total_count - a.total_count).slice(0, 10));
    } catch {
      return;
    }
  }

  async function loadLeaderboard() {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, handle, avatar_url, reputation_score, avg_driver_rating, driver_rating_count')
        .order('reputation_score', { ascending: false })
        .limit(50);

      if (!profiles) {
        setLeaderboard([]);
        return;
      }

      const userIds = profiles.map(p => p.id);

      const [followersResult, badgesResult] = await Promise.all([
        supabase
          .from('follows')
          .select('following_id')
          .in('following_id', userIds),
        supabase
          .from('user_badges')
          .select('user_id')
          .in('user_id', userIds)
      ]);

      const followerCounts = (followersResult.data || []).reduce((acc, row) => {
        acc[row.following_id] = (acc[row.following_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const badgeCounts = (badgesResult.data || []).reduce((acc, row) => {
        acc[row.user_id] = (acc[row.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const leaderboardData: LeaderboardUser[] = profiles.map(p => ({
        id: p.id,
        handle: p.handle || 'Anonymous',
        avatar_url: p.avatar_url,
        reputation_score: p.reputation_score || 0,
        avg_driver_rating: p.avg_driver_rating || 0,
        driver_rating_count: p.driver_rating_count || 0,
        follower_count: followerCounts[p.id] || 0,
        badge_count: badgeCounts[p.id] || 0,
      }));

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      setLeaderboard([]);
    }
  }

  async function loadData() {
    if (!user) return;
    setLoading(true);

    try {
      const [badgesResult, userBadgesResult, counts] = await Promise.all([
        supabase
          .from('badges')
          .select('*')
          .in('earning_method', ['one_off', 'tiered_activity'])
          .order('badge_group', { ascending: true })
          .order('tier_threshold', { ascending: true }),
        supabase
          .from('user_badges')
          .select('*')
          .eq('user_id', user.id),
        loadActivityCounts()
      ]);

      setAllBadges(badgesResult.data || []);
      setUserBadges(userBadgesResult.data || []);
      setActivityCounts(counts);

      await loadStickers();
      await loadLeaderboard();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  function getCountForBadge(badge: Badge): number {
    if (!badge.tracks) return 0;
    return activityCounts[badge.tracks] || 0;
  }

  const tabLabel = activeTab === 'local' ? 'LOCAL' : activeTab === 'national' ? 'NATIONAL' : 'BY MAKE';
  const scopeLabel = activeTab === 'local' ? 'LOCAL' : activeTab === 'national' ? 'NATIONAL' : 'MAKE';

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  if (loading) {
    return (
      <Layout currentPage="rankings" onNavigate={onNavigate}>
        <div className="px-3.5 py-4">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-[var(--s1)] rounded-xl" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="rankings" onNavigate={onNavigate}>
      <div className="pb-20">

        {/* Header */}
        <div style={{ padding: '56px 20px 14px', background: 'linear-gradient(to bottom, #070a0f, transparent)' }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.26em',
            textTransform: 'uppercase' as const,
            color: 'var(--muted)',
          }}>
            {tabLabel}
          </div>
          <div style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--white, #f2f4f7)',
            lineHeight: 1,
          }}>
            Top <span style={{ color: 'var(--accent, #F97316)' }}>Vehicles</span>
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{
          margin: '0 20px 18px',
          background: 'rgba(10,13,20,0.9)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '7px',
          overflow: 'hidden',
          display: 'flex',
        }}>
          {([
            { id: 'local' as const, label: 'Local' },
            { id: 'national' as const, label: 'National' },
            { id: 'make' as const, label: 'By Make' },
          ]).map((tab, idx) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '9px 0',
                textAlign: 'center' as const,
                cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                color: activeTab === tab.id ? 'var(--accent, #F97316)' : 'var(--dim)',
                background: activeTab === tab.id ? 'var(--accent-dim, rgba(249,115,22,0.12))' : 'transparent',
                border: 'none',
                borderRight: idx < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Podium - Top 3 */}
        {top3.length >= 3 && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: '6px',
            padding: '0 16px 20px',
            height: '240px',
          }}>
            {/* Silver - #2 (order 1) */}
            <div
              style={{ order: 1, cursor: 'pointer', textAlign: 'center' as const }}
              onClick={() => onNavigate('user-profile', top3[1].id)}
            >
              {top3[1].avatar_url ? (
                <img
                  src={top3[1].avatar_url}
                  alt={top3[1].handle}
                  style={{
                    width: '92px',
                    height: '62px',
                    borderRadius: '6px',
                    objectFit: 'cover' as const,
                    border: '1px solid rgba(154,176,192,0.3)',
                    display: 'block',
                  }}
                />
              ) : (
                <div style={{
                  width: '92px',
                  height: '62px',
                  borderRadius: '6px',
                  border: '1px solid rgba(154,176,192,0.3)',
                  background: '#121a2c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Car size={24} style={{ color: '#9abccc' }} />
                </div>
              )}
              <div style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: '13px',
                fontWeight: 700,
                color: 'white',
                textAlign: 'center' as const,
                marginTop: '4px',
              }}>
                {top3[1].handle}
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '9px',
                fontWeight: 500,
                color: 'var(--accent, #F97316)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {formatRP(top3[1].reputation_score)}
              </div>
              <div style={{
                width: '92px',
                height: '36px',
                background: 'linear-gradient(135deg, #2c3a50, #445566)',
                borderRadius: '4px 4px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '6px',
              }}>
                <span style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#fff',
                }}>2ND</span>
              </div>
            </div>

            {/* Gold - #1 (order 2) */}
            <div
              style={{ order: 2, cursor: 'pointer', textAlign: 'center' as const }}
              onClick={() => onNavigate('user-profile', top3[0].id)}
            >
              {top3[0].avatar_url ? (
                <img
                  src={top3[0].avatar_url}
                  alt={top3[0].handle}
                  style={{
                    width: '118px',
                    height: '80px',
                    borderRadius: '6px',
                    objectFit: 'cover' as const,
                    border: '1px solid rgba(249,115,22,0.45)',
                    display: 'block',
                  }}
                />
              ) : (
                <div style={{
                  width: '118px',
                  height: '80px',
                  borderRadius: '6px',
                  border: '1px solid rgba(249,115,22,0.45)',
                  background: '#121a2c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Car size={32} style={{ color: '#f0a030' }} />
                </div>
              )}
              <div style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: '13px',
                fontWeight: 700,
                color: 'white',
                textAlign: 'center' as const,
                marginTop: '4px',
              }}>
                {top3[0].handle}
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '9px',
                fontWeight: 500,
                color: 'var(--accent, #F97316)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {formatRP(top3[0].reputation_score)}
              </div>
              <div style={{
                width: '118px',
                height: '52px',
                background: 'linear-gradient(135deg, #F97316, #ff6000)',
                borderRadius: '4px 4px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '6px',
              }}>
                <span style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#fff',
                }}>1ST</span>
              </div>
            </div>

            {/* Bronze - #3 (order 3) */}
            <div
              style={{ order: 3, cursor: 'pointer', textAlign: 'center' as const }}
              onClick={() => onNavigate('user-profile', top3[2].id)}
            >
              {top3[2].avatar_url ? (
                <img
                  src={top3[2].avatar_url}
                  alt={top3[2].handle}
                  style={{
                    width: '92px',
                    height: '62px',
                    borderRadius: '6px',
                    objectFit: 'cover' as const,
                    border: '1px solid rgba(192,120,64,0.3)',
                    display: 'block',
                  }}
                />
              ) : (
                <div style={{
                  width: '92px',
                  height: '62px',
                  borderRadius: '6px',
                  border: '1px solid rgba(192,120,64,0.3)',
                  background: '#121a2c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Car size={24} style={{ color: '#b07840' }} />
                </div>
              )}
              <div style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: '13px',
                fontWeight: 700,
                color: 'white',
                textAlign: 'center' as const,
                marginTop: '4px',
              }}>
                {top3[2].handle}
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '9px',
                fontWeight: 500,
                color: 'var(--accent, #F97316)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {formatRP(top3[2].reputation_score)}
              </div>
              <div style={{
                width: '92px',
                height: '26px',
                background: 'linear-gradient(135deg, #182036, #2c3a50)',
                borderRadius: '4px 4px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: '6px',
              }}>
                <span style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#fff',
                }}>3RD</span>
              </div>
            </div>
          </div>
        )}

        {/* List Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '10px 20px 8px',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase' as const,
            color: 'var(--muted)',
            flex: 1,
          }}>
            RANKED VEHICLES
          </span>
          <span style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '9px',
            color: 'var(--accent, #F97316)',
            background: 'rgba(249,115,22,0.12)',
            borderRadius: '3px',
            padding: '2px 7px',
          }}>
            {scopeLabel}
          </span>
        </div>

        {/* Rank Rows (#4+) */}
        {rest.length === 0 && leaderboard.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center' as const }}>
            <Trophy size={48} style={{ color: 'var(--muted)', margin: '0 auto 16px' }} />
            <div style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--white, #f2f4f7)',
              marginBottom: '8px',
            }}>
              No Rankings Yet
            </div>
            <div style={{ fontSize: '14px', color: 'var(--dim)' }}>
              Be the first to earn reputation and climb the ranks
            </div>
          </div>
        )}

        {rest.map((leader, idx) => {
          const rank = idx + 4;

          const rankStyle: React.CSSProperties = {
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            minWidth: '28px',
            textAlign: 'center' as const,
            ...(rank <= 6
              ? { fontSize: '20px', color: 'var(--dim)' }
              : rank <= 10
                ? { fontSize: '17px', color: 'var(--subtle, #4a5568)' }
                : { fontSize: '15px', color: 'var(--muted)' }
            ),
          };

          return (
            <div
              key={leader.id}
              onClick={() => onNavigate('user-profile', leader.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.03)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              {/* Rank Number */}
              <div style={rankStyle}>
                {rank}
              </div>

              {/* Thumbnail */}
              {leader.avatar_url ? (
                <img
                  src={leader.avatar_url}
                  alt={leader.handle}
                  style={{
                    width: '64px',
                    height: '44px',
                    borderRadius: '4px',
                    objectFit: 'cover' as const,
                    background: '#121a2c',
                  }}
                />
              ) : (
                <div style={{
                  width: '64px',
                  height: '44px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  background: '#121a2c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Car size={20} style={{ color: 'var(--dim)' }} />
                </div>
              )}

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'white',
                  lineHeight: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap' as const,
                }}>
                  {leader.handle}
                </div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '9px',
                  fontWeight: 600,
                  color: 'var(--dim)',
                  marginTop: '1px',
                }}>
                  {formatRP(leader.reputation_score)} RP &middot; #{rank}
                </div>
              </div>

              {/* Right - RP */}
              <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'white',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatRP(leader.reputation_score)}
                </div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '9px',
                  color: 'var(--dim)',
                }}>
                  &mdash;
                </div>
              </div>
            </div>
          );
        })}

      </div>
    </Layout>
  );
}
