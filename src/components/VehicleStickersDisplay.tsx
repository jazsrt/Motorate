import { useState, useEffect } from 'react';
import { X, Tag, ChevronRight } from 'lucide-react';
import { getVehicleStickers, type VehicleStickerWithCount } from '../lib/stickers';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface VehicleStickersDisplayProps {
  vehicleId: string;
}

const CATEGORY_ORDER = ['Positive', 'Fun', 'Community', 'Negative'] as const;

const CATEGORY_META: Record<string, { label: string; bg: string; border: string; text: string }> = {
  Positive: { label: 'Positive Vibes', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.22)', text: '#4ade80' },
  Negative: { label: 'Feedback', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.22)', text: '#f87171' },
  Fun:      { label: 'Fun', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.22)', text: '#fb923c' },
  Community:{ label: 'Community', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.22)', text: '#60a5fa' },
};

function tierColor(count: number): { label: string; hex: string; darkText: boolean } | null {
  if (count >= 20) return { label: 'PLATINUM', hex: '#E5E4E2', darkText: true };
  if (count >= 10) return { label: 'GOLD', hex: '#FFD700', darkText: true };
  if (count >= 5)  return { label: 'SILVER', hex: '#C0C0C0', darkText: true };
  if (count >= 1)  return { label: 'BRONZE', hex: '#CD7F32', darkText: false };
  return null;
}

function StickerPill({
  sticker,
  large = false,
}: {
  sticker: VehicleStickerWithCount;
  large?: boolean;
}) {
  const meta = CATEGORY_META[sticker.category] ?? CATEGORY_META['Fun'];
  const tier = tierColor(sticker.count);

  return (
    <div
      className={`relative inline-flex items-center gap-2 rounded-full border select-none ${
        large ? 'px-4 py-2' : 'px-3 py-1.5'
      }`}
      style={{ background: meta.bg, borderColor: meta.border }}
      title={sticker.description || sticker.name}
    >
      <span className={`leading-none flex-shrink-0 ${large ? 'text-xl' : 'text-base'}`}>
        {sticker.icon_name}
      </span>
      <span
        className={`font-bold uppercase tracking-wide whitespace-nowrap ${
          large ? 'text-[12px]' : 'text-[11px]'
        }`}
        style={{ color: meta.text }}
      >
        {sticker.name}
      </span>
      {sticker.count > 1 && (
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{
            background: tier ? `${tier.hex}22` : 'rgba(255,255,255,0.08)',
            color: tier ? tier.hex : 'rgba(255,255,255,0.5)',
            border: `1px solid ${tier ? `${tier.hex}44` : 'rgba(255,255,255,0.10)'}`,
          }}
        >
          ×{sticker.count}
        </span>
      )}
      {tier && (
        <span
          className="absolute -top-1.5 -right-1.5 text-[7px] font-bold px-1.5 py-[3px] rounded-full tracking-widest leading-none shadow-sm"
          style={{
            background: tier.hex,
            color: tier.darkText ? '#000' : '#fff',
          }}
        >
          {tier.label}
        </span>
      )}
    </div>
  );
}

function AllStickersModal({
  stickers,
  onClose,
}: {
  stickers: VehicleStickerWithCount[];
  onClose: () => void;
}) {
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const group = stickers.filter(s => s.category === cat);
    if (group.length > 0) acc[cat] = group;
    return acc;
  }, {} as Record<string, VehicleStickerWithCount[]>);

  const totalGiven = stickers.reduce((s, x) => s + x.count, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-[#111820] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '85vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <Tag className="w-4 h-4 text-accent-primary" />
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider text-primary leading-none">
                Bumper Stickers
              </h3>
              <p className="text-[10px] text-tertiary mt-0.5">{totalGiven} total given by the community</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-secondary" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-6" style={{ maxHeight: 'calc(85vh - 70px)' }}>
          {Object.entries(grouped).map(([cat, group]) => {
            const meta = CATEGORY_META[cat] ?? CATEGORY_META['Fun'];
            const catTotal = group.reduce((s, x) => s + x.count, 0);
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-[9px] font-bold uppercase tracking-[1.5px] px-2.5 py-1 rounded-full"
                    style={{ background: meta.bg, color: meta.text, border: `1px solid ${meta.border}` }}
                  >
                    {meta.label}
                  </span>
                  <div className="flex-1 h-px" style={{ background: meta.border }} />
                  <span className="text-[10px] font-bold" style={{ color: meta.text }}>
                    {catTotal}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.map(sticker => (
                    <StickerPill key={sticker.sticker_id} sticker={sticker} large />
                  ))}
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

  useEffect(() => {
    loadStickers();
  }, [vehicleId]);

  async function loadStickers() {
    setLoading(true);
    const data = await getVehicleStickers(vehicleId);
    setStickers(data);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (stickers.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-secondary text-sm">No stickers yet.</p>
        <p className="text-tertiary text-[11px] mt-1">Be the first to rate this vehicle!</p>
      </div>
    );
  }

  const top5 = stickers.slice(0, 5);
  const totalGiven = stickers.reduce((s, x) => s + x.count, 0);
  const hasMore = stickers.length > 5;

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {top5.map(sticker => (
            <StickerPill key={sticker.sticker_id} sticker={sticker} />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-tertiary">
            {totalGiven} sticker{totalGiven !== 1 ? 's' : ''} from the community
          </span>
          {hasMore && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-accent-primary hover:text-accent-hover transition-colors"
            >
              View All {stickers.length} types
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <AllStickersModal stickers={stickers} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
