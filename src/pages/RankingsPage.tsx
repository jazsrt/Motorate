import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Award, Lock, ChevronRight, Zap, Crosshair, Star as StarIcon, Users, Heart, Camera, FileText, MessageCircle, TrendingUp, Wrench, ThumbsUp, MapPin, UserPlus, CheckCircle2, Car, Tag, Trophy, Crown, Medal } from 'lucide-react';
import { type OnNavigate } from '../types/navigation';
import { Layout } from '../components/Layout';

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

type TabType = 'badges' | 'leaderboard' | 'quests';
type LeaderboardPeriod = 'all' | 'week' | 'month';

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
  const [activeTab, setActiveTab] = useState<TabType>('badges');
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [activityCounts, setActivityCounts] = useState<Record<string, number>>({});
  const [stickers, setStickers] = useState<StickerType[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      loadLeaderboard();
    }
  }, [activeTab, leaderboardPeriod]);

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
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('author_id', user.id),
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

  const earnedBadgeIds = new Set(userBadges.map(ub => ub.badge_id));
  const earnedBadgesList = allBadges.filter(b => earnedBadgeIds.has(b.id));

  const inProgressBadges = allBadges.filter(b => {
    if (earnedBadgeIds.has(b.id)) return false;
    if (!b.tracks) return false;
    const count = getCountForBadge(b);
    return count > 0 && count < (b.tier_threshold || 999);
  }).sort((a, b) => {
    const aPct = getCountForBadge(a) / (a.tier_threshold || 1);
    const bPct = getCountForBadge(b) / (b.tier_threshold || 1);
    return bPct - aPct;
  });

  const lockedBadgesList = allBadges.filter(b => {
    if (earnedBadgeIds.has(b.id)) return false;
    const count = getCountForBadge(b);
    return count === 0;
  });

  const TABS: { id: TabType; label: string }[] = [
    { id: 'badges', label: 'Badges' },
    { id: 'leaderboard', label: 'Leaderboard' },
    { id: 'quests', label: 'Quests' },
  ];

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

        {/* Page Header */}
        <div style={{ padding: '56px 20px 16px', background: 'linear-gradient(to bottom, var(--carbon-0), transparent)' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, color: 'var(--white)' }}>
            RANK<em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>INGS</em>
          </div>
          <div style={{ fontFamily: 'var(--font-cond)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Chicago · Illinois
          </div>
        </div>

        {/* Tab Bar */}
        <div style={{ display: 'flex', margin: '0 20px 20px', background: 'rgba(10,13,20,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ flex: 1, padding: '8px 0', fontFamily: 'var(--font-cond)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', borderRight: '1px solid rgba(255,255,255,0.05)', color: activeTab === tab.id ? 'var(--accent)' : 'var(--dim)', background: activeTab === tab.id ? 'rgba(249,115,22,0.12)' : 'transparent' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <div className="space-y-4 px-4">

            {/* Page Header with Progress */}
            <div className="bg-[var(--s1)] border border-[var(--border2)] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-heading text-xl font-bold text-primary" style={{ fontFamily: 'var(--font-display)' }}>Badge Collection</h3>
                  <p className="text-xs text-tertiary mt-0.5">
                    {earnedBadgesList.length} of {allBadges.length} earned
                  </p>
                </div>
                <div className="text-right">
                  <div
                    className="font-heading text-3xl font-bold"
                    style={{
                      background: 'linear-gradient(135deg, #f97316, #f59e0b)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {allBadges.length > 0 ? Math.round((earnedBadgesList.length / allBadges.length) * 100) : 0}%
                  </div>
                  <div className="text-[10px] text-tertiary">
                    {earnedBadgesList.length} / {allBadges.length}
                  </div>
                </div>
              </div>
              <div className="h-1.5 bg-surface-4 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${allBadges.length > 0 ? (earnedBadgesList.length / allBadges.length) * 100 : 0}%`,
                    background: 'linear-gradient(90deg, #f97316, #f59e0b)',
                  }}
                />
              </div>
            </div>

            {/* Next Badge Hero */}
            {inProgressBadges.length > 0 && (() => {
              const nextBadge = inProgressBadges[0];
              const IconComp = getIcon(nextBadge.icon);
              const current = getCountForBadge(nextBadge);
              const target = nextBadge.tier_threshold || 1;
              const remaining = target - current;
              const pct = Math.min((current / target) * 100, 100);

              return (
                <div
                  className="rounded-2xl p-3.5 transition-all"
                  style={{
                    background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(245,158,11,0.06))',
                    border: '1px solid rgba(249,115,22,0.3)',
                  }}
                >
                  <div className="text-[9px] font-bold tracking-[1.5px] uppercase text-accent-2 mb-2 flex items-center gap-1">
                    <Crosshair className="w-3 h-3" />
                    NEXT UP — {remaining} away
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, #f97316, #f59e0b)',
                        boxShadow: '0 3px 12px rgba(249,115,22,0.3)',
                      }}
                    >
                      <IconComp className="w-6 h-6 text-white/80" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-heading text-lg font-bold text-primary truncate">
                        {nextBadge.name}
                        {nextBadge.tier && (
                          <span className="text-secondary text-sm font-normal ml-1.5">
                            ({nextBadge.tier.charAt(0).toUpperCase() + nextBadge.tier.slice(1)})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-secondary mb-1.5">{nextBadge.description}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-surface-4 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background: 'linear-gradient(90deg, #f97316, #f59e0b)',
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-accent-2 whitespace-nowrap">
                          {current} / {target}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Sticker Rep Section */}
            {stickers.length > 0 && (
              <div className="bg-[var(--s1)] border border-[rgba(249,115,22,0.2)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-accent-2" strokeWidth={1.5} />
                    <span className="text-xs font-bold text-primary">Sticker Rep</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(249,115,22,0.1)] text-accent-2">{stickers.length} types</span>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {stickers.map((s) => (
                    <div key={s.sticker_type} className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-[8px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(245,158,11,0.1))', border: '1px solid rgba(249,115,22,0.25)' }}>
                        <Zap className="w-5 h-5 text-accent-2" strokeWidth={1.5} />
                      </div>
                      <div className="text-sm font-bold text-primary">{s.total_count}</div>
                      <div className="text-center truncate w-full text-[10px] text-tertiary">
                        {s.sticker_type.replace(/_/g, ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Earned Badges */}
            {earnedBadgesList.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-positive" />
                  <span className="text-xs font-bold text-primary">Earned</span>
                  <span className="text-[10px] px-1.5 rounded-full bg-[rgba(16,185,129,0.1)] text-positive">
                    {earnedBadgesList.length}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {earnedBadgesList.map((badge) => {
                    const IconComp = getIcon(badge.icon);
                    const rc = rarityColor(badge.rarity);
                    const isLegendary = badge.rarity?.toLowerCase() === 'legendary';
                    return (
                      <div
                        key={badge.id}
                        className="bg-[var(--s1)] border rounded-xl p-2.5 text-center relative transition-all hover:-translate-y-0.5"
                        style={{
                          borderColor: isLegendary ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.35)',
                          background: isLegendary ? 'linear-gradient(135deg, var(--s1), rgba(245,158,11,0.04))' : 'var(--s1)',
                        }}
                      >
                        <div
                          className="w-11 h-11 rounded-[11px] mx-auto mb-1.5 flex items-center justify-center relative"
                          style={{
                            background: isLegendary
                              ? 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,146,60,0.15))'
                              : 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(249,115,22,0.15))',
                          }}
                        >
                          <IconComp className="w-5 h-5 text-white/70" />
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#5aaa7a] rounded-full flex items-center justify-center border-[1.5px] border-[var(--bg)]">
                            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                          </div>
                        </div>
                        <div className="text-[11px] font-bold leading-tight mb-0.5 text-primary">{badge.name}</div>
                        <span className={`text-[9px] font-bold px-1.5 py-px rounded-full ${rc.bg} ${rc.text}`}>
                          {badge.rarity}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* In Progress Badges */}
            {inProgressBadges.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-accent-2" />
                  <span className="text-xs font-bold text-primary">In Progress</span>
                  <span className="text-[10px] px-1.5 rounded-full bg-[rgba(249,115,22,0.1)] text-accent-2">
                    {inProgressBadges.length}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {inProgressBadges.map((badge) => {
                    const IconComp = getIcon(badge.icon);
                    const current = getCountForBadge(badge);
                    const target = badge.tier_threshold || 1;
                    const pct = Math.min((current / target) * 100, 100);
                    return (
                      <div
                        key={badge.id}
                        className="bg-[var(--s1)] rounded-xl p-2.5 text-center relative transition-all hover:-translate-y-0.5"
                        style={{ border: '1px solid rgba(249,115,22,0.25)' }}
                      >
                        <div
                          className="w-11 h-11 rounded-[11px] mx-auto mb-1.5 flex items-center justify-center"
                          style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(251,146,60,0.1))' }}
                        >
                          <IconComp className="w-5 h-5 text-white/60" />
                        </div>
                        <div className="text-[11px] font-bold leading-tight mb-1 text-primary">{badge.name}</div>
                        <div className="h-1 bg-surface-4 rounded-full overflow-hidden mx-1 mb-1">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #F97316, #fb923c)' }}
                          />
                        </div>
                        <div className="text-[9px] text-accent-2 font-bold">{current}/{target}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Locked Badges */}
            {lockedBadgesList.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Lock className="w-3.5 h-3.5 text-tertiary" />
                  <span className="text-xs font-bold text-primary">Locked</span>
                  <span className="text-[10px] px-1.5 rounded-full bg-[rgba(61,96,128,0.1)] text-tertiary">
                    {lockedBadgesList.length}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {lockedBadgesList.slice(0, 12).map((badge) => {
                    const IconComp = getIcon(badge.icon);
                    return (
                      <div
                        key={badge.id}
                        className="bg-[var(--s1)] border border-[var(--border2)] rounded-xl p-2.5 text-center opacity-40"
                      >
                        <div className="w-11 h-11 rounded-[11px] mx-auto mb-1.5 flex items-center justify-center bg-surface-4 relative">
                          <IconComp className="w-5 h-5 text-tertiary" />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-surface-4 rounded-full flex items-center justify-center border border-[var(--border2)]">
                            <Lock className="w-2.5 h-2.5 text-tertiary" />
                          </div>
                        </div>
                        <div className="text-[11px] font-bold leading-tight mb-0.5 text-tertiary">{badge.name}</div>
                      </div>
                    );
                  })}

                  {/* Mystery badge */}
                  <div className="border border-dashed border-[var(--border2)] rounded-xl p-2.5 text-center opacity-[0.15]">
                    <div className="w-11 h-11 rounded-[11px] mx-auto mb-1.5 flex items-center justify-center bg-surface-4">
                      <span className="text-lg font-bold text-tertiary">?</span>
                    </div>
                    <div className="text-[11px] font-bold leading-tight text-tertiary">Mystery</div>
                  </div>
                </div>

                {lockedBadgesList.length > 12 && (
                  <button className="w-full mt-2 py-2 text-[11px] font-bold text-accent-2 bg-[rgba(249,115,22,0.05)] border border-[rgba(249,115,22,0.15)] rounded-lg hover:bg-[rgba(249,115,22,0.1)] transition-colors">
                    Show All {lockedBadgesList.length} Locked Badges
                  </button>
                )}
              </div>
            )}

            {/* Empty State */}
            {allBadges.length === 0 && (
              <div className="bg-[var(--s1)] border border-[var(--border2)] rounded-2xl p-12 text-center">
                <Award className="w-12 h-12 text-tertiary mx-auto mb-4" />
                <h3 className="font-heading text-xl font-bold text-primary mb-2" style={{ fontFamily: 'var(--font-display)' }}>No Badges Found</h3>
                <p className="text-sm text-secondary">Badge data may still be loading. Try refreshing.</p>
              </div>
            )}

          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-4 px-4">

            {/* Period Filter */}
            <div className="flex gap-1 p-1 rounded-[10px] bg-[var(--s1)] border border-[var(--border2)]">
              {[
                { id: 'all' as const, label: 'All Time' },
                { id: 'month' as const, label: 'This Month' },
                { id: 'week' as const, label: 'This Week' },
              ].map(period => (
                <button
                  key={period.id}
                  onClick={() => setLeaderboardPeriod(period.id)}
                  className="flex-1 py-1.5 rounded-[8px] transition-all text-xs font-bold"
                  style={{
                    color: leaderboardPeriod === period.id ? '#f2f4f7' : '#909aaa',
                    background: leaderboardPeriod === period.id ? 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(251,146,60,0.1))' : 'transparent',
                    border: leaderboardPeriod === period.id ? '1px solid rgba(249,115,22,0.25)' : '1px solid transparent',
                  }}
                >
                  {period.label}
                </button>
              ))}
            </div>

            {/* Current User Rank Card */}
            {user && leaderboard.length > 0 && (() => {
              const userRank = leaderboard.findIndex(u => u.id === user.id) + 1;
              const userData = leaderboard.find(u => u.id === user.id);

              if (userData) {
                return (
                  <div
                    className="rounded-xl p-4 relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(251,146,60,0.08))',
                      border: '1px solid rgba(249,115,22,0.3)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[rgba(249,115,22,0.2)] border border-[rgba(249,115,22,0.4)] flex-shrink-0">
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--accent)' }}>#{userRank}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontFamily: 'var(--font-cond)', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '2px' }}>Your Rank</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: 'var(--white)' }}>@{userData.handle}</div>
                      </div>
                      <div className="text-right">
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '24px',
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                            background: 'linear-gradient(135deg, #F97316, #fb923c)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          {userData.reputation_score.toLocaleString()}
                        </div>
                        <div style={{ fontFamily: 'var(--font-cond)', fontSize: '10px', fontWeight: 600, color: 'var(--dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>SCORE</div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Top 3 Podium */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {[1, 0, 2].map((idx) => {
                  const leader = leaderboard[idx];
                  const rank = idx + 1;
                  const podiumColors = {
                    1: { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', icon: '#f59e0b' },
                    2: { bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.4)', icon: '#94a3b8' },
                    3: { bg: 'rgba(205,127,50,0.15)', border: 'rgba(205,127,50,0.4)', icon: '#cd7f32' },
                  }[rank] || { bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.4)', icon: '#fb923c' };

                  return (
                    <button
                      key={leader.id}
                      onClick={() => onNavigate('user-profile', leader.id)}
                      className="bg-[var(--s1)] rounded-xl p-3 text-center transition-all hover:-translate-y-1"
                      style={{
                        border: `1px solid ${podiumColors.border}`,
                        background: rank === 1 ? `linear-gradient(135deg, ${podiumColors.bg}, rgba(245,158,11,0.08))` : 'var(--s1)',
                        order: idx === 1 ? -1 : idx === 0 ? 0 : 1,
                      }}
                    >
                      <div className="relative mb-2 mx-auto w-fit">
                        {leader.avatar_url ? (
                          <img
                            src={leader.avatar_url}
                            alt={leader.handle}
                            className="w-12 h-12 rounded-full object-cover border-2"
                            style={{ borderColor: podiumColors.icon }}
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center border-2"
                            style={{ borderColor: podiumColors.icon, background: podiumColors.bg }}
                          >
                            <Users className="w-5 h-5" style={{ color: podiumColors.icon }} />
                          </div>
                        )}
                        <div
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-[var(--bg)]"
                          style={{ background: podiumColors.icon }}
                        >
                          {rank === 1 && <Crown className="w-3 h-3 text-white" />}
                          {rank === 2 && <Medal className="w-3 h-3 text-white" />}
                          {rank === 3 && <Medal className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>@{leader.handle}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: podiumColors.icon, fontVariantNumeric: 'tabular-nums' }}>
                        {leader.reputation_score.toLocaleString()}
                      </div>
                      <div style={{ fontFamily: 'var(--font-cond)', fontSize: '9px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--dim)' }}>SCORE</div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Leaderboard List */}
            <div className="space-y-2">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Trophy className="w-3.5 h-3.5 text-orange" />
                <span style={{ fontFamily: 'var(--font-cond)', fontSize: '12px', fontWeight: 700, color: 'var(--white)' }}>Top Riders</span>
              </div>

              {leaderboard.length === 0 && (
                <div className="bg-[var(--s1)] border border-[var(--border2)] rounded-xl p-8 text-center">
                  <Trophy className="w-12 h-12 text-tertiary mx-auto mb-4" />
                  <h3 className="font-heading text-xl font-bold text-primary mb-2" style={{ fontFamily: 'var(--font-display)' }}>No Rankings Yet</h3>
                  <p className="text-sm text-secondary">Be the first to earn reputation and climb the ranks</p>
                </div>
              )}

              {leaderboard.slice(3).map((leader, idx) => {
                const rank = idx + 4;
                const isCurrentUser = leader.id === user?.id;

                return (
                  <div
                    key={leader.id}
                    onClick={() => onNavigate('user-profile', leader.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px',
                      borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer',
                      ...(isCurrentUser ? { background: 'rgba(249,115,22,0.06)' } : {}),
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: 'var(--muted)', minWidth: '32px' }}>
                      {rank}
                    </div>

                    {leader.avatar_url ? (
                      <img
                        src={leader.avatar_url}
                        alt={leader.handle}
                        style={{ width: '52px', height: '36px', borderRadius: '4px', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{ width: '52px', height: '36px', borderRadius: '4px', background: 'var(--s1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Users className="w-4 h-4 text-tertiary" />
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        @{leader.handle}
                        {isCurrentUser && (
                          <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: 400, color: 'var(--accent)' }}>(You)</span>
                        )}
                      </div>
                      <div style={{ fontFamily: 'var(--font-cond)', fontSize: '9px', fontWeight: 600, color: 'var(--dim)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                        <span>{leader.follower_count} followers</span>
                        <span>{leader.badge_count} badges</span>
                        {leader.driver_rating_count > 0 && (
                          <span>{leader.avg_driver_rating.toFixed(1)} rating</span>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: 'var(--white)', fontVariantNumeric: 'tabular-nums' }}>
                        {leader.reputation_score.toLocaleString()}
                      </div>
                      <div style={{ fontFamily: 'var(--font-cond)', fontSize: '9px', fontWeight: 600, color: 'var(--dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>SCORE</div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* Quests Tab */}
        {activeTab === 'quests' && (
          <div className="px-4">
            <div className="bg-[var(--s1)] border border-[var(--border2)] rounded-xl p-8 text-center">
              <Zap className="w-12 h-12 text-tertiary mx-auto mb-4" />
              <h3 className="font-heading text-xl font-bold text-primary mb-2" style={{ fontFamily: 'var(--font-display)' }}>Quests Coming Soon</h3>
              <p className="text-sm text-secondary">Complete challenges to earn exclusive rewards</p>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
