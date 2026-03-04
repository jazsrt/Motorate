import { Clock, AlertCircle } from 'lucide-react';
import { getActionDisplayName, getRateLimitDescription, type RateLimitAction } from '../lib/rateLimitConfig';

interface RateLimitErrorProps {
  action: RateLimitAction;
  remainingTime: number;
}

/**
 * Formats milliseconds into a human-readable time string.
 */
function formatRemainingTime(ms: number): string {
  const seconds = Math.ceil(ms / 1000);

  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  return `${hours} hour${hours !== 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
}

/**
 * Displays a friendly rate limit error message with countdown.
 * Shows when a user has exceeded the rate limit for a specific action.
 */
export default function RateLimitError({ action, remainingTime }: RateLimitErrorProps) {
  const actionName = getActionDisplayName(action);
  const limitDescription = getRateLimitDescription(action);
  const timeRemaining = formatRemainingTime(remainingTime);

  return (
    <div className="bg-surface border border-orange/30 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-orange/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-primary mb-2">
            Slow Down There, Speed Racer!
          </h3>

          <p className="text-secondary mb-4">
            You've reached the rate limit for {actionName.toLowerCase()}s.
            We limit this action to <strong>{limitDescription}</strong> to prevent spam
            and keep the community awesome.
          </p>

          <div className="flex items-center gap-3 bg-surfacehighlight border border-orange/30 rounded-lg px-4 py-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-primary">
                Try again in:
              </p>
              <p className="text-lg font-bold text-amber-600">
                {timeRemaining}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Take a break, grab some coffee, and come back soon!
              Your enthusiasm is appreciated, but let's keep things smooth for everyone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
