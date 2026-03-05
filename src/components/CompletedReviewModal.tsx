import { useEffect, useRef } from 'react';
import { Star, Heart, ThumbsDown, X, Car, Zap, TrendingUp, Award, Share2 } from 'lucide-react';
import type { SpotWizardData } from '../types/spot';
import { floatPoints } from '../utils/floatPoints';
import { shareToSocial } from './ShareCardGenerator';

interface CompletedReviewModalProps {
  vehicleId: string;
  spotType: 'quick' | 'full';
  wizardData: SpotWizardData;
  driverRating: number;
  drivingRating: number;
  vehicleRating: number;
  looksRating?: number;
  soundRating?: number;
  conditionRating?: number;
  sentiment: 'love' | 'hate';
  comment?: string;
  selectedTags?: string[];
  reputationEarned: number;
  isFirstSpot?: boolean;
  newRank?: number;
  rankChange?: number;
  nextBadgeName?: string;
  nextBadgeRemaining?: number;
  onDone: () => void;
  onViewVehicle: (vehicleId: string) => void;
  onUpgradeToFull?: () => void;
  userId?: string;
  userHandle?: string;
}

function StarDisplay({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold uppercase tracking-wider text-secondary">{label}</span>
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${star <= value ? 'fill-[#F97316] text-[#F97316]' : 'fill-neutral-700 text-neutral-700'}`}
          />
        ))}
      </div>
      <span className="text-sm font-bold text-primary w-6 text-right">{value}</span>
    </div>
  );
}

export function CompletedReviewModal({
  vehicleId,
  spotType,
  wizardData,
  driverRating,
  drivingRating,
  vehicleRating,
  looksRating,
  soundRating,
  conditionRating,
  sentiment,
  comment,
  selectedTags = [],
  reputationEarned,
  isFirstSpot,
  newRank,
  rankChange,
  nextBadgeName,
  nextBadgeRemaining,
  onDone,
  onViewVehicle,
  onUpgradeToFull,
  userId,
  userHandle,
}: CompletedReviewModalProps) {
  const vehicleName = [wizardData.year, wizardData.make, wizardData.model].filter(Boolean).join(' ');
  const pointsRef = useRef<HTMLDivElement>(null);
  const stockImageUrl = wizardData.stockImageUrl;

  useEffect(() => {
    const t = setTimeout(() => floatPoints(pointsRef.current, `+${reputationEarned}`), 400);
    return () => clearTimeout(t);
  }, [reputationEarned]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="modal-overlay p-4">
      <div ref={pointsRef} className="modal-content rounded-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-b border-surfacehighlight p-6 text-center relative">
          <button
            onClick={onDone}
            className="absolute top-4 right-4 p-2 rounded-xl bg-surface/50 hover:bg-surface/80 transition-colors z-10"
          >
            <X className="w-4 h-4 text-secondary" />
          </button>

          {/* Stock image or fallback icon */}
          {stockImageUrl ? (
            <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-4 border border-surfacehighlight" style={{ animation: 'coin-in 0.7s cubic-bezier(.25,.46,.45,.94) forwards' }}>
              <img src={stockImageUrl} alt={vehicleName} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-orange/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Car className="w-8 h-8 text-accent-primary" />
            </div>
          )}

          <h2 className="text-2xl font-heading font-black uppercase tracking-tight text-primary mb-1">
            {spotType === 'full' ? 'Full Spot' : 'Quick Spot'} Submitted!
          </h2>
          <p className="text-secondary text-sm">{vehicleName}</p>

          <div className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-orange/20 rounded-xl border border-orange/40">
            <Zap className="w-5 h-5 text-accent-primary" />
            <span className="text-2xl font-black text-accent-primary">+{reputationEarned}</span>
            <span className="text-sm font-bold text-accent-primary">Points Earned</span>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* First Spot Celebration */}
          {isFirstSpot && (
            <div
              className="rounded-xl p-4 border text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(245,158,11,0.08))',
                borderColor: 'rgba(249,115,22,0.3)',
                animation: 'fup 0.4s cubic-bezier(.25,.46,.45,.94) 0.3s both',
              }}
            >
              <div className="text-lg font-heading font-black uppercase tracking-tight text-accent-primary mb-1">
                First Spot!
              </div>
              <p className="text-xs text-secondary">
                You're the first to spot this {wizardData.make} {wizardData.model}
              </p>
            </div>
          )}

          {/* Competitive Context */}
          {(newRank || nextBadgeName) && (
            <div className="flex gap-3" style={{ animation: 'fup 0.4s cubic-bezier(.25,.46,.45,.94) 0.5s both' }}>
              {newRank && (
                <div className="flex-1 bg-surfacehighlight rounded-xl p-3 text-center">
                  <TrendingUp className="w-4 h-4 text-accent-primary mx-auto mb-1" />
                  <div className="text-lg font-black text-primary">#{newRank}</div>
                  <div className="text-[10px] text-secondary uppercase tracking-wider">
                    {rankChange && rankChange > 0 ? `Up ${rankChange}` : 'Your Rank'}
                  </div>
                </div>
              )}
              {nextBadgeName && nextBadgeRemaining != null && (
                <div className="flex-1 bg-surfacehighlight rounded-xl p-3 text-center">
                  <Award className="w-4 h-4 text-accent-primary mx-auto mb-1" />
                  <div className="text-lg font-black text-primary">{nextBadgeRemaining}</div>
                  <div className="text-[10px] text-secondary uppercase tracking-wider">
                    to {nextBadgeName}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-surfacehighlight rounded-xl p-4 space-y-2">
            <StarDisplay label="Driver" value={driverRating} />
            <StarDisplay label="Driving" value={drivingRating} />
            <StarDisplay label="Vehicle" value={vehicleRating} />
            {looksRating && <StarDisplay label="Looks" value={looksRating} />}
            {soundRating && <StarDisplay label="Sound" value={soundRating} />}
            {conditionRating && <StarDisplay label="Condition" value={conditionRating} />}
          </div>

          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm ${
            sentiment === 'love'
              ? 'bg-rose-500/20 text-rose-400'
              : 'bg-neutral-700/50 text-neutral-300'
          }`}>
            {sentiment === 'love'
              ? <><Heart className="w-4 h-4 fill-current" /> Love It</>
              : <><ThumbsDown className="w-4 h-4" /> Hate It</>
            }
          </div>

          {selectedTags.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-secondary mb-2">Bumper Stickers</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.map(tag => (
                  <span
                    key={tag}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                      sentiment === 'love'
                        ? 'bg-rose-500/15 text-rose-300'
                        : 'bg-neutral-700/50 text-neutral-400'
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {comment && (
            <div className="bg-surfacehighlight rounded-xl p-3">
              <p className="text-sm text-secondary">{comment}</p>
            </div>
          )}

          {spotType === 'quick' && onUpgradeToFull && (
            <div className="rounded-xl p-4 border" style={{
              background: 'rgba(249, 115, 22, 0.08)',
              borderColor: 'rgba(249, 115, 22, 0.25)'
            }}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-primary mb-1">
                    Earn +20 More Points
                  </h3>
                  <p className="text-xs text-secondary leading-relaxed">
                    Complete the full spot review for 35 total points
                  </p>
                </div>
              </div>
              <button
                onClick={onUpgradeToFull}
                className="w-full py-3 rounded-xl font-heading font-bold uppercase tracking-tight bg-gradient-to-r from-[#F97316] to-orange-500 hover:from-[#F97316] hover:to-[#fb923c] transition-all active:scale-95 shadow-lg"
              >
                Complete Full Spot
              </button>
            </div>
          )}

          {/* Share Prompt */}
          <div
            className="rounded-xl p-4 border border-surfacehighlight text-center"
            style={{ animation: 'fup 0.4s cubic-bezier(.25,.46,.45,.94) 0.7s both' }}
          >
            <p className="text-xs text-secondary mb-3">Share your spot with friends</p>
            <button
              onClick={() => {
                shareToSocial({
                  type: 'spot',
                  title: `Spotted: ${vehicleName}`,
                  subtitle: `${sentiment === 'love' ? 'Loved' : 'Reviewed'} this ride on MotoRate`,
                  imageUrl: stockImageUrl || undefined,
                  userHandle: userHandle || '',
                  userRep: reputationEarned,
                  deepLinkUrl: `${window.location.origin}/#/vehicle/${vehicleId}`,
                }, userId);
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-heading font-bold uppercase tracking-tight text-sm text-white transition-all active:scale-95"
              style={{ background: '#F97316' }}
            >
              <Share2 className="w-4 h-4" />
              Share Spot
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-surfacehighlight grid grid-cols-2 gap-3">
          <button
            onClick={onDone}
            className="py-3 bg-surface border border-surfacehighlight hover:bg-surfacehighlight rounded-xl font-heading font-bold uppercase tracking-tight text-sm transition-all active:scale-95"
          >
            Done
          </button>
          <button
            onClick={() => onViewVehicle(vehicleId)}
            className="py-3 rounded-xl font-bold text-center bg-surface-2 border border-white/[0.06] text-primary transition-all hover:border-orange text-sm uppercase tracking-tight active:scale-95"
          >
            View Vehicle
          </button>
        </div>

        <div className="px-4 pb-4 pt-0">
          <div className="pt-3 text-center" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-[10px] font-mono" style={{ color: 'var(--t3)' }}>
              Keep spotting to earn badges and climb the ranks!
            </p>
            <button className="spot-btn mt-3 px-6 text-[11px]" onClick={onDone}>
              Spot Another →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
