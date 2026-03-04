import React, { useEffect, useState, useMemo } from 'react';
import { Award, Lock, CheckCircle2, ChevronRight, Crosshair, Star, Users, Heart, Camera, FileText, MessageCircle, TrendingUp, Wrench, ThumbsUp, MapPin, UserPlus, Car, Tag, Zap, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { type OnNavigate } from '../types/navigation';
import { BadgeCoin } from '../components/BadgeCoin';
import { sounds } from '../lib/sounds';
import { haptics } from '../lib/haptics';

interface BadgesPageProps {
  onNavigate: OnNavigate;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  earning_method: string;
  tier: string | null;
  tier_threshold: number | null;
  badge_group: string | null;
  tracks: string | null;
  type: string;
}

interface UserBadge {
  badge_id: string;
  awarded_at: string;
}

interface ActivityCounts {
  spots: number;
  reviews: number;
  posts: number;
  comments: number;
  likesGiven: number;
  likesReceived: number;
  followers: number;
  photos: number;
  mods: number;
  commentLikes: number;
}

const iconMap: Record<string, React.ElementType> = {
  'Crosshair': Crosshair,
  'Star': Star,
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

function getBadgeIcon(iconName: string): React.ElementType {
  return iconMap[iconName] || Award;
}

function getCountForBadge(badge: Badge, activityCounts: ActivityCounts): number {
  switch (badge.tracks) {
    case 'spots': return activityCounts.spots;
    case 'reviews': return activityCounts.reviews;
    case 'posts': return activityCounts.posts;
    case 'comments': return activityCounts.comments;
    case 'likes_given': return activityCounts.likesGiven;
    case 'likes_received': return activityCounts.likesReceived;
    case 'followers': return activityCounts.followers;
    case 'photos': return activityCounts.photos;
    case 'mods': return activityCounts.mods;
    case 'comment_likes': return activityCounts.commentLikes;
    default: return 0;
  }
}

function rarityStyle(rarity: string) {
  switch (rarity?.toLowerCase()) {
    case 'common':    return { pill: 'bg-[rgba(100,116,139,0.2)] text-[#94a3b8]', border: 'rgba(100,116,139,0.3)', iconBg: 'linear-gradient(135deg, rgba(100,116,139,0.2), rgba(100,116,139,0.1))' };
    case 'uncommon':  return { pill: 'bg-[rgba(16,185,129,0.15)] text-positive', border: 'rgba(16,185,129,0.35)', iconBg: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(249,115,22,0.15))' };
    case 'rare':      return { pill: 'bg-[rgba(249,115,22,0.15)] text-accent-2', border: 'rgba(249,115,22,0.35)', iconBg: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(251,146,60,0.15))' };
    case 'epic':      return { pill: 'bg-[rgba(251,146,60,0.15)] text-accent-2', border: 'rgba(251,146,60,0.35)', iconBg: 'linear-gradient(135deg, rgba(251,146,60,0.2), rgba(249,115,22,0.15))' };
    case 'legendary': return { pill: 'bg-[rgba(245,158,11,0.15)] text-orange', border: 'rgba(245,158,11,0.4)', iconBg: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,146,60,0.15))' };
    default:          return { pill: 'bg-[rgba(100,116,139,0.2)] text-[#94a3b8]', border: 'rgba(100,116,139,0.3)', iconBg: 'linear-gradient(135deg, rgba(100,116,139,0.2), rgba(100,116,139,0.1))' };
  }
}

const tierLabel = (tier: string | null): string => {
  if (!tier) return '';
  return tier.charAt(0).toUpperCase() + tier.slice(1);
};

export function BadgesPage({ onNavigate }: BadgesPageProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [activeSection, setActiveSection] = useState<'earned' | 'progress' | 'locked'>('earned');
  const [celebBadge, setCelebBadge] = useState<any>(null);
  const [activityCounts, setActivityCounts] = useState<ActivityCounts>({
    spots: 0,
    reviews: 0,
    posts: 0,
    comments: 0,
    likesGiven: 0,
    likesReceived: 0,
    followers: 0,
    photos: 0,
    mods: 0,
    commentLikes: 0,
  });

  useEffect(() => {
    if (user) {
      loadBadgeData();
    }
  }, [user]);

  async function loadBadgeData() {
    if (!user) return;
    try {
      const { data: badges } = await supabase
        .from('badges')
        .select('*')
        .in('earning_method', ['one_off', 'tiered_activity'])
        .order('badge_group', { ascending: true })
        .order('tier_threshold', { ascending: true });

      const { data: earned } = await supabase
        .from('user_badges')
        .select('badge_id, awarded_at')
        .eq('user_id', user.id);

      const counts = await loadActivityCounts();

      setAllBadges(badges || []);
      setUserBadges(earned || []);
      setActivityCounts(counts);
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadActivityCounts(): Promise<ActivityCounts> {
    if (!user) return {
      spots: 0, reviews: 0, posts: 0, comments: 0, likesGiven: 0,
      likesReceived: 0, followers: 0, photos: 0, mods: 0,
      commentLikes: 0,
    };

    const [
      { count: spotsCount },
      { count: reviewsCount },
      { count: postsCount },
      { count: commentsCount },
      { count: likesGivenCount },
      { count: followersCount },
      { count: photosCount },
    ] = await Promise.all([
      supabase.from('spot_history').select('*', { count: 'exact', head: true }).eq('spotter_id', user.id),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('author_id', user.id),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', user.id),
      supabase.from('post_comments').select('*', { count: 'exact', head: true }).eq('author_id', user.id),
      supabase.from('reactions').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('spot_history').select('*', { count: 'exact', head: true }).eq('spotter_id', user.id).not('photo_url', 'is', null),
    ]);

    const { data: myPosts } = await supabase.from('posts').select('id').eq('author_id', user.id);
    const postIds = myPosts?.map(p => p.id) || [];
    const { count: likesReceivedCount } = postIds.length > 0
      ? await supabase.from('reactions').select('*', { count: 'exact', head: true }).in('post_id', postIds)
      : { count: 0 };

    const { data: myComments } = await supabase.from('post_comments').select('id').eq('author_id', user.id);
    const commentIds = myComments?.map(c => c.id) || [];
    const { count: commentLikesCount } = commentIds.length > 0
      ? await supabase.from('comment_likes').select('*', { count: 'exact', head: true }).in('comment_id', commentIds)
      : { count: 0 };

    return {
      spots: spotsCount || 0,
      reviews: reviewsCount || 0,
      posts: postsCount || 0,
      comments: commentsCount || 0,
      likesGiven: likesGivenCount || 0,
      likesReceived: likesReceivedCount || 0,
      followers: followersCount || 0,
      photos: photosCount || 0,
      mods: 0,
      commentLikes: commentLikesCount || 0,
    };
  }

  const earnedBadgeIds = useMemo(() => new Set(userBadges.map(ub => ub.badge_id)), [userBadges]);

  const earned = useMemo(() => {
    return allBadges.filter(b => earnedBadgeIds.has(b.id));
  }, [allBadges, earnedBadgeIds]);

  const inProgress = useMemo(() => {
    return allBadges.filter(b => {
      if (earnedBadgeIds.has(b.id)) return false;
      if (!b.badge_group) return false;
      const count = getCountForBadge(b, activityCounts);
      return count > 0 && count < (b.tier_threshold || 999);
    });
  }, [allBadges, earnedBadgeIds, activityCounts]);

  const locked = useMemo(() => {
    return allBadges.filter(b => {
      if (earnedBadgeIds.has(b.id)) return false;
      if (inProgress.find(ip => ip.id === b.id)) return false;
      return true;
    });
  }, [allBadges, earnedBadgeIds, inProgress]);

  const nextBadge = useMemo(() => {
    if (inProgress.length === 0) return null;
    const sorted = [...inProgress].map(badge => {
      const currentCount = getCountForBadge(badge, activityCounts);
      const remaining = (badge.tier_threshold || 0) - currentCount;
      const progressPercent = (currentCount / (badge.tier_threshold || 1)) * 100;
      return { badge, currentCount, remaining, progressPercent };
    }).sort((a, b) => a.remaining - b.remaining);
    return sorted[0];
  }, [inProgress, activityCounts]);

  if (loading) {
    return (
      <Layout currentPage="rankings" onNavigate={onNavigate}>
        <div className="px-3.5 py-4">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card-v3 h-20" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="rankings" onNavigate={onNavigate}>
      <div className="pb-20 animate-page-enter">
        {/* PAGE HEADER */}
        <div className="px-4 py-4 bg-surface border-b stg" style={{ borderColor: 'var(--border-2)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-xl font-bold text-primary">Badges</h1>
              <p className="text-xs text-tertiary mt-0.5">{earned.length} of {allBadges.length} earned</p>
            </div>
            <div className="text-right">
              <div className="font-heading text-3xl font-bold" style={{ background: 'linear-gradient(135deg, var(--orange), var(--gold-h))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {Math.round((earned.length / Math.max(allBadges.length, 1)) * 100)}%
              </div>
              <div className="text-[10px] font-mono text-tertiary">{earned.length} / {allBadges.length}</div>
            </div>
          </div>
          <div className="mt-2.5 tach-bar">
            <div className="tach-fill" style={{ width: `${(earned.length / Math.max(allBadges.length, 1)) * 100}%` }} />
          </div>
        </div>

        {/* TROPHY CASE */}
        <div
          className="card-v3 mx-3.5 mt-3 p-5 relative overflow-hidden stg"
          style={{ background: 'linear-gradient(180deg, #1c1814 0%, rgba(28,24,20,0.5) 100%)' }}
        >
          <div className="absolute top-0 left-[20%] right-[20%] h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--orange-muted), transparent)' }} />
          <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-[200px] h-[60px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(249,115,22,0.06), transparent 70%)' }} />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-3 h-3" strokeWidth={1.2} style={{ color: 'var(--orange)' }} />
              <span className="slbl !p-0 !text-tertiary">Trophy Case</span>
            </div>
            <span className="text-[8px] uppercase tracking-wider cursor-pointer text-quaternary">Edit</span>
          </div>

          <div className="flex gap-3 relative z-10">
            {earned.slice(0, 3).map((badge, i) => (
              <div key={badge.id} className="w-[54px] h-[54px] rounded-full flex items-center justify-center border"
                style={{ background: '#26221c', borderColor: 'var(--border-2)', boxShadow: '0 0 12px rgba(249,115,22,0.06)' }}>
                <div className="w-[46px] h-[46px] rounded-full flex items-center justify-center coin-gold">
                  {React.createElement(getBadgeIcon(badge.icon), { className: 'w-[18px] h-[18px]', strokeWidth: 1.2, style: { color: '#1a1400' } })}
                </div>
              </div>
            ))}
            {Array.from({ length: Math.max(0, 5 - earned.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="w-[54px] h-[54px] rounded-full flex items-center justify-center"
                style={{ border: '1px dashed var(--border-2)' }}>
                <span className="text-[14px] text-quaternary">+</span>
              </div>
            ))}
          </div>

          <p className="text-[9px] mt-3.5 leading-relaxed relative z-10 text-tertiary">
            Your trophy case is shown on your profile and visible in search results.
          </p>
        </div>

        {/* NEXT BADGE HERO */}
        {nextBadge && (
          <div className="card-v3 mx-3.5 mt-3 p-4 stg">
            <div className="flex justify-between items-center mb-3">
              <div>
                <span className="text-xs font-medium text-primary">{nextBadge.badge.name}</span>
                <span className="font-mono text-[10px] ml-2" style={{ color: 'var(--gold-h)' }}>
                  {tierLabel(nextBadge.badge.tier)}
                </span>
              </div>
              <span className="font-mono text-sm text-primary">{Math.round(nextBadge.progressPercent)}%</span>
            </div>
            <div className="tach-bar">
              <div className="tach-fill" style={{ width: `${nextBadge.progressPercent}%` }} />
            </div>
            <div className="text-[10px] mt-2 text-quaternary">
              {nextBadge.currentCount} / {nextBadge.badge.tier_threshold} — <span style={{ color: 'var(--orange)' }}>{nextBadge.remaining} to go</span>
            </div>
          </div>
        )}

        {/* SECTION TABS */}
        <div className="flex mx-3.5 mt-3 bg-surface rounded-xl border p-1 stg" style={{ borderColor: 'var(--border-2)' }}>
          {[
            { key: 'earned' as const, label: 'Earned', count: earned.length, color: 'var(--positive)' },
            { key: 'progress' as const, label: 'In Progress', count: inProgress.length, color: 'var(--orange)' },
            { key: 'locked' as const, label: 'Locked', count: locked.length, color: 'var(--t3)' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                activeSection === tab.key
                  ? 'bg-surface-2'
                  : 'hover:text-secondary'
              }`}
              style={{ color: activeSection === tab.key ? '#f2f4f7' : 'rgba(242,244,247,0.5)' }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 text-[10px] font-mono" style={{ color: activeSection === tab.key ? tab.color : 'var(--t3)' }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* EARNED GRID */}
        {activeSection === 'earned' && (
          <div className="px-4 mt-3 stg">
            <div className="slbl">Earned · {earned.length}</div>
            {earned.length > 0 ? (
              <div className="grid grid-cols-3 gap-4 pb-4">
                {earned.map(badge => {
                  const IconComp = getBadgeIcon(badge.icon);
                  const tier = (badge.tier?.toLowerCase() || 'bronze') as 'bronze' | 'silver' | 'gold' | 'plat';
                  return (
                    <BadgeCoin
                      key={badge.id}
                      tier={tier}
                      name={badge.name}
                      icon={<IconComp size={16} strokeWidth={1.2} />}
                      onClick={() => {
                        setCelebBadge(badge);
                        sounds.badge();
                        haptics.medium();
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="card-v3 p-10 text-center">
                <Award className="w-10 h-10 text-quaternary mx-auto mb-3" />
                <p className="text-sm font-bold text-tertiary">No badges earned yet</p>
                <p className="text-[11px] text-quaternary mt-1">Spot vehicles, leave reviews, and engage to earn your first badge</p>
              </div>
            )}
          </div>
        )}

        {/* IN PROGRESS GRID */}
        {activeSection === 'progress' && (
          <div className="px-4 mt-3 stg">
            <div className="slbl">In Progress · {inProgress.length}</div>
            {inProgress.length > 0 ? (
              <div className="grid grid-cols-3 gap-4 pb-4">
                {inProgress.map(badge => {
                  const IconComp = getBadgeIcon(badge.icon);
                  const cur = getCountForBadge(badge, activityCounts);
                  const tgt = badge.tier_threshold || 1;
                  const tier = (badge.tier?.toLowerCase() || 'bronze') as 'bronze' | 'silver' | 'gold' | 'plat';
                  return (
                    <div key={badge.id} className="flex flex-col items-center gap-1.5">
                      <BadgeCoin
                        tier={tier}
                        name={badge.name}
                        icon={<IconComp size={16} strokeWidth={1.2} />}
                      />
                      <div className="text-[9px] font-mono font-bold" style={{ color: 'var(--orange)' }}>{cur}/{tgt}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card-v3 p-10 text-center">
                <TrendingUp className="w-10 h-10 text-quaternary mx-auto mb-3" />
                <p className="text-sm font-bold text-tertiary">No badges in progress</p>
                <p className="text-[11px] text-quaternary mt-1">Start spotting and posting to begin earning</p>
              </div>
            )}
          </div>
        )}

        {/* LOCKED GRID */}
        {activeSection === 'locked' && (
          <div className="px-4 mt-3 stg">
            <div className="slbl">Locked · {locked.length}</div>
            <div className="grid grid-cols-3 gap-4 pb-4">
              {locked.map(badge => (
                <BadgeCoin
                  key={badge.id}
                  tier="bronze"
                  name="???"
                  icon={<Lock size={16} />}
                  locked={true}
                />
              ))}
              <div className="flex flex-col items-center gap-1.5 opacity-[0.15]">
                <div className="w-14 h-14 rounded-full flex items-center justify-center border border-dashed" style={{ borderColor: 'var(--border-2)', background: 'var(--s2)' }}>
                  <span className="text-lg font-bold text-quaternary">?</span>
                </div>
                <span className="text-[10px] font-medium text-quaternary">Mystery</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {celebBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
             style={{ background: 'rgba(0,0,0,0.85)' }}
             onClick={() => setCelebBadge(null)}>
          <div className="text-center p-8" onClick={e => e.stopPropagation()}>
            <div className="w-20 h-20 mx-auto rounded-full flex items-center justify-center"
                 style={{ background: 'linear-gradient(145deg, #806828, #c8a45a 55%, #806828)', border: '3px solid rgba(200,164,90,0.4)' }}>
              {React.createElement(getBadgeIcon(celebBadge.icon), { size: 28, strokeWidth: 1.2, style: { color: 'rgba(255,255,255,0.9)' } })}
            </div>
            <h3 className="text-lg font-bold text-primary mt-4">{celebBadge.name}</h3>
            <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--gold-h)' }}>
              {celebBadge.tier ? tierLabel(celebBadge.tier) : 'Bronze'}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--t3)' }}>{celebBadge.description || 'Badge earned'}</p>
            <p className="text-[10px] font-mono mt-3" style={{ color: 'var(--t4)' }}>
              {celebBadge.tier || 'Bronze'} tier · {celebBadge.category || 'Achievement'} badge
            </p>
            <button className="spot-btn px-8 mt-6" onClick={() => setCelebBadge(null)}>Done</button>
          </div>
        </div>
      )}
    </Layout>
  );
}
