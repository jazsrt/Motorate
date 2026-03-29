import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { parseVehicleSpecs } from '../../lib/vehicleSpecs';

interface AchievementCard {
  id: string;
  badgeName: string;
  tier: 'gold' | 'platinum';
  userHandle: string;
  vehicleMakeModel: string;
  photoUrl: string;
  specs: string | null;
}

export function AchievementCarousel() {
  const [cards, setCards] = useState<AchievementCard[]>([]);

  useEffect(() => {
    loadAchievements();
  }, []);

  async function loadAchievements() {
    try {
      const { data: badges } = await supabase
        .from('user_badges')
        .select(`
          id,
          user_id,
          earned_at,
          badge:badges!inner(name, tier)
        `)
        .in('badges.tier', ['gold', 'platinum'])
        .order('earned_at', { ascending: false })
        .limit(10);

      if (!badges || badges.length === 0) return;

      // Get unique user IDs
      const userIds = [...new Set(badges.map(b => b.user_id))];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, handle')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Fetch each user's top vehicle (by RP) with photo
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('owner_id, make, model, profile_image_url, stock_image_url, vin_raw_data, reputation_score')
        .in('owner_id', userIds)
        .eq('is_claimed', true)
        .order('reputation_score', { ascending: false });

      // Map: userId -> best vehicle with photo
      const vehicleMap = new Map<string, any>();
      (vehicles || []).forEach(v => {
        if (vehicleMap.has(v.owner_id)) return; // keep first (highest RP)
        const photo = v.profile_image_url || v.stock_image_url;
        if (photo) vehicleMap.set(v.owner_id, v);
      });

      const result: AchievementCard[] = [];
      for (const badge of badges) {
        const badgeData = Array.isArray(badge.badge) ? badge.badge[0] : badge.badge;
        if (!badgeData?.name || !badgeData?.tier) continue;

        const profile = profileMap.get(badge.user_id);
        const vehicle = vehicleMap.get(badge.user_id);
        if (!vehicle) continue; // no vehicle photo = skip card

        const specs = parseVehicleSpecs(vehicle.vin_raw_data);
        const specsStr = specs?.engine || null;

        result.push({
          id: badge.id,
          badgeName: badgeData.name,
          tier: badgeData.tier as 'gold' | 'platinum',
          userHandle: profile?.handle || 'driver',
          vehicleMakeModel: [vehicle.make, vehicle.model].filter(Boolean).join(' '),
          photoUrl: vehicle.profile_image_url || vehicle.stock_image_url,
          specs: specsStr,
        });
      }

      setCards(result);
    } catch {
      // Silent — achievement carousel is non-critical
    }
  }

  if (cards.length === 0) return null;

  const tierColors = {
    gold: { border: '#f0a030', bg: 'rgba(240,160,48,0.12)', text: '#f0a030' },
    platinum: { border: '#f5cc55', bg: 'rgba(245,204,85,0.12)', text: '#f5cc55' },
  };

  return (
    <div style={{ paddingBottom: 4 }}>
      <div style={{
        padding: '10px 14px 6px',
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
        letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e',
      }}>
        Recent Achievements
      </div>
      <div style={{
        display: 'flex', gap: 10, padding: '0 14px 10px',
        overflowX: 'auto', scrollSnapType: 'x mandatory' as const,
        scrollbarWidth: 'none' as const,
      }}>
        {cards.map(card => {
          const colors = tierColors[card.tier];
          return (
            <div key={card.id} style={{
              flexShrink: 0, width: 180, height: 220, borderRadius: 10,
              overflow: 'hidden', position: 'relative',
              borderLeft: `2px solid ${colors.border}`,
              scrollSnapAlign: 'start' as const,
            }}>
              {/* Vehicle photo background */}
              <img
                src={card.photoUrl}
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
              {/* Dark overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, #030508 0%, rgba(3,5,8,0.6) 50%, transparent 100%)',
              }} />

              {/* Tier pill */}
              <div style={{
                position: 'absolute', top: 10, left: 10, zIndex: 2,
                padding: '3px 8px', borderRadius: 4,
                background: colors.bg, border: `1px solid ${colors.border}`,
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700,
                letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: colors.text,
              }}>
                {card.tier}
              </div>

              {/* Bottom content */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 10px 12px',
                zIndex: 2,
              }}>
                <div style={{
                  fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700,
                  color: '#ffffff', textTransform: 'uppercase' as const, lineHeight: 1.1,
                  marginBottom: 4,
                }}>
                  {card.badgeName}
                </div>
                <div style={{
                  fontFamily: "'Barlow', sans-serif", fontSize: 10,
                  color: 'rgba(255,255,255,0.5)', marginBottom: 2,
                }}>
                  {card.vehicleMakeModel}
                </div>
                {card.specs && (
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
                    color: 'rgba(249,115,22,0.7)', marginBottom: 2,
                  }}>
                    {card.specs}
                  </div>
                )}
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 600,
                  letterSpacing: '0.06em', color: 'rgba(255,255,255,0.35)',
                }}>
                  @{card.userHandle}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
