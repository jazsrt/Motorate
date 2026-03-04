import { useState, useEffect } from 'react';
import { X, ExternalLink, Car, Crosshair } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getVehicleImageUrl } from '../lib/carImageryApi';
import { StickerSlab } from './StickerSlab';
import { useAuth } from '../contexts/AuthContext';
import type { OnNavigate } from '../types/navigation';

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
  plate_number: string | null;
  plate_state: string | null;
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

  useEffect(() => {
    loadVehicle();
  }, [vehicleId]);

  useEffect(() => {
    if (vehicle && !vehicle.stock_image_url) {
      getVehicleImageUrl(vehicle.make || '', vehicle.model || '', vehicle.year || undefined).then(url => {
        if (url) setCarImageryUrl(url);
      });
    }
  }, [vehicle]);

  async function loadVehicle() {
    try {
      const { data } = await supabase
        .from('vehicles')
        .select(`
          id, make, model, year, color, stock_image_url,
          plate_number, plate_state, owner_id, is_claimed, verification_tier,
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
  }

  const vehicleName = vehicle
    ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ')
    : '';

  const handleViewFull = () => {
    if (vehicle && onNavigate) {
      onNavigate('vehicle-detail', { vehicleId: vehicle.id });
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end"
      style={{ background: 'rgba(20,28,38,0.92)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full animate-sheet-up"
        style={{
          background: 'var(--surface)',
          borderRadius: '14px 14px 0 0',
          borderTop: '1px solid var(--border-2)',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="rounded-full" style={{ width: 28, height: 2, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <h2 className="text-[15px] font-normal" style={{ color: 'var(--text-primary)', letterSpacing: '0.3px' }}>
            Plate Profile
          </h2>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-tertiary)' }}
          >
            <X className="w-2.5 h-2.5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: 'var(--accent)' }} />
            </div>
          ) : !vehicle ? (
            <div className="py-10 text-center">
              <Car className="w-10 h-10 mx-auto mb-3" strokeWidth={1} style={{ color: 'var(--text-quaternary)' }} />
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Vehicle not found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                const imgUrl = vehicle.stock_image_url || carImageryUrl;
                return imgUrl ? (
                  <div className="w-full overflow-hidden rounded-xl" style={{ background: 'var(--surface-2)' }}>
                    <img
                      src={imgUrl}
                      alt={vehicleName}
                      className="w-full object-cover"
                      style={{ maxHeight: 200 }}
                    />
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-center py-8 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                    <Car className="w-16 h-16" strokeWidth={1} style={{ color: 'var(--text-quaternary)' }} />
                  </div>
                );
              })()}

              <div>
                <p className="text-[18px] font-bold" style={{ color: 'var(--text-primary)' }}>{vehicleName || 'Unknown Vehicle'}</p>
                {vehicle.color && (
                  <p className="text-[13px] capitalize mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{vehicle.color}</p>
                )}
              </div>

              {(vehicle.plate_number || vehicle.plate_state) && (
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}
                >
                  <span className="font-mono text-[13px] font-bold tracking-widest" style={{ color: 'var(--text-primary)' }}>
                    {vehicle.plate_state ? `${vehicle.plate_state} · ` : ''}{vehicle.plate_number}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div
                  className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                  style={
                    vehicle.is_claimed
                      ? { background: 'rgba(16,185,129,0.12)', color: '#5aaa7a', border: '1px solid rgba(16,185,129,0.25)' }
                      : { background: 'rgba(122,142,168,0.12)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }
                  }
                >
                  {vehicle.is_claimed ? 'Claimed' : 'Unclaimed'}
                </div>
                {vehicle.verification_tier === 'verified' && (
                  <div
                    className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                    style={{ background: 'rgba(249,115,22,0.12)', color: '#fb923c', border: '1px solid rgba(249,115,22,0.25)' }}
                  >
                    Verified
                  </div>
                )}
              </div>

              {vehicle.owner && vehicle.is_claimed && (
                <div
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                    style={{ background: 'var(--accent)', color: 'var(--bg)' }}
                  >
                    {vehicle.owner.handle?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold" style={{ color: 'var(--accent)' }}>@{vehicle.owner.handle}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Owner</p>
                  </div>
                </div>
              )}

              <StickerSlab vehicleId={vehicle.id} />
            </div>
          )}
        </div>

        {vehicle && onNavigate && (
          <div
            className="px-5 py-4 space-y-2"
            style={{ borderTop: '1px solid var(--border)', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
          >
            <button
              onClick={() => {
                onNavigate('vehicle-detail', { vehicleId: vehicle.id, openReviewModal: true });
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[12px] font-bold uppercase transition-all active:scale-[0.98]"
              style={{ background: 'var(--accent)', color: 'var(--bg)', letterSpacing: '0.8px' }}
            >
              <Crosshair className="w-3.5 h-3.5" strokeWidth={2} />
              Spot This Plate
            </button>
            <button
              onClick={handleViewFull}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[12px] font-bold uppercase transition-all active:scale-[0.98]"
              style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-2)', letterSpacing: '0.8px' }}
            >
              <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
              View Plate Profile
            </button>
            {!vehicle.is_claimed && user && (
              <button
                onClick={() => {
                  onNavigate('vehicle-detail', { vehicleId: vehicle.id, scrollTo: 'claim-section' });
                  onClose();
                }}
                className="w-full py-2 text-[11px] transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Is this your plate? Claim it &rarr;
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
