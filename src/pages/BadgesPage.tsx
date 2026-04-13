import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Award, CheckCircle2, Crosshair, Star, Users, Heart, Camera, FileText, MessageCircle, TrendingUp, Wrench, ThumbsUp, MapPin, UserPlus, Car, Tag, Zap } from 'lucide-react';
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

function stripRpReferences(desc: string): string {
  if (!desc) return '';
  return desc
    .replace(/\s*\+?\s*\d+\s*RP\.?/gi, '')
    .replace(/\s*earn\s*\d+\s*RP\.?/gi, '')
    .replace(/\s*rewards?\s*\d+\s*RP\.?/gi, '')
    .replace(/\s*RP\s*reward.*$/gi, '')
    .trim();
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
  const [celebBadge, setCelebBadge] = useState<Badge | null>(null);
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

  const loadBadgeData = useCallback(async function loadBadgeData() {
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
  }, [user]);

  useEffect(() => {
    if (user) {
      loadBadgeData();
    }
  }, [user, loadBadgeData]);

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
      <Layout currentPage="badges" onNavigate={onNavigate}>
        <div style={{ padding: '16px 14px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: 80, background: '#0a0d14', borderBottom: '1px solid rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const currentBadges = activeSection === 'earned' ? earned : activeSection === 'progress' ? inProgress : locked;

  return (
    <Layout currentPage="badges" onNavigate={onNavigate}>
      <div style={{ paddingBottom: 80 }}>
        {/* DONUT HEADER */}
        <div style={{ padding: '56px 20px 20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <svg width="78" height="78" viewBox="0 0 78 78">
            <circle cx="39" cy="39" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
            <circle cx="39" cy="39" r="32" fill="none" stroke="#F97316" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={`${(earned.length / Math.max(allBadges.length, 1)) * 201} 201`}
              transform="rotate(-90 39 39)" />
            <text x="39" y="36" textAnchor="middle" style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '22px', fontWeight: 700, fill: '#F97316' }}>
              {Math.round((earned.length / Math.max(allBadges.length, 1)) * 100)}%
            </text>
            <text x="39" y="50" textAnchor="middle" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '8px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', fill: '#3a4e60' }}>
              EARNED
            </text>
          </svg>
          <div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 28, fontWeight: 700, color: '#eef4f8' }}>{earned.length}</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#3a4e60' }}>Badges Earned</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5a6e7e', marginTop: 2 }}>
              {allBadges.length > 0 ? `Top ${Math.max(1, Math.round(100 - (earned.length / allBadges.length) * 100))}% of spotters` : ''}
            </div>
          </div>
        </div>

        {/* NEXT BADGE HERO */}
        {nextBadge && (
          <div style={{ margin: '12px 14px', padding: '14px 16px', background: '#0a0d14', borderTop: '1px solid rgba(249,115,22,0.16)', borderBottom: '1px solid rgba(249,115,22,0.16)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, fontWeight: 700, color: '#eef4f8' }}>{nextBadge.badge.name}</span>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: '#F97316', fontVariantNumeric: 'tabular-nums' }}>{Math.round(nextBadge.progressPercent)}%</span>
            </div>
            <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div className="mr-bar" style={{ height: '100%', background: '#F97316', '--bar-w': `${nextBadge.progressPercent}%` } as React.CSSProperties} />
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#5a6e7e', marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>
              {nextBadge.currentCount} / {nextBadge.badge.tier_threshold} — <span style={{ color: '#F97316' }}>{nextBadge.remaining} to go</span>
            </div>
          </div>
        )}

        {/* CATEGORY FILTER CHIPS */}
        <div style={{ display: 'flex', gap: '6px', padding: '16px 20px 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {(['earned', 'progress', 'locked'] as const).map(key => (
            <button key={key} onClick={() => setActiveSection(key)}
              style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const,
                letterSpacing: '0.12em', padding: '5px 12px', borderRadius: 3, cursor: 'pointer',
                background: activeSection === key ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
                color: activeSection === key ? '#F97316' : '#5a6e7e',
                border: `1px solid ${activeSection === key ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.05)'}`,
                transition: 'all 0.2s',
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
                onClick={() => { if (isEarned) { setCelebBadge(badge); try { sounds.badge(); haptics.medium(); } catch { /* intentionally empty */ } } }}>
                <div style={{ position: 'relative', filter: isLocked ? 'grayscale(1)' : 'none', opacity: isLocked ? 0.4 : 1, transition: 'opacity 0.2s, filter 0.2s, transform 0.2s' }}>
                  <BadgeCoin tier={tier} name={isLocked ? '???' : badge.name} icon_path={getBadgeImagePath(badge)} locked={isLocked} size="sm" />
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
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setCelebBadge(null)}>
          <div style={{ textAlign: 'center', padding: 32 }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 100, height: 100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {React.createElement(getBadgeIcon(celebBadge.icon), { size: 80, strokeWidth: 1.2, style: { color: '#F97316' } })}
            </div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#eef4f8', marginTop: 16 }}>{celebBadge.name}</div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#7a8e9e', marginTop: 8 }}>{stripRpReferences(celebBadge.description || 'Badge earned')}</div>
            <button
              onClick={() => setCelebBadge(null)}
              style={{ marginTop: 24, padding: '10px 32px', background: '#F97316', border: 'none', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#030508', cursor: 'pointer' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
