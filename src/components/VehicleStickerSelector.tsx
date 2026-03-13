import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { giveSticker } from '../lib/stickerService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { AlertCircle, ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';
import { sounds } from '../lib/sounds';
import { haptics } from '../lib/haptics';

interface VehicleStickerSelectorProps {
  vehicleId: string;
  onStickerGiven?: () => void;
}

const MAX_POSITIVE_STICKERS = 5;
const MAX_NEGATIVE_STICKERS = 3;

export function VehicleStickerSelector({ vehicleId, onStickerGiven }: VehicleStickerSelectorProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [stickers, setStickers] = useState<any[]>([]);
  const [giving, setGiving] = useState<string | null>(null);
  const [positiveCount, setPositiveCount] = useState(0);
  const [negativeCount, setNegativeCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [vehicleId, user]);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadStickerDefinitions(), loadUserStickerCounts()]);
    setLoading(false);
  }

  async function loadStickerDefinitions() {
    const { data } = await supabase
      .from('bumper_stickers')
      .select('*')
      .order('category', { ascending: false });

    if (data) setStickers(data);
  }

  async function loadUserStickerCounts() {
    if (!user) return;

    const { data: givenStickers } = await supabase
      .from('vehicle_stickers')
      .select(`sticker_id, bumper_stickers(category)`)
      .eq('vehicle_id', vehicleId)
      .eq('given_by', user.id);

    if (givenStickers) {
      let positive = 0;
      let negative = 0;
      givenStickers.forEach((item: any) => {
        const category = item.bumper_stickers?.category;
        if (category === 'Positive') positive++;
        else if (category === 'Negative') negative++;
      });
      setPositiveCount(positive);
      setNegativeCount(negative);
    }
  }

  async function handleGiveSticker(sticker: any) {
    if (!user) {
      showToast('You must be logged in to give stickers', 'error');
      return;
    }

    const isPositive = sticker.category === 'Positive';
    if (isPositive && positiveCount >= MAX_POSITIVE_STICKERS) {
      showToast(`You can only give up to ${MAX_POSITIVE_STICKERS} positive stickers to this vehicle`, 'error');
      return;
    }
    if (!isPositive && negativeCount >= MAX_NEGATIVE_STICKERS) {
      showToast(`You can only give up to ${MAX_NEGATIVE_STICKERS} negative stickers to this vehicle`, 'error');
      return;
    }

    setGiving(sticker.id);
    const result = await giveSticker(vehicleId, sticker.id, user.id);

    if (result.success) {
      sounds.pop();
      haptics.light();
      showToast(`${sticker.icon_name} ${sticker.name} sticker given! ${isPositive ? '+2 rep' : '-3 rep'} to owner`, 'success');
      if (isPositive) setPositiveCount(prev => prev + 1);
      else setNegativeCount(prev => prev + 1);
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

  if (loading) {
    return (
      <div className="bg-surface border border-surfacehighlight rounded-xl p-6">
        <div className="text-center text-secondary text-sm">Loading stickers...</div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-surfacehighlight rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Give a Bumper Sticker</h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-bold">
          <span className="flex items-center gap-1 text-green-400">
            <ThumbsUp className="w-3 h-3" />
            {positiveCount}/{MAX_POSITIVE_STICKERS}
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <ThumbsDown className="w-3 h-3" />
            {negativeCount}/{MAX_NEGATIVE_STICKERS}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {atLimit && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/25">
            <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-orange-300">
              <strong className="block mb-0.5">Sticker limit reached</strong>
              You've given the maximum number of stickers to this vehicle.
            </p>
          </div>
        )}

        {positiveStickers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <ThumbsUp className="w-3.5 h-3.5 text-green-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-green-400">Positive Vibes</span>
              </div>
              {!canGiveMorePositive && (
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Limit Reached</span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {positiveStickers.map((sticker) => {
                const isDisabled = giving !== null || !canGiveMorePositive;
                const isGiving = giving === sticker.id;
                return (
                  <button
                    key={sticker.id}
                    onClick={() => handleGiveSticker(sticker)}
                    disabled={isDisabled}
                    className={`
                      relative flex flex-col items-center gap-1.5 p-3.5 rounded-xl border transition-all duration-200 text-center
                      ${isDisabled && !isGiving
                        ? 'opacity-35 cursor-not-allowed border-white/[0.06] bg-white/[0.02]'
                        : 'border-green-500/40 bg-green-500/5 hover:bg-green-500/12 hover:border-green-400/60 hover:scale-[1.03] active:scale-[0.97] cursor-pointer'}
                      ${isGiving ? 'scale-95 opacity-70' : ''}
                    `}
                  >
                    <span className="text-3xl leading-none">{sticker.icon_name}</span>
                    <span className="text-[11px] font-bold leading-tight text-primary">{sticker.name}</span>
                    <span className="text-[10px] font-semibold text-green-400">+2 rep</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {negativeStickers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <ThumbsDown className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">Constructive Feedback</span>
              </div>
              {!canGiveMoreNegative && (
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Limit Reached</span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {negativeStickers.map((sticker) => {
                const isDisabled = giving !== null || !canGiveMoreNegative;
                const isGiving = giving === sticker.id;
                return (
                  <button
                    key={sticker.id}
                    onClick={() => handleGiveSticker(sticker)}
                    disabled={isDisabled}
                    className={`
                      relative flex flex-col items-center gap-1.5 p-3.5 rounded-xl border transition-all duration-200 text-center
                      ${isDisabled && !isGiving
                        ? 'opacity-35 cursor-not-allowed border-white/[0.06] bg-white/[0.02]'
                        : 'border-red-500/40 bg-red-500/5 hover:bg-red-500/12 hover:border-red-400/60 hover:scale-[1.03] active:scale-[0.97] cursor-pointer'}
                      ${isGiving ? 'scale-95 opacity-70' : ''}
                    `}
                  >
                    <span className="text-3xl leading-none">{sticker.icon_name}</span>
                    <span className="text-[11px] font-bold leading-tight text-primary">{sticker.name}</span>
                    <span className="text-[10px] font-semibold text-red-400">-3 rep</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
