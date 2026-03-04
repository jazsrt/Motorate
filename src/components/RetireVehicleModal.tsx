import { useState } from 'react';
import { X, AlertCircle, Archive, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

interface RetireVehicleModalProps {
  vehicle: {
    id: string;
    year: number;
    make: string;
    model: string;
  };
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RetireVehicleModal({ vehicle, userId, onClose, onSuccess }: RetireVehicleModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [ownershipStart, setOwnershipStart] = useState('');
  const [ownershipEnd, setOwnershipEnd] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      showToast('Please select a reason', 'error');
      return;
    }

    setLoading(true);

    try {
      const ownershipPeriod = ownershipStart && ownershipEnd
        ? `${ownershipStart} - ${ownershipEnd}`
        : ownershipStart
        ? `${ownershipStart} - Present`
        : 'Unknown';

      const { error: retiredError } = await supabase
        .from('retired_vehicles')
        .insert({
          user_id: userId,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          ownership_period: ownershipPeriod,
          notes: notes || reason,
          retired_at: new Date().toISOString(),
        });

      if (retiredError) throw retiredError;

      const { error: deleteError } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicle.id)
        .eq('owner_id', userId);

      if (deleteError) throw deleteError;

      showToast('Vehicle retired and added to Lifetime Rides', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error retiring vehicle:', error);
      showToast('Failed to retire vehicle', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-surfacehighlight rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-surfacehighlight p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Archive className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold">Retire Vehicle</h2>
              <p className="text-xs text-texttertiary">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surfacehighlight flex items-center justify-center hover:bg-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-textsecondary">
              <p className="font-bold mb-1">This will move the vehicle to Lifetime Rides</p>
              <p>The vehicle will be removed from your active garage and added to your automotive history.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-textsecondary">
              Reason for retirement <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-surfacehighlight border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
              required
            >
              <option value="">Select a reason</option>
              <option value="sold">Sold</option>
              <option value="traded">Traded in</option>
              <option value="totaled">Totaled/Accident</option>
              <option value="stolen">Stolen</option>
              <option value="donated">Donated</option>
              <option value="scrapped">Scrapped</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold mb-2 text-textsecondary flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Owned From
              </label>
              <input
                type="month"
                value={ownershipStart}
                onChange={(e) => setOwnershipStart(e.target.value)}
                className="w-full bg-surfacehighlight border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-textsecondary flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Until
              </label>
              <input
                type="month"
                value={ownershipEnd}
                onChange={(e) => setOwnershipEnd(e.target.value)}
                className="w-full bg-surfacehighlight border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-textsecondary">
              Additional notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Favorite memories, why you let it go, etc."
              rows={3}
              className="w-full bg-surfacehighlight border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-border bg-surfacehighlight text-sm font-bold hover:bg-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Retiring...' : 'Retire Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
