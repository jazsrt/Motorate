import { useState, useRef } from 'react';
import { ArrowLeft, Star, Heart, ThumbsDown, Camera, X, Shield, CheckCircle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { hashPlate } from '../lib/hash';
import { calculateAndAwardReputation } from '../lib/reputation';
import { uploadImage } from '../lib/storage';
import { type OnNavigate } from '../types/navigation';
import type { SpotWizardData } from '../types/spot';
import { StickerSelector } from '../components/StickerSelector';
import { giveSticker } from '../lib/stickerService';
import { sounds } from '../lib/sounds';
import { haptics } from '../lib/haptics';
import { trackSpotEvent } from '../lib/spotAnalytics';

interface VerifiedReviewPageProps {
  onNavigate: OnNavigate;
  wizardData: SpotWizardData;
}

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [hov, setHov] = useState(0);
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#7a8e9e' }}>{label}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1,2,3,4,5].map(s => (
          <button key={s} onClick={() => onChange(s)} onMouseEnter={() => setHov(s)} onMouseLeave={() => setHov(0)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
            <Star style={{ width: 16, height: 16, fill: s <= (hov || value) ? '#f0a030' : 'none', color: s <= (hov || value) ? '#f0a030' : '#3a4e60' }} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function VerifiedReviewPage({ onNavigate, wizardData }: VerifiedReviewPageProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [vehicleRating, setVehicleRating] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [drivingRating, setDrivingRating] = useState(0);
  const [looksRating, setLooksRating] = useState(0);
  const [soundRating, setSoundRating] = useState(0);
  const [conditionRating, setConditionRating] = useState(0);
  const [sentiment, setSentiment] = useState<'love' | 'hate' | null>(null);
  const [comment, setComment] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedStickerIds, setSelectedStickerIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = vehicleRating > 0 && driverRating > 0 && drivingRating > 0 && sentiment !== null;
  const heroUrl = photoPreview || wizardData.stockImageUrl || null;

  const handleSubmit = async () => {
    if (!user || !canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const plateHash = wizardData.plateHash || await hashPlate(wizardData.plateState, wizardData.plateNumber);
      let vehicleId = wizardData.vehicleId;

      if (!vehicleId) {
        const { data: ex } = await supabase.from('vehicles').select('id').eq('plate_hash', plateHash).maybeSingle();
        if (ex) {
          vehicleId = ex.id;
        } else {
          const { data: nv, error } = await supabase.from('vehicles').insert({
            plate_hash: plateHash, plate_state: wizardData.plateState, plate_number: wizardData.plateNumber,
            make: wizardData.make, model: wizardData.model, color: wizardData.color,
            year: wizardData.year ? parseInt(wizardData.year) : null,
            trim: wizardData.trim || null, stock_image_url: wizardData.stockImageUrl || null,
            is_claimed: false, verification_tier: 'vin_verified', created_by_user_id: user.id,
          }).select('id').single();
          if (error) throw error;
          vehicleId = nv.id;
        }
      }

      let photoUrl: string | null = null;
      if (photoFile) { try { photoUrl = await uploadImage(photoFile, 'reviews'); } catch { /**/ } }

      const { data: spotData, error: spotError } = await supabase.from('spot_history').insert({
        spotter_id: user.id, vehicle_id: vehicleId, spot_type: 'verified', reputation_earned: 20,
      }).select('id').single();
      if (spotError) throw spotError;

      try { sounds.revEngine(); haptics.medium(); } catch { /**/ }

      const { data: reviewData, error: reviewError } = await supabase.from('reviews').insert({
        vehicle_id: vehicleId, author_id: user.id,
        rating_vehicle: vehicleRating, rating_driver: driverRating, rating_driving: drivingRating,
        looks_rating: looksRating || null, sound_rating: soundRating || null, condition_rating: conditionRating || null,
        sentiment, comment: comment.trim() || null, spot_type: 'verified', spot_history_id: spotData.id,
      }).select('id').single();
      if (reviewError) throw reviewError;

      let feedImg: string | null = photoUrl;
      if (!feedImg) {
        const { data: vImg } = await supabase.from('vehicles').select('profile_image_url, stock_image_url').eq('id', vehicleId).maybeSingle();
        feedImg = vImg?.profile_image_url || vImg?.stock_image_url || null;
      }

      if (feedImg) {
        await supabase.from('posts').insert({
          author_id: user.id, vehicle_id: vehicleId, post_type: 'spot', spot_type: 'verified',
          caption: comment.trim() || null, image_url: feedImg,
          spot_history_id: spotData.id, review_id: reviewData.id,
          rating_vehicle: vehicleRating, rating_driver: driverRating, rating_driving: drivingRating,
          looks_rating: looksRating || null, sound_rating: soundRating || null, condition_rating: conditionRating || null,
          sentiment, moderation_status: 'approved', privacy_level: 'public',
        });
      }

      await calculateAndAwardReputation({ userId: user.id, action: 'SPOT_QUICK_REVIEW', referenceType: 'review', referenceId: reviewData.id });

      if (selectedStickerIds.length > 0) {
        for (const id of selectedStickerIds) await giveSticker(vehicleId, id, user.id);
      }

      trackSpotEvent('verified_spot_created', user.id, { vehicleId, plate: wizardData.plateNumber });
      setSubmitted(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to submit', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── SUCCESS STATE ──────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <Layout currentPage="scan" onNavigate={onNavigate}>
        <div style={{ maxWidth: 512, margin: '0 auto', padding: '40px 16px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
              <Shield size={18} color="#F97316" />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316' }}>Motorate Verified</span>
            </div>
            <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 42, fontWeight: 700, color: '#F97316' }}>+20</span>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#F97316', marginLeft: 6 }}>RP</span>
          </div>

          <div style={{ background: '#0a0d14', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#eef4f8', marginBottom: 2 }}>
              {[wizardData.make, wizardData.model].filter(Boolean).join(' ')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <CheckCircle size={10} color="#20c060" />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#20c060' }}>Verified Spot Recorded</span>
            </div>
          </div>

          {/* Post-submit CTA */}
          <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.20)', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: '#eef4f8', marginBottom: 4 }}>Boost your vehicle's visibility</div>
            <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#7a8e9e', marginBottom: 12, lineHeight: 1.5 }}>
              Share your verified spot to drive more engagement and climb the rankings.
            </div>
            <button onClick={() => onNavigate('feed')} style={{ width: '100%', padding: '10px', background: '#F97316', border: 'none', borderRadius: 6, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#030508', cursor: 'pointer' }}>
              View in Feed
            </button>
          </div>

          <button onClick={() => onNavigate('feed')} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#7a8e9e', cursor: 'pointer' }}>
            Done
          </button>
        </div>
      </Layout>
    );
  }

  // ── REVIEW FORM ────────────────────────────────────────────────────────────

  return (
    <Layout currentPage="scan" onNavigate={onNavigate}>
      {/* Header */}
      <div style={{ padding: '52px 16px 16px', background: '#0a0d14', borderBottom: '1px solid rgba(249,115,22,0.10)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <button onClick={() => onNavigate('scan')} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(3,5,8,0.7)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <ArrowLeft size={14} color="#eef4f8" strokeWidth={2} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={13} color="#F97316" />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316' }}>Verified Spot \u00b7 Step 3 of 3</span>
          </div>
        </div>
        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 20, fontWeight: 700, color: '#eef4f8', lineHeight: 1, marginBottom: 10 }}>Rate It</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {[1,2,3].map(i => <div key={i} style={{ flex: 1, height: 2, borderRadius: 1, background: '#F97316' }} />)}
        </div>
      </div>

      {/* Hero */}
      {heroUrl && (
        <div style={{ position: 'relative', width: '100%', height: 160, overflow: 'hidden', background: '#111720' }}>
          <img src={heroUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(3,5,8,0.8) 0%, transparent 55%)' }} />
          <div style={{ position: 'absolute', bottom: 10, left: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
              <Shield size={10} color="#F97316" />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: '#F97316' }}>Motorate Verified</span>
            </div>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700, color: '#eef4f8', lineHeight: 1 }}>
              {[wizardData.make, wizardData.model].filter(Boolean).join(' ')}
            </div>
          </div>
        </div>
      )}

      {/* Ratings */}
      <div>
        <StarRow label="Vehicle" value={vehicleRating} onChange={setVehicleRating} />
        <StarRow label="Driver" value={driverRating} onChange={setDriverRating} />
        <StarRow label="Driving" value={drivingRating} onChange={setDrivingRating} />
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#5a6e7e', padding: '10px 16px 0' }}>Additional \u00b7 Optional</div>
        <StarRow label="Looks" value={looksRating} onChange={setLooksRating} />
        <StarRow label="Sound" value={soundRating} onChange={setSoundRating} />
        <StarRow label="Condition" value={conditionRating} onChange={setConditionRating} />
      </div>

      {/* Sentiment */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '12px 16px' }}>
        <button onClick={() => setSentiment('love')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, cursor: 'pointer', ...(sentiment === 'love' ? { background: 'rgba(249,115,22,0.10)', border: '1px solid rgba(249,115,22,0.40)', color: '#F97316' } : { background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', color: '#5a6e7e' }) }}>
          <Heart style={{ width: 16, height: 16, fill: sentiment === 'love' ? '#F97316' : 'none' }} /> Love It
        </button>
        <button onClick={() => setSentiment('hate')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, cursor: 'pointer', ...(sentiment === 'hate' ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.30)', color: '#ef4444' } : { background: 'transparent', border: '1px solid rgba(255,255,255,0.07)', color: '#5a6e7e' }) }}>
          <ThumbsDown style={{ width: 16, height: 16, fill: sentiment === 'hate' ? '#ef4444' : 'none' }} /> Hate It
        </button>
      </div>

      {/* Stickers */}
      <div style={{ paddingBottom: 8 }}>
        <StickerSelector selectedStickers={selectedStickerIds} onToggleSticker={(id) => setSelectedStickerIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])} />
      </div>

      {/* Caption */}
      <div style={{ margin: '0 16px 10px' }}>
        <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a caption..." rows={2} style={{ width: '100%', padding: '10px 12px', background: '#0d1117', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#eef4f8', outline: 'none', resize: 'none' as const }} />
      </div>

      {/* Photo */}
      <div style={{ padding: '0 16px 12px' }}>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={e => { const f = e.target.files?.[0]; if (!f) return; setPhotoFile(f); const r = new FileReader(); r.onload = ev => setPhotoPreview(ev.target?.result as string); r.readAsDataURL(f); }} style={{ display: 'none' }} />
        {photoPreview ? (
          <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            <img src={photoPreview} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
            <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ position: 'absolute', top: 6, right: 6, padding: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X style={{ width: 14, height: 14, color: '#fff' }} />
            </button>
          </div>
        ) : (
          <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#5a6e7e', cursor: 'pointer' }}>
            <Camera style={{ width: 14, height: 14 }} /> Add a Photo
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700, color: '#F97316', background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)', borderRadius: 4, padding: '2px 6px', marginLeft: 4 }}>+5 RP</span>
          </button>
        )}
      </div>

      {/* Submit */}
      <div style={{ margin: '0 16px 24px' }}>
        <button onClick={handleSubmit} disabled={!canSubmit || submitting} style={{ width: '100%', padding: 13, background: '#F97316', border: 'none', borderRadius: 8, fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: '#030508', cursor: 'pointer', opacity: (!canSubmit || submitting) ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {submitting && <div style={{ width: 16, height: 16, border: '2px solid #030508', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />}
          Submit Verified Spot +20 RP
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}
