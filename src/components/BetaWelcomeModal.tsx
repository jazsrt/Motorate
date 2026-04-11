import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface BetaWelcomeModalProps {
  userId: string;
  onDismiss: () => void;
}

export function BetaWelcomeModal({ userId, onDismiss }: BetaWelcomeModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Small delay so it doesn't pop instantly on load
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(`motorate_beta_seen_${userId}`, 'true');
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(8px)',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease',
    }}>
      <div style={{
        background: '#0d1117',
        border: '1px solid rgba(249,115,22,0.25)',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        overflow: 'hidden',
        boxShadow: '0 0 60px rgba(249,115,22,0.08)',
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'transform 0.3s ease',
      }}>

        {/* Orange top bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #F97316, rgba(249,115,22,0.3))' }} />

        {/* Header */}
        <div style={{ padding: '24px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 9, fontWeight: 700, letterSpacing: '0.25em',
              textTransform: 'uppercase', color: '#F97316', marginBottom: 6,
            }}>
              Exclusive Beta Access
            </div>
            <div style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 28, fontWeight: 700, color: '#eef4f8', lineHeight: 1,
            }}>
              You're In.
            </div>
          </div>
          <button
            onClick={handleDismiss}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#5a6e7e', marginTop: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 24px 0' }}>
          <div style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: 16, fontWeight: 700, color: '#eef4f8', marginBottom: 6,
          }}>
            Welcome to the MotoRate Beta
          </div>
          <p style={{
            fontFamily: "'Barlow', sans-serif",
            fontSize: 13, color: '#7a8e9e', lineHeight: 1.6, margin: '0 0 20px',
          }}>
            You're one of the first people to access MotoRate — a vehicle-first social platform where real cars and trucks build real reputation. This is an exclusive beta, and your feedback directly shapes what gets built next.
          </p>

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Spot a vehicle', body: 'Find any car or truck and scan its plate. Rate it. Log it. Be the first to put it on the map.' },
              { label: 'Claim your ride', body: 'Own a vehicle? Find it and claim it with your VIN. Make it yours.' },
              { label: 'Explore the feed', body: 'See what\'s been spotted, react to builds, drop a comment.' },
              { label: 'Break things', body: 'If something feels off or doesn\'t work, that\'s exactly what we need to know. Send it to support.motorate@gmail.com.' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 20, height: 20, borderRadius: 2, flexShrink: 0,
                  background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: '#F97316',
                  marginTop: 2,
                }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#eef4f8', marginBottom: 2 }}>
                    {item.label}
                  </div>
                  <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#7a8e9e', lineHeight: 1.5 }}>
                    {item.body}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Closing line */}
          <div style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: 14, fontWeight: 700, color: '#5a6e7e',
            textAlign: 'center', marginBottom: 20,
            fontStyle: 'italic',
          }}>
            This is early. It's raw. And it's yours first.
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: '0 24px 24px' }}>
          <button
            onClick={handleDismiss}
            style={{
              width: '100%', padding: '14px 0',
              background: '#F97316', border: 'none', borderRadius: 2,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 13, fontWeight: 700, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: '#030508', cursor: 'pointer',
            }}
          >
            Let's Go
          </button>
        </div>
      </div>
    </div>
  );
}
