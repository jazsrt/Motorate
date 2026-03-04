import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Lock, Unlock, Upload, MapPin, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { uploadImage } from '../lib/storage';

interface EditProfileModalProps {
  profile: {
    id: string;
    handle: string | null;
    avatar_url: string | null;
    profile_photo_url?: string | null;
    bio?: string | null;
    location?: string | null;
    is_private?: boolean;
  };
  onClose: () => void;
  onSave: () => void;
}

export function EditProfileModal({ profile, onClose, onSave }: EditProfileModalProps) {
  const { refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [handle, setHandle] = useState(profile.handle || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [location, setLocation] = useState(profile.location || '');
  const [isPrivate, setIsPrivate] = useState(profile.is_private || false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(profile.profile_photo_url || profile.avatar_url || null);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error');
      return;
    }

    setUploading(true);
    try {
      const photoUrl = await uploadImage(file, 'profiles');
      setPhotoPreview(photoUrl);
      showToast('Photo uploaded successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload photo', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          handle: handle.trim() || null,
          bio: bio.trim() || null,
          location: location.trim() || null,
          profile_photo_url: photoPreview,
          is_private: isPrivate
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      await refreshProfile();
      showToast('Profile updated successfully!', 'success');
      onSave();
      onClose();
    } catch (err: any) {
      console.error('Profile update error:', err);
      const errorMsg = err.message || err.details || err.hint || 'Failed to update profile';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-surfacehighlight rounded-xl max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col">
        <div className="sticky top-0 z-10 bg-surface border-b border-surfacehighlight px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="font-heading font-bold text-2xl uppercase tracking-tight">Edit User Profile</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surfacehighlight rounded-xl transition-all active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-status-danger/20 border border-status-danger rounded-xl text-sm text-status-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
          {/* Profile Photo */}
          <div>
            <label className="block text-sm font-heading font-bold uppercase tracking-tight text-secondary mb-2">
              Profile Photo
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-surfacehighlight flex items-center justify-center overflow-hidden">
                {photoPreview ? (
                  <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-8 h-8 text-secondary" />
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  id="photo-upload"
                  className="hidden"
                  disabled={uploading}
                />
                <label
                  htmlFor="photo-upload"
                  className={`btn-secondary inline-block cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Upload className="w-4 h-4 inline mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                </label>
                <p className="text-xs text-secondary mt-2">Max 5MB, JPG or PNG</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-heading font-bold uppercase tracking-tight text-secondary mb-2">
              Username
            </label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              className="w-full px-4 py-3 rounded-xl border border-border bg-surface-2 text-primary placeholder-secondary focus:outline-none focus:border-accent-primary transition-colors"
            />
            <p className="text-xs text-secondary mt-1">
              Your username will be displayed as @{handle || 'anonymous'}
            </p>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-heading font-bold uppercase tracking-tight text-secondary mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself and your rides..."
              maxLength={160}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border bg-surface-2 text-primary placeholder-secondary focus:outline-none focus:border-accent-primary transition-colors resize-none"
            />
            <p className="text-xs text-secondary mt-1">
              {bio.length}/160 characters
            </p>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-heading font-bold uppercase tracking-tight text-secondary mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, State"
              className="w-full px-4 py-3 rounded-xl border border-border bg-surface-2 text-primary placeholder-secondary focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>

          <div className="border-t border-surfacehighlight pt-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors ${
                  isPrivate ? 'bg-accent-primary' : 'bg-surfacehighlight'
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    isPrivate ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {isPrivate ? (
                    <Lock size={16} className="text-accent-primary" strokeWidth={1.5} />
                  ) : (
                    <Unlock size={16} className="text-secondary" strokeWidth={1.5} />
                  )}
                  <label className="text-sm font-heading font-bold uppercase tracking-tight text-primary">
                    Private Account
                  </label>
                </div>
                <p className="text-xs text-secondary">
                  {isPrivate
                    ? 'Only your followers can see your photos, vehicles, and activity'
                    : 'Anyone can see your profile content'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
