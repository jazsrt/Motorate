import { ReactNode, useState, useEffect, useRef } from 'react';
import { Home, Shield, User, Search, MessageCircle, Settings, Car, Award, Camera, Crown, Menu, X, AlertOctagon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { UserAvatar } from './UserAvatar';
import { supabase } from '../lib/supabase';
import { ReportStolenModal } from './ReportStolenModal';
import { LiveStatsBar } from './LiveStatsBar';

interface LayoutProps {
  children: ReactNode;
  currentPage: 'feed' | 'rankings' | 'scan' | 'safety' | 'profile' | 'events' | 'my-garage' | 'notifications';
  onNavigate: (page: string, data?: any) => void;
}

interface SearchResults {
  users: Array<{
    id: string;
    handle: string;
    avatar_url: string | null;
    is_private?: boolean;
  }>;
  vehicles: Array<{
    id: string;
    make: string | null;
    model: string | null;
    year: number | null;
  }>;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults>({ users: [], vehicles: [] });
  const [suggestedUsers, setSuggestedUsers] = useState<SearchResults['users']>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showStolenModal, setShowStolenModal] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    async function loadSuggestedUsers() {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, handle, avatar_url, is_private')
          .not('handle', 'is', null)
          .order('reputation_score', { ascending: false })
          .limit(5);
        if (data) setSuggestedUsers(data.filter(u => u.handle));
      } catch {}
    }
    loadSuggestedUsers();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setShowDropdown(false);
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (searchQuery.trim().length < 2) {
      setSearchResults({ users: [], vehicles: [] });
      setShowDropdown(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => performLiveSearch(searchQuery.trim()), 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery]);

  async function performLiveSearch(query: string) {
    try {
      const cleanQuery = query.replace(/^@/, '');
      const [usersResult, vehiclesResult] = await Promise.all([
        supabase.from('profiles').select('id, handle, avatar_url, is_private').ilike('handle', `%${cleanQuery}%`).not('handle', 'is', null).limit(5),
        supabase.from('vehicles').select('id, make, model, year').or(`make.ilike.%${cleanQuery}%,model.ilike.%${cleanQuery}%`).limit(5)
      ]);
      setSearchResults({ users: (usersResult.data || []).filter(u => u.handle), vehicles: vehiclesResult.data || [] });
      setShowDropdown(true);
    } catch {}
  }

  function handleUserClick(userId: string) {
    onNavigate('user-profile', userId);
    setSearchQuery(''); setShowDropdown(false); setSearchResults({ users: [], vehicles: [] });
  }

  function handleVehicleClick(vehicleId: string) {
    onNavigate('vehicle-detail', vehicleId);
    setSearchQuery(''); setShowDropdown(false); setSearchResults({ users: [], vehicles: [] });
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searching) return;
    onNavigate('search', searchQuery);
    setShowDropdown(false);
  };

  const navItems = [
    { id: 'feed' as const, icon: Home, label: 'Feed' },
    { id: 'rankings' as const, icon: Award, label: 'Rankings' },
    { id: 'scan' as const, icon: Camera, label: 'Spot', isCenter: true },
    { id: 'my-garage' as const, icon: Car, label: 'Garage' },
    { id: 'profile' as const, icon: User, label: 'Profile' },
  ];

  const hasSearchResults = searchResults.users.length > 0 || searchResults.vehicles.length > 0;
  const hasSuggestions = searchQuery.trim().length === 0 && suggestedUsers.length > 0;

  return (
    <>
      {/* ── Header ── */}
      <header className="topbar">
        <button
          onClick={() => onNavigate('feed')}
          className="topbar-logo hover:opacity-70 transition-opacity"
          aria-label="Return to feed"
        >
          MOTO<em style={{ fontStyle: 'normal', color: 'var(--accent)' }}>R</em>ATE
        </button>

        {user && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('search')}
              className="p-0 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--t4)' }}
            >
              <Search size={17} strokeWidth={1.2} />
            </button>
            <NotificationBell onNavigate={onNavigate} />
          </div>
        )}
      </header>

      {/* DO NOT REMOVE — LiveStatsBar */}
      {user && <LiveStatsBar />}

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 pt-24 pb-28 hide-scrollbar page-enter" style={{ WebkitOverflowScrolling: 'touch' }}>
        {children}
      </main>

      {/* ── Bottom Nav ── */}
      <nav className="bot-nav">
        <div className="flex items-center w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            if ((item as any).isCenter) {
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className="flex-1 flex flex-col items-center -mt-6 relative"
                >
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      background: 'var(--accent)',
                      borderRadius: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 30px rgba(249,115,22,0.5), 0 4px 16px rgba(0,0,0,0.6)',
                    }}
                  >
                    <Icon size={24} strokeWidth={2} style={{ color: 'var(--black)' }} />
                  </div>
                  <span style={{ fontFamily: 'var(--font-cond)', fontSize: '9px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent)', marginTop: '2px' }}>
                    {item.label}
                  </span>
                </button>
              );
            }
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`bot-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={22} strokeWidth={1.5} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {showStolenModal && (
        <ReportStolenModal
          onClose={() => setShowStolenModal(false)}
          onSuccess={() => setShowStolenModal(false)}
        />
      )}
    </>
  );
}
