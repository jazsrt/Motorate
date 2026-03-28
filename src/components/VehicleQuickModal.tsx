import { useState, useEffect, useCallback } from 'react';
import { Car, Crosshair } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getVehicleImageUrl } from '../lib/carImageryApi';
import { StickerSlab } from './StickerSlab';
import { useAuth } from '../contexts/AuthContext';
import type { OnNavigate } from '../types/navigation';
import { ModalShell, modalButtonPrimary, modalButtonGhost } from './ui/ModalShell';

interface VehicleQuickModalProps {
  vehicleId: string;
  onClose: () => void;
  onNavigate?: OnNavigate;
}

interface VehicleData {
  id: string;
  make: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  stock_image_url: string | null;
  owner_id: string | null;
  is_claimed: boolean;
  verification_tier: 'shadow' | 'standard' | 'verified';
  owner?: {
    handle: string;
    avatar_url: string | null;
  } | null;
}

export function VehicleQuickModal({ vehicleId, onClose, onNavigate }: VehicleQuickModalProps) {
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [carImageryUrl, setCarImageryUrl] = useState<string | null>(null);

  const loadVehicle = useCallback(async () => {
    try {
      // PLATE: hidden — public surface
      const { data } = await supabase
        .from('vehicles')
        .select(`
          id, make, model, year, color, stock_image_url,
          owner_id, is_claimed, verification_tier,
          owner:profiles!owner_id(handle, avatar_url)
        `)
        .eq('id', vehicleId)
        .maybeSingle();

      if (data) {
        setVehicle({
          ...data,
          owner: Array.isArray(data.owner) ? data.owner[0] : data.owner,
        } as VehicleData);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    loadVehicle();
  }, [loadVehicle]);

  useEffect(() => {
    if (vehicle && !vehicle.stock_image_url) {
      getVehicleImageUrl(vehicle.make || '', vehicle.model || '', vehicle.year || undefined).then(url => {
        if (url) setCarImageryUrl(url);
      });
    }
  }, [vehicle]);

  const vehicleName = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')
    : '';

  const handleViewFull = () => {
    if (vehicle && onNavigate) {
      onNavigate('vehicle-detail', { vehicleId: vehicle.id });
      onClose();
    }
  };

  const imgUrl = vehicle?.stock_image_url || carImageryUrl;

  return (
    <ModalShell
      isOpen={true}
      onClose={onClose}
      eyebrow="Vehicle"
      title={vehicleName || 'Loading...'}
      footer={vehicle && onNavigate ? (
        <>
          <button onClick={handleViewFull} style={modalButtonGhost}>View Profile</button>
          <button onClick={() => {
            onNavigate('vehicle-detail', { vehicleId: vehicle.id, openReviewModal: true });
            onClose();
          }} style={modalButtonPrimary}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Crosshair style={{ width: 13, height: 13 }} strokeWidth={2} />
              Spot This Plate
            </span>
          </button>
        </>
      ) : undefined}
    >
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
          <div style={{
            width: 24, height: 24, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.1)',
            borderTopColor: '#F97316',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      ) : !vehicle ? (
        <div style={{ padding: '40px 0', textAlign: 'center' as const }}>
          <Car style={{ width: 40, height: 40, color: '#445566', margin: '0 auto 12px', display: 'block' }} strokeWidth={1} />
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#7a8e9e' }}>Vehicle not found</p>
        </div>
      ) : (
        <>
          {/* Hero image */}
          <div style={{
            width: '100%', height: 160, borderRadius: 10, overflow: 'hidden',
            background: '#131920', marginBottom: 14, position: 'relative' as const,
          }}>
            {imgUrl ? (
              <img src={imgUrl} alt={vehicleName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Car style={{ width: 48, height: 48, color: '#445566' }} strokeWidth={1} />
              </div>
            )}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, rgba(13,17,23,0.9) 0%, transparent 50%)',
            }} />
            <div style={{ position: 'absolute', bottom: 10, left: 12, zIndex: 2 }}>
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700,
                letterSpacing: '0.2em', textTransform: 'uppercase' as const, color: '#F97316',
              }}>
                {vehicle.make} {vehicle.color ? `\u00B7 ${vehicle.color}` : ''}
              </div>
              <div style={{
                fontFamily: "'Rajdhani', sans-serif", fontSize: 18, fontWeight: 700,
                color: '#eef4f8', lineHeight: 1,
              }}>
                {vehicle.model || vehicle.make}
              </div>
            </div>
          </div>

          {/* Status badges */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            <div style={{
              padding: '3px 10px', borderRadius: 4,
              fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase' as const,
              ...(vehicle.is_claimed
                ? { background: 'rgba(32,192,96,0.1)', border: '1px solid rgba(32,192,96,0.25)', color: '#20c060' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#7a8e9e' }
              ),
            }}>
              {vehicle.is_claimed ? 'Claimed' : 'Unclaimed'}
            </div>
            {vehicle.verification_tier === 'verified' && (
              <div style={{
                padding: '3px 10px', borderRadius: 4,
                background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)',
                fontFamily: "'Barlow Condensed', sans-serif", fontSize: 8, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#F97316',
              }}>
                Verified
              </div>
            )}
          </div>

          {/* Owner */}
          {vehicle.owner && vehicle.is_claimed && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: 10, borderRadius: 8,
              background: '#131920', border: '1px solid rgba(255,255,255,0.06)',
              marginBottom: 14,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Rajdhani', sans-serif", fontSize: 14, fontWeight: 700, color: '#030508',
              }}>
                {vehicle.owner.handle?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, color: '#F97316' }}>
                  @{vehicle.owner.handle}
                </div>
                <div style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#445566' }}>Owner</div>
              </div>
            </div>
          )}

          {/* Stickers */}
          <StickerSlab vehicleId={vehicle.id} />

          {/* Claim hint */}
          {!vehicle.is_claimed && user && onNavigate && (
            <button
              onClick={() => {
                onNavigate('vehicle-detail', { vehicleId: vehicle.id, scrollTo: 'claim-section' });
                onClose();
              }}
              style={{
                width: '100%', padding: '8px', marginTop: 10,
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#7a8e9e',
              }}
            >
              Is this your vehicle? Claim it →
            </button>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </ModalShell>
  );
}
