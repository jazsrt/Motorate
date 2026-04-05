import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { OnNavigate } from '../types/navigation';

interface Fan {
  id: string;
  handle: string | null;
  avatar_url: string | null;
  reputation_score: number | null;
  tier: string | null;
}

interface MotoFansModalProps {
  vehicleId: string;
  vehicleName: string;
  fanCount: number;
  onClose: () => void;
  onNavigate: OnNavigate;
}

export function MotoFansModal({ vehicleId, vehicleName, fanCount, onClose, onNavigate }: MotoFansModalProps) {
  const [fans, setFans] = useState<Fan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('vehicle_follows')
        .select('follower:profiles!vehicle_follows_follower_id_fkey(id, handle, avatar_url, reputation_score, tier)')
        .eq('vehicle_id', vehicleId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(50);
      setFans((data || []).map((d: any) => d.follower).filter(Boolean));
      setLoading(false);
    }
    load();
  }, [vehicleId]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(3,5,8,0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxHeight: '75vh',
          background: '#0a0d14',
          borderRadius: '16px 16px 0 0',
          border: '1px solid rgba(255,255,255,0.07)',
          borderBottom: 'none',
          display: 'flex', flexDirection: 'column' as const,
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 16px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#eef4f8' }}>
              Fans
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: '#F97316', marginLeft: 8, fontVariantNumeric: 'tabular-nums' }}>
                {fanCount}
              </span>
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#5a6e7e', marginTop: 2 }}>
              {vehicleName}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7a8e9e" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Fan list */}
        <div style={{ overflowY: 'auto', flex: 1, scrollbarWidth: 'none' as const }}>
          {loading ? (
            <div style={{ padding: '32px 0', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(249,115,22,0.2)', borderTopColor: '#F97316', animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : fans.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center' as const }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#3a4e60' }}>
                No fans yet
              </div>
            </div>
          ) : (
            fans.map(fan => (
              <div
                key={fan.id}
                onClick={() => { onNavigate('user-profile', fan.id); onClose(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: '#1e2a38', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {fan.avatar_url ? (
                    <img src={fan.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, color: '#7a8e9e' }}>
                      {(fan.handle || '?')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 15, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
                    @{fan.handle || 'anonymous'}
                  </div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#5a6e7e', marginTop: 2 }}>
                    {fan.tier || 'Driver'} · {fan.reputation_score ?? 0} RP
                  </div>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3a4e60" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            ))
          )}
          <div style={{ height: 32 }} />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
