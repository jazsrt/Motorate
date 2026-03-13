import { X, TrendingUp } from 'lucide-react';

interface WeeklyRecapModalProps {
  rank: number;
  previousRank: number;
  location: string;
  spotsThisWeek: number;
  reviewsThisWeek: number;
  badgesThisWeek: number;
  nextBadgeName?: string;
  nextBadgeProgress?: number;
  nextBadgeRequired?: number;
  onClose: () => void;
}

export function WeeklyRecapModal({
  rank,
  previousRank,
  location,
  spotsThisWeek,
  reviewsThisWeek,
  badgesThisWeek,
  nextBadgeName,
  nextBadgeProgress = 0,
  nextBadgeRequired = 100,
  onClose,
}: WeeklyRecapModalProps) {
  const rankChange = previousRank - rank;
  const isImprovement = rankChange > 0;
  const remaining = nextBadgeRequired - nextBadgeProgress;

  return (
    <div
      className="recap-overlay active"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-2)' }}
      >
        <X className="w-4 h-4" strokeWidth={1.5} style={{ color: 'var(--t3)' }} />
      </button>

      {/* Card */}
      <div
        className="card-v3 p-6 max-w-sm w-full mx-4 animate-fade-up"
        style={{ background: 'var(--surface)' }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <p
            className="text-[9px] font-semibold uppercase mb-3"
            style={{ color: 'var(--t4)', letterSpacing: '2.5px' }}
          >
            Weekly Recap
          </p>

          {/* Rank */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div
              className="font-mono text-[40px] font-bold"
              style={{ color: isImprovement ? 'var(--positive)' : 'var(--t1)' }}
            >
              #{rank}
            </div>
            {rankChange !== 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp
                  className={`w-5 h-5 ${!isImprovement ? 'rotate-180' : ''}`}
                  style={{ color: isImprovement ? 'var(--positive)' : 'var(--negative)' }}
                  strokeWidth={2}
                />
                <span
                  className="font-mono text-sm font-semibold"
                  style={{ color: isImprovement ? 'var(--positive)' : 'var(--negative)' }}
                >
                  {Math.abs(rankChange)}
                </span>
              </div>
            )}
          </div>

          {/* Location */}
          <p className="text-xs" style={{ color: 'var(--t3)' }}>
            in {location}
            {rankChange !== 0 && (
              <span style={{ color: isImprovement ? 'var(--positive)' : 'var(--negative)' }}>
                {' '}
                {isImprovement ? '↑' : '↓'} {Math.abs(rankChange)} from #{previousRank}
              </span>
            )}
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div
              className="font-mono text-2xl font-bold"
              style={{ color: 'var(--t1)' }}
            >
              {spotsThisWeek}
            </div>
            <div
              className="text-[10px] mt-1"
              style={{ color: 'var(--t4)' }}
            >
              Spots
            </div>
          </div>
          <div className="text-center">
            <div
              className="font-mono text-2xl font-bold"
              style={{ color: 'var(--t1)' }}
            >
              {reviewsThisWeek}
            </div>
            <div
              className="text-[10px] mt-1"
              style={{ color: 'var(--t4)' }}
            >
              Reviews
            </div>
          </div>
          <div className="text-center">
            <div
              className="font-mono text-2xl font-bold"
              style={{ color: badgesThisWeek > 0 ? 'var(--gold-h)' : 'var(--t1)' }}
            >
              {badgesThisWeek}
            </div>
            <div
              className="text-[10px] mt-1"
              style={{ color: 'var(--t4)' }}
            >
              Badges
            </div>
          </div>
        </div>

        {/* Next Badge Hint */}
        {nextBadgeName && (
          <div
            className="p-3 rounded-lg mb-6"
            style={{ background: 'var(--s2)', border: '1px solid var(--border)' }}
          >
            <p className="text-[10px] mb-1" style={{ color: 'var(--t4)' }}>
              Next Badge
            </p>
            <p className="text-xs font-medium" style={{ color: 'var(--t2)' }}>
              {remaining} more spots to <span style={{ color: 'var(--accent)' }}>{nextBadgeName}</span>
            </p>
          </div>
        )}

        {/* CTA Button */}
        <button
          onClick={onClose}
          className="spot-btn"
        >
          Let's Go
        </button>
      </div>
    </div>
  );
}
