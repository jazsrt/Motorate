import { ArrowLeft, ChevronRight, Edit2, Car } from 'lucide-react';
import { Layout } from '../components/Layout';
import { type OnNavigate } from '../types/navigation';
import type { SpotWizardData } from '../types/spot';

const primaryBtnStyle: React.CSSProperties = { width: '100%', padding: '13px', background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#000', cursor: 'pointer' };

interface ConfirmVehiclePageProps {
  onNavigate: OnNavigate;
  wizardData: SpotWizardData;
}

export function ConfirmVehiclePage({ onNavigate, wizardData }: ConfirmVehiclePageProps) {
  const vehicleName = [wizardData.year, wizardData.make, wizardData.model]
    .filter(Boolean)
    .join(' ');

  const handleNext = () => {
    onNavigate('quick-spot-review', { wizardData });
  };

  const handleEdit = () => {
    onNavigate('quick-spot', { wizardData });
  };

  const colorMap: Record<string, string> = {
    black: '#1a1a1a', white: '#f5f5f5', silver: '#c0c0c0', gray: '#808080',
    red: '#dc2626', blue: '#F97316', green: '#16a34a', yellow: '#eab308',
    orange: '#ea580c', brown: '#92400e', gold: '#d97706', beige: '#d2b48c',
    purple: '#7c3aed', pink: '#ec4899', teal: '#0d9488', burgundy: '#800020',
    tan: '#d2b48c', bronze: '#cd7f32', copper: '#b87333', chrome: '#dce0e5',
  };

  const colorHex = colorMap[wizardData.color?.toLowerCase() || ''] || '#888';

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>
      <div style={{ maxWidth: 512, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={handleEdit}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5a6e7e' }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            <span>Edit Details</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    height: 6,
                    borderRadius: 9999,
                    width: i <= 2 ? 32 : 16,
                    background: i <= 2 ? '#F97316' : 'rgba(255,255,255,0.06)',
                  }}
                />
              ))}
            </div>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5a6e7e' }}>Step 2 of 3 — 66%</span>
          </div>

          <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#eef4f8', margin: '4px 0' }}>
            Does this look right?
          </h1>
          <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5a6e7e', margin: 0 }}>Confirm the vehicle before rating</p>
        </div>

        <div style={{ background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ position: 'relative', aspectRatio: '16/9', background: 'linear-gradient(135deg, #0e1320, #070a0f)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {wizardData.stockImageUrl ? (
              <img
                src={wizardData.stockImageUrl}
                alt={vehicleName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{ textAlign: 'center' }}>
                <Car style={{ width: 48, height: 48, color: '#5a6e7e', marginBottom: 8 }} />
                <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3a4e60', margin: 0 }}>No image available</p>
              </div>
            )}
          </div>

          <div style={{ padding: 24 }}>
            <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', marginBottom: 16, marginTop: 0 }}>
              {vehicleName || 'Unknown Vehicle'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Make', value: wizardData.make },
                { label: 'Model', value: wizardData.model },
                { label: 'Color', value: wizardData.color },
                { label: 'Year', value: wizardData.year || '—' },
                ...(wizardData.trim ? [{ label: 'Trim', value: wizardData.trim }] : []),
                { label: 'State', value: wizardData.plateState || '—' },
                { label: 'Plate', value: wizardData.plateNumber || '—' },
              ].map(item => (
                <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12 }}>
                  <p style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a8e9e', marginBottom: 4, marginTop: 0 }}>{item.label}</p>
                  <p style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, color: '#eef4f8', textTransform: 'capitalize', margin: 0, fontSize: 15 }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            onClick={handleEdit}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5a6e7e', cursor: 'pointer' }}
          >
            <Edit2 style={{ width: 16, height: 16 }} />
            Edit
          </button>
          <button
            onClick={handleNext}
            style={{ ...primaryBtnStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            Looks Good
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>
    </Layout>
  );
}
