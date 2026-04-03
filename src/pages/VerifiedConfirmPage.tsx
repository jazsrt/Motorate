import { useState } from 'react';
import { ArrowLeft, Shield, CheckCircle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { type OnNavigate } from '../types/navigation';
import type { SpotWizardData } from '../types/spot';

interface VerifiedConfirmPageProps {
  onNavigate: OnNavigate;
  wizardData: SpotWizardData;
}

export function VerifiedConfirmPage({ onNavigate, wizardData }: VerifiedConfirmPageProps) {
  const [imgError, setImgError] = useState(false);
  const photoUrl = !imgError ? (wizardData.stockImageUrl || null) : null;
  const specs = wizardData.verifiedSpecs || {};

  const specRows = [
    { label: 'Year', value: wizardData.year },
    { label: 'Make', value: wizardData.make },
    { label: 'Model', value: wizardData.model },
    { label: 'Trim', value: wizardData.trim },
    { label: 'Engine', value: specs.engine },
    { label: 'Body', value: specs.bodyStyle },
    { label: 'Trans', value: specs.transmission },
    { label: 'Drive', value: specs.driveType },
  ].filter(r => r.value);

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>
      <div style={{ background: '#030508', minHeight: '100vh', paddingBottom: 100 }}>

        {/* Header */}
        <div style={{ padding: '52px 16px 16px', background: '#0a0d14', borderBottom: '1px solid rgba(249,115,22,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <button onClick={() => onNavigate('scan')} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(3,5,8,0.7)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ArrowLeft size={14} color="#eef4f8" strokeWidth={2} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={14} color="#F97316" />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316' }}>Verified Spot \u00b7 Step 2 of 3</span>
            </div>
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#20c060', marginBottom: 4 }}>Motorate Verified</div>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
            {[wizardData.year, wizardData.make, wizardData.model].filter(Boolean).join(' ')}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#F97316', letterSpacing: '0.12em', marginTop: 4 }}>
            {wizardData.plateState} \u00b7 {wizardData.plateNumber}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <div style={{ flex: 1, height: 2, borderRadius: 1, background: '#F97316' }} />
            <div style={{ flex: 1, height: 2, borderRadius: 1, background: '#F97316' }} />
            <div style={{ flex: 1, height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.08)' }} />
          </div>
        </div>

        {/* Hero image */}
        {photoUrl ? (
          <div style={{ position: 'relative', width: '100%', height: 220, overflow: 'hidden', background: '#111720' }}>
            <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={() => setImgError(true)} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,5,8,0.7) 0%, transparent 55%)' }} />
            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(32,192,96,0.15)', border: '1px solid rgba(32,192,96,0.35)', borderRadius: 5, padding: '4px 10px' }}>
              <CheckCircle size={11} color="#20c060" />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#20c060' }}>Verified</span>
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', height: 160, background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3a4e60" strokeWidth="1.2"><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0M5 17H3v-6l2-5h9l4 5h3v6h-2"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
        )}

        {/* Spec block — only if we have VIN-derived data. DO NOT show inferred or manual data. */}
        {specRows.length > 0 && (
          <div style={{ margin: '14px 16px 0' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#5a6e7e', marginBottom: 8 }}>Factory Specs</div>
            <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden' }}>
              {specRows.map((row, i) => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: i < specRows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', background: i % 2 === 0 ? '#0d1117' : '#0a0d14' }}>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#5a6e7e' }}>{row.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#eef4f8' }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <CheckCircle size={10} color="#20c060" />
              <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#5a6e7e' }}>VIN-decoded factory data. Cannot be edited.</span>
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ padding: '20px 16px 0' }}>
          <button
            onClick={() => onNavigate('verified-review', { wizardData })}
            style={{ width: '100%', padding: '14px', background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#030508', cursor: 'pointer' }}
          >
            Continue \u2014 Rate This Vehicle
          </button>
        </div>
      </div>
    </Layout>
  );
}
