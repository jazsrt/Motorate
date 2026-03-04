import { Star } from 'lucide-react';
import { type ReactNode } from 'react';

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export function StarRatingInput({ value, onChange, label, icon, disabled = false }: StarRatingInputProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-2">
        {icon && <span className="flex items-center text-secondary">{icon}</span>}
        <span className="text-sm font-heading font-bold uppercase tracking-tight text-secondary">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !disabled && onChange(star)}
            disabled={disabled}
            className={`
              transition-all duration-200 hover:scale-110 active:scale-95
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            `}
          >
            <Star
              className={`w-7 h-7 transition-colors ${
                star <= value
                  ? 'fill-yellow-500 text-yellow-500'
                  : 'fill-none text-gray-600 hover:text-yellow-500/50'
              }`}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
