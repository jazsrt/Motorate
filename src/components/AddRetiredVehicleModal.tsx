import { useState } from 'react';
import { X, Car, Calendar, Clock, Upload, Image } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { uploadImage } from '../lib/storage';

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
    year: '',
    make: '',
    model: '',
    trim: '',
    ownership_start: '',
    ownership_end: '',
    notes: '',
    photo_url_1: '',
    photo_url_2: '',
  });

  const handlePhotoUpload = async (file: File, photoNumber: 1 | 2) => {
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showToast('Image must be less than 5MB', 'error');
      return;
    }

    setUploadingPhoto(true);

    try {
      const photoUrl = await uploadImage(file, 'retired-vehicles');

      if (photoNumber === 1) {
        setFormData({ ...formData, photo_url_1: photoUrl });
      } else {
        setFormData({ ...formData, photo_url_2: photoUrl });
      }

      showToast(`Photo ${photoNumber} uploaded successfully`, 'success');
    } catch (error) {
      console.error('Error uploading photo:', error);
      showToast('Failed to upload photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.year || !formData.make || !formData.model) {
      showToast('Please fill in year, make, and model', 'error');
      return;
    }

    setLoading(true);

    try {
      const ownershipPeriod = formData.ownership_start && formData.ownership_end
        ? `${formData.ownership_start} - ${formData.ownership_end}`
        : formData.ownership_start
        ? `${formData.ownership_start} - Present`
        : 'Unknown';

      const { error } = await supabase
        .from('retired_vehicles')
        .insert({
          user_id: userId,
          year: parseInt(formData.year),
          make: formData.make,
          model: formData.model,
          trim: formData.trim || null,
          ownership_start: formData.ownership_start || null,
          ownership_end: formData.ownership_end || null,
          ownership_period: ownershipPeriod,
          notes: formData.notes || null,
          photo_url_1: formData.photo_url_1 || null,
          photo_url_2: formData.photo_url_2 || null,
          retired_at: new Date().toISOString(),
        });

      if (error) throw error;

      showToast('Lifetime ride added!', 'success');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding retired vehicle:', error);
      showToast('Failed to add retired vehicle', 'error');
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1949 }, (_, i) => currentYear - i);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface border border-surfacehighlight rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex-shrink-0 bg-surface border-b border-surfacehighlight p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange/20 flex items-center justify-center">
              <Car className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold">Add Lifetime Ride</h2>
              <p className="text-xs text-texttertiary">Vehicles from your past</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surfacehighlight flex items-center justify-center hover:bg-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-bold mb-2 text-textsecondary">
                Year <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                placeholder="2020"
                maxLength={4}
                pattern="[0-9]{4}"
                className="w-full bg-surfacehighlight border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-bold mb-2 text-textsecondary">
                Make <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                placeholder="Toyota"
                className="w-full bg-surfacehighlight border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-textsecondary">
              Model <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="Camry"
              className="w-full bg-surfacehighlight border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-textsecondary">
              Trim (optional)
            </label>
            <input
              type="text"
              value={formData.trim}
              onChange={(e) => setFormData({ ...formData, trim: e.target.value })}
              placeholder="XLE, Sport, etc."
              className="w-full bg-surfacehighlight border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold mb-2 text-textsecondary flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Owned From
              </label>
              <input
                type="text"
                value={formData.ownership_start}
                onChange={(e) => setFormData({ ...formData, ownership_start: e.target.value })}
                placeholder="2015"
                className="w-full bg-surfacehighlight border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange"
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-textsecondary flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Until
              </label>
              <input
                type="text"
                value={formData.ownership_end}
                onChange={(e) => setFormData({ ...formData, ownership_end: e.target.value })}
                placeholder="2019"
                className="w-full bg-surfacehighlight border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-textsecondary">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Favorite memories, why you sold it, etc."
              rows={3}
              className="w-full bg-surfacehighlight border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-textsecondary">
              Photos (max 2)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Photo 1 */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], 1)}
                  className="hidden"
                  id="photo-1"
                  disabled={uploadingPhoto}
                />
                <label
                  htmlFor="photo-1"
                  className={`block aspect-[4/3] border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    formData.photo_url_1
                      ? 'border-orange bg-orange/10'
                      : 'border-border bg-surfacehighlight hover:border-orange'
                  } ${uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {formData.photo_url_1 ? (
                    <div className="relative w-full h-full">
                      <img
                        src={formData.photo_url_1}
                        alt="Photo 1"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setFormData({ ...formData, photo_url_1: '' });
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-textsecondary">
                      {uploadingPhoto ? (
                        <Upload className="w-6 h-6 animate-pulse" />
                      ) : (
                        <>
                          <Image className="w-6 h-6 mb-1" />
                          <span className="text-xs">Photo 1</span>
                        </>
                      )}
                    </div>
                  )}
                </label>
              </div>

              {/* Photo 2 */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], 2)}
                  className="hidden"
                  id="photo-2"
                  disabled={uploadingPhoto}
                />
                <label
                  htmlFor="photo-2"
                  className={`block aspect-[4/3] border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    formData.photo_url_2
                      ? 'border-orange bg-orange/10'
                      : 'border-border bg-surfacehighlight hover:border-orange'
                  } ${uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {formData.photo_url_2 ? (
                    <div className="relative w-full h-full">
                      <img
                        src={formData.photo_url_2}
                        alt="Photo 2"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setFormData({ ...formData, photo_url_2: '' });
                        }}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-textsecondary">
                      {uploadingPhoto ? (
                        <Upload className="w-6 h-6 animate-pulse" />
                      ) : (
                        <>
                          <Image className="w-6 h-6 mb-1" />
                          <span className="text-xs">Photo 2</span>
                        </>
                      )}
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>
        </form>

        <div className="flex-shrink-0 border-t border-surfacehighlight p-4 bg-surface">
          <div className="flex gap-3">
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
              onClick={(e) => {
                e.preventDefault();
                const form = e.currentTarget.closest('div')?.parentElement?.querySelector('form');
                if (form) {
                  const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                  form.dispatchEvent(submitEvent);
                }
              }}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#F97316] to-[#fb923c] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add to Lifetime Rides'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
