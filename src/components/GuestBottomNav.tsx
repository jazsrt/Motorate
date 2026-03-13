import { Search, LogIn } from 'lucide-react';
import { type OnNavigate } from '../types/navigation';

interface GuestBottomNavProps {
  onNavigate: OnNavigate;
}

export function GuestBottomNav({ onNavigate }: GuestBottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-surfacehighlight p-4 z-50 safe-area-bottom">
      <div className="flex gap-3 max-w-md mx-auto">
        <button
          onClick={() => onNavigate('search')}
          className="flex-1 py-3 px-4 bg-surfacehighlight hover:bg-surfacehover border border-surfacehighlight rounded-xl font-bold uppercase tracking-wider text-sm transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Search className="w-5 h-5" />
          Search Plates
        </button>
        <button
          onClick={() => onNavigate('feed')}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-accent-primary to-accent-hover hover:shadow-lg hover:shadow-accent-primary/20 rounded-xl font-bold uppercase tracking-wider text-sm transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <LogIn className="w-5 h-5" />
          Join MotoRate
        </button>
      </div>
    </div>
  );
}
