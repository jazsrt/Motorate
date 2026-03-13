import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CompetitiveRankBarProps {
  rank: number;
  city?: string;
  totalUsers?: number;
  topPercent?: number;
  spotsThisWeek?: number;
}

export function CompetitiveRankBar({
  rank,
  city = 'Chicago',
  totalUsers = 0,
  topPercent = 0,
  spotsThisWeek = 0,
}: CompetitiveRankBarProps) {
  if (rank <= 0) return null;

  // Ensure rank never exceeds total — use whichever is larger as the total
  const safeTotal = Math.max(rank, totalUsers);

  return (
    <div className="card-v3 mx-4 mb-4 flex items-center gap-3.5 p-3.5">
      <div
        className="font-mono text-[28px] font-bold min-w-[40px] text-center leading-none"
        style={{ color: 'var(--orange)', textShadow: '0 0 16px rgba(249,115,22,0.2)' }}
      >
        {rank}
      </div>
      <div className="flex-1">
        <div className="text-xs font-light" style={{ color: 'var(--t3)' }}>
          {safeTotal > 0 ? (
            <>#{rank} of {safeTotal.toLocaleString()} spotters in {city}</>
          ) : (
            <>#{rank} in {city} this week</>
          )}
        </div>
        {spotsThisWeek > 0 && (
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--t4)' }}>
            {spotsThisWeek} spot{spotsThisWeek !== 1 ? 's' : ''} this week
            {topPercent > 0 && topPercent <= 25 && (
              <span style={{ color: 'var(--orange)' }}> · Top {topPercent}%</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
