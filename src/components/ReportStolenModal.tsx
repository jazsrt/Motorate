import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, AlertOctagon } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface ReportStolenModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ReportStolenModal({ onClose, onSuccess }: ReportStolenModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [vehicleId, setVehicleId] = useState('');
  const [policeReportNumber, setPoliceReportNumber] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const [userVehicles, setUserVehicles] = useState<any[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  useState(() => {
    loadUserVehicles();
  });

  const loadUserVehicles = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('vehicles')
      .select('id, make, model, year')
      .eq('owner_id', user.id)
      .eq('is_claimed', true);

    if (data) {
      setUserVehicles(data);
    }
    setLoadingVehicles(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !vehicleId) return;

    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('stolen_vehicles')
        .insert({
          vehicle_id: vehicleId,
          reporter_id: user.id,
          police_report_number: policeReportNumber,
          description: description || null,
        });

      if (insertError) throw insertError;

      showToast('Vehicle reported as stolen. The community will be notified.', 'success');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-surface border border-surfacehighlight rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-status-danger/20 rounded-xl">
              <AlertOctagon className="w-6 h-6 text-status-danger" />
            </div>
            <h3 className="text-xl font-bold">Report Stolen Vehicle</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surfacehighlight rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-amber-900/20 border border-amber-800 rounded-xl p-4 mb-6">
          <p className="text-sm text-accent-primary">
            <span className="font-bold">Important:</span> Make sure you've filed a police report first.
            Once reported, your vehicle will be flagged in the system and you'll be notified if anyone spots it.
          </p>
        </div>

        {error && (
          <div className="bg-status-danger/20 border border-status-danger rounded-xl p-4 mb-6">
            <p className="text-sm text-status-danger">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="vehicle" className="block text-sm font-medium mb-2">
              Select Vehicle *
            </label>
            {loadingVehicles ? (
              <div className="text-sm text-secondary">Loading your vehicles...</div>
            ) : userVehicles.length === 0 ? (
              <div className="text-sm text-secondary">
                You don't have any claimed plates. Claim a plate first to report it as stolen.
              </div>
            ) : (
              <select
                id="vehicle"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-primary"
                required
              >
                <option value="">Select a vehicle</option>
                {userVehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label htmlFor="policeReport" className="block text-sm font-medium mb-2">
              Police Report Number *
            </label>
            <input
              type="text"
              id="policeReport"
              value={policeReportNumber}
              onChange={(e) => setPoliceReportNumber(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-primary"
              placeholder="e.g., 2024-123456"
              required
            />
            <p className="text-xs text-secondary mt-1">
              This helps verify the report with law enforcement
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Additional Details (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent-primary"
              rows={4}
              placeholder="When and where was it stolen? Any other details that might help..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 rounded-lg px-4 py-3 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !vehicleId || !policeReportNumber || userVehicles.length === 0}
              className="flex-1 bg-status-danger hover:bg-red-600 rounded-lg px-4 py-3 font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
