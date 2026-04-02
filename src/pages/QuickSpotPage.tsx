import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useToast } from '../contexts/ToastContext';
import { getAllMakes, getModelsForMake, getYearRange, getPopularColors, getTrimsForModel } from '../lib/nhtsaApi';
import { type OnNavigate } from '../types/navigation';
import type { SpotWizardData } from '../types/spot';

interface QuickSpotPageProps {
  onNavigate: OnNavigate;
  wizardData: SpotWizardData;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#070a0f',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 8,
  padding: '11px 14px',
  fontFamily: "'Barlow', sans-serif",
  fontSize: 14,
  color: '#eef4f8',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: '#7a8e9e',
  marginBottom: 6,
  display: 'block',
};

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px',
  background: '#F97316',
  border: 'none',
  borderRadius: 8,
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: '#030508',
  cursor: 'pointer',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: 'none' as const,
  paddingRight: 36,
};

const selectWrapperStyle: React.CSSProperties = {
  position: 'relative',
};

const chevronStyle: React.CSSProperties = {
  position: 'absolute',
  right: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 14,
  height: 14,
  color: '#5a6e7e',
  pointerEvents: 'none' as const,
};

const _loadingTextStyle: React.CSSProperties = {
  fontFamily: "'Barlow Condensed', sans-serif",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase' as const,
  color: '#3a4e60',
};

export function QuickSpotPage({ onNavigate, wizardData }: QuickSpotPageProps) {
  const { showToast } = useToast();
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [trims, setTrims] = useState<string[]>([]);
  const [colors] = useState(getPopularColors());
  const [years] = useState(getYearRange());

  const [make, setMake] = useState(wizardData.make || '');
  const [model, setModel] = useState(wizardData.model || '');
  const [color, setColor] = useState(wizardData.color || '');
  const [year, setYear] = useState(wizardData.year || '');
  const [trim, setTrim] = useState(wizardData.trim || '');

  const [loadingMakes, setLoadingMakes] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingTrims, setLoadingTrims] = useState(false);

  useEffect(() => {
    getAllMakes().then(m => {
      setMakes(m);
      setLoadingMakes(false);
    });
  }, []);

  useEffect(() => {
    if (!make) {
      setModels([]);
      setModel('');
      return;
    }
    setLoadingModels(true);
    getModelsForMake(make).then(m => {
      setModels(m);
      setLoadingModels(false);
    });
  }, [make]);

  useEffect(() => {
    if (!make || !model || !year) {
      setTrims([]);
      return;
    }
    setLoadingTrims(true);
    getTrimsForModel(make, model, year).then(t => {
      setTrims(t);
      setLoadingTrims(false);
    });
  }, [make, model, year]);

  const canProceed = make.trim() && model.trim() && color.trim();

  const handleNext = () => {
    if (!canProceed) {
      showToast('Please fill in Make, Model, and Color', 'error');
      return;
    }
    const updated: SpotWizardData = {
      ...wizardData,
      make,
      model,
      color,
      year: year || undefined,
      trim: trim || undefined,
    };
    onNavigate('confirm-vehicle', { wizardData: updated });
  };

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>
      <div style={{ maxWidth: 512, margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => onNavigate('scan')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase' as const,
              color: '#5a6e7e',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              marginBottom: 20,
            }}
          >
            <ArrowLeft style={{ width: 16, height: 16 }} />
            <span>Back</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  style={{
                    height: 6,
                    borderRadius: 9999,
                    transition: 'all 0.3s',
                    ...(i === 1
                      ? { width: 32, background: '#F97316' }
                      : { width: 16, background: 'rgba(255,255,255,0.08)' }),
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: 12, color: '#5a6e7e' }}>Step 1 of 3 — 33%</span>
          </div>

          <h1 style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: '#eef4f8',
            textTransform: 'uppercase' as const,
            letterSpacing: '-0.01em',
            marginBottom: 4,
          }}>
            YOU'RE THE FIRST TO SPOT!
          </h1>
          <p style={{ color: '#5a6e7e', fontSize: 14, marginBottom: 8 }}>
            Fill in what you know to earn bonus points
          </p>
          <p style={{ fontSize: 12, color: '#5a6e7e', marginBottom: 12 }}>
            +5 RP for make/model · +3 RP for color · +2 RP for year
          </p>
          {wizardData.plateState && wizardData.plateNumber && (
            <div style={{
              background: '#0a0d14',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 16,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.15em',
                color: '#F97316',
                fontWeight: 700,
                fontSize: 18,
                textTransform: 'uppercase' as const,
              }}>
                {wizardData.plateState} {wizardData.plateNumber}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
          {/* Make */}
          <div>
            <label style={labelStyle}>
              Make <span style={{ color: '#f87171' }}>*</span>
            </label>
            <div style={selectWrapperStyle}>
              <select
                value={make}
                onChange={(e) => { setMake(e.target.value); setModel(''); setTrim(''); }}
                disabled={loadingMakes}
                style={{ ...selectStyle, opacity: loadingMakes ? 0.5 : 1 }}
              >
                <option value="">{loadingMakes ? 'Loading...' : 'Select make...'}</option>
                {makes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown style={chevronStyle} />
            </div>
          </div>

          {/* Model */}
          <div>
            <label style={labelStyle}>
              Model <span style={{ color: '#f87171' }}>*</span>
            </label>
            <div style={selectWrapperStyle}>
              <select
                value={model}
                onChange={(e) => { setModel(e.target.value); setTrim(''); }}
                disabled={!make || loadingModels}
                style={{ ...selectStyle, opacity: (!make || loadingModels) ? 0.5 : 1 }}
              >
                <option value="">{loadingModels ? 'Loading...' : !make ? 'Select make first' : 'Select model...'}</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown style={chevronStyle} />
            </div>
          </div>

          {/* Color */}
          <div>
            <label style={labelStyle}>
              Color <span style={{ color: '#f87171' }}>*</span>
            </label>
            <div style={selectWrapperStyle}>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={selectStyle}
              >
                <option value="">Select color...</option>
                {colors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown style={chevronStyle} />
            </div>
          </div>

          {/* Year + Trim row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>
                Year <span style={{ color: '#5a6e7e' }}>(optional)</span>
              </label>
              <div style={selectWrapperStyle}>
                <select
                  value={year}
                  onChange={(e) => { setYear(e.target.value); setTrim(''); }}
                  style={selectStyle}
                >
                  <option value="">Any year</option>
                  {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
                <ChevronDown style={chevronStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                Trim <span style={{ color: '#5a6e7e' }}>(optional)</span>
              </label>
              <div style={selectWrapperStyle}>
                <select
                  value={trim}
                  onChange={(e) => setTrim(e.target.value)}
                  disabled={!year || !model || loadingTrims}
                  style={{ ...selectStyle, opacity: (!year || !model || loadingTrims) ? 0.5 : 1 }}
                >
                  <option value="">{loadingTrims ? 'Loading...' : !year ? 'Select year first' : trims.length === 0 ? 'No trims found' : 'Select trim...'}</option>
                  {trims.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown style={chevronStyle} />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleNext}
          disabled={!canProceed}
          style={{
            ...primaryBtnStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            ...(canProceed
              ? { background: '#F97316', color: '#030508' }
              : { background: 'rgba(255,255,255,0.08)', color: '#5a6e7e', cursor: 'not-allowed' }),
          }}
        >
          Next: Rate It
          <ChevronRight style={{ width: 18, height: 18 }} />
        </button>
      </div>
    </Layout>
  );
}
