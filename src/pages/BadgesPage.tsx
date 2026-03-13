import React, { useEffect, useState, useMemo } from 'react';
import { Award, Lock, CheckCircle2, ChevronRight, Crosshair, Star, Users, Heart, Camera, FileText, MessageCircle, TrendingUp, Wrench, ThumbsUp, MapPin, UserPlus, Car, Tag, Zap, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { type OnNavigate } from '../types/navigation';
import { BadgeCoin } from '../components/BadgeCoin';
import { BadgeCelebration } from '../components/badges/BadgeCelebration';
import { sounds } from '../lib/sounds';
import { haptics } from '../lib/haptics';
import { getTierFromScore } from '../lib/tierConfig';
import { formatRP } from '../lib/vehicleUtils';

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

const CATEGORIES = ['All', 'Spotter', 'Owner', 'Social', 'Elite', 'Legendary'] as const;

function getHexBackground(rarity: string, isLocked: boolean) {
  if (isLocked) return { background: 'linear-gradient(135deg, #1a2633, #222f40, #1a2633)', filter: 'none' };
  switch (rarity?.toLowerCase()) {
    case 'legendary':
      return { background: 'linear-gradient(135deg, #a06820, #f0a030, #a06820)', filter: 'drop-shadow(0 0 10px rgba(240,160,48,0.6))' };
    case 'epic':
      return { background: 'linear-gradient(135deg, #a03000, #f97316, #a03000)', filter: 'drop-shadow(0 0 10px rgba(249,115,22,0.55))' };
    case 'rare':
      return { background: 'linear-gradient(135deg, #183888, #3888ee, #183888)', filter: 'drop-shadow(0 0 8px rgba(56,136,238,0.4))' };
    default:
      return { background: 'linear-gradient(135deg, #7a4820, #c07848, #7a4820)', filter: 'drop-shadow(0 0 8px rgba(192,120,72,0.35))' };
  }
}

function getRarityLabelColor(rarity: string): string {
  switch (rarity?.toLowerCase()) {
    case 'legendary': return 'var(--gold, #f0a030)';
    case 'epic': return 'var(--accent, #F97316)';
    case 'rare': return '#3888ee';
    default: return 'var(--muted, #586878)';
  }
}

export function BadgesPage({ onNavigate }: BadgesPageProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
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
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', user.id).in('post_type', ['spot', 'review']),
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

  // Filtered badges by category (all badges, earned + locked)
  const filteredBadges = useMemo(() => {
    const all = allBadges;
    if (activeCategory === 'all') return all;
    return all.filter(b => b.category?.toLowerCase() === activeCategory.toLowerCase());
  }, [allBadges, activeCategory]);

  const earnedPct = (earned.length / Math.max(allBadges.length, 1)) * 100;
  const circumference = 2 * Math.PI * 32;
  const dashOffset = circumference - (earnedPct / 100) * circumference;
  const userTier = getTierFromScore(profile?.reputation_score ?? 0);

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

  return (
    <Layout currentPage="badges" onNavigate={onNavigate}>
      <style>{`
        @keyframes badge-glow {
          0%, 100% { filter: drop-shadow(0 0 8px rgba(240,160,48,0.5)); }
          50% { filter: drop-shadow(0 0 20px rgba(240,160,48,0.95)); }
        }
        .badge-hex-scrollbar::-webkit-scrollbar { display: none; }
        .badge-hex-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="pb-20 animate-page-enter">
        {/* MASTHEAD */}
        <div style={{
          padding: '54px 20px 14px',
          background: 'linear-gradient(to bottom, #070a0f, transparent)',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}>
          {/* Donut SVG */}
          <div style={{ position: 'relative', width: 78, height: 78, flexShrink: 0 }}>
            <svg viewBox="0 0 78 78" width={78} height={78} style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx={39} cy={39} r={32}
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={7}
                fill="none"
              />
              <circle
                cx={39} cy={39} r={32}
                stroke="#F97316"
                strokeWidth={7}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
              />
            </svg>
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span style={{
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 19,
                fontWeight: 700,
                color: '#F97316',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}>
                {Math.round(earnedPct)}%
              </span>
              <span style={{
                fontFamily: 'Barlow Condensed, sans-serif',
                fontSize: 6,
                fontWeight: 700,
                textTransform: 'uppercase',
                color: 'var(--muted, #586878)',
                lineHeight: 1,
                marginTop: 2,
              }}>
                EARNED
              </span>
            </div>
          </div>

          {/* Info block */}
          <div>
            <div style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 38,
              fontWeight: 700,
              color: '#fff',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}>
              {earned.length}
            </div>
            <div style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: 9,
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--muted, #586878)',
            }}>
              of {allBadges.length} Badges
            </div>
            <div style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: 12,
              fontWeight: 700,
              color: '#F97316',
              marginTop: 5,
            }}>
              {userTier} Tier
            </div>
          </div>
        </div>

        {/* CATEGORY TABS */}
        <div
          className="badge-hex-scrollbar"
          style={{
            display: 'flex',
            overflowX: 'auto',
            padding: '0 20px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat.toLowerCase())}
                style={{
                  flexShrink: 0,
                  padding: '7px 14px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: isActive ? 'var(--accent, #F97316)' : 'var(--muted, #586878)',
                  borderBottom: isActive ? '2px solid var(--accent, #F97316)' : '2px solid transparent',
                  background: 'none',
                  border: 'none',
                  borderBottomWidth: 2,
                  borderBottomStyle: 'solid',
                  borderBottomColor: isActive ? 'var(--accent, #F97316)' : 'transparent',
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* BADGE GRID */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
          padding: 16,
        }}>
          {filteredBadges.map(badge => {
            const isEarned = earnedBadgeIds.has(badge.id);
            const isLocked = !isEarned;
            const rarity = badge.rarity?.toLowerCase() || 'common';
            const hexStyle = getHexBackground(rarity, isLocked);
            const IconComp = getBadgeIcon(badge.icon);
            const isLegendary = rarity === 'legendary' && isEarned;

            // Progress bar data
            const currentCount = getCountForBadge(badge, activityCounts);
            const threshold = badge.tier_threshold || 0;
            const isInProgress = !isEarned && currentCount > 0 && threshold > 0 && currentCount < threshold;
            const progressPct = threshold > 0 ? (currentCount / threshold) * 100 : 0;

            return (
              <div
                key={badge.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 5,
                  cursor: 'pointer',
                  opacity: isLocked ? 0.3 : 1,
                }}
                onClick={() => {
                  if (isEarned) {
                    setCelebBadge(badge);
                    sounds.badge();
                    haptics.medium();
                  }
                }}
              >
                {/* Hex shape */}
                <div style={{
                  width: 70,
                  height: 70,
                  clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 26,
                  background: hexStyle.background,
                  filter: hexStyle.filter,
                  ...(isLegendary ? { animation: 'badge-glow 3s ease-in-out infinite' } : {}),
                }}>
                  <IconComp size={26} strokeWidth={1.2} style={{ color: isLocked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.95)' }} />
                </div>

                {/* Badge name */}
                <span style={{
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'var(--light, #c0c8d4)',
                  textAlign: 'center',
                  lineHeight: 1.2,
                }}>
                  {isLocked ? '???' : badge.name}
                </span>

                {/* Rarity label */}
                <span style={{
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontSize: 7,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: getRarityLabelColor(rarity),
                }}>
                  {badge.rarity}
                </span>

                {/* Progress bar (in-progress only) */}
                {isInProgress && (
                  <div style={{
                    width: '100%',
                    height: 2,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.07)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${Math.min(progressPct, 100)}%`,
                      height: '100%',
                      background: 'var(--accent, #F97316)',
                      borderRadius: 2,
                    }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {celebBadge && (
        <BadgeCelebration
          badgeName={celebBadge.name}
          badgeDescription={celebBadge.description || 'Badge earned'}
          tier={(celebBadge.tier?.toLowerCase() || 'bronze') as 'bronze' | 'silver' | 'gold' | 'platinum'}
          icon={React.createElement(getBadgeIcon(celebBadge.icon), { size: 36, strokeWidth: 1.2, style: { color: 'rgba(255,255,255,0.9)' } })}
          onClose={() => setCelebBadge(null)}
          onViewBadges={() => { setCelebBadge(null); setActiveCategory('all'); }}
        />
      )}
    </Layout>
  );
}
