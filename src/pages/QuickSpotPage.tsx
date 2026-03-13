import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useToast } from '../contexts/ToastContext';
import { getAllMakes, getModelsForMake, getYearRange, getPopularColors, getTrimsForModel } from '../lib/nhtsaApi';
import { getVehicleImageUrl } from '../lib/carImageryApi';
import { type OnNavigate } from '../types/navigation';
import type { SpotWizardData } from '../types/spot';

interface QuickSpotPageProps {
  onNavigate: OnNavigate;
  wizardData: SpotWizardData;
}

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
  const [submitting, setSubmitting] = useState(false);

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

  const handleNext = async () => {
    if (!canProceed) {
      showToast('Please fill in Make, Model, and Color', 'error');
      return;
    }

    setSubmitting(true);

    let stockImageUrl: string | undefined;
    try {
      const imageUrl = await getVehicleImageUrl(make, model, year || undefined);
      if (imageUrl) stockImageUrl = imageUrl;
    } catch {
      // Not critical
    }

    const updated: SpotWizardData = {
      ...wizardData,
      make,
      model,
      color,
      year: year || undefined,
      trim: trim || undefined,
      stockImageUrl,
    };

    setSubmitting(false);
    onNavigate('confirm-vehicle', { wizardData: updated });
  };

  const selectStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'var(--white,#eef4f8)',
    width: '100%',
    padding: '14px 40px 14px 16px',
    appearance: 'none' as const,
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Barlow Condensed',sans-serif",
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    fontSize: '11px',
    letterSpacing: '0.15em',
    color: 'var(--light,#a8bcc8)',
    display: 'block',
    marginBottom: '8px',
  };

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>
      <div className="max-w-lg mx-auto px-4 py-6" style={{ background: 'var(--black,#030508)', minHeight: '100%' }}>
        <div className="mb-6">
          <button
            onClick={() => onNavigate('scan')}
            className="flex items-center gap-2 transition-colors mb-5"
            style={{ color: 'var(--dim,#6a7486)', fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 700, textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.1em' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === 1 ? '32px' : '16px',
                    background: i === 1 ? 'var(--accent,#F97316)' : 'rgba(255,255,255,0.1)',
                  }}
                />
              ))}
            </div>
            <span className="text-xs" style={{ color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow',sans-serif" }}>Step 1 of 3 — 33%</span>
          </div>

          <h1 style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: '24px', color: 'var(--white,#eef4f8)', textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: '4px' }}>
            YOU'RE THE FIRST TO SPOT!
          </h1>
          <p className="text-sm mb-2" style={{ color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow',sans-serif" }}>
            Fill in what you know to earn bonus points
          </p>
          <p className="text-xs mb-3" style={{ color: 'var(--light,#a8bcc8)', fontFamily: "'Barlow',sans-serif" }}>
            +5 RP for make/model · +3 RP for color · +2 RP for year
          </p>
          {wizardData.plateState && wizardData.plateNumber && (
            <div className="inline-flex items-center gap-2 px-4 py-3 mb-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", letterSpacing: '0.15em', color: 'var(--accent,#F97316)', fontSize: '18px', textTransform: 'uppercase' }}>
                {wizardData.plateState} {wizardData.plateNumber}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <label style={labelStyle}>
              Make <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="relative">
              <select
                value={make}
                onChange={(e) => { setMake(e.target.value); setModel(''); setTrim(''); }}
                disabled={loadingMakes}
                style={{ ...selectStyle, opacity: loadingMakes ? 0.5 : 1 }}
              >
                <option value="">{loadingMakes ? 'Loading...' : 'Select make...'}</option>
                {makes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--dim,#6a7486)' }} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              Model <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="relative">
              <select
                value={model}
                onChange={(e) => { setModel(e.target.value); setTrim(''); }}
                disabled={!make || loadingModels}
                style={{ ...selectStyle, opacity: (!make || loadingModels) ? 0.5 : 1 }}
              >
                <option value="">{loadingModels ? 'Loading...' : !make ? 'Select make first' : 'Select model...'}</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--dim,#6a7486)' }} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>
              Color <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div className="relative">
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={selectStyle}
              >
                <option value="">Select color...</option>
                {colors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--dim,#6a7486)' }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>
                Year <span style={{ color: 'var(--dim,#6a7486)' }}>(optional)</span>
              </label>
              <div className="relative">
                <select
                  value={year}
                  onChange={(e) => { setYear(e.target.value); setTrim(''); }}
                  style={selectStyle}
                >
                  <option value="">Any year</option>
                  {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--dim,#6a7486)' }} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                Trim <span style={{ color: 'var(--dim,#6a7486)' }}>(optional)</span>
              </label>
              <div className="relative">
                <select
                  value={trim}
                  onChange={(e) => setTrim(e.target.value)}
                  disabled={!year || !model || loadingTrims}
                  style={{ ...selectStyle, opacity: (!year || !model || loadingTrims) ? 0.5 : 1 }}
                >
                  <option value="">{loadingTrims ? 'Loading...' : !year ? 'Select year first' : trims.length === 0 ? 'No trims found' : 'Select trim...'}</option>
                  {trims.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--dim,#6a7486)' }} />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleNext}
          disabled={!canProceed || submitting}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-xl transition-all active:scale-95 disabled:cursor-not-allowed"
          style={
            canProceed && !submitting
              ? {
                  background: 'var(--accent,#F97316)',
                  color: '#030508',
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
                  fontSize: '14px',
                  letterSpacing: '0.08em',
                }
              : {
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--dim,#6a7486)',
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
                  fontSize: '14px',
                  letterSpacing: '0.08em',
                }
          }
        >
          {submitting ? 'Loading...' : 'Next: Confirm'}
          {!submitting && <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
    </Layout>
  );
}
