import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { ModalShell, modalButtonGhost, modalButtonDanger, modalInput, modalLabel } from './ui/ModalShell';

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

  const handleSubmit = async () => {
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

  const reasons = [
    { value: 'sold', label: 'Sold' },
    { value: 'traded', label: 'Traded In' },
    { value: 'totaled', label: 'Totaled' },
    { value: 'stolen', label: 'Stolen' },
    { value: 'donated', label: 'Donated' },
    { value: 'scrapped', label: 'Scrapped' },
  ];

  return (
    <ModalShell
      isOpen={true}
      onClose={onClose}
      eyebrow={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
      title="Retire This Ride"
      footer={
        <>
          <button onClick={onClose} disabled={loading} style={{ ...modalButtonGhost, opacity: loading ? 0.5 : 1 }}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading || !reason} style={{ ...modalButtonDanger, opacity: (loading || !reason) ? 0.5 : 1 }}>
            {loading ? 'Retiring...' : 'Retire Vehicle'}
          </button>
        </>
      }
    >
      {/* Warning */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 12px', borderRadius: 8, marginBottom: 16,
        background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)',
      }}>
        <AlertCircle style={{ width: 16, height: 16, color: '#F97316', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#F97316', lineHeight: 1.45 }}>
          <strong style={{ display: 'block', marginBottom: 2 }}>This will move the vehicle to Lifetime Rides</strong>
          The vehicle will be removed from your active garage and added to your automotive history.
        </div>
      </div>

      {/* Reason grid */}
      <div style={{ marginBottom: 16 }}>
        <label style={modalLabel}>Reason <span style={{ color: '#ef4444' }}>*</span></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {reasons.map(r => (
            <button key={r.value} onClick={() => setReason(r.value)} style={{
              padding: '10px 8px', borderRadius: 8, textAlign: 'center' as const,
              background: reason === r.value ? 'rgba(249,115,22,0.12)' : '#131920',
              border: reason === r.value ? '1px solid rgba(249,115,22,0.4)' : '1px solid rgba(255,255,255,0.06)',
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase' as const,
              color: reason === r.value ? '#F97316' : '#a8bcc8',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div>
          <label style={modalLabel}>Owned From</label>
          <input type="month" value={ownershipStart} onChange={e => setOwnershipStart(e.target.value)} style={modalInput} />
        </div>
        <div>
          <label style={modalLabel}>Until</label>
          <input type="month" value={ownershipEnd} onChange={e => setOwnershipEnd(e.target.value)} style={modalInput} />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label style={modalLabel}>Farewell Note <span style={{ fontWeight: 400, textTransform: 'none' as const, letterSpacing: 'normal' }}>(Optional)</span></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Favorite memories, why you let it go..."
          rows={3} style={{ ...modalInput, resize: 'none' as const, lineHeight: 1.55 }} />
      </div>
    </ModalShell>
  );
}
