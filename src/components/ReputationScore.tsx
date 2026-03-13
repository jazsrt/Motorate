import { useEffect, useState } from 'react';
import { getUserReputationScore, ReputationScore as ReputationScoreType } from '../lib/reputation';

interface ReputationScoreProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/**
 * REPUTATION SCORE DISPLAY
 *
 * This component displays a user's Reputation score.
 * Reputation is calculated from user activity:
 *
 * Point Values (from reputationConfig.ts):
 * - Claim Vehicle: 50 pts (max 1/day)
 * - Badge Earned: 25 pts (unlimited)
 * - Post Created: 15 pts (or 5 pts if >10 posts today)
 * - Comment Left: 5 pts (unlimited)
 * - Like Received: 2 pts (or 1 pt if post has >10 likes)
 * - Positive Sticker: 2 pts (unlimited)
 * - Negative Sticker: -3 pts (unlimited)
 *
 * Stored in: reputation_scores table
 */
export function ReputationScore({ userId, size = 'md', showLabel = true }: ReputationScoreProps) {
  const [reputationData, setReputationData] = useState<ReputationScoreType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScore();
  }, [userId]);

  async function loadScore() {
    try {
      const data = await getUserReputationScore(userId);
      setReputationData(data);
    } catch (error) {
      console.error('Error loading reputation score:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !reputationData) {
    return null;
  }

  const score = reputationData.total_score;
  const safeScore = typeof score === 'number' && !isNaN(score) ? score : 0;

  const scoreSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  const labelSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`font-bold font-mono text-accent-primary ${scoreSizes[size]}`}>
        {safeScore.toLocaleString()}
      </div>
      {showLabel && (
        <div className={`uppercase tracking-wider font-bold text-secondary ${labelSizes[size]}`}>
          Reputation
        </div>
      )}
    </div>
  );
}
