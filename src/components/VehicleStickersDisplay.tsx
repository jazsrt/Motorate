import { useState, useEffect, useCallback } from 'react';
import { X, Tag } from 'lucide-react';
import { getVehicleStickers, type VehicleStickerWithCount } from '../lib/stickers';

interface VehicleStickersDisplayProps {
  vehicleId: string;
}

const CATEGORY_ORDER = ['Positive', 'Fun', 'Community', 'Negative'] as const;

const CATEGORY_META: Record<string, { bg: string; border: string; text: string }> = {
  Positive:  { bg: 'rgba(34,197,94,0.07)',   border: 'rgba(34,197,94,0.22)',   text: '#4ade80' },
  Negative:  { bg: 'rgba(239,68,68,0.07)',   border: 'rgba(239,68,68,0.22)',   text: '#f87171' },
  Fun:       { bg: 'rgba(249,115,22,0.07)',  border: 'rgba(249,115,22,0.22)',  text: '#fb923c' },
  Community: { bg: 'rgba(96,165,250,0.07)',  border: 'rgba(96,165,250,0.22)',  text: '#60a5fa' },
};

function tierCountStyle(count: number): { color: string; bg: string; border: string } {
  if (count >= 20) return { color: '#E5E4E2', bg: 'rgba(229,228,226,0.1)',  border: 'rgba(229,228,226,0.25)' };
  if (count >= 10) return { color: '#FFD700', bg: 'rgba(255,215,0,0.1)',    border: 'rgba(255,215,0,0.25)' };
  if (count >= 5)  return { color: '#C0C0C0', bg: 'rgba(192,192,192,0.1)',  border: 'rgba(192,192,192,0.25)' };
  return           { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.1)' };
}

function AllStickersModal({ stickers, onClose }: { stickers: VehicleStickerWithCount[]; onClose: () => void }) {
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const group = stickers.filter(s => s.category === cat);
    if (group.length > 0) acc[cat] = group;
    return acc;
  }, {} as Record<string, VehicleStickerWithCount[]>);

  const totalGiven = stickers.reduce((s, x) => s + x.count, 0);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        style={{ position: 'relative', width: '100%', maxWidth: 512, background: '#0d1117', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px 24px 0 0', overflow: 'hidden', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={14} color="#F97316" />
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#eef4f8' }}>
                Bumper Stickers
              </div>
              <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#5a6e7e', marginTop: 1 }}>
                {totalGiven} total from the community
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={14} color="#7a8e9e" />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {Object.entries(grouped).map(([cat, group]) => {
            const meta = CATEGORY_META[cat] ?? CATEGORY_META['Fun'];
            const catTotal = group.reduce((s, x) => s + x.count, 0);
            return (
              <div key={cat}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, padding: '2px 8px', borderRadius: 20, background: meta.bg, border: `1px solid ${meta.border}`, color: meta.text }}>
                    {cat}
                  </span>
                  <div style={{ flex: 1, height: 1, background: meta.border }} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, color: meta.text }}>{catTotal}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {group.map(sticker => {
                    const smeta = CATEGORY_META[sticker.category] ?? CATEGORY_META['Fun'];
                    const tc = tierCountStyle(sticker.count);
                    return (
                      <div
                        key={sticker.sticker_id}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 20, background: smeta.bg, border: `1px solid ${smeta.border}` }}
                        title={sticker.description || sticker.name}
                      >
                        <span style={{ fontSize: 14, lineHeight: 1 }}>{sticker.icon_name || '🚗'}</span>
                        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: smeta.text, whiteSpace: 'nowrap' as const }}>{sticker.name}</span>
                        {sticker.count > 1 && (
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 10, background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color, fontVariantNumeric: 'tabular-nums' }}>×{sticker.count}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function VehicleStickersDisplay({ vehicleId }: VehicleStickersDisplayProps) {
  const [stickers, setStickers] = useState<VehicleStickerWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadStickers = useCallback(async () => {
    setLoading(true);
    const data = await getVehicleStickers(vehicleId);
    setStickers(data);
    setLoading(false);
  }, [vehicleId]);

  useEffect(() => { loadStickers(); }, [loadStickers]);

  if (loading) {
    return (
      <div style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 14, height: 14, border: '2px solid rgba(249,115,22,0.3)', borderTopColor: '#F97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#3a4e60' }}>Loading...</span>
      </div>
    );
  }

  if (stickers.length === 0) {
    return (
      <div style={{ padding: '6px 0' }}>
        <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#3a4e60' }}>No stickers yet. Be the first.</span>
      </div>
    );
  }

  const top5 = stickers.slice(0, 5);
  const remaining = stickers.length - 5;

  return (
    <>
      {/* Single horizontal scroll row — no wrapping */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', alignItems: 'center', paddingBottom: 2 }}>
        {top5.map(sticker => {
          const meta = CATEGORY_META[sticker.category] ?? CATEGORY_META['Fun'];
          const tc = tierCountStyle(sticker.count);
          return (
            <div
              key={sticker.sticker_id}
              style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, background: meta.bg, border: `1px solid ${meta.border}`, whiteSpace: 'nowrap' as const }}
              title={sticker.description || sticker.name}
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>{sticker.icon_name || '🚗'}</span>
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: meta.text }}>{sticker.name}</span>
              {sticker.count > 1 && (
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 10, background: tc.bg, border: `1px solid ${tc.border}`, color: tc.color, fontVariantNumeric: 'tabular-nums' }}>×{sticker.count}</span>
              )}
            </div>
          );
        })}

        {/* +N more pill — opens modal */}
        {remaining > 0 && (
          <div
            onClick={() => setShowModal(true)}
            style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', padding: '5px 10px', borderRadius: 20, background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', cursor: 'pointer', whiteSpace: 'nowrap' as const }}
          >
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316' }}>+{remaining} more</span>
          </div>
        )}
      </div>

      {showModal && <AllStickersModal stickers={stickers} onClose={() => setShowModal(false)} />}
    </>
  );
}
