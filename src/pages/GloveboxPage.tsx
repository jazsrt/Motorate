import { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { type OnNavigate } from '../types/navigation';

interface Badge {
  id: string;
  name: string;
  icon: string;
  type: 'good' | 'bad' | 'status' | null;
  monthly_limit: number;
  description?: string;
  is_automated: boolean;
}

interface InventoryItem {
  badge: Badge;
  count_remaining: number;
}

interface GloveboxPageProps {
  onNavigate: OnNavigate;
}

export function GloveboxPage({ onNavigate }: GloveboxPageProps) {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    const { data: badgesData } = await supabase
      .from('badges')
      .select('*')
      .eq('is_automated', false)
      .order('type', { ascending: true });

    const { data: inventoryData } = await supabase
      .from('user_inventory')
      .select('*, badge:badges(*)')
      .eq('user_id', user!.id);

    if (badgesData) setBadges(badgesData);
    if (inventoryData) setInventory(inventoryData as any);
    setLoading(false);
  };

  const initializeBadge = async (badge: Badge) => {
    if (!user) return;

    const count = badge.type === 'bad' ? badge.monthly_limit : -1;

    await supabase
      .from('user_inventory')
      .insert({
        user_id: user.id,
        badge_id: badge.id,
        count_remaining: count,
        last_reset: new Date().toISOString(),
      });

    loadData();
  };

  const getBadgeInventory = (badgeId: string) => {
    return inventory.find((item) => item.badge.id === badgeId);
  };

  if (loading) {
    return (
      <Layout currentPage="rankings" onNavigate={onNavigate}>
        <div className="flex items-center justify-center py-12">
          <div className="text-secondary">Loading rankings...</div>
        </div>
      </Layout>
    );
  }

  const goodBadges = badges.filter((b) => b.type === 'good' && !b.is_automated);
  const badBadges = badges.filter((b) => b.type === 'bad' && !b.is_automated);
  const statusBadges = badges.filter((b) => b.type === 'status' && b.is_automated);

  return (
    <Layout currentPage="rankings" onNavigate={onNavigate}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Your Glovebox</h2>
          <p className="text-secondary">Badge collection and inventory</p>
        </div>

        <div className="bg-accent-primary/20 border border-accent-primary rounded-xl p-4">
          <p className="text-sm text-accent-primary">
            <span className="font-semibold">Tip:</span> Bad badges are limited to 3 per month to encourage positive interactions.
            Good badges are unlimited!
          </p>
        </div>

        <section>
          <h3 className="text-xl font-bold mb-4 text-status-success uppercase tracking-wider">Good Badges</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {goodBadges.map((badge) => {
              const item = getBadgeInventory(badge.id);
              const hasItem = !!item;

              return (
                <div
                  key={badge.id}
                  className="bg-surface border border-surfacehighlight rounded-xl p-4 text-center"
                >
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <div className="font-medium mb-1">{badge.name}</div>
                  {hasItem ? (
                    <div className="text-xs uppercase tracking-wider font-bold text-status-success">In Inventory</div>
                  ) : (
                    <button
                      onClick={() => initializeBadge(badge)}
                      className="text-xs uppercase tracking-wider font-bold text-accent-primary hover:text-accent-hover transition-colors"
                    >
                      Add to inventory
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-xl font-bold mb-4 text-status-danger uppercase tracking-wider">Bad Badges</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {badBadges.map((badge) => {
              const item = getBadgeInventory(badge.id);
              const hasItem = !!item;
              const remaining = item?.count_remaining ?? 0;

              return (
                <div
                  key={badge.id}
                  className="bg-surface border border-surfacehighlight rounded-xl p-4 text-center"
                >
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <div className="font-medium mb-1">{badge.name}</div>
                  {hasItem ? (
                    <div className="text-sm">
                      <span className={remaining > 0 ? 'text-status-warning' : 'text-secondary'}>
                        {remaining} / {badge.monthly_limit} available
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => initializeBadge(badge)}
                      className="text-xs uppercase tracking-wider font-bold text-accent-primary hover:text-accent-hover transition-colors"
                    >
                      Add to inventory
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {statusBadges.length > 0 && (
          <section>
            <h3 className="text-xl font-bold mb-4 text-accent-primary uppercase tracking-wider">Status Badges (Earned Automatically)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {statusBadges.map((badge) => {
                const item = getBadgeInventory(badge.id);
                const hasItem = !!item;

                return (
                  <div
                    key={badge.id}
                    className={`border rounded-xl p-4 text-center ${
                      hasItem
                        ? 'bg-gradient-to-br from-amber-900/40 to-yellow-800/40 border-2 border-orange/60'
                        : 'bg-surface border-surfacehighlight opacity-50'
                    }`}
                  >
                    <div className="text-4xl mb-2">{badge.icon}</div>
                    <div className="font-medium mb-1">{badge.name}</div>
                    {badge.description && (
                      <div className="text-xs text-secondary mt-1">{badge.description}</div>
                    )}
                    <div className="text-xs uppercase tracking-wider font-bold text-secondary mt-2">
                      {hasItem ? 'Earned' : 'Not Yet Earned'}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
