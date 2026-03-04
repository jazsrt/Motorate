import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Award, CheckCircle, Trash2, Sparkles, ArrowLeft } from 'lucide-react';
import { getBadgeIcon } from '../lib/badgeIcons';

interface Badge {
  id: string;
  name: string;
  description: string;
  category: string;
  icon_name: string;
  level: number;
  level_name: string;
  tier: string;
}

export function BadgeTestingPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadBadges();
    loadUserBadges();
  }, [user?.id]);

  async function loadBadges() {
    const { data } = await supabase.from('badges').select('*').order('category').order('name');
    setBadges(data || []);
    setInitialLoading(false);
  }

  async function loadUserBadges() {
    if (!user?.id) return;
    const { data } = await supabase.from('user_badges').select('badge_id').eq('user_id', user.id);
    setUserBadges(new Set(data?.map(ub => ub.badge_id) || []));
  }

  async function awardBadge(badgeId: string, badgeName: string) {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('user_badges').insert({
        user_id: user.id,
        badge_id: badgeId,
        earned_at: new Date().toISOString()
      });
      if (error) throw error;
      showToast(`Badge Unlocked: ${badgeName}!`, 'success');
      await loadUserBadges();
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === '23505') {
        showToast('You already have this badge', 'warning');
      } else {
        showToast('Failed to award badge', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  async function awardAllBadges() {
    if (!user?.id) return;
    if (!confirm('Award ALL badges? This will trigger many notifications.')) return;
    setLoading(true);
    try {
      const badgesToAward = badges.filter(b => !userBadges.has(b.id)).map(b => ({
        user_id: user.id,
        badge_id: b.id,
        earned_at: new Date().toISOString()
      }));
      const { error } = await supabase.from('user_badges').insert(badgesToAward);
      if (error) throw error;
      showToast(`Awarded ${badgesToAward.length} badges!`, 'success');
      await loadUserBadges();
    } catch {
      showToast('Failed to award badges', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function removeAllBadges() {
    if (!user?.id) return;
    if (!confirm('Remove ALL badges? This allows you to re-test notifications.')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('user_badges').delete().eq('user_id', user.id);
      if (error) throw error;
      showToast('All badges removed', 'success');
      await loadUserBadges();
    } catch {
      showToast('Failed to remove badges', 'error');
    } finally {
      setLoading(false);
    }
  }

  const groupedBadges = badges.reduce((acc, badge) => {
    const category = badge.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(badge);
    return acc;
  }, {} as Record<string, Badge[]>);

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      'bronze': 'border-orange-400 bg-orange-50',
      'silver': 'border-gray-400 bg-gray-50',
      'gold': 'border-yellow-400 bg-yellow-50',
      'platinum': 'border-cyan-400 bg-cyan-50',
    };
    return colors[tier?.toLowerCase()] || 'border-gray-300 bg-gray-50';
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-secondary hover:text-primary mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-surface rounded-lg shadow-sm p-6 mb-6 border border-surfacehighlight">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                <Award className="w-6 h-6 text-accent-primary" />
                Badge Testing Page
              </h1>
              <p className="text-secondary mt-1">
                Test badge unlock notifications - {userBadges.size} / {badges.length} badges earned
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={removeAllBadges}
                disabled={loading || userBadges.size === 0}
                className="px-4 py-2 bg-status-error text-white rounded-lg hover:bg-status-error/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Remove All
              </button>
              <button
                onClick={awardAllBadges}
                disabled={loading}
                className="px-4 py-2 bg-status-success text-white rounded-lg hover:bg-status-success/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Award All
              </button>
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-lg shadow-sm p-6 mb-6 border border-surfacehighlight">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-secondary">Badge Progress</span>
            <span className="text-sm font-medium text-primary">{userBadges.size} / {badges.length}</span>
          </div>
          <div className="w-full bg-surfacehighlight rounded-full h-3">
            <div
              className="bg-accent-primary h-3 rounded-full transition-all duration-500"
              style={{ width: `${badges.length > 0 ? (userBadges.size / badges.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        {Object.entries(groupedBadges).map(([category, categoryBadges]) => (
          <div key={category} className="bg-surface rounded-lg shadow-sm p-6 mb-6 border border-surfacehighlight">
            <h2 className="text-xl font-bold text-primary mb-4 capitalize flex items-center justify-between">
              <span>{category} Badges</span>
              <span className="text-sm font-normal text-secondary">
                {categoryBadges.filter(b => userBadges.has(b.id)).length} / {categoryBadges.length}
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryBadges.map((badge) => {
                const hasBadge = userBadges.has(badge.id);
                return (
                  <div
                    key={badge.id}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      hasBadge ? 'border-status-success bg-status-success/10' : getTierColor(badge.tier)
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-primary flex items-center gap-2">
                          <span className="w-6 h-6 flex items-center justify-center">
                            {getBadgeIcon(badge.icon_name)}
                          </span>
                          {badge.name}
                          {hasBadge && <CheckCircle className="w-4 h-4 text-status-success" />}
                        </h3>
                        <p className="text-xs text-secondary mt-1">
                          {badge.tier || 'Standard'} - {badge.level_name || `Level ${badge.level}`}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-secondary mb-3 line-clamp-2">{badge.description}</p>
                    <button
                      onClick={() => awardBadge(badge.id, badge.name)}
                      disabled={loading || hasBadge}
                      className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        hasBadge
                          ? 'bg-surfacehighlight text-secondary cursor-not-allowed'
                          : 'bg-accent-primary text-white hover:bg-accent-primary/90'
                      }`}
                    >
                      {hasBadge ? 'Already Earned' : 'Award Badge'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
