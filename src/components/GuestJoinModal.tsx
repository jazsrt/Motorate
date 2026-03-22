import { ModalShell, modalButtonPrimary, modalButtonGhost } from './ui/ModalShell';
import { Car, MapPin, Heart } from 'lucide-react';

interface GuestJoinModalProps {
  onClose: () => void;
  action: string;
}

export function GuestJoinModal({ onClose, action }: GuestJoinModalProps) {
  const handleJoin = () => {
    window.location.reload();
  };

  return (
    <ModalShell
      isOpen={true}
      onClose={onClose}
      title=""
      footer={
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, width: '100%' }}>
          <button onClick={handleJoin} style={{ ...modalButtonPrimary, flex: 'none', width: '100%' }}>
            Create Account
          </button>
          <button onClick={onClose} style={{ ...modalButtonGhost, flex: 'none', width: '100%' }}>
            Sign In
          </button>
        </div>
      }
    >
      <div style={{ textAlign: 'center' as const, padding: '8px 0 16px' }}>
        {/* Logo */}
        <div style={{
          fontFamily: "'Rajdhani', sans-serif", fontSize: 28, fontWeight: 700,
          color: '#eef4f8', marginBottom: 6,
        }}>
          MOTO<span style={{ color: '#F97316' }}>R</span>ATE
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700,
          letterSpacing: '0.24em', textTransform: 'uppercase' as const,
          color: '#7a8e9e', marginBottom: 24,
        }}>
          The car community, rated
        </div>

        <div style={{
          fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#a8bcc8',
          lineHeight: 1.5, marginBottom: 24,
        }}>
          To {action}, you need an account.
        </div>

        {/* Feature rows */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12, textAlign: 'left' as const }}>
          {[
            { icon: <Car style={{ width: 16, height: 16 }} />, text: 'Track and rate vehicles you spot in the wild' },
            { icon: <Heart style={{ width: 16, height: 16 }} />, text: 'Follow vehicles and owners to see their activity' },
            { icon: <MapPin style={{ width: 16, height: 16 }} />, text: 'Claim your own vehicle and build its reputation' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#F97316',
              }}>
                {item.icon}
              </div>
              <div style={{
                fontFamily: "'Barlow', sans-serif", fontSize: 12,
                color: '#a8bcc8', lineHeight: 1.45, paddingTop: 6,
              }}>
                {item.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}
