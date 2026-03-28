import { useState } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { uploadImage } from '../lib/storage';
import { ModalShell, modalButtonPrimary, modalButtonGhost, modalInput, modalLabel } from './ui/ModalShell';

interface AddRetiredVehicleModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddRetiredVehicleModal({ userId, onClose, onSuccess }: AddRetiredVehicleModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [formData, setFormData] = useState({
    year: '', make: '', model: '', trim: '',
    ownership_start: '', ownership_end: '',
    notes: '', photo_url_1: '', photo_url_2: '',
  });

  const handlePhotoUpload = async (file: File, photoNumber: 1 | 2) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast('Image must be less than 5MB', 'error'); return; }
    setUploadingPhoto(true);
    try {
      const photoUrl = await uploadImage(file, 'vehicles');
      setFormData(prev => ({ ...prev, [`photo_url_${photoNumber}`]: photoUrl }));
      showToast(`Photo ${photoNumber} uploaded successfully`, 'success');
    } catch { showToast('Failed to upload photo', 'error'); }
    finally { setUploadingPhoto(false); }
  };

  const handleSubmit = async () => {
    if (!formData.year || !formData.make || !formData.model) {
      showToast('Please fill in year, make, and model', 'error'); return;
    }
    setLoading(true);
    try {
      const ownershipPeriod = formData.ownership_start && formData.ownership_end
        ? `${formData.ownership_start} - ${formData.ownership_end}`
        : formData.ownership_start ? `${formData.ownership_start} - Present` : 'Unknown';

      const { error } = await supabase.from('retired_vehicles').insert({
        user_id: userId, year: parseInt(formData.year), make: formData.make,
        model: formData.model, trim: formData.trim || null,
        ownership_start: formData.ownership_start || null, ownership_end: formData.ownership_end || null,
        ownership_period: ownershipPeriod, notes: formData.notes || null,
        photo_url_1: formData.photo_url_1 || null, photo_url_2: formData.photo_url_2 || null,
        retired_at: new Date().toISOString(),
      });
      if (error) throw error;
      showToast('Lifetime ride added!', 'success');
      onSuccess(); onClose();
    } catch { showToast('Failed to add retired vehicle', 'error'); }
    finally { setLoading(false); }
  };

  return (
    <ModalShell isOpen={true} onClose={onClose} eyebrow="Lifetime Rides" title="Add a Past Vehicle"
      footer={
        <>
          <button onClick={onClose} style={modalButtonGhost}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading} style={{ ...modalButtonPrimary, opacity: loading ? 0.5 : 1 }}>
            {loading ? 'Adding...' : 'Add to Lifetime Rides'}
          </button>
        </>
      }
    >
      {/* Year + Make */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginBottom: 14 }}>
        <div>
          <label style={modalLabel}>Year <span style={{ color: '#ef4444' }}>*</span></label>
          <input type="text" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })}
            placeholder="2020" maxLength={4} style={modalInput} required />
        </div>
        <div>
          <label style={modalLabel}>Make <span style={{ color: '#ef4444' }}>*</span></label>
          <input type="text" value={formData.make} onChange={e => setFormData({ ...formData, make: e.target.value })}
            placeholder="Toyota" style={modalInput} required />
        </div>
      </div>

      {/* Model */}
      <div style={{ marginBottom: 14 }}>
        <label style={modalLabel}>Model <span style={{ color: '#ef4444' }}>*</span></label>
        <input type="text" value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })}
          placeholder="Camry" style={modalInput} required />
      </div>

      {/* Trim */}
      <div style={{ marginBottom: 14 }}>
        <label style={modalLabel}>Trim <span style={{ fontWeight: 400, textTransform: 'none' as const, letterSpacing: 'normal' }}>(Optional)</span></label>
        <input type="text" value={formData.trim} onChange={e => setFormData({ ...formData, trim: e.target.value })}
          placeholder="XLE, Sport, etc." style={modalInput} />
      </div>

      {/* Ownership dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div>
          <label style={modalLabel}>Owned From</label>
          <input type="text" value={formData.ownership_start} onChange={e => setFormData({ ...formData, ownership_start: e.target.value })}
            placeholder="2015" style={modalInput} />
        </div>
        <div>
          <label style={modalLabel}>Until</label>
          <input type="text" value={formData.ownership_end} onChange={e => setFormData({ ...formData, ownership_end: e.target.value })}
            placeholder="2019" style={modalInput} />
        </div>
      </div>

      {/* Story */}
      <div style={{ marginBottom: 14 }}>
        <label style={modalLabel}>Story <span style={{ fontWeight: 400, textTransform: 'none' as const, letterSpacing: 'normal' }}>(Optional)</span></label>
        <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Favorite memories, why you sold it..." rows={3} style={{ ...modalInput, resize: 'none' as const, lineHeight: 1.55 }} />
      </div>

      {/* Photos */}
      <div>
        <label style={modalLabel}>Photos <span style={{ fontWeight: 400, textTransform: 'none' as const, letterSpacing: 'normal' }}>(max 2)</span></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {([1, 2] as const).map(num => {
            const url = formData[`photo_url_${num}` as keyof typeof formData];
            return (
              <div key={num} style={{ position: 'relative' as const }}>
                <input type="file" accept="image/*" id={`photo-${num}`} style={{ display: 'none' }} disabled={uploadingPhoto}
                  onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], num)} />
                <label htmlFor={`photo-${num}`} style={{
                  display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
                  aspectRatio: '4/3', borderRadius: 8, cursor: uploadingPhoto ? 'not-allowed' : 'pointer',
                  border: url ? '1px solid rgba(249,115,22,0.3)' : '2px dashed rgba(255,255,255,0.08)',
                  background: url ? 'rgba(249,115,22,0.06)' : '#131920', overflow: 'hidden',
                  opacity: uploadingPhoto ? 0.5 : 1, transition: 'border-color 0.15s',
                }}>
                  {url ? (
                    <img src={url} alt={`Photo ${num}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <>
                      <ImageIcon style={{ width: 20, height: 20, color: '#445566', marginBottom: 4 }} />
                      <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#445566' }}>Photo {num}</span>
                    </>
                  )}
                </label>
                {url && (
                  <button onClick={e => { e.preventDefault(); setFormData({ ...formData, [`photo_url_${num}`]: '' }); }}
                    style={{
                      position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%',
                      background: '#ef4444', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    <X style={{ width: 12, height: 12, color: '#fff' }} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}
