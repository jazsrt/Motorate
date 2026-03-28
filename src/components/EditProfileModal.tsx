import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { uploadImage } from '../lib/storage';
import { ModalShell, modalButtonPrimary, modalButtonGhost, modalInput, modalLabel } from './ui/ModalShell';

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

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be less than 5MB', 'error');
      return;
    }

    setUploading(true);
    try {
      const photoUrl = await uploadImage(file, 'profiles');
      setPhotoPreview(photoUrl);
      showToast('Photo uploaded successfully', 'success');
    } catch (err: unknown) {
      showToast((err instanceof Error ? err.message : null) || 'Failed to upload photo', 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
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
    } catch (err: unknown) {
      console.error('Profile update error:', err);
      const errorMsg = (err instanceof Error ? err.message : null) || 'Failed to update profile';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      isOpen={true}
      onClose={onClose}
      eyebrow="Your Profile"
      title="Edit Profile"
      footer={
        <>
          <button onClick={onClose} style={modalButtonGhost}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ ...modalButtonPrimary, opacity: saving ? 0.5 : 1 }}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </>
      }
    >
      {error && (
        <div style={{
          marginBottom: 14, padding: '10px 12px', borderRadius: 8,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#ef4444',
        }}>
          {error}
        </div>
      )}

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
          background: '#131920', border: '2px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative' as const,
        }}>
          {photoPreview ? (
            <img src={photoPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Upload style={{ width: 24, height: 24, color: '#445566' }} />
          )}
        </div>
        <div>
          <input type="file" accept="image/*" onChange={handlePhotoUpload} id="photo-upload" style={{ display: 'none' }} disabled={uploading} />
          <label htmlFor="photo-upload" style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase' as const,
            color: '#F97316', cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.5 : 1,
          }}>
            {uploading ? 'Uploading...' : 'Change photo'}
          </label>
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#445566', marginTop: 4 }}>
            Max 5MB, JPG or PNG
          </div>
        </div>
      </div>

      {/* Handle */}
      <div style={{ marginBottom: 16 }}>
        <label style={modalLabel}>Username</label>
        <input
          type="text"
          value={handle}
          onChange={e => setHandle(e.target.value)}
          placeholder="Enter your username"
          autoComplete="username"
          style={modalInput}
        />
        <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#445566', marginTop: 4 }}>
          Displayed as @{handle || 'anonymous'}
        </div>
      </div>

      {/* Bio */}
      <div style={{ marginBottom: 16 }}>
        <label style={modalLabel}>Bio</label>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Tell us about yourself and your rides..."
          maxLength={160}
          rows={3}
          style={{ ...modalInput, resize: 'none' as const, lineHeight: 1.55 }}
        />
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          color: '#445566', textAlign: 'right' as const, marginTop: 4, fontVariantNumeric: 'tabular-nums',
        }}>
          {bio.length}/160
        </div>
      </div>

      {/* Location */}
      <div style={{ marginBottom: 16 }}>
        <label style={modalLabel}>Location</label>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="City, State"
          style={modalInput}
        />
      </div>

      {/* Privacy toggle */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 0', borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <button
          type="button"
          onClick={() => setIsPrivate(!isPrivate)}
          style={{
            width: 44, height: 24, borderRadius: 12, flexShrink: 0,
            background: isPrivate ? '#F97316' : 'rgba(255,255,255,0.08)',
            border: 'none', cursor: 'pointer', position: 'relative' as const,
            transition: 'background 0.2s',
          }}
        >
          <div style={{
            width: 18, height: 18, borderRadius: '50%', background: '#eef4f8',
            position: 'absolute' as const, top: 3,
            left: isPrivate ? 23 : 3, transition: 'left 0.2s',
          }} />
        </button>
        <div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700,
            color: '#eef4f8', letterSpacing: '0.06em',
          }}>
            Private Account
          </div>
          <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7a8e9e', marginTop: 2 }}>
            {isPrivate ? 'Only followers can see your content' : 'Anyone can see your profile'}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
