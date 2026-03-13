import { useState } from 'react';
import { Filter, X, CheckCircle } from 'lucide-react';

export interface VehicleFilters {
  make: string;
  year: string;
  verifiedOnly: boolean;
  sortBy: 'newest' | 'oldest' | 'rating' | 'spots';
}

interface SearchFiltersProps {
  filters: VehicleFilters;
  onFiltersChange: (filters: VehicleFilters) => void;
  availableMakes?: string[];
  availableYears?: number[];
}

export function SearchFilters({
  filters,
  onFiltersChange,
  availableMakes = [],
  availableYears = [],
}: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters = filters.make || filters.year || filters.verifiedOnly;

  const handleReset = () => {
    onFiltersChange({
      make: '',
      year: '',
      verifiedOnly: false,
      sortBy: 'newest',
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
          hasActiveFilters
            ? 'bg-accent-primary text-white border-accent-primary'
            : 'bg-surface text-primary border-surfacehighlight hover:bg-surfacehighlight'
        }`}
      >
        <Filter className="w-5 h-5" />
        Filters
        {hasActiveFilters && (
          <span className="ml-1 px-2 py-0.5 bg-white text-accent-primary text-xs font-bold rounded-full">
            {[filters.make, filters.year, filters.verifiedOnly].filter(Boolean).length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-surface border border-surfacehighlight rounded-lg shadow-lg z-50 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-primary">Filters</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-surfacehighlight rounded transition-colors"
              >
                <X className="w-5 h-5 text-secondary" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Make
                </label>
                <select
                  value={filters.make}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, make: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-background border border-surfacehighlight rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                >
                  <option value="">All Makes</option>
                  {availableMakes.map((make) => (
                    <option key={make} value={make}>
                      {make}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Year
                </label>
                <select
                  value={filters.year}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, year: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-background border border-surfacehighlight rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                >
                  <option value="">All Years</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary mb-2">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      sortBy: e.target.value as VehicleFilters['sortBy'],
                    })
                  }
                  className="w-full px-3 py-2 bg-background border border-surfacehighlight rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="rating">Highest Rated</option>
                  <option value="spots">Most Spotted</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.verifiedOnly}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        verifiedOnly: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-accent-primary bg-background border-surfacehighlight rounded focus:ring-2 focus:ring-accent-primary"
                  />
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-primary">Verified Only</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t border-surfacehighlight">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 bg-surfacehighlight text-primary rounded-lg hover:bg-surfacehighlight/80 transition-colors text-sm font-medium"
              >
                Reset
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-hover transition-colors text-sm font-medium"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
