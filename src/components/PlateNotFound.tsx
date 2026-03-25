import { useState, useEffect } from 'react';
import { AlertCircle, Car, ArrowRight, ArrowLeft, Check, Key } from 'lucide-react';
import { AutocompleteInput } from './AutocompleteInput';
import { VEHICLE_MAKES, VEHICLE_MODELS, VEHICLE_COLORS } from '../data/vehicleData';
import { getVehicleImageUrl } from '../lib/carImageryApi';

interface PlateNotFoundProps {
  state: string;
  plateNumber: string;
  onCancel: () => void;
  onCreate: (vehicleData: CreateVehicleData) => void;
  onClaimVehicle?: () => void;
  loading?: boolean;
}

export interface CreateVehicleData {
  make: string;
  model: string;
  year: number | null;
  color: string;
  trim?: string;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

export function PlateNotFound({ state, plateNumber, onCancel, onCreate, onClaimVehicle, loading = false }: PlateNotFoundProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 2;

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number | null>(null);
  const [trim, setTrim] = useState('');
  const [color, setColor] = useState('');

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [stockImageUrl, setStockImageUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  const stateCode = state.length === 2 ? state : state.substring(0, 2).toUpperCase();

  useEffect(() => {
    if (make) {
      setAvailableModels(VEHICLE_MODELS[make] || []);
      setModel('');
      setTrim('');
    } else {
      setAvailableModels([]);
    }
  }, [make]);

  useEffect(() => {
    if (make && model) {
      let cancelled = false;
      setStockImageUrl(null);
      getVehicleImageUrl(make, model, year ?? undefined).then(url => {
        if (!cancelled) setStockImageUrl(url);
      }).catch(() => {});
      return () => { cancelled = true; };
    } else {
      setStockImageUrl(null);
    }
  }, [make, model, year]);

  const canProceedStep1 = make && model && color;

  const handleNext = () => {
    if (step === 1 && !canProceedStep1) {
      setError('Please select Make, Model, and Color to continue');
      return;
    }
    setError('');
    setStep(step + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = () => {
    if (!canProceedStep1) {
      setError('Please complete all required fields');
      return;
    }
    onCreate({
      make,
      model,
      year,
      color,
      trim: trim || undefined,
    });
  };

  const progressPct = Math.round((step / totalSteps) * 100);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
      <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 24px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#eef4f8', margin: '0 0 4px', textTransform: 'uppercase' }}>
            Spot This Plate
          </h2>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#9CA3AF', margin: 0 }}>Be the first to add this vehicle!</p>
        </div>

        {/* Progress */}
        <div style={{ padding: '12px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6B7280' }}>Step {step} of {totalSteps}</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#F97316' }}>{progressPct}%</span>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 9999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: '#F97316', borderRadius: 9999, transition: 'width 0.4s ease-out' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: step >= 1 ? '#F97316' : '#6B7280' }}>
              {step > 1 ? <Check style={{ width: 14, height: 14 }} /> : <Car style={{ width: 14, height: 14 }} />}
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Vehicle</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: step >= 2 ? '#F97316' : '#6B7280' }}>
              <Check style={{ width: 14, height: 14 }} />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Confirm</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ margin: '0 24px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <AlertCircle style={{ width: 18, height: 18, color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#ef4444', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Step 1: Vehicle Identity */}
        {step === 1 && (
          <div style={{ padding: '0 24px 24px' }}>
            {/* Plate display */}
            <div style={{ background: '#030508', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 10, padding: 20, marginBottom: 20, textAlign: 'center' }}>
              <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#F97316', display: 'block', marginBottom: 12 }}>
                License Plate
              </label>
              <div style={{ display: 'inline-block', background: '#fff', borderRadius: 6, padding: '12px 28px', border: '3px solid #222' }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#666', marginBottom: 2, textAlign: 'left' }}>{stateCode}</div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 700, color: '#000', letterSpacing: '0.12em', textAlign: 'center' }}>
                  {plateNumber.toUpperCase()}
                </div>
              </div>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#6B7280', marginTop: 10, marginBottom: 0 }}>From your search</p>
            </div>

            {/* Vehicle form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <AutocompleteInput label="Make" placeholder="Type make..." value={make} onChange={setMake} options={VEHICLE_MAKES} required />
              <AutocompleteInput label="Model" placeholder="Type model..." value={model} onChange={setModel} options={availableModels} required disabled={!make} />
              <AutocompleteInput label="Year" placeholder="Type year..." value={year ? String(year) : ''} onChange={v => setYear(v ? Number(v) : null)} options={years.map(String)} inputMode="numeric" />
              <AutocompleteInput label="Color" placeholder="Type color..." value={color} onChange={setColor} options={VEHICLE_COLORS} required />
            </div>

            {/* Stock image */}
            {stockImageUrl && (
              <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }}>
                <img src={stockImageUrl} alt={`${make} ${model}`} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block', background: '#030508' }} />
                <div style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.04)', textAlign: 'center' }}>
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#6B7280' }}>Stock reference image</span>
                </div>
              </div>
            )}

            {/* Trim */}
            <div>
              <label style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#6B7280', display: 'block', marginBottom: 6 }}>
                Trim Level <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(Optional)</span>
              </label>
              <input
                type="text"
                value={trim}
                onChange={(e) => setTrim(e.target.value)}
                placeholder="e.g., EX-L, Sport, Limited..."
                style={{ width: '100%', padding: '11px 14px', background: '#030508', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#eef4f8', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
        )}

        {/* Step 2: Confirm */}
        {step === 2 && (
          <div style={{ padding: '0 24px 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', margin: '0 0 4px', textTransform: 'uppercase' }}>Confirm Details</h3>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#9CA3AF', margin: 0 }}>Does this look right?</p>
            </div>

            <div style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 20, marginBottom: 16 }}>
              {/* Plate */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <div style={{ background: '#fff', borderRadius: 6, padding: '10px 24px', border: '3px solid #222' }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#666', marginBottom: 2, textAlign: 'left' }}>{stateCode}</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: '#000', letterSpacing: '0.12em', textAlign: 'center' }}>
                    {plateNumber.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Stock image */}
              {stockImageUrl && (
                <div style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                  <img src={stockImageUrl} alt={`${make} ${model}`} style={{ width: '100%', height: 128, objectFit: 'cover', display: 'block', background: '#030508' }} />
                </div>
              )}

              {/* Vehicle name */}
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <h4 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', margin: 0 }}>
                  {year && `${year} `}{make} {model}
                </h4>
                {trim && <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#9CA3AF', margin: '4px 0 0' }}>{trim}</p>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <span style={{ padding: '4px 14px', background: '#030508', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, fontFamily: "'Barlow', sans-serif", fontSize: 13, fontWeight: 600, color: '#eef4f8' }}>{color}</span>
              </div>
            </div>

            {/* Claim prompt */}
            {onClaimVehicle && (
              <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#F97316', margin: '0 0 10px' }}>Is this your vehicle?</p>
                <button
                  onClick={onClaimVehicle}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#000', cursor: 'pointer' }}
                >
                  <Key style={{ width: 14, height: 14 }} />
                  Claim Instead
                </button>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 16px', background: '#030508', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#eef4f8', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
            >
              <ArrowLeft style={{ width: 14, height: 14 }} />
              Back
            </button>
          )}

          {step === 1 && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              style={{ flex: 1, padding: '11px', background: '#030508', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#9CA3AF', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
            >
              Cancel
            </button>
          )}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#000', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
            >
              Next
              <ArrowRight style={{ width: 14, height: 14 }} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px', background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#000', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
            >
              {loading ? (
                <div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : (
                <Check style={{ width: 14, height: 14 }} />
              )}
              {loading ? 'Saving...' : 'Confirm & Continue'}
              {!loading && <ArrowRight style={{ width: 14, height: 14 }} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
