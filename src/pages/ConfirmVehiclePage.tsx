import { ArrowLeft, ChevronRight, Edit2, Car } from 'lucide-react';
import { Layout } from '../components/Layout';
import { type OnNavigate } from '../types/navigation';
import type { SpotWizardData } from '../types/spot';

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
      <div className="max-w-lg mx-auto px-4 py-6" style={{ background: 'var(--black,#030508)' }}>
        <div className="mb-6">
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 transition-colors mb-5"
            style={{ color: 'var(--light,#a8bcc8)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm" style={{ fontFamily: "'Barlow',sans-serif" }}>Edit Details</span>
          </button>

          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    height: '6px',
                    borderRadius: '9999px',
                    width: i <= 2 ? '32px' : '16px',
                    background: i <= 2 ? 'var(--accent,#F97316)' : 'rgba(255,255,255,0.1)',
                    transition: 'all 0.2s',
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--dim,#6a7486)', fontFamily: "'Barlow',sans-serif" }}>
              Step 2 of 3 — 66%
            </span>
          </div>

          <h1
            style={{
              fontFamily: "'Rajdhani',sans-serif",
              fontWeight: 700,
              fontSize: '26px',
              color: 'var(--white,#eef4f8)',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            Is this your vehicle?
          </h1>
          <p style={{ color: 'var(--light,#a8bcc8)', fontSize: '14px', fontFamily: "'Barlow',sans-serif" }}>
            Confirm the vehicle before rating
          </p>
        </div>

        <div
          style={{
            background: 'var(--carbon-1,#0a0d14)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '14px',
            overflow: 'hidden',
            marginBottom: '24px',
          }}
        >
          <div
            className="relative aspect-video flex items-center justify-center overflow-hidden"
            style={{ background: 'var(--carbon-1,#0a0d14)', borderRadius: '12px 12px 0 0' }}
          >
            {wizardData.stockImageUrl ? (
              <>
                <img
                  src={wizardData.stockImageUrl}
                  alt={`${wizardData.year || ''} ${wizardData.make} ${wizardData.model}`}
                  className="w-full h-full object-cover photo-scan"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const fallback = document.getElementById('vehicle-image-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div
                  id="vehicle-image-fallback"
                  className="absolute inset-0 items-center justify-center"
                  style={{ display: 'none' }}
                >
                  <div className="text-center">
                    <div
                      className="w-20 h-20 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                      style={{ backgroundColor: colorHex + '33', border: `2px solid ${colorHex}66` }}
                    >
                      <Car className="w-10 h-10" style={{ color: colorHex }} />
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--dim,#6a7486)', fontFamily: "'Barlow',sans-serif" }}>
                      Image unavailable
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div
                  className="w-20 h-20 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                  style={{ backgroundColor: colorHex + '33', border: `2px solid ${colorHex}66` }}
                >
                  <Car className="w-10 h-10" style={{ color: colorHex }} />
                </div>
                <p style={{ fontSize: '12px', color: 'var(--dim,#6a7486)', fontFamily: "'Barlow',sans-serif" }}>
                  No image available
                </p>
              </div>
            )}
            <div
              className="absolute bottom-3 right-3 w-8 h-8 rounded-full border-2 border-white/30 shadow-lg"
              style={{ backgroundColor: colorHex }}
              title={wizardData.color}
            />
          </div>

          <div className="p-6">
            <h2
              style={{
                fontFamily: "'Rajdhani',sans-serif",
                fontWeight: 700,
                fontSize: '26px',
                color: 'var(--white,#eef4f8)',
                textTransform: 'uppercase',
                marginBottom: '16px',
              }}
            >
              {vehicleName || 'Unknown Vehicle'}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Make', value: wizardData.make },
                { label: 'Model', value: wizardData.model },
                { label: 'Color', value: wizardData.color },
                { label: 'Year', value: wizardData.year || '—' },
                ...(wizardData.trim ? [{ label: 'Trim', value: wizardData.trim }] : []),
                { label: 'State', value: wizardData.plateState || '—' },
                { label: 'Plate', value: wizardData.plateNumber || '—' },
              ].map(item => (
                <div
                  key={item.label}
                  style={{
                    background: 'var(--carbon-2,#0e1320)',
                    borderRadius: '8px',
                    padding: '12px',
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Barlow Condensed',sans-serif",
                      fontWeight: 700,
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      color: 'var(--dim,#6a7486)',
                      marginBottom: '4px',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {item.label}
                  </p>
                  <p
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: '13px',
                      color: 'var(--white,#eef4f8)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleEdit}
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all active:scale-95"
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent',
              color: 'var(--light,#a8bcc8)',
              fontFamily: "'Barlow Condensed',sans-serif",
              fontWeight: 700,
              fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={handleNext}
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all active:scale-95 hover:opacity-90"
            style={{
              background: 'var(--accent,#F97316)',
              color: '#030508',
              fontFamily: "'Barlow Condensed',sans-serif",
              fontWeight: 700,
              fontSize: '13px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Looks Good
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Layout>
  );
}
