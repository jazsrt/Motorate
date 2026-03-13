import { useState, useEffect } from 'react';
import { AlertCircle, Car, Palette, Star, ArrowRight, ArrowLeft, Check, Key, Eye, Volume2, Flag } from 'lucide-react';
import { StarRatingInput } from './StarRatingInput';
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
  ratings?: {
    look: number;
    sound: number;
    condition: number;
    driving: number;
  };
  comments?: string;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

// State-specific plate colors
const STATE_PLATE_COLORS: Record<string, { bg: string; text: string }> = {
  CA: { bg: 'bg-white', text: 'text-black' },
  NY: { bg: 'bg-yellow-400', text: 'text-black' },
  TX: { bg: 'bg-white', text: 'text-black' },
  FL: { bg: 'bg-orange-500', text: 'text-white' },
  IL: { bg: 'bg-white', text: 'text-orange-600' },
  DEFAULT: { bg: 'bg-white', text: 'text-black' },
};

export function PlateNotFound({ state, plateNumber, onCancel, onCreate, onClaimVehicle, loading = false }: PlateNotFoundProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Form data
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number | null>(null);
  const [trim, setTrim] = useState('');
  const [color, setColor] = useState('');

  // Review data
  const [lookRating, setLookRating] = useState(0);
  const [soundRating, setSoundRating] = useState(0);
  const [conditionRating, setConditionRating] = useState(0);
  const [drivingRating, setDrivingRating] = useState(0);
  const [comments, setComments] = useState('');

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [error, setError] = useState('');

  // Get state code from state name
  const stateCode = state.length === 2 ? state : state.substring(0, 2).toUpperCase();
  const plateColors = STATE_PLATE_COLORS[stateCode] || STATE_PLATE_COLORS.DEFAULT;

  // Update available models when make changes
  useEffect(() => {
    if (make) {
      setAvailableModels(VEHICLE_MODELS[make] || []);
      setModel(''); // Reset model when make changes
      setTrim(''); // Reset trim when make changes
    } else {
      setAvailableModels([]);
    }
  }, [make]);

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

    const hasRatings = lookRating > 0 || soundRating > 0 || conditionRating > 0 || drivingRating > 0;

    onCreate({
      make,
      model,
      year,
      color,
      trim: trim || undefined,
      ratings: hasRatings ? {
        look: lookRating,
        sound: soundRating,
        condition: conditionRating,
        driving: drivingRating
      } : undefined,
      comments: comments.trim() || undefined
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-surface border border-surfacehighlight rounded-2xl overflow-hidden shadow-2xl">
        {/* Header with Progress Bar */}
        <div className="bg-gradient-to-r from-[rgba(249,115,22,0.12)] to-[rgba(245,158,11,0.08)] border-b border-surfacehighlight">
          <div className="p-4 text-center">
            <h2 className="text-2xl font-heading font-bold uppercase tracking-tight mb-1">
              Spot This Plate
            </h2>
            <p className="text-secondary text-sm">Be the first to add this vehicle!</p>
          </div>

          {/* Progress Bar */}
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-secondary">Step {step} of {totalSteps}</span>
              <span className="text-xs font-bold text-accent-2">{Math.round((step / totalSteps) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-surfacehighlight rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{ width: `${(step / totalSteps) * 100}%`, background: 'linear-gradient(90deg, #f97316, #f59e0b)' }}
              />
            </div>

            {/* Step Labels */}
            <div className="flex justify-between mt-2">
              <div className={`flex items-center gap-1 ${step >= 1 ? 'text-accent-2' : 'text-secondary/50'}`}>
                {step > 1 ? <Check className="w-3.5 h-3.5" /> : <Car className="w-3.5 h-3.5" />}
                <span className="text-xs font-bold">Vehicle</span>
              </div>
              <div className={`flex items-center gap-1 ${step >= 2 ? 'text-accent-2' : 'text-secondary/50'}`}>
                {step > 2 ? <Check className="w-3.5 h-3.5" /> : <Palette className="w-3.5 h-3.5" />}
                <span className="text-xs font-bold">Confirm</span>
              </div>
              <div className={`flex items-center gap-1 ${step >= 3 ? 'text-accent-2' : 'text-secondary/50'}`}>
                <Star className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">Rate</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-6 bg-status-danger/20 border border-status-danger rounded-xl p-4 flex items-start gap-3 animate-shake">
            <AlertCircle className="w-5 h-5 text-status-danger flex-shrink-0 mt-0.5" />
            <p className="text-sm text-status-danger">{error}</p>
          </div>
        )}

        {/* Step 1: License Plate & Vehicle Identity */}
        {step === 1 && (
          <div className="p-6 space-y-5">
            {/* License Plate Display - FIRST and PROMINENT */}
            <div className="bg-gradient-to-br from-[rgba(249,115,22,0.1)] to-[rgba(245,158,11,0.06)] rounded-2xl p-5 border-2 border-[rgba(249,115,22,0.3)]">
              <label className="block text-xs font-heading font-bold uppercase tracking-tight text-accent-2 mb-3 text-center">
                License Plate *
              </label>
              <div className="flex justify-center">
                <div className={`relative ${plateColors.bg} rounded-lg px-8 py-4 shadow-xl border-4 border-gray-800`}>
                  <div className="absolute top-1.5 left-3 text-[10px] text-gray-600 font-bold">{stateCode}</div>
                  <div className={`text-3xl font-mono font-extrabold ${plateColors.text} tracking-widest text-center`}>
                    {plateNumber.toUpperCase()}
                  </div>
                </div>
              </div>
              <p className="text-xs text-center text-secondary mt-3">From your search</p>
            </div>

            {/* Compact Vehicle Selection Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Make */}
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-tight text-secondary mb-1.5">
                  Make *
                </label>
                <select
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  className="w-full px-3 py-2.5 bg-surfacehighlight border border-surfacehighlight rounded-xl focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all text-sm"
                  required
                >
                  <option value="">Select...</option>
                  {VEHICLE_MAKES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Model */}
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-tight text-secondary mb-1.5">
                  Model *
                </label>
                {make ? (
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2.5 bg-surfacehighlight border border-surfacehighlight rounded-xl focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all text-sm"
                    required
                  >
                    <option value="">Select...</option>
                    {availableModels.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2.5 bg-surfacehighlight/50 border border-surfacehighlight rounded-xl text-secondary/50 italic text-sm">
                    Select make first
                  </div>
                )}
              </div>

              {/* Year */}
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-tight text-secondary mb-1.5">
                  Year
                </label>
                <select
                  value={year || ''}
                  onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2.5 bg-surfacehighlight border border-surfacehighlight rounded-xl focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all text-sm"
                >
                  <option value="">Select...</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-heading font-bold uppercase tracking-tight text-secondary mb-1.5">
                  Color *
                </label>
                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-3 py-2.5 bg-surfacehighlight border border-surfacehighlight rounded-xl focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all text-sm"
                  required
                >
                  <option value="">Select...</option>
                  {VEHICLE_COLORS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Trim - Optional */}
            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-tight text-secondary mb-1.5">
                Trim Level <span className="text-secondary/50">(Optional)</span>
              </label>
              <input
                type="text"
                value={trim}
                onChange={(e) => setTrim(e.target.value)}
                placeholder="e.g., EX-L, Sport, Limited..."
                className="w-full px-3 py-2.5 bg-surfacehighlight border border-surfacehighlight rounded-xl focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all placeholder-secondary/50 text-sm"
              />
            </div>
          </div>
        )}

        {/* Step 2: Vehicle Preview */}
        {step === 2 && (
          <div className="p-5 space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-heading font-bold uppercase tracking-tight mb-1">Confirm Details</h3>
              <p className="text-secondary text-sm">Does this look right?</p>
            </div>

            {/* Combined Summary */}
            <div className="bg-gradient-to-br from-surfacehighlight/60 to-surfacehighlight/30 rounded-2xl p-5 border border-surfacehighlight">
              {/* License Plate at Top */}
              <div className="flex justify-center mb-4">
                <div className={`relative ${plateColors.bg} rounded-lg px-6 py-3 shadow-lg border-4 border-gray-800`}>
                  <div className="absolute top-1 left-2 text-[8px] text-gray-600 font-bold">{stateCode}</div>
                  <div className={`text-2xl font-mono font-extrabold ${plateColors.text} tracking-widest text-center`}>
                    {plateNumber.toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Vehicle Details */}
              <div className="text-center mb-3">
                <h4 className="text-xl font-bold">
                  {year && `${year} `}{make} {model}
                </h4>
                {trim && <p className="text-sm text-secondary">{trim}</p>}
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className="px-3 py-1 bg-surface rounded-full text-sm font-medium">{color}</span>
              </div>
            </div>

            {/* Is this your car? */}
            {onClaimVehicle && (
              <div className="bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.25)] rounded-xl p-4 text-center">
                <p className="text-sm text-accent-2 mb-2">Is this your vehicle?</p>
                <button
                  onClick={onClaimVehicle}
                  className="inline-flex items-center gap-2 px-4 py-2 text-white font-bold rounded-lg transition-all text-sm"
                  style={{ background: 'linear-gradient(135deg, #f97316, #f59e0b)' }}
                >
                  <Key className="w-4 h-4" />
                  Claim Instead
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Real-Time Review */}
        {step === 3 && (
          <div className="p-5 space-y-4">
            <div className="text-center mb-3">
              <h3 className="text-xl font-heading font-bold uppercase tracking-tight mb-1">Your Review</h3>
              <p className="text-secondary text-xs">Optional - Share what you saw</p>
            </div>

            {/* Compact Rating Section */}
            <div className="bg-surfacehighlight rounded-xl p-3 space-y-0.5">
              <StarRatingInput
                label="Look"
                icon={<Eye className="w-5 h-5" strokeWidth={1.5} />}
                value={lookRating}
                onChange={setLookRating}
              />
              <StarRatingInput
                label="Sound"
                icon={<Volume2 className="w-5 h-5" strokeWidth={1.5} />}
                value={soundRating}
                onChange={setSoundRating}
              />
              <StarRatingInput
                label="Condition"
                icon={<Flag className="w-5 h-5" strokeWidth={1.5} />}
                value={conditionRating}
                onChange={setConditionRating}
              />
              <StarRatingInput
                label="Driving"
                icon={<Car className="w-5 h-5" strokeWidth={1.5} />}
                value={drivingRating}
                onChange={setDrivingRating}
              />
            </div>

            {/* Comments */}
            <div>
              <label className="block text-xs font-heading font-bold uppercase tracking-tight text-secondary mb-1.5">
                Comments <span className="text-secondary/50">(Optional)</span>
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="What did you think? Any mods spotted?"
                rows={3}
                className="w-full px-3 py-2.5 bg-surfacehighlight border border-surfacehighlight rounded-xl focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all placeholder-secondary/50 resize-none text-sm"
              />
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="px-5 pb-5 flex gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-surfacehighlight hover:bg-surfacehighlight/70 text-primary rounded-xl font-bold transition-all text-sm"
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {step === 1 && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 btn-secondary text-sm py-2.5"
              disabled={loading}
            >
              Cancel
            </button>
          )}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex-1 btn-primary flex items-center justify-center gap-1.5 text-sm py-2.5"
              disabled={loading}
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 btn-primary flex items-center justify-center gap-1.5 text-sm py-2.5"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Submit
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
