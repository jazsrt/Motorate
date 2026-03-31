import { useState } from 'react';
import { ArrowLeft, Camera } from 'lucide-react';
import { Layout } from '../components/Layout';
import { type OnNavigate } from '../types/navigation';
import type { SpotWizardData } from '../types/spot';

interface ConfirmVehiclePageProps {
  onNavigate: OnNavigate;
  wizardData: SpotWizardData;
}

export function ConfirmVehiclePage({ onNavigate, wizardData }: ConfirmVehiclePageProps) {
  const [imgError, setImgError] = useState(false);
  const photoUrl = !imgError ? (wizardData.stockImageUrl || null) : null;

  const handleNext = () => {
    onNavigate('quick-spot-review', { wizardData });
  };

  const isClaimed = false; // New vehicles from API lookup are always unclaimed

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>
      {/* Header */}
      <div style={{ padding: '52px 16px 20px', background: '#0a0d14', borderBottom: '1px solid rgba(249,115,22,0.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button onClick={() => onNavigate('scan')} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(3,5,8,0.7)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={14} color="#eef4f8" strokeWidth={2} />
          </button>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316' }}>Step 2 of 3</span>
        </div>
        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', lineHeight: 1, marginBottom: 12 }}>Confirm Vehicle</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1, height: 2, borderRadius: 1, background: '#F97316' }} />
          <div style={{ flex: 1, height: 2, borderRadius: 1, background: 'rgba(249,115,22,0.40)' }} />
          <div style={{ flex: 1, height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>
      </div>

      {/* Plate display */}
      <div style={{ background: '#0d1117', border: '1px solid rgba(249,115,22,0.12)', borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, margin: '14px 16px' }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, color: '#7a8e9e', letterSpacing: '0.1em' }}>{wizardData.plateState || '—'}</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600, color: '#eef4f8', letterSpacing: '0.15em' }}>{wizardData.plateNumber || '—'}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          {isClaimed ? (
            <span style={{ background: 'rgba(32,192,96,0.12)', border: '1px solid rgba(32,192,96,0.25)', color: '#20c060', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, textTransform: 'uppercase' as const, padding: '3px 8px', borderRadius: 4 }}>Claimed</span>
          ) : (
            <span style={{ background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.20)', color: '#F97316', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, textTransform: 'uppercase' as const, padding: '3px 8px', borderRadius: 4 }}>Unclaimed</span>
          )}
        </div>
      </div>

      {/* Vehicle card */}
      <div style={{ background: '#0d1117', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', margin: '0 16px 14px' }}>
        {photoUrl ? (
          <img src={photoUrl} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} onError={() => setImgError(true)} />
        ) : (
          <div style={{ width: '100%', height: 100, background: '#111720', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3a4e60" strokeWidth="1.2"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M5 17H3v-6l2-5h9l4 5h3v6h-2"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
        )}
        <div style={{ padding: '10px 12px 12px' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316', marginBottom: 1 }}>{wizardData.make}</div>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: '#eef4f8', lineHeight: 1, marginBottom: 6 }}>
            {[wizardData.year, wizardData.model].filter(Boolean).join(' ') || 'Vehicle'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {wizardData.color && <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, color: '#5a6e7e', letterSpacing: '0.08em' }}>{wizardData.color.toUpperCase()}</span>}
            {wizardData.trim && <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, color: '#5a6e7e', letterSpacing: '0.08em' }}>{wizardData.trim}</span>}
          </div>
        </div>
      </div>

      {/* Photo section placeholder */}
      <div style={{ margin: '0 16px 14px', padding: 14, background: '#0d1117', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' as const }}>
        <Camera size={28} color="#3a4e60" style={{ margin: '0 auto 8px', display: 'block' }} />
        <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>Add a Photo (optional)</span>
      </div>

      {/* Submit button */}
      <div style={{ margin: '0 16px' }}>
        <button onClick={handleNext} style={{ width: '100%', padding: 13, background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#030508', cursor: 'pointer' }}>
          Confirm & Continue
        </button>
      </div>
    </Layout>
  );
}
