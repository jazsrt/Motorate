import { ReactNode } from 'react';
import { Home, Search, LayoutGrid, Activity, Compass } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { NotificationBell } from './NotificationBell';
import { LiveStatsBar } from './LiveStatsBar';

interface LayoutProps {
  children: ReactNode;
  currentPage: 'feed' | 'rankings' | 'scan' | 'safety' | 'profile' | 'events' | 'my-garage' | 'notifications' | 'search' | 'explore' | 'badges';
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
        padding: '14px 16px 10px',
        background: '#070a0f',
        borderBottom: '1px solid rgba(249,115,22,0.10)',
      }}>
        <button
          onClick={() => onNavigate('feed')}
          aria-label="Return to feed"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700,
            letterSpacing: '0.04em', color: '#eef4f8',
          }}
        >
          MOTO<em style={{ fontStyle: 'normal', color: '#F97316' }}>R</em>ATE
        </button>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => onNavigate('search')}
              style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#7a8e9e', width: 18, height: 18 }}
            >
              <Search size={18} strokeWidth={1.5} />
            </button>
            <NotificationBell onNavigate={onNavigate} />
          </div>
        )}
      </header>

      {/* Orange signal strip */}
      <div style={{ position: 'fixed', top: 44, left: 0, right: 0, zIndex: 50, height: 2, background: 'linear-gradient(90deg, #F97316 0%, rgba(249,115,22,0.2) 100%)', animation: 'motorate-pulse 3s ease-in-out infinite' }} />

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
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        height: 72,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        background: 'rgba(7,10,15,0.96)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        paddingBottom: 8,
      }}>
        {/* Left items */}
        {navLeft.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, cursor: 'pointer', padding: 0, background: 'none', border: 'none',
            }}>
              <Icon size={20} strokeWidth={1.5} style={{ color: isActive ? '#F97316' : '#3a4e60' }} />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: isActive ? '#F97316' : '#3a4e60' }}>{item.label}</span>
            </button>
          );
        })}

        {/* Center — FAB Spot button */}
        <button onClick={() => onNavigate('scan')} aria-label="Spot a vehicle"
          style={{
            width: 52, height: 52, borderRadius: 8,
            background: '#F97316', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', marginTop: -10,
          }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
          </svg>
        </button>

        {/* Right items */}
        {navRight.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, cursor: 'pointer', padding: 0, background: 'none', border: 'none',
            }}>
              <Icon size={20} strokeWidth={1.5} style={{ color: isActive ? '#F97316' : '#3a4e60' }} />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: isActive ? '#F97316' : '#3a4e60' }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
