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

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-6">
          <button
            onClick={() => onNavigate('scan')}
            className="flex items-center gap-2 text-secondary hover:text-primary transition-colors mb-5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === 1 ? 'w-8' : 'w-4 bg-surfacehighlight'}`}
                  style={i === 1 ? { background: 'linear-gradient(90deg, #f97316, #f59e0b)' } : {}}
                />
              ))}
            </div>
            <span className="text-xs text-secondary">Step 1 of 3 — 33%</span>
          </div>

          <h1 className="text-2xl font-heading font-black uppercase tracking-tight text-primary mb-1">
            YOU'RE THE FIRST TO SPOT!
          </h1>
          <p className="text-secondary text-sm mb-2">
            Fill in what you know to earn bonus points
          </p>
          <p className="text-xs text-secondary mb-3">
            +5 RP for make/model · +3 RP for color · +2 RP for year
          </p>
          {wizardData.plateState && wizardData.plateNumber && (
            <div className="bg-surface border border-surfacehighlight rounded-xl px-4 py-3 mb-4 inline-flex items-center gap-2">
              <span className="font-mono tracking-widest text-accent-primary font-bold text-lg uppercase">
                {wizardData.plateState} {wizardData.plateNumber}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">
              Make <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <select
                value={make}
                onChange={(e) => { setMake(e.target.value); setModel(''); setTrim(''); }}
                disabled={loadingMakes}
                className="w-full bg-surface border border-surfacehighlight rounded-xl px-4 py-3.5 text-primary appearance-none focus:outline-none focus:border-accent-primary transition-colors pr-10 disabled:opacity-50"
              >
                <option value="">{loadingMakes ? 'Loading...' : 'Select make...'}</option>
                {makes.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">
              Model <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <select
                value={model}
                onChange={(e) => { setModel(e.target.value); setTrim(''); }}
                disabled={!make || loadingModels}
                className="w-full bg-surface border border-surfacehighlight rounded-xl px-4 py-3.5 text-primary appearance-none focus:outline-none focus:border-accent-primary transition-colors pr-10 disabled:opacity-50"
              >
                <option value="">{loadingModels ? 'Loading...' : !make ? 'Select make first' : 'Select model...'}</option>
                {models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">
              Color <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full bg-surface border border-surfacehighlight rounded-xl px-4 py-3.5 text-primary appearance-none focus:outline-none focus:border-accent-primary transition-colors pr-10"
              >
                <option value="">Select color...</option>
                {colors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">
                Year <span className="text-neutral-600">(optional)</span>
              </label>
              <div className="relative">
                <select
                  value={year}
                  onChange={(e) => { setYear(e.target.value); setTrim(''); }}
                  className="w-full bg-surface border border-surfacehighlight rounded-xl px-4 py-3.5 text-primary appearance-none focus:outline-none focus:border-accent-primary transition-colors pr-10"
                >
                  <option value="">Any year</option>
                  {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">
                Trim <span className="text-neutral-600">(optional)</span>
              </label>
              <div className="relative">
                <select
                  value={trim}
                  onChange={(e) => setTrim(e.target.value)}
                  disabled={!year || !model || loadingTrims}
                  className="w-full bg-surface border border-surfacehighlight rounded-xl px-4 py-3.5 text-primary appearance-none focus:outline-none focus:border-accent-primary transition-colors pr-10 disabled:opacity-50"
                >
                  <option value="">{loadingTrims ? 'Loading...' : !year ? 'Select year first' : trims.length === 0 ? 'No trims found' : 'Select trim...'}</option>
                  {trims.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleNext}
          disabled={!canProceed || submitting}
          className="w-full flex items-center justify-center gap-3 py-4 disabled:bg-surfacehighlight disabled:text-secondary rounded-xl font-heading font-bold uppercase tracking-tight text-lg transition-all active:scale-95 disabled:cursor-not-allowed text-white"
          style={canProceed && !submitting ? { background: 'linear-gradient(135deg, #f97316, #f59e0b)' } : {}}
        >
          {submitting ? 'Loading...' : 'Next: Confirm'}
          {!submitting && <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
    </Layout>
  );
}
