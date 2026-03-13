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
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-6">
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 text-secondary hover:text-primary transition-colors mb-5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Edit Details</span>
          </button>

          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i <= 2 ? 'w-8 bg-accent-primary' : 'w-4 bg-surfacehighlight'}`}
                />
              ))}
            </div>
            <span className="text-xs text-secondary">Step 2 of 3 — 66%</span>
          </div>

          <h1 className="text-2xl font-heading font-bold uppercase tracking-tight text-primary mb-1">
            Is this your vehicle?
          </h1>
          <p className="text-secondary text-sm">Confirm the vehicle before rating</p>
        </div>

        <div className="bg-surface border border-surfacehighlight rounded-2xl overflow-hidden mb-6">
          <div className="relative aspect-video bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center overflow-hidden">
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
                    <p className="text-xs text-secondary">Image unavailable</p>
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
                <p className="text-xs text-secondary">No image available</p>
              </div>
            )}
            <div
              className="absolute bottom-3 right-3 w-8 h-8 rounded-full border-2 border-white/30 shadow-lg"
              style={{ backgroundColor: colorHex }}
              title={wizardData.color}
            />
          </div>

          <div className="p-6">
            <h2 className="text-2xl font-heading font-bold uppercase tracking-tight text-primary mb-4">
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
                <div key={item.label} className="bg-surfacehighlight rounded-xl p-3">
                  <p className="text-xs text-secondary uppercase tracking-wider font-bold mb-1">{item.label}</p>
                  <p className="font-bold text-primary capitalize">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleEdit}
            className="flex items-center justify-center gap-2 py-3.5 bg-surface border border-surfacehighlight hover:bg-surfacehighlight rounded-xl font-heading font-bold uppercase tracking-tight transition-all active:scale-95"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={handleNext}
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-heading font-bold uppercase tracking-tight transition-all active:scale-95 text-white hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
          >
            Looks Good
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Layout>
  );
}
