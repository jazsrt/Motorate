import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function CompetitiveRankBar() {
  const { user } = useAuth();
  const [rank, setRank] = useState<number | null>(null);
  const [city, setCity] = useState('your city');
  const [flipClass, setFlipClass] = useState('');
  const rankRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const loadRank = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('location')
        .eq('id', user.id)
        .maybeSingle();
      if (profile?.location) setCity(profile.location);

      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('location', profile?.location || '')
        .gt('reputation_score', 0);

      setRank(count ? Math.min(count, 50) : null);
    };
    loadRank();
  }, [user]);

  if (!rank || !user) return null;

  return (
    <div
      className="card-v3-lift v3-stagger v3-stagger-1"
      style={{
        margin: '0 16px 16px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        borderRadius: 14,
        background: 'repeating-linear-gradient(90deg, rgba(255,255,255,.012) 0px, transparent 1px, transparent 2px, rgba(255,255,255,.008) 3px), linear-gradient(180deg, #141c28, #111a24)',
        border: '1px solid rgba(255,255,255,.035)',
        borderLeftWidth: 2,
        borderLeftColor: '#F97316',
        boxShadow: 'inset 4px 0 20px rgba(249,115,22,.04), inset 0 1px 0 rgba(255,255,255,.04), 0 2px 12px rgba(0,0,0,.35)',
      }}
    >
      <div
        ref={rankRef}
        className={`mono ${flipClass}`}
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: '#F97316',
          lineHeight: 1,
          textShadow: '0 0 20px rgba(249,115,22,.2)',
          minWidth: 28,
          textAlign: 'center',
        }}
      >
        {rank}
      </div>
      <div>
        <div style={{ fontSize: 12, color: '#c0c8d4', fontWeight: 300, lineHeight: 1.5 }}>
          in <span style={{ color: '#f2f4f7', fontWeight: 500 }}>{city}</span> this week
        </div>
        <div style={{ fontSize: 10, color: '#586878', fontWeight: 300, marginTop: 2 }}>
          Keep spotting to climb the leaderboard
        </div>
      </div>
    </div>
  );
}
