import React, { useEffect, useState, useMemo } from 'react';
import { Award, Lock, CheckCircle2, ChevronRight, Crosshair, Star, Users, Heart, Camera, FileText, MessageCircle, TrendingUp, Wrench, ThumbsUp, MapPin, UserPlus, Car, Tag, Zap, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { type OnNavigate } from '../types/navigation';
import { BadgeCoin } from '../components/BadgeCoin';
import { sounds } from '../lib/sounds';
import { haptics } from '../lib/haptics';
import { getBadgeImagePath, getBadgeType } from '../lib/badgeUtils';

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

function getRarityColor(rarity: string): string {
  switch (rarity?.toLowerCase()) {
    case 'common':    return 'var(--silver)';
    case 'uncommon':  return 'var(--positive)';
    case 'rare':      return 'var(--blue)';
    case 'epic':      return 'var(--accent)';
    case 'legendary': return 'var(--gold)';
    default:          return 'var(--muted)';
  }
}

function stripRpReferences(desc: string): string {
  if (!desc) return '';
  return desc
    .replace(/\s*\+?\s*\d+\s*RP\.?/gi, '')
    .replace(/\s*earn\s*\d+\s*RP\.?/gi, '')
    .replace(/\s*rewards?\s*\d+\s*RP\.?/gi, '')
    .replace(/\s*RP\s*reward.*$/gi, '')
    .trim();
}

function getTierBarColor(tier: string | null | undefined): string {
  switch (tier?.toLowerCase()) {
    case 'bronze':   return '#c07840';
    case 'silver':   return '#9ab0c0';
    case 'gold':     return '#f0a030';
    case 'platinum':
    case 'plat':     return '#8a88a8';
    default:         return 'var(--accent)';
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

  const getTierBackground = (tier: string) => {
    switch (tier) {
      case 'gold': return 'linear-gradient(135deg, #c07830 0%, #f0a030 40%, #c07830 100%)';
      case 'silver': return 'linear-gradient(135deg, #6888a0 0%, #9ab8cc 40%, #6888a0 100%)';
      case 'bronze': return 'linear-gradient(135deg, #804828 0%, #b07040 40%, #804828 100%)';
      default: return 'linear-gradient(135deg, #c04810 0%, #f97316 40%, #c04810 100%)';
    }
  };

  if (loading) {
    return (
      <Layout currentPage="badges" onNavigate={onNavigate}>
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

  const currentBadges = activeSection === 'earned' ? earned : activeSection === 'progress' ? inProgress : locked;

  return (
    <Layout currentPage="badges" onNavigate={onNavigate}>
      <div className="pb-20 animate-page-enter">
        {/* DONUT HEADER */}
        <div style={{ padding: '56px 20px 20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <svg width="78" height="78" viewBox="0 0 78 78">
            <circle cx="39" cy="39" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
            <circle cx="39" cy="39" r="32" fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={`${(earned.length / Math.max(allBadges.length, 1)) * 201} 201`}
              transform="rotate(-90 39 39)" />
            <text x="39" y="36" textAnchor="middle" style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, fill: 'var(--accent)' }}>
              {Math.round((earned.length / Math.max(allBadges.length, 1)) * 100)}%
            </text>
            <text x="39" y="50" textAnchor="middle" style={{ fontFamily: 'var(--font-cond)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', fill: 'var(--muted)' }}>
              EARNED
            </text>
          </svg>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, color: 'var(--white)' }}>{earned.length}</div>
            <div style={{ fontFamily: 'var(--font-cond)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>Badges Earned</div>
            <div style={{ fontFamily: 'var(--font-cond)', fontSize: '9px', color: 'var(--dim)', marginTop: '2px' }}>
              {allBadges.length > 0 ? `Top ${Math.max(1, Math.round(100 - (earned.length / allBadges.length) * 100))}% of spotters` : ''}
            </div>
          </div>
        </div>

        {/* NEXT BADGE HERO */}
        {nextBadge && (
          <div className="card-v3 mx-3.5 mt-3 p-4 stg">
            <div className="flex justify-between items-center mb-3">
              <div>
                <span className="text-xs font-medium text-primary" style={{ fontFamily: 'var(--font-display)' }}>{nextBadge.badge.name}</span>
                <span className="text-[10px] ml-2" style={{ fontFamily: 'var(--font-cond)', color: 'var(--gold-h)' }}>
                  {tierLabel(nextBadge.badge.tier)}
                </span>
              </div>
              <span className="text-sm text-primary" style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{Math.round(nextBadge.progressPercent)}%</span>
            </div>
            <div className="tach-bar">
              <div className="tach-fill" style={{ width: `${nextBadge.progressPercent}%` }} />
            </div>
            <div className="text-[10px] mt-2 text-quaternary" style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
              {nextBadge.currentCount} / {nextBadge.badge.tier_threshold} — <span style={{ color: 'var(--orange)' }}>{nextBadge.remaining} to go</span>
            </div>
          </div>
        )}

        {/* CATEGORY FILTER CHIPS */}
        <div style={{ display: 'flex', gap: '6px', padding: '16px 20px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {(['earned', 'progress', 'locked'] as const).map(key => (
            <button key={key} onClick={() => setActiveSection(key)}
              style={{
                fontFamily: 'var(--font-cond)', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.12em', padding: '5px 12px', borderRadius: '3px', cursor: 'pointer',
                background: activeSection === key ? 'var(--accent-dim)' : 'rgba(255,255,255,0.04)',
                color: activeSection === key ? 'var(--accent)' : 'var(--dim)',
                borderWidth: '1px', borderStyle: 'solid',
                borderColor: activeSection === key ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.05)',
              }}>
              {key === 'earned' ? `Earned \u00B7 ${earned.length}` : key === 'progress' ? `In Progress \u00B7 ${inProgress.length}` : `Locked \u00B7 ${locked.length}`}
            </button>
          ))}
        </div>

        {/* 5-column coin vault */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, padding: '0 16px 20px' }}>
          {currentBadges.map((badge) => {
            const isEarned = earnedBadgeIds.has(badge.id);
            const isInProgressBadge = !isEarned && inProgress.find(ip => ip.id === badge.id);
            const isLocked = !isEarned && !isInProgressBadge;
            const badgeType = getBadgeType(badge);
            const labelColor = isLocked ? '#445566' : badgeType === 'prestige' ? '#f0a030' : badgeType === 'milestone' ? '#F97316' : '#7a8e9e';
            const tier = (badge.tier?.toLowerCase() || 'bronze') as 'bronze' | 'silver' | 'gold' | 'plat';

            return (
              <div key={badge.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, cursor: isEarned ? 'pointer' : 'default' }}
                onClick={() => { if (isEarned) { setCelebBadge(badge); try { sounds.badge(); haptics.medium(); } catch {} } }}>
                <div style={{ position: 'relative', filter: isLocked ? 'grayscale(1)' : 'none', opacity: isLocked ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                  <BadgeCoin tier={tier} name={isLocked ? '???' : badge.name} locked={isLocked} size="sm" />
                  {/* Progress ring for in-progress badges */}
                  {isInProgressBadge && badge.tier_threshold && (() => {
                    const count = getCountForBadge(badge, activityCounts);
                    const pct = Math.min(100, Math.round((count / (badge.tier_threshold || 1)) * 100));
                    return (
                      <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', background: `conic-gradient(rgba(249,115,22,0.55) ${pct}%, transparent ${pct}%)`, zIndex: -1 }} />
                    );
                  })()}
                </div>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: labelColor, textAlign: 'center', maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {isLocked ? 'Locked' : badge.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Empty states */}
        {currentBadges.length === 0 && (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: '#eef4f8' }}>
              {activeSection === 'earned' ? 'No badges earned yet' : activeSection === 'progress' ? 'No badges in progress' : 'All badges unlocked!'}
            </p>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e', marginTop: 4 }}>
              {activeSection === 'earned' ? 'Spot vehicles and engage to earn badges' : activeSection === 'progress' ? 'Start spotting to begin earning' : ''}
            </p>
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
            <h3 className="text-lg text-primary mt-4" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{celebBadge.name}</h3>
            <p className="text-[10px] mt-1" style={{ fontFamily: 'var(--font-cond)', color: 'var(--gold-h)' }}>
              {celebBadge.tier ? tierLabel(celebBadge.tier) : 'Bronze'}
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--t3)' }}>{stripRpReferences(celebBadge.description || 'Badge earned')}</p>
            <p className="text-[10px] mt-3" style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--t4)' }}>
              {celebBadge.tier || 'Bronze'} tier
            </p>
            <button className="spot-btn px-8 mt-6" onClick={() => setCelebBadge(null)}>Done</button>
          </div>
        </div>
      )}
    </Layout>
  );
}
