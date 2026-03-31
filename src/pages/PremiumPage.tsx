import { Layout } from '../components/Layout';
import { OnNavigate } from '../types/navigation';

interface PremiumPageProps {
  onNavigate: OnNavigate;
}

const FEATURES = [
  { bold: 'Plate-to-VIN lookups', rest: ' — automatically identify vehicles by plate' },
  { bold: '10 free spots per week', rest: ' included for all users — Pro gets unlimited' },
  { bold: 'Auto plate-to-VIN', rest: ' — plate automatically identifies make, model, and year' },
  { bold: 'Priority spot ranking', rest: ' — your spots surface higher in feed' },
  { bold: 'Pro badge', rest: ' — verified Pro status on your profile' },
  { bold: 'Profile insights', rest: ' — detailed analytics on views and engagement' },
];

export function PremiumPage({ onNavigate }: PremiumPageProps) {
  return (
    <Layout currentPage="profile" onNavigate={onNavigate}>
      {/* Hero section */}
      <div style={{ background: '#0a0d14', padding: '52px 16px 24px', textAlign: 'center', borderBottom: '1px solid rgba(249,115,22,0.12)' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.3em', textTransform: 'uppercase', color: '#F97316', marginBottom: 6 }}>
          Upgrade
        </div>
        <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 28, fontWeight: 700, color: '#eef4f8', lineHeight: 1, marginBottom: 6, marginTop: 0 }}>
          MotoRate <span style={{ color: '#F97316' }}>Pro</span>
        </h1>
        <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#5a6e7e', lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>
          Unlock plate-to-VIN lookups and premium features.
        </p>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 600, color: '#F97316', fontVariantNumeric: 'tabular-nums', margin: '16px 0 4px' }}>
          $4
        </div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, color: '#5a6e7e', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          per month
        </div>
        <button
          onClick={() => {/* Stripe integration coming */}}
          style={{ margin: '16px 0 0', padding: 13, background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#030508', width: '100%', textAlign: 'center', cursor: 'pointer' }}
        >
          Upgrade to Pro
        </button>
      </div>

      {/* Feature rows */}
      <div>
        {FEATURES.map((feature, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {/* Check circle */}
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(32,192,96,0.12)', border: '1px solid rgba(32,192,96,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4.5 7.5L8 3" stroke="#20c060" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#7a8e9e' }}>
              <span style={{ color: '#eef4f8' }}>{feature.bold}</span>{feature.rest}
            </span>
          </div>
        ))}
      </div>
    </Layout>
  );
}
