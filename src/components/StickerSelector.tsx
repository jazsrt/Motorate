import { useState, useEffect } from 'react';
import { getStickerDefinitions, type StickerDefinition } from '../lib/stickers';

interface StickerSelectorProps {
  selectedStickers: string[];
  onToggleSticker: (stickerType: string) => void;
  maxPositive?: number;
  maxNegative?: number;
}

export function StickerSelector({ selectedStickers, onToggleSticker, maxPositive = 5, maxNegative = 3 }: StickerSelectorProps) {
  const [stickers, setStickers] = useState<StickerDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPositive, setShowPositive] = useState(true);

  useEffect(() => {
    getStickerDefinitions().then(data => { setStickers(data); setLoading(false); });
  }, []);

  const positiveStickers = stickers.filter(s => s.category === 'Positive');
  const negativeStickers = stickers.filter(s => s.category === 'Negative');
  const funStickers = stickers.filter(s => s.category === 'Fun');
  const communityStickers = stickers.filter(s => s.category === 'Community');

  const displayedStickers = showPositive
    ? [...positiveStickers, ...funStickers, ...communityStickers]
    : negativeStickers;

  const selectedPositiveCount = selectedStickers.filter(id => {
    const s = stickers.find(st => st.id === id);
    return s && (s.category === 'Positive' || s.category === 'Fun' || s.category === 'Community');
  }).length;

  const selectedNegativeCount = selectedStickers.filter(id => {
    const s = stickers.find(st => st.id === id);
    return s && s.category === 'Negative';
  }).length;

  const canSelectMorePositive = selectedPositiveCount < maxPositive;
  const canSelectMoreNegative = selectedNegativeCount < maxNegative;

  if (loading) {
    return (
      <div style={{ textAlign: 'center' as const, padding: '16px 0', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#3a4e60' }}>
        Loading stickers...
      </div>
    );
  }

  if (stickers.length === 0) return null;

  return (
    <div>
      {/* Header + toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>
            Bumper Stickers
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: '#F97316', marginLeft: 8 }}>
            {showPositive ? `${selectedPositiveCount}/${maxPositive}` : `${selectedNegativeCount}/${maxNegative}`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setShowPositive(true)}
            style={{
              padding: '4px 10px', borderRadius: 6,
              background: showPositive ? 'rgba(249,115,22,0.12)' : 'transparent',
              border: showPositive ? '1px solid rgba(249,115,22,0.35)' : '1px solid rgba(255,255,255,0.08)',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
              textTransform: 'uppercase' as const, letterSpacing: '0.1em',
              color: showPositive ? '#F97316' : '#5a6e7e', cursor: 'pointer',
            }}
          >
            Positive
          </button>
          <button
            onClick={() => setShowPositive(false)}
            style={{
              padding: '4px 10px', borderRadius: 6,
              background: !showPositive ? 'rgba(249,115,22,0.12)' : 'transparent',
              border: !showPositive ? '1px solid rgba(249,115,22,0.35)' : '1px solid rgba(255,255,255,0.08)',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
              textTransform: 'uppercase' as const, letterSpacing: '0.1em',
              color: !showPositive ? '#F97316' : '#5a6e7e', cursor: 'pointer',
            }}
          >
            Negative
          </button>
        </div>
      </div>

      {/* Sticker grid — NO scroll trap */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {displayedStickers.map((sticker) => {
          const isSelected = selectedStickers.includes(sticker.id);
          const isPositiveSticker = sticker.category === 'Positive' || sticker.category === 'Fun' || sticker.category === 'Community';
          const canSelectMore = isPositiveSticker ? canSelectMorePositive : canSelectMoreNegative;
          const canSelect = isSelected || canSelectMore;

          const selectedBg = isPositiveSticker ? 'rgba(32,192,96,0.08)' : 'rgba(239,68,68,0.08)';
          const selectedBorder = isPositiveSticker ? 'rgba(32,192,96,0.30)' : 'rgba(239,68,68,0.30)';

          return (
            <button
              key={sticker.id}
              onClick={() => canSelect && onToggleSticker(sticker.id)}
              disabled={!canSelect}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10,
                background: isSelected ? selectedBg : '#0d1117',
                border: `1px solid ${isSelected ? selectedBorder : 'rgba(255,255,255,0.06)'}`,
                cursor: canSelect ? 'pointer' : 'not-allowed',
                opacity: !canSelect && !isSelected ? 0.35 : 1,
                textAlign: 'left' as const,
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0 }}>{sticker.icon_name}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>{sticker.name}</div>
                <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#5a6e7e', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{sticker.description}</div>
              </div>
              {isSelected && (
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                  background: isPositiveSticker ? '#20c060' : '#ef4444',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
