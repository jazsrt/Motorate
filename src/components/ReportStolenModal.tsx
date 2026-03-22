import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { ModalShell, modalButtonGhost, modalButtonDanger, modalInput, modalLabel } from './ui/ModalShell';

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
    if (data) setUserVehicles(data);
    setLoadingVehicles(false);
  };

  const handleSubmit = async () => {
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
    <ModalShell isOpen={true} onClose={onClose} eyebrow="Vehicle Alert" title="Report Stolen"
      footer={
        <>
          <button onClick={onClose} style={modalButtonGhost}>Cancel</button>
          <button onClick={handleSubmit}
            disabled={loading || !vehicleId || !policeReportNumber || userVehicles.length === 0}
            style={{ ...modalButtonDanger, opacity: (loading || !vehicleId || !policeReportNumber) ? 0.5 : 1 }}>
            {loading ? 'Submitting...' : 'Submit Report'}
          </button>
        </>
      }
    >
      {/* Red warning */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '10px 12px', borderRadius: 8, marginBottom: 16,
        background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
      }}>
        <AlertTriangle style={{ width: 16, height: 16, color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#ef4444', lineHeight: 1.45 }}>
          <strong style={{ display: 'block', marginBottom: 2 }}>Make sure you've filed a police report first.</strong>
          Once reported, your vehicle will be flagged and you'll be notified if anyone spots it.
        </div>
      </div>

      {error && (
        <div style={{
          marginBottom: 14, padding: '10px 12px', borderRadius: 8,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#ef4444',
        }}>
          {error}
        </div>
      )}

      {/* Vehicle select */}
      <div style={{ marginBottom: 16 }}>
        <label style={modalLabel}>Select Vehicle <span style={{ color: '#ef4444' }}>*</span></label>
        {loadingVehicles ? (
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#7a8e9e' }}>Loading your vehicles...</div>
        ) : userVehicles.length === 0 ? (
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#7a8e9e' }}>
            You don't have any claimed vehicles. Claim a vehicle first.
          </div>
        ) : (
          <select value={vehicleId} onChange={e => setVehicleId(e.target.value)}
            style={{ ...modalInput, cursor: 'pointer' }} required>
            <option value="">Select a vehicle</option>
            {userVehicles.map(v => (
              <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
            ))}
          </select>
        )}
      </div>

      {/* Police report number */}
      <div style={{ marginBottom: 16 }}>
        <label style={modalLabel}>Police Report Number <span style={{ color: '#ef4444' }}>*</span></label>
        <input type="text" value={policeReportNumber} onChange={e => setPoliceReportNumber(e.target.value)}
          placeholder="e.g., 2024-123456" style={modalInput} required />
        <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#445566', marginTop: 4 }}>
          This helps verify the report with law enforcement
        </div>
      </div>

      {/* Details */}
      <div>
        <label style={modalLabel}>Additional Details <span style={{ fontWeight: 400, textTransform: 'none' as const, letterSpacing: 'normal' }}>(Optional)</span></label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="When and where was it stolen? Any details that might help..."
          rows={4} style={{ ...modalInput, resize: 'none' as const, lineHeight: 1.55 }} />
      </div>
    </ModalShell>
  );
}
