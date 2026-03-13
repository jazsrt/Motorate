import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  count?: number;
  onChange?: (rating: number) => void;
  label?: string;
  disabled?: boolean;
}

export function StarRating({
  value,
  readonly = false,
  size = 'md',
  showCount = false,
  count,
  onChange,
  label,
  disabled = false
}: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  const starSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const countSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const isInteractive = !readonly && !disabled && onChange;

  const handleClick = (rating: number) => {
    if (isInteractive && onChange) {
      onChange(rating);
    }
  };

  const getStarFill = (starPosition: number) => {
    const diff = value - starPosition;

    if (diff >= 0) {
      // Full star
      return 'filled';
    } else if (diff > -1 && diff < 0) {
      // Half star (for decimals like 4.3, 4.7, etc)
      return 'half';
    } else {
      // Empty star
      return 'empty';
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-bold uppercase tracking-wider text-neutral-300">
          {label}
        </label>
      )}

      <div className="flex items-center gap-2">
        {/* Stars */}
        <div className="flex items-center gap-0.5">
          {stars.map((star) => {
            const fillType = getStarFill(star);

            return (
              <button
                key={star}
                type="button"
                disabled={disabled || readonly}
                onClick={() => handleClick(star)}
                className={`
                  transition-all duration-200
                  ${isInteractive ? 'cursor-pointer hover:scale-110 active:scale-95' : ''}
                  ${disabled ? 'cursor-not-allowed opacity-50' : ''}
                  ${readonly ? 'cursor-default' : ''}
                `}
              >
                {fillType === 'filled' && (
                  <Star
                    className={`${starSizes[size]} fill-[#F97316] text-accent-primary drop-shadow-md transition-colors`}
                  />
                )}

                {fillType === 'half' && (
                  <div className="relative">
                    <Star
                      className={`${starSizes[size]} fill-gray-600 text-gray-600 transition-colors`}
                    />
                    <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                      <Star
                        className={`${starSizes[size]} fill-[#F97316] text-accent-primary drop-shadow-md transition-colors`}
                      />
                    </div>
                  </div>
                )}

                {fillType === 'empty' && (
                  <Star
                    className={`${starSizes[size]} fill-gray-600 text-gray-600 transition-colors`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Numeric Value */}
        {value > 0 && (
          <span className={`font-bold text-accent-primary ${textSizes[size]} drop-shadow-md`}>
            {value.toFixed(1)}
          </span>
        )}

        {/* Review Count */}
        {showCount && count !== undefined && count > 0 && (
          <span className={`text-gray-400 ${countSizes[size]}`}>
            ({count.toLocaleString()})
          </span>
        )}
      </div>
    </div>
  );
}
