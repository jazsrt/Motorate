import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react';
import { VEHICLE_MAKES, VEHICLE_MODELS, VEHICLE_COLORS } from '../data/vehicleData';

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
const years = Array.from({ length: 40 }, (_, i) => currentYear - i);

const labelStyle: React.CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#7a8e9e', marginBottom: 6, display: 'block' };
const inputStyle: React.CSSProperties = { width: '100%', background: '#070a0f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '12px 14px', fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#eef4f8', outline: 'none', boxSizing: 'border-box' as const };
const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none' as const, paddingRight: 36, cursor: 'pointer' };

export function PlateNotFound({ state, plateNumber, onCancel, onCreate, loading = false }: PlateNotFoundProps) {
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number | null>(null);
  const [color, setColor] = useState('');
  const [trim, setTrim] = useState('');
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  const stateCode = state.length === 2 ? state : state.substring(0, 2).toUpperCase();
  const canSubmit = make && model && color;

  useEffect(() => {
    if (make) {
      setAvailableModels(VEHICLE_MODELS[make] || []);
      setModel('');
    } else {
      setAvailableModels([]);
    }
  }, [make]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    onCreate({ make, model, year, color, trim: trim || undefined });
  };

  return (
    <div style={{ maxWidth: 512, margin: '0 auto', padding: '24px 16px' }}>
      {/* Back + progress */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={onCancel}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5a6e7e' }}
        >
          <ArrowLeft style={{ width: 16, height: 16 }} />
          <span>Back</span>
        </button>

        {/* Progress dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 6, borderRadius: 9999, width: i === 1 ? 32 : 16, background: i === 1 ? '#F97316' : 'rgba(255,255,255,0.06)' }} />
          ))}
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#5a6e7e', marginLeft: 4 }}>Step 1 of 3</span>
        </div>

        {/* Title */}
        <h1 style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, fontWeight: 700, color: '#eef4f8', margin: '0 0 6px', textTransform: 'uppercase' }}>
          You're the first to spot!
        </h1>
        <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#5a6e7e', margin: 0 }}>
          Tell us what vehicle this plate belongs to.
        </p>
      </div>

      {/* Plate display */}
      <div style={{ background: '#0a0d14', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#5a6e7e' }}>
          {stateCode}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 600, color: '#F97316', letterSpacing: '0.15em' }}>
          {plateNumber.toUpperCase()}
        </div>
      </div>

      {/* Form: 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {/* Make */}
        <div>
          <label style={labelStyle}>Make *</label>
          <div style={{ position: 'relative' }}>
            <select value={make} onChange={e => setMake(e.target.value)} style={selectStyle}>
              <option value="">Make</option>
              {VEHICLE_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#5a6e7e', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Model */}
        <div>
          <label style={labelStyle}>Model *</label>
          <div style={{ position: 'relative' }}>
            <select value={model} onChange={e => setModel(e.target.value)} disabled={!make} style={{ ...selectStyle, opacity: make ? 1 : 0.5 }}>
              <option value="">{make ? 'Model' : 'Select make first'}</option>
              {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#5a6e7e', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Color */}
        <div>
          <label style={labelStyle}>Color *</label>
          <div style={{ position: 'relative' }}>
            <select value={color} onChange={e => setColor(e.target.value)} style={selectStyle}>
              <option value="">Color</option>
              {VEHICLE_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#5a6e7e', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Year */}
        <div>
          <label style={labelStyle}>Year</label>
          <div style={{ position: 'relative' }}>
            <select value={year ?? ''} onChange={e => setYear(e.target.value ? Number(e.target.value) : null)} style={selectStyle}>
              <option value="">Year</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#5a6e7e', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {/* Trim */}
      <div style={{ marginBottom: 28 }}>
        <label style={labelStyle}>Trim <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 'normal' }}>(optional)</span></label>
        <input
          type="text"
          value={trim}
          onChange={e => setTrim(e.target.value)}
          placeholder="e.g. Sport, SRT, Limited"
          style={inputStyle}
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        style={{
          width: '100%', padding: '14px',
          background: canSubmit && !loading ? 'linear-gradient(135deg, #f97316, #f59e0b)' : 'rgba(255,255,255,0.08)',
          border: 'none', borderRadius: 8,
          fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          color: canSubmit && !loading ? '#000' : '#5a6e7e',
          cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: loading ? 0.5 : 1,
        }}
      >
        {loading ? (
          <div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        ) : null}
        {loading ? 'Saving...' : 'Next: Confirm'}
        {!loading && <ArrowRight size={16} />}
      </button>
    </div>
  );
}
