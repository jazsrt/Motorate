import { ReactNode } from 'react';
import { Home, Search, LayoutGrid, Activity, Compass } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { NotificationBell } from './NotificationBell';
import { LiveStatsBar } from './LiveStatsBar';

interface LayoutProps {
  children: ReactNode;
  currentPage: 'feed' | 'rankings' | 'scan' | 'safety' | 'profile' | 'events' | 'my-garage' | 'notifications' | 'search' | 'badges';
  onNavigate: (page: string, data?: unknown) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { user } = useAuth();

  const navLeft = [
    { id: 'feed' as const, icon: LayoutGrid, label: 'Feed' },
    { id: 'search' as const, icon: Compass, label: 'Explore' },
  ];
  const navRight = [
    { id: 'rankings' as const, icon: Activity, label: 'Rankings' },
    { id: 'my-garage' as const, icon: Home, label: 'Garage' },
  ];

  return (
    <>
      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '48px 20px 14px', flexShrink: 0,
        background: 'rgba(7,10,15,0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      }}>
        <button
          onClick={() => onNavigate('feed')}
          aria-label="Return to feed"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700,
            letterSpacing: '0.2em', textTransform: 'uppercase', color: '#eef4f8',
          }}
        >
          MOTO<em style={{ fontStyle: 'normal', color: '#F97316' }}>R</em>ATE
        </button>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => onNavigate('search')}
              style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#445566' }}
            >
              <Search size={17} strokeWidth={1.2} />
            </button>
            <NotificationBell onNavigate={onNavigate} />
          </div>
        )}
      </header>

      {/* LiveStatsBar */}
      {user && <LiveStatsBar />}

      {/* Main */}
      <main style={{
        maxWidth: 1280, margin: '0 auto', padding: '96px 16px 112px',
        WebkitOverflowScrolling: 'touch', overflowY: 'auto',
        scrollbarWidth: 'none' as const, msOverflowStyle: 'none' as const,
      }}>
        {children}
      </main>

      {/* Bottom Nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        display: 'flex',
        background: 'linear-gradient(to top, rgba(3,5,8,0.98) 0%, rgba(3,5,8,0.0) 100%)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        padding: '8px 0 22px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', position: 'relative' }}>
          {/* Left items */}
          {navLeft.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 5, cursor: 'pointer', padding: '4px 0', background: 'none', border: 'none',
                position: 'relative',
              }}>
                <Icon size={21} strokeWidth={1.5} style={{ color: isActive ? '#F97316' : '#7a8e9e', opacity: isActive ? 1 : 0.35, transition: 'color 0.2s, opacity 0.2s' }} />
                <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", color: isActive ? '#F97316' : '#7a8e9e', textTransform: 'uppercase', letterSpacing: '0.1em', transition: 'color 0.2s' }}>{item.label}</span>
                <span style={{ display: 'block', width: 3, height: 3, borderRadius: '50%', background: isActive ? '#F97316' : 'transparent', margin: '1px auto 0' }} />
              </button>
            );
          })}

          {/* Center — floating Spot button */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <button onClick={() => onNavigate('scan')} aria-label="Spot a vehicle"
              style={{
                position: 'absolute', top: -28, width: 52, height: 52, borderRadius: 14,
                background: '#F97316', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 28px rgba(249,115,22,0.5), 0 4px 14px rgba(0,0,0,0.6)',
                cursor: 'pointer', zIndex: 10,
              }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
              </svg>
            </button>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#F97316', marginTop: 30 }}>Spot</span>
          </div>

          {/* Right items */}
          {navRight.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 5, cursor: 'pointer', padding: '4px 0', background: 'none', border: 'none',
                position: 'relative',
              }}>
                <Icon size={21} strokeWidth={1.5} style={{ color: isActive ? '#F97316' : '#7a8e9e', opacity: isActive ? 1 : 0.35, transition: 'color 0.2s, opacity 0.2s' }} />
                <span style={{ fontSize: 9, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", color: isActive ? '#F97316' : '#7a8e9e', textTransform: 'uppercase', letterSpacing: '0.1em', transition: 'color 0.2s' }}>{item.label}</span>
                <span style={{ display: 'block', width: 3, height: 3, borderRadius: '50%', background: isActive ? '#F97316' : 'transparent', margin: '1px auto 0' }} />
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
