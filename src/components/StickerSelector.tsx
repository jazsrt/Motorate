import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Lightbulb } from 'lucide-react';
import { getStickerDefinitions, type StickerDefinition } from '../lib/stickers';

// Map Lucide icon names to emojis for sticker display
const STICKER_EMOJI_MAP: Record<string, string> = {
  // Positive
  Sparkles: '✨', Gauge: '🏎️', Heart: '😇', Zap: '⚡', Target: '🅿️',
  // Negative
  AlertTriangle: '🦶', AlertCircle: '🐷', ArrowDown: '🚗💨', X: '🚫', Ban: '🅿️❌',
  // Fun
  Star: '💪', Music: '🔊', Cloud: '💨', Sticker: '🏷️', Wrench: '🔧',
  // Community
  Users: '🤝', Flag: '🏁', Gift: '💚', Crown: '👑', GraduationCap: '🎓',
};

function getStickerEmoji(iconName: string): string {
  return STICKER_EMOJI_MAP[iconName] || '🏷️';
}

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
    loadStickers();
  }, []);

  async function loadStickers() {
    const data = await getStickerDefinitions();
    setStickers(data);
    setLoading(false);
  }

  const positiveStickers = stickers.filter(s => s.category === 'Positive');
  const negativeStickers = stickers.filter(s => s.category === 'Negative');
  const funStickers = stickers.filter(s => s.category === 'Fun');
  const communityStickers = stickers.filter(s => s.category === 'Community');

  // For now, combine Fun and Community with Positive
  const displayedStickers = showPositive
    ? [...positiveStickers, ...funStickers, ...communityStickers]
    : negativeStickers;

  // Count selected stickers by category
  const selectedPositiveCount = selectedStickers.filter(id => {
    const sticker = stickers.find(s => s.id === id);
    return sticker && (sticker.category === 'Positive' || sticker.category === 'Fun' || sticker.category === 'Community');
  }).length;

  const selectedNegativeCount = selectedStickers.filter(id => {
    const sticker = stickers.find(s => s.id === id);
    return sticker && sticker.category === 'Negative';
  }).length;

  const canSelectMorePositive = selectedPositiveCount < maxPositive;
  const canSelectMoreNegative = selectedNegativeCount < maxNegative;

  if (loading) {
    return (
      <div className="text-center py-6 text-secondary">
        Loading stickers...
      </div>
    );
  }

  if (stickers.length === 0) {
    return (
      <div className="text-center py-4 text-secondary text-sm">
        No bumper stickers available yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm uppercase tracking-wider text-secondary">
            Add Stickers <span className="text-xs normal-case text-secondary/60">(Optional)</span>
          </h3>
          <p className="text-xs text-secondary/70 mt-1 flex items-center gap-1">
            {showPositive ? (
              <><ThumbsUp className="w-3 h-3 inline" /> Positive: {selectedPositiveCount}/{maxPositive}</>
            ) : (
              <><ThumbsDown className="w-3 h-3 inline" /> Negative: {selectedNegativeCount}/{maxNegative}</>
            )}
            {selectedStickers.length > 0 && (
              <span className="ml-2">• {selectedStickers.length} total selected</span>
            )}
          </p>
        </div>

        <div className="flex gap-2 bg-surfacehighlight rounded-lg p-1">
          <button
            onClick={() => setShowPositive(true)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all ${
              showPositive
                ? 'bg-green-500/20 text-green-400'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <ThumbsUp className="w-3 h-3 inline mr-1" /> Positive
          </button>
          <button
            onClick={() => setShowPositive(false)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all ${
              !showPositive
                ? 'bg-red-500/20 text-red-400'
                : 'text-secondary hover:text-primary'
            }`}
          >
            <ThumbsDown className="w-3 h-3 inline mr-1" /> Negative
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {displayedStickers.map((sticker) => {
          const isSelected = selectedStickers.includes(sticker.id);
          const isPositiveSticker = sticker.category === 'Positive' || sticker.category === 'Fun' || sticker.category === 'Community';
          const canSelectMore = isPositiveSticker ? canSelectMorePositive : canSelectMoreNegative;
          const canSelect = isSelected || canSelectMore;

          return (
            <button
              key={sticker.id}
              onClick={() => {
                if (canSelect) {
                  onToggleSticker(sticker.id);
                }
              }}
              disabled={!canSelect}
              className={`
                relative flex items-center gap-2 p-3 rounded-xl text-left transition-all
                ${isSelected
                  ? showPositive
                    ? 'bg-green-500/20 border-2 border-green-500/50'
                    : 'bg-red-500/20 border-2 border-red-500/50'
                  : 'bg-surfacehighlight border-2 border-transparent hover:border-surfacehighlight'
                }
                ${!canSelect && !isSelected ? 'opacity-30 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
              `}
            >
              <span className="text-2xl">{getStickerEmoji(sticker.icon_name)}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs truncate">{sticker.name}</div>
                <div className="text-xs text-secondary/70 truncate">{sticker.description}</div>
              </div>
              {isSelected && (
                <div className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                  showPositive ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedStickers.length > 0 && (
        <div className={`p-3 rounded-lg ${
          showPositive ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
        }`}>
          <p className={`text-xs flex items-start gap-1.5 ${showPositive ? 'text-green-300' : 'text-red-300'}`}>
            <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            Selected stickers will appear on the vehicle profile for everyone to see
          </p>
        </div>
      )}
    </div>
  );
}
