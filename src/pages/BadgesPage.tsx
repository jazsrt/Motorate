import React, { useEffect, useState, useMemo } from 'react';
import { Award, Lock, CheckCircle2, Crosshair, Star, Users, Heart, Camera, FileText, MessageCircle, TrendingUp, Wrench, ThumbsUp, MapPin, UserPlus, Car, Tag, Zap, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { type OnNavigate } from '../types/navigation';
import { BadgeCoin } from '../components/BadgeCoin';
import { BadgeCelebration } from '../components/badges/BadgeCelebration';
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

function getProgressHint(badge: Badge): string | null {
  if (!badge.tracks || !badge.tier_threshold) return null;
  const t = badge.tier_threshold;
  switch (badge.tracks) {
    case 'spots': return `${t} spots`;
    case 'reviews': return `${t} reviews`;
    case 'posts': return `${t} posts`;
    case 'comments': return `${t} comments`;
    case 'likes_given': return `${t} likes`;
    case 'likes_received': return `${t} likes rcvd`;
    case 'followers': return `${t} followers`;
    case 'photos': return `${t} photos`;
    default: return null;
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
        <div className="px-4 py-6">
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
      <div className="pb-20 page-enter">

        {/* ─── PAGE HEADER ─── */}
        <div className="px-5 pt-5 pb-4 v3-stagger v3-stagger-1">
          <div className="flex items-center justify-between">
            <div>
              <div style={{ fontSize: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '3px', color: 'var(--t4)' }}>
                Collection
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 300, color: 'var(--t1)', marginTop: 4, fontFamily: "'Space Grotesk', sans-serif" }}>
                Badges
              </h1>
            </div>
            <div className="text-right">
              <span className="mono" style={{ fontSize: 28, fontWeight: 700, color: 'var(--orange)', textShadow: '0 0 20px rgba(249,115,22,.2)' }}>
                {earned.length}
              </span>
              <span style={{ fontSize: 14, fontWeight: 300, color: 'var(--t3)' }}> / {allBadges.length}</span>
              <div style={{ fontSize: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--t4)', marginTop: 2 }}>
                {Math.round((earned.length / Math.max(allBadges.length, 1)) * 100)}% complete
              </div>
            </div>
          </div>
          <div className="tach-bar" style={{ marginTop: 12 }}>
            <div className="tach-fill" style={{ width: `${(earned.length / Math.max(allBadges.length, 1)) * 100}%` }} />
          </div>
        </div>

        {/* ─── TROPHY CASE ─── */}
        <div
          className="card-v3 card-v3-lift mx-4 p-5 relative overflow-hidden v3-stagger v3-stagger-2"
          style={{ background: 'linear-gradient(180deg, #1c1814 0%, rgba(28,24,20,0.5) 100%)' }}
        >
          <div className="absolute top-0 left-[20%] right-[20%] h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--orange-muted), transparent)' }} />
          <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-[200px] h-[60px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(249,115,22,0.06), transparent 70%)' }} />

          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-3 h-3" strokeWidth={1.2} style={{ color: 'var(--orange)' }} />
            <span style={{ fontSize: 8, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '2.5px', color: 'var(--t4)' }}>
              Trophy Case
            </span>
          </div>

          <div className="flex gap-3 justify-center relative z-10">
            {earned.slice(0, 5).map((badge) => {
              const IconComp = getBadgeIcon(badge.icon);
              const tier = (badge.tier?.toLowerCase() || 'bronze') as 'bronze' | 'silver' | 'gold' | 'plat';
              return (
                <BadgeCoin
                  key={badge.id}
                  tier={tier}
                  name={badge.name}
                  size="sm"
                  icon={<IconComp size={14} strokeWidth={1.2} />}
                  onClick={() => { setCelebBadge(badge); sounds.badge(); haptics.medium(); }}
                />
              );
            })}
            {Array.from({ length: Math.max(0, 5 - earned.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="flex flex-col items-center gap-1.5">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center"
                  style={{ border: '1px dashed var(--border-2)', opacity: 0.4 }}
                >
                  <span style={{ fontSize: 14, color: 'var(--t4)' }}>+</span>
                </div>
                <span style={{ fontSize: 10, color: 'var(--t4)', opacity: 0.4 }}>???</span>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 9, marginTop: 14, lineHeight: 1.6, color: 'var(--t4)', position: 'relative', zIndex: 1 }}>
            Your trophy case is shown on your profile and visible in search results.
          </p>
        </div>

        {/* ─── NEXT BADGE HERO ─── */}
        {nextBadge && (
          <div className="card-v3 mx-4 mt-3 p-4 v3-stagger v3-stagger-3">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--orange-dim)', border: '1px solid var(--orange-muted)' }}
                >
                  {React.createElement(getBadgeIcon(nextBadge.badge.icon), { size: 14, strokeWidth: 1.2, style: { color: 'var(--orange)' } })}
                </div>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--t1)' }}>{nextBadge.badge.name}</span>
                  {nextBadge.badge.tier && (
                    <span className="mono" style={{ fontSize: 9, marginLeft: 6, color: 'var(--gold-h)' }}>
                      {tierLabel(nextBadge.badge.tier)}
                    </span>
                  )}
                </div>
              </div>
              <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: 'var(--orange)' }}>
                {Math.round(nextBadge.progressPercent)}%
              </span>
            </div>
            <div className="tach-bar">
              <div className="tach-fill" style={{ width: `${nextBadge.progressPercent}%` }} />
            </div>
            <div style={{ fontSize: 10, marginTop: 6, color: 'var(--t4)' }}>
              <span className="mono" style={{ color: 'var(--t2)' }}>{nextBadge.currentCount}</span>
              <span> / {nextBadge.badge.tier_threshold}</span>
              <span style={{ color: 'var(--orange)', marginLeft: 8 }}>{nextBadge.remaining} to go</span>
            </div>
          </div>
        )}

        {/* ─── V3 SECTION TABS ─── */}
        <div className="flex gap-2 px-4 mt-4 v3-stagger v3-stagger-4">
          {[
            { key: 'earned' as const, label: 'Earned', count: earned.length },
            { key: 'progress' as const, label: 'Progress', count: inProgress.length },
            { key: 'locked' as const, label: 'Locked', count: locked.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 10,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                fontFamily: "'Space Grotesk', sans-serif",
                cursor: 'pointer',
                border: activeSection === tab.key ? '1px solid var(--orange-muted)' : '1px solid var(--border)',
                background: activeSection === tab.key ? 'var(--orange-dim)' : 'transparent',
                color: activeSection === tab.key ? 'var(--orange)' : 'var(--t3)',
                transition: 'all 0.2s',
              }}
            >
              {tab.label} <span className="mono">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* ─── EARNED GRID ─── */}
        {activeSection === 'earned' && (
          <div className="px-4 mt-4 v3-stagger v3-stagger-5">
            {earned.length > 0 ? (
              <div className="grid grid-cols-3 gap-4 pb-4">
                {earned.map((badge, i) => {
                  const IconComp = getBadgeIcon(badge.icon);
                  const tier = (badge.tier?.toLowerCase() || 'bronze') as 'bronze' | 'silver' | 'gold' | 'plat';
                  return (
                    <div key={badge.id} className="stg" style={{ animationDelay: `${i * 50}ms` }}>
                      <BadgeCoin
                        tier={tier}
                        name={badge.name}
                        icon={<IconComp size={16} strokeWidth={1.2} />}
                        onClick={() => { setCelebBadge(badge); sounds.badge(); haptics.medium(); }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card-v3 p-10 text-center">
                <Award className="w-10 h-10 mx-auto mb-3" strokeWidth={1} style={{ color: 'var(--t4)' }} />
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t3)' }}>No badges earned yet</p>
                <p style={{ fontSize: 11, fontWeight: 300, color: 'var(--t4)', marginTop: 4 }}>
                  Spot vehicles, leave reviews, and engage to earn your first badge
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── IN PROGRESS GRID ─── */}
        {activeSection === 'progress' && (
          <div className="px-4 mt-4 v3-stagger v3-stagger-5">
            {inProgress.length > 0 ? (
              <div className="grid grid-cols-3 gap-4 pb-4">
                {inProgress.map((badge, i) => {
                  const IconComp = getBadgeIcon(badge.icon);
                  const cur = getCountForBadge(badge, activityCounts);
                  const tgt = badge.tier_threshold || 1;
                  const tier = (badge.tier?.toLowerCase() || 'bronze') as 'bronze' | 'silver' | 'gold' | 'plat';
                  return (
                    <div key={badge.id} className="flex flex-col items-center gap-1 stg" style={{ animationDelay: `${i * 50}ms` }}>
                      <BadgeCoin
                        tier={tier}
                        name={badge.name}
                        icon={<IconComp size={16} strokeWidth={1.2} />}
                      />
                      <div className="w-10 h-1 rounded-full overflow-hidden" style={{ background: 'var(--s3)', marginTop: -2 }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min((cur / tgt) * 100, 100)}%`, background: 'var(--orange)' }} />
                      </div>
                      <span className="mono" style={{ fontSize: 9, fontWeight: 600, color: 'var(--orange)' }}>{cur}/{tgt}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="card-v3 p-10 text-center">
                <TrendingUp className="w-10 h-10 mx-auto mb-3" strokeWidth={1} style={{ color: 'var(--t4)' }} />
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--t3)' }}>No badges in progress</p>
                <p style={{ fontSize: 11, fontWeight: 300, color: 'var(--t4)', marginTop: 4 }}>
                  Start spotting and posting to begin earning
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── LOCKED GRID ─── */}
        {activeSection === 'locked' && (
          <div className="px-4 mt-4 v3-stagger v3-stagger-5">
            <div className="grid grid-cols-3 gap-4 pb-4">
              {locked.map((badge, i) => {
                const hint = getProgressHint(badge);
                return (
                  <div key={badge.id} className="flex flex-col items-center gap-1 stg" style={{ animationDelay: `${i * 40}ms` }}>
                    <BadgeCoin
                      tier="bronze"
                      name="???"
                      icon={<Lock size={16} strokeWidth={1.2} />}
                      locked={true}
                    />
                    {hint && (
                      <span style={{ fontSize: 8, fontWeight: 400, color: 'var(--t4)', textAlign: 'center', lineHeight: '1.3' }}>
                        {hint}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Badge Celebration ─── */}
      {celebBadge && (() => {
        const IconComp = getBadgeIcon(celebBadge.icon);
        const t = celebBadge.tier?.toLowerCase() || 'bronze';
        const celebTier = (['platinum', 'gold', 'silver'].includes(t) ? t : 'bronze') as 'bronze' | 'silver' | 'gold' | 'platinum';
        return (
          <BadgeCelebration
            badgeName={celebBadge.name}
            badgeDescription={celebBadge.description || 'Badge earned'}
            tier={celebTier}
            icon={<IconComp size={40} strokeWidth={1.2} style={{ color: 'rgba(255,255,255,0.9)' }} />}
            onClose={() => setCelebBadge(null)}
          />
        );
      })()}
    </Layout>
  );
}
