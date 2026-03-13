import { useState, useEffect } from 'react';
import { BarChart3, ThumbsUp, ThumbsDown, Star, User, Award, AlertTriangle, FileText, Tag } from 'lucide-react';
import { getReviewProfile } from '../lib/reviewProfileService';
import { type ReviewProfile } from '../types/reviewProfile';

interface ReviewProfileSectionProps {
  userId: string;
  showRecentReviews?: boolean;
  maxReviews?: number;
  showEditDelete?: boolean;
  emptyStateMessage?: string;
  onEdit?: (reviewId: string) => void;
  onDelete?: (reviewId: string) => void;
}

export function ReviewProfileSection({
  userId,
  showRecentReviews = true,
  maxReviews = 10,
  showEditDelete = false,
  emptyStateMessage = "This user hasn't spotted",
  onEdit,
  onDelete
}: ReviewProfileSectionProps) {
  const [profile, setProfile] = useState<ReviewProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative'>('all');

  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    setLoading(true);
    const data = await getReviewProfile(userId);
    setProfile(data);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-primary mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-4">Loading review profile...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Unable to load review profile
      </div>
    );
  }

  if (profile.stats.totalSpots === 0) {
    return (
      <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-8 text-center">
        <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
        <h3 className="text-xl font-bold mb-2">No Spots Yet</h3>
        <p className="text-gray-600 dark:text-gray-400">
          {emptyStateMessage} any plates yet.
        </p>
      </div>
    );
  }

  const totalRated = profile.distribution.excellent + profile.distribution.good +
                     profile.distribution.average + profile.distribution.poor;
  const negativePercent = totalRated > 0 ? (profile.distribution.poor / totalRated) * 100 : 0;
  const showWarning = negativePercent > 40 && totalRated >= 10;

  const getPercentage = (count: number) => (totalRated > 0 ? (count / totalRated) * 100 : 0);

  const bars = [
    { label: '80-100', count: profile.distribution.excellent, color: 'bg-green-500', percentage: getPercentage(profile.distribution.excellent) },
    { label: '60-79', count: profile.distribution.good, color: 'bg-orange-500', percentage: getPercentage(profile.distribution.good) },
    { label: '40-59', count: profile.distribution.average, color: 'bg-yellow-500', percentage: getPercentage(profile.distribution.average) },
    { label: '0-39', count: profile.distribution.poor, color: 'bg-red-500', percentage: getPercentage(profile.distribution.poor) }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'blue': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'red': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'orange': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const filteredReviews = profile.recentReviews.filter(review => {
    if (filter === 'positive') return review.overall_rating >= 4;
    if (filter === 'negative') return review.overall_rating <= 2;
    return true;
  }).slice(0, maxReviews);

  const percentage = Math.round(profile.stickerStats.positivityRatio * 100);

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      {showWarning && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <div className="font-bold text-red-900 dark:text-red-300">
                Notice: Unusual Spot Pattern
              </div>
              <div className="text-sm text-red-800 dark:text-red-400 mt-1">
                This user shows a pattern of mostly negative spots ({Math.round(negativePercent)}%).
                Consider their spot history before trusting ratings.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="text-accent-primary" size={24} />
          <h3 className="text-xl font-bold">Spots Profile & Reputation</h3>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-md">
            <div className="text-3xl font-bold text-accent-primary">{profile.stats.totalSpots}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Spots</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-md">
            <div className="text-3xl font-bold text-accent-primary">{profile.stats.avgDriverRating}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Driver</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-md">
            <div className="text-3xl font-bold text-accent-primary">{profile.stats.avgVehicleRating}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Vehicle</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-center shadow-md">
            <div className="text-3xl font-bold text-accent-primary">{profile.stats.memberAgeDays}d</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Member Age</div>
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> Rating Distribution</h4>
          <div className="space-y-2">
            {bars.map((bar) => (
              <div key={bar.label} className="flex items-center gap-3">
                <span className="text-sm w-20 font-medium">{bar.label}:</span>
                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-6 relative">
                  <div
                    className={`${bar.color} h-6 rounded-full flex items-center justify-end pr-2 transition-all`}
                    style={{ width: `${bar.percentage}%` }}
                  >
                    {bar.percentage > 10 && (
                      <span className="text-xs text-white font-semibold">
                        {Math.round(bar.percentage)}%
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm w-12 text-right font-medium">{bar.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sticker Stats */}
        <div className="mb-6">
          <h4 className="font-semibold mb-3 flex items-center gap-2"><Tag className="w-4 h-4" /> Sticker Usage</h4>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <ThumbsUp className="text-green-600" size={20} />
              <span className="text-sm">
                Positive: <strong>{profile.stickerStats.positiveCount}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ThumbsDown className="text-red-600" size={20} />
              <span className="text-sm">
                Negative: <strong>{profile.stickerStats.negativeCount}</strong>
              </span>
            </div>
            {(profile.stickerStats.positiveCount + profile.stickerStats.negativeCount) > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                ({percentage}% positive)
              </div>
            )}
          </div>
          {profile.stickerStats.mostGivenSticker && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Most Given: <strong>"{profile.stickerStats.mostGivenSticker}"</strong>
            </div>
          )}
        </div>

        {/* Credibility Badges */}
        {profile.credibilityBadges.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Award className="w-4 h-4" /> Credibility Indicators
            </h4>
            <div className="flex flex-wrap gap-2">
              {profile.credibilityBadges.map((badge, index) => (
                <span
                  key={index}
                  className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${getColorClasses(badge.color)}`}
                  title={badge.description}
                >
                  {badge.icon} {badge.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Reviews */}
      {showRecentReviews && profile.recentReviews.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-lg">Recent Reviews from Others</h4>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'all'
                    ? 'bg-accent-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('positive')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'positive'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                Positive
              </button>
              <button
                onClick={() => setFilter('negative')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === 'negative'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                Negative
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <div
                key={review.id}
                className="bg-surfacehighlight rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {review.author?.avatar_url ? (
                      <img
                        src={review.author.avatar_url}
                        className="w-10 h-10 rounded-full object-cover"
                        alt={review.author.handle}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
                        <User className="w-5 h-5 text-secondary" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-sm">
                        @{review.author?.handle || 'Anonymous'}
                      </p>
                      {review.vehicle && (
                        <p className="text-xs text-secondary">
                          {review.vehicle.year} {review.vehicle.make} {review.vehicle.model}
                        </p>
                      )}
                      {review.location_label && (
                        <p className="text-xs text-secondary">
                          {review.location_label}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-secondary">Driver</span>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= (review.rating_driver || 0)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-secondary">Cool</span>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= (review.rating_vehicle || 0)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {review.text && (
                  <p className="text-sm text-secondary mt-3 leading-relaxed italic">
                    "{review.text}"
                  </p>
                )}

                <p className="text-xs text-secondary mt-2">
                  {new Date(review.created_at).toLocaleDateString()}
                </p>
                {showEditDelete && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-surfacehighlight">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(review.id)}
                        className="px-3 py-1 text-sm bg-surface hover:bg-surfacehighlight rounded-lg transition"
                        title="Edit review"
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(review.id)}
                        className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition"
                        title="Delete review"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
