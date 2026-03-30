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
    gold: { border: '#f0a030', pillBg: 'rgba(240,160,48,0.20)', pillText: '#f0a030', pillBorder: 'rgba(240,160,48,0.30)' },
    platinum: { border: '#c8d8e8', pillBg: 'rgba(200,216,232,0.15)', pillText: '#c8d8e8', pillBorder: 'rgba(200,216,232,0.30)' },
  };

  return (
    <div>
      <div style={{
        padding: '10px 14px 6px',
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
        letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e',
      }}>
        Recent Achievements
      </div>
      <div style={{
        display: 'flex', gap: 10, padding: '0 14px 10px',
        overflowX: 'auto',
        scrollbarWidth: 'none' as const,
      }}>
        {cards.map(card => {
          const colors = tierColors[card.tier];
          return (
            <div key={card.id} style={{
              flexShrink: 0, width: 140, height: 180, borderRadius: 10,
              overflow: 'hidden', position: 'relative',
              borderLeft: `2px solid ${colors.border}`,
              background: '#0d1117',
            }}>
              {/* Vehicle photo background */}
              <img
                src={card.photoUrl}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
              />
              {/* Dark overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(3,5,8,0.95) 40%, transparent 100%)',
              }} />

              {/* Tier pill top-left */}
              <div style={{ position: 'absolute', top: 8, left: 8 }}>
                <div style={{
                  padding: '2px 7px', borderRadius: 4,
                  background: colors.pillBg, border: `1px solid ${colors.pillBorder}`,
                  fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: colors.pillText,
                }}>
                  {card.tier}
                </div>
              </div>

              {/* Bottom content */}
              <div style={{
                position: 'absolute', bottom: 10, left: 10, right: 10,
              }}>
                <div style={{
                  fontFamily: "'Rajdhani', sans-serif", fontSize: 13, fontWeight: 700,
                  color: '#eef4f8', textTransform: 'uppercase' as const, lineHeight: 1,
                }}>
                  {card.badgeName}
                </div>
                <div style={{
                  fontFamily: "'Barlow', sans-serif", fontSize: 9,
                  color: 'rgba(255,255,255,0.4)', marginTop: 2,
                }}>
                  {card.vehicleMakeModel}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
