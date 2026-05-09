import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { giveSticker } from '../lib/stickerService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useRewardEvents } from '../contexts/RewardEventContext';
import { X } from 'lucide-react';
import { sounds } from '../lib/sounds';
import { floatPoints, haptic } from '../utils/floatPoints';

interface VehicleStickerSelectorProps {
  vehicleId: string;
  onStickerGiven?: () => void;
}

const MAX_POSITIVE_STICKERS = 5;
const MAX_NEGATIVE_STICKERS = 3;

export function VehicleStickerSelector({ vehicleId, onStickerGiven }: VehicleStickerSelectorProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { celebrateReward } = useRewardEvents();
  const stickerContainerRef = useRef<HTMLDivElement>(null);

  const [stickers, setStickers] = useState<any[]>([]);
  const [giving, setGiving] = useState<string | null>(null);
  const [positiveCount, setPositiveCount] = useState(0);
  const [negativeCount, setNegativeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'positive' | 'negative'>('positive');
  const [selected, setSelected] = useState<any | null>(null);

  const loadData = useCallback(async function loadData() {
    setLoading(true);

    async function loadStickerDefinitions() {
      const { data } = await supabase
        .from('sticker_catalog')
        .select('*')
        .order('category', { ascending: false });
      if (data) setStickers(data);
    }

    async function loadUserStickerCounts() {
      if (!user) return;
      const { data: givenStickers } = await supabase
        .from('vehicle_stickers')
        .select(`sticker_id, sticker_definitions!vehicle_stickers_sticker_id_fkey(category)`)
        .eq('vehicle_id', vehicleId)
        .eq('given_by', user.id);
      if (givenStickers) {
        let positive = 0;
        let negative = 0;
        givenStickers.forEach((item: any) => {
          const category = (item.sticker_definitions as any)?.category;
          if (category === 'Positive') positive++;
          else if (category === 'Negative') negative++;
        });
        setPositiveCount(positive);
        setNegativeCount(negative);
      }
    }

    await Promise.all([loadStickerDefinitions(), loadUserStickerCounts()]);
    setLoading(false);
  }, [vehicleId, user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Reset selection when tab changes
  useEffect(() => { setSelected(null); }, [activeTab]);

  async function handleGiveSticker() {
    if (!user || !selected || giving) return;

    const sticker = selected;
    const isPositive = sticker.category === 'Positive';

    if (isPositive && positiveCount >= MAX_POSITIVE_STICKERS) {
      showToast(`Max ${MAX_POSITIVE_STICKERS} positive stickers per vehicle`, 'error');
      return;
    }
    if (!isPositive && negativeCount >= MAX_NEGATIVE_STICKERS) {
      showToast(`Max ${MAX_NEGATIVE_STICKERS} negative stickers per vehicle`, 'error');
      return;
    }

    setGiving(sticker.id);
    const result = await giveSticker(vehicleId, sticker.id, user.id);

    if (result.success) {
      sounds.pop();
      haptic(25);
      floatPoints(stickerContainerRef.current, '+5');
      stickerContainerRef.current?.classList.add('sticker-flying');
      setTimeout(() => stickerContainerRef.current?.classList.remove('sticker-flying'), 500);
      showToast(`${sticker.name} sticker given! ${isPositive ? '+2 rep' : '-3 rep'} to owner`, 'success');
      celebrateReward({
        type: 'sticker',
        title: `${sticker.name} Sticker Given`,
        message: isPositive ? 'Positive garage feedback sent.' : 'Feedback logged on this ride.',
        points: isPositive ? 2 : undefined,
        accent: isPositive ? '#f0a030' : '#ef4444',
      });
      if (isPositive) setPositiveCount(prev => prev + 1);
      else setNegativeCount(prev => prev + 1);
      setSelected(null);
      setExpanded(false);
      onStickerGiven?.();
    } else if (result.alreadyGiven) {
      showToast(result.message || 'You already gave this sticker', 'error');
    } else {
      showToast(result.message || 'Failed to give sticker', 'error');
    }

    setGiving(null);
  }

  const positiveStickers = stickers.filter(s => s.category === 'Positive');
  const negativeStickers = stickers.filter(s => s.category === 'Negative');
  const canGiveMorePositive = positiveCount < MAX_POSITIVE_STICKERS;
  const canGiveMoreNegative = negativeCount < MAX_NEGATIVE_STICKERS;
  const atLimit = !canGiveMorePositive && !canGiveMoreNegative;
  const tabStickers = activeTab === 'positive' ? positiveStickers : negativeStickers;
  const canGiveOnTab = activeTab === 'positive' ? canGiveMorePositive : canGiveMoreNegative;

  if (loading) return null;

  // ── COLLAPSED STATE ──
  if (!expanded) {
    return (
      <div
        ref={stickerContainerRef}
        onClick={() => !atLimit && setExpanded(true)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 0',
          cursor: atLimit ? 'default' : 'pointer',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          marginTop: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
            🏷️
          </div>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: atLimit ? '#5a6e7e' : '#F97316' }}>
              {atLimit ? 'Sticker Limit Reached' : 'Leave a Sticker'}
            </div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#5a6e7e', marginTop: 1 }}>
              {canGiveMorePositive ? `${MAX_POSITIVE_STICKERS - positiveCount} positive` : 'No positive left'} · {canGiveMoreNegative ? `${MAX_NEGATIVE_STICKERS - negativeCount} negative remaining` : 'No negative left'}
            </div>
          </div>
        </div>
        {!atLimit && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5a6e7e" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        )}
      </div>
    );
  }

  // ── EXPANDED STATE ──
  return (
    <div ref={stickerContainerRef} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', marginTop: 8, background: '#070a0f' }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0 8px' }}>
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#F97316' }}>
          Leave a Sticker
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Limit counters */}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, color: canGiveMorePositive ? '#4ade80' : '#3a4e60', display: 'flex', alignItems: 'center', gap: 3, fontVariantNumeric: 'tabular-nums' }}>
            👍 {positiveCount}/{MAX_POSITIVE_STICKERS}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, color: canGiveMoreNegative ? '#f87171' : '#3a4e60', display: 'flex', alignItems: 'center', gap: 3, fontVariantNumeric: 'tabular-nums' }}>
            👎 {negativeCount}/{MAX_NEGATIVE_STICKERS}
          </span>
          {/* Close */}
          <button
            onClick={() => { setExpanded(false); setSelected(null); }}
            style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={10} color="#7a8e9e" />
          </button>
        </div>
      </div>

      {/* Tab toggle */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: 0 }}>
        <button
          onClick={() => setActiveTab('positive')}
          style={{
            flex: 1, padding: '7px 0', textAlign: 'center' as const, background: 'none', border: 'none',
            cursor: canGiveMorePositive ? 'pointer' : 'default',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const,
            color: activeTab === 'positive' ? '#4ade80' : '#3a4e60',
            borderBottom: activeTab === 'positive' ? '2px solid #4ade80' : '2px solid transparent',
            opacity: canGiveMorePositive ? 1 : 0.45,
          }}
        >
          👍 Positive {!canGiveMorePositive && '· Limit reached'}
        </button>
        <button
          onClick={() => canGiveMoreNegative && setActiveTab('negative')}
          style={{
            flex: 1, padding: '7px 0', textAlign: 'center' as const, background: 'none', border: 'none',
            cursor: canGiveMoreNegative ? 'pointer' : 'default',
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const,
            color: activeTab === 'negative' ? '#f87171' : '#3a4e60',
            borderBottom: activeTab === 'negative' ? '2px solid #f87171' : '2px solid transparent',
            opacity: canGiveMoreNegative ? 1 : 0.45,
          }}
        >
          👎 Negative {!canGiveMoreNegative && '· Limit reached'}
        </button>
      </div>

      {/* Emoji tile row — horizontal scroll */}
      <div style={{ display: 'flex', gap: 4, padding: '10px 0', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {tabStickers.map(sticker => {
          const isSelected = selected?.id === sticker.id;
          const isPos = sticker.category === 'Positive';
          const selColor = isPos ? 'rgba(34,197,94,' : 'rgba(239,68,68,';
          return (
            <button
              key={sticker.id}
              onClick={() => canGiveOnTab && setSelected(isSelected ? null : sticker)}
              disabled={!canGiveOnTab}
              style={{
                flexShrink: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 3,
                padding: '8px 10px', borderRadius: 8, minWidth: 56, cursor: canGiveOnTab ? 'pointer' : 'not-allowed',
                border: `1px solid ${isSelected ? `${selColor}0.4)` : 'rgba(255,255,255,0.06)'}`,
                background: isSelected ? `${selColor}0.1)` : '#0a0d14',
                opacity: !canGiveOnTab ? 0.35 : 1,
                transition: 'all 0.12s',
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{sticker.icon_name || '🚗'}</span>
              <span style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase' as const, textAlign: 'center' as const,
                color: isSelected ? (isPos ? '#4ade80' : '#f87171') : '#5a6e7e',
                whiteSpace: 'nowrap' as const,
              }}>
                {sticker.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Confirm bar — appears when a sticker is selected */}
      {selected && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0 10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: 18 }}>{selected.icon_name || '🚗'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#eef4f8' }}>
              {selected.name}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: selected.category === 'Positive' ? '#4ade80' : '#f87171', marginTop: 1 }}>
              {selected.category === 'Positive' ? '+2 RP to owner' : '-3 RP to owner'}
            </div>
          </div>
          <button
            onClick={handleGiveSticker}
            disabled={!!giving}
            style={{
              padding: '7px 16px', background: '#F97316', border: 'none', borderRadius: 2,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
              letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#030508',
              cursor: giving ? 'not-allowed' : 'pointer', opacity: giving ? 0.6 : 1, flexShrink: 0,
            }}
          >
            {giving ? 'Giving...' : 'Give Sticker'}
          </button>
        </div>
      )}
    </div>
  );
}
